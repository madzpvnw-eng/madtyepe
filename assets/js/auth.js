/**
 * @license
 * madtype - Firebase Google Authentication & Cloud Sync Manager
 * Uses Firebase Auth (Google Sign-In Popup) and Firestore (Enterprise database ID).
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const OperationType = Object.freeze({
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
});

/**
 * Mandatory Firestore error handler per Firebase security integration spec.
 * Throws a structured JSON error string containing auth & operation context.
 */
export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Mandatory startup connection test against Firestore server.
 */
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

const VALID_THEMES = ['dark', 'light'];
const VALID_WORDS_MODES = ['all', 'moderate', 'light', 'first_letters'];
const VALID_TYPING_MODES = ['wait', 'continuous', 'line'];
const VALID_AUTO_REPLAY = ['off', '5', '10', '15'];
const VALID_KEY_SOUNDS = ['off', 'quiet', 'medium', 'loud'];
const VALID_ERROR_SOUNDS = ['off', 'error', 'beep', 'thud'];

function sanitizeId(val, maxLen = 128) {
  return String(val || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, maxLen) || 'unknown';
}

export class AuthManager {
  constructor({
    onAuthChanged = () => {},
    onProfileLoaded = () => {},
    onSessionsUpdated = () => {},
    onFavoritesUpdated = () => {},
  } = {}) {
    this.user = null;
    this.authReady = false;
    this.profile = null;
    this.sessions = [];
    this.favorites = [];

    this.onAuthChanged = onAuthChanged;
    this.onProfileLoaded = onProfileLoaded;
    this.onSessionsUpdated = onSessionsUpdated;
    this.onFavoritesUpdated = onFavoritesUpdated;

    this.unsubSessions = null;
    this.unsubFavorites = null;

    this.provider = new GoogleAuthProvider();
    this.provider.setCustomParameters({ prompt: 'select_account' });

    this.initAuthListener();
  }

  initAuthListener() {
    onAuthStateChanged(auth, async (firebaseUser) => {
      this.detachListeners();
      this.user = firebaseUser || null;
      this.authReady = true;

      if (this.user) {
        this.onAuthChanged(this.user);
        try {
          await this.ensureUserDocuments(this.user);
          this.attachUserListeners(this.user.uid);
        } catch (err) {
          console.error('Failed to initialize user cloud data:', err);
        }
      } else {
        this.profile = null;
        this.sessions = [];
        this.favorites = [];
        this.onAuthChanged(null);
        this.onSessionsUpdated([]);
        this.onFavoritesUpdated([]);
      }
    });
  }

  detachListeners() {
    if (this.unsubSessions) {
      this.unsubSessions();
      this.unsubSessions = null;
    }
    if (this.unsubFavorites) {
      this.unsubFavorites();
      this.unsubFavorites = null;
    }
  }

  async signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, this.provider);
      return { success: true, user: result.user };
    } catch (error) {
      const code = error?.code || '';
      let message = 'Gagal masuk dengan Google. Silakan coba lagi.';

      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        message = 'Jendela login Google ditutup sebelum proses selesai.';
      } else if (code === 'auth/popup-blocked') {
        message = 'Popup login diblokir oleh browser. Izinkan popup untuk situs ini.';
      } else if (code === 'auth/unauthorized-domain') {
        message = 'Domain ini belum diotorisasi di pengaturan Firebase Authentication.';
      } else if (code === 'auth/network-request-failed') {
        message = 'Koneksi internet bermasalah saat menghubungi Google.';
      } else if (error instanceof Error && error.message) {
        message = error.message;
      }

      return { success: false, code, message };
    }
  }

  async signOutUser() {
    this.detachListeners();
    await signOut(auth);
  }

  async ensureUserDocuments(user) {
    const uid = sanitizeId(user.uid, 128);
    const displayName = (user.displayName || user.email?.split('@')[0] || 'Pengguna madtype').trim().slice(0, 120);
    const photoURL = (user.photoURL || '').trim().slice(0, 500);
    const email = (user.email || '').trim().slice(0, 254);

    // 1. Public Profile & Synced Preferences (/users/{uid})
    const userPath = `users/${uid}`;
    const userRef = doc(db, 'users', uid);
    let userSnap;
    try {
      userSnap = await getDoc(userRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, userPath);
    }

    if (!userSnap.exists()) {
      const payload = {
        uid,
        displayName,
        photoURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      try {
        await setDoc(userRef, payload);
        this.profile = payload;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, userPath);
      }
    } else {
      const existingData = userSnap.data();
      this.profile = existingData;
      try {
        await updateDoc(userRef, {
          displayName,
          photoURL,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, userPath);
      }
      this.onProfileLoaded(existingData);
    }

    // 2. Isolated PII Subcollection (/users/{uid}/private/info)
    if (email) {
      const privatePath = `users/${uid}/private/info`;
      const privateRef = doc(db, 'users', uid, 'private', 'info');
      let privSnap;
      try {
        privSnap = await getDoc(privateRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, privatePath);
      }

      if (!privSnap.exists()) {
        try {
          await setDoc(privateRef, {
            uid,
            email,
            emailVerified: Boolean(user.emailVerified),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, privatePath);
        }
      } else {
        try {
          await updateDoc(privateRef, {
            email,
            emailVerified: Boolean(user.emailVerified),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, privatePath);
        }
      }
    }
  }

  attachUserListeners(rawUid) {
    if (!this.authReady || !this.user) return;
    const uid = sanitizeId(rawUid, 128);

    // Sessions listener
    const sessionsPath = `users/${uid}/sessions`;
    const sessionsQuery = query(
      collection(db, 'users', uid, 'sessions'),
      orderBy('createdAt', 'desc'),
      limit(25)
    );
    this.unsubSessions = onSnapshot(
      sessionsQuery,
      (snapshot) => {
        this.sessions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        this.onSessionsUpdated(this.sessions);
      },
      (err) => {
        if (!this.user) return;
        handleFirestoreError(err, OperationType.LIST, sessionsPath);
      }
    );

    // Favorites listener
    const favoritesPath = `users/${uid}/favorites`;
    const favoritesQuery = query(
      collection(db, 'users', uid, 'favorites'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    this.unsubFavorites = onSnapshot(
      favoritesQuery,
      (snapshot) => {
        this.favorites = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        this.onFavoritesUpdated(this.favorites);
      },
      (err) => {
        if (!this.user) return;
        handleFirestoreError(err, OperationType.LIST, favoritesPath);
      }
    );
  }

  async savePreferences(prefs = {}) {
    if (!this.authReady || !this.user) return;
    const uid = sanitizeId(this.user.uid, 128);
    const userPath = `users/${uid}`;

    const sanitized = {
      theme: VALID_THEMES.includes(prefs.theme) ? prefs.theme : 'dark',
      fontFamily: String(prefs.fontFamily || 'Be Vietnam Pro').trim().slice(0, 80) || 'Be Vietnam Pro',
      wordsToType: VALID_WORDS_MODES.includes(prefs.wordsToType) ? prefs.wordsToType : 'all',
      typingMode: VALID_TYPING_MODES.includes(prefs.typingMode) ? prefs.typingMode : 'wait',
      autoReplay: VALID_AUTO_REPLAY.includes(String(prefs.autoReplay)) ? String(prefs.autoReplay) : '10',
      keySound: VALID_KEY_SOUNDS.includes(prefs.keySound) ? prefs.keySound : 'medium',
      errorSound: VALID_ERROR_SOUNDS.includes(prefs.errorSound) ? prefs.errorSound : 'error',
      waitForTyping: Boolean(prefs.waitForTyping),
      soundFx: Boolean(prefs.soundFx),
      updatedAt: serverTimestamp(),
    };

    try {
      await updateDoc(doc(db, 'users', uid), sanitized);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, userPath);
    }
  }

  async savePracticeSession(sessionData) {
    if (!this.authReady || !this.user) return false;
    const uid = sanitizeId(this.user.uid, 128);
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const sessionPath = `users/${uid}/sessions/${sessionId}`;

    const clamp = (n, min, max) => Math.max(min, Math.min(max, Math.round(Number(n) || 0)));

    const payload = {
      uid,
      videoId: sanitizeId(sessionData.videoId, 32),
      songTitle: String(sessionData.songTitle || 'Lagu YouTube').trim().slice(0, 200) || 'Lagu YouTube',
      songArtist: String(sessionData.songArtist || '').trim().slice(0, 160),
      wpm: clamp(sessionData.wpm, 0, 500),
      accuracy: clamp(sessionData.accuracy, 0, 100),
      correctChars: clamp(sessionData.correctChars, 0, 100000),
      totalChars: clamp(sessionData.totalChars, 0, 100000),
      highestStreak: clamp(sessionData.highestStreak, 0, 100000),
      completedLines: clamp(sessionData.completedLines, 0, 5000),
      totalLines: clamp(sessionData.totalLines, 0, 5000),
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'users', uid, 'sessions', sessionId), payload);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, sessionPath);
    }
  }

  isFavorite(videoId) {
    if (!videoId) return false;
    const clean = sanitizeId(videoId, 32);
    return this.favorites.some((f) => f.videoId === clean || f.id === clean);
  }

  async toggleFavoriteSong(song) {
    if (!this.authReady || !this.user) {
      return { requiresAuth: true };
    }
    const uid = sanitizeId(this.user.uid, 128);
    const videoId = sanitizeId(song?.videoId, 32);
    if (!videoId || videoId === 'unknown') return { success: false };

    const favPath = `users/${uid}/favorites/${videoId}`;
    const favRef = doc(db, 'users', uid, 'favorites', videoId);

    if (this.isFavorite(videoId)) {
      try {
        await deleteDoc(favRef);
        return { success: true, favorited: false };
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, favPath);
      }
    } else {
      const payload = {
        uid,
        videoId,
        title: String(song?.title || 'Lagu YouTube').trim().slice(0, 200) || 'Lagu YouTube',
        artist: String(song?.artist || '').trim().slice(0, 160),
        duration: Math.max(0, Math.min(86400, Math.round(Number(song?.duration) || 0))),
        createdAt: serverTimestamp(),
      };
      try {
        await setDoc(favRef, payload);
        return { success: true, favorited: true };
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, favPath);
      }
    }
  }
}
