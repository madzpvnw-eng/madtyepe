/**
 * @license
 * madtype - Settings & Sound Manager
 * Handles user preferences, theme toggling, typography settings, and Web Audio SFX.
 */

export class SettingsManager {
  constructor() {
    this.STORAGE_KEY = 'madtype_settings_v3';
    
    // Default configuration (madtype authentic interface)
    this.defaultSettings = {
      theme: 'dark', // 'dark' (Gray Matte) | 'light' (Cream Soft Matte)
      fontSize: 'lg', // 'sm', 'md', 'lg', 'xl'
      fontFamily: 'Be Vietnam Pro', // 'Be Vietnam Pro', 'Roboto Mono', 'Quicksand', 'Playpen Sans'
      wordsToType: 'all', // 'all', 'moderate', 'light', 'first_letters'
      autoReplay: '10', // 'off', '5', '10', '15'
      keySound: 'medium', // 'off', 'quiet', 'medium', 'loud'
      errorSound: 'error', // 'off', 'error', 'beep', 'thud'
      typingMode: 'continuous', // 'continuous' | 'line'
      showPreviousLyrics: true,
      showNextLyrics: true,
      soundFx: true,
      skipPunctuation: false,
      syncOffset: 0.0, // seconds
      videoVisible: true,
      lyricLang: 'auto', // 'auto' or ISO code ('en', 'id', 'tl', 'ja', 'ko', etc.)
      subtitleLang: 'id', // target subtitle language ISO code
      showSubtitles: true,
    };

    this.settings = this.loadSettings();
    this.audioCtx = null;
    this.listeners = [];

    this.applySettingsToDOM();
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY) || localStorage.getItem('vocatype_settings_v2');
      if (saved) {
        return { ...this.defaultSettings, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load settings from localStorage:', e);
    }
    return { ...this.defaultSettings };
  }

  saveSettings() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
    this.applySettingsToDOM();
    this.notifyListeners();
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    this.settings[key] = value;
    this.saveSettings();
  }

  toggleTheme() {
    const nextTheme = this.settings.theme === 'dark' ? 'light' : 'dark';
    this.set('theme', nextTheme);
    return nextTheme;
  }

  adjustSyncOffset(delta) {
    const newOffset = Math.round((this.settings.syncOffset + delta) * 10) / 10;
    this.set('syncOffset', newOffset);
    return newOffset;
  }

  resetSyncOffset() {
    this.set('syncOffset', 0.0);
    return 0.0;
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(cb => {
      try {
        cb(this.settings);
      } catch (err) {
        console.error('Settings listener error:', err);
      }
    });
  }

  applySettingsToDOM() {
    // 1. Theme
    document.documentElement.setAttribute('data-theme', this.settings.theme);

    // 2. Font size on lyrics container
    const lyricsContainer = document.querySelector('.lyrics-container');
    if (lyricsContainer) {
      lyricsContainer.classList.remove('size-sm', 'size-md', 'size-lg', 'size-xl');
      lyricsContainer.classList.add(`size-${this.settings.fontSize}`);
      lyricsContainer.style.fontFamily = `"${this.settings.fontFamily}", monospace`;
    }

    // 3. Previous / Next lines visibility
    const prevLyrics = document.querySelector('.previous-lyrics');
    if (prevLyrics) {
      if (this.settings.showPreviousLyrics) {
        prevLyrics.classList.remove('hidden');
      } else {
        prevLyrics.classList.add('hidden');
      }
    }

    const nextLyrics = document.querySelector('.next-lyrics');
    if (nextLyrics) {
      if (this.settings.showNextLyrics) {
        nextLyrics.classList.remove('hidden');
      } else {
        nextLyrics.classList.add('hidden');
      }
    }

    // 4. Video visibility
    const videoCol = document.querySelector('.video-column');
    const mainGrid = document.querySelector('.main-stage-grid');
    if (videoCol && mainGrid) {
      if (this.settings.videoVisible) {
        videoCol.classList.remove('hidden');
        mainGrid.classList.add('with-video');
      } else {
        videoCol.classList.add('hidden');
        mainGrid.classList.remove('with-video');
      }
    }
  }

  // --- Sound Effects using Web Audio API ---
  initAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playKeySound(isCorrect = true) {
    if (!this.settings.soundFx) return;

    if (isCorrect) {
      const mode = this.settings.keySound || 'medium';
      if (mode === 'off') return;
      this.initAudio();
      if (!this.audioCtx) return;

      const volumeMap = { quiet: 0.015, medium: 0.04, loud: 0.08 };
      const vol = volumeMap[mode] || 0.04;

      try {
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.04);

        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.05);

        osc.start(now);
        osc.stop(now + 0.05);
      } catch (e) {}
    } else {
      const errMode = this.settings.errorSound || 'error';
      if (errMode === 'off') return;
      this.initAudio();
      if (!this.audioCtx) return;

      try {
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        if (errMode === 'beep') {
          osc.type = 'square';
          osc.frequency.setValueAtTime(880, now);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
          osc.start(now);
          osc.stop(now + 0.07);
        } else if (errMode === 'thud') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(95, now);
          osc.frequency.exponentialRampToValueAtTime(45, now + 0.1);
          gain.gain.setValueAtTime(0.09, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
        } else {
          // Standard error frequency slide
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(170, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
          osc.start(now);
          osc.stop(now + 0.09);
        }
      } catch (e) {}
    }
  }

  playLineSuccessSound() {
    if (!this.settings.soundFx) return;
    this.initAudio();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 chord
      notes.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        
        gain.gain.setValueAtTime(0.03, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.18);

        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.2);
      });
    } catch (e) {}
  }
}
