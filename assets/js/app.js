/**
 * @license
 * VOCATYPE - Main Controller
 * Implements the official Vocatype interface, pause-wait line typing mechanics,
 * mini HUD, and end-of-song summary modal.
 */

import { SettingsManager } from './settings.js';
import { StatisticsTracker } from './statistics.js';
import { YouTubeController } from './youtube.js';
import { LyricsManager } from './lyrics.js';
import { TypingEngine } from './typing.js';
import { AuthManager } from './auth.js';

// Popular curated demo tracks inspired by video.vocatype.app/id/
const DEMO_SONGS = [
  {
    title: 'Ang Boyfriend Kong Baduy',
    artist: 'Cinderella',
    videoId: '141HauTGBpQ',
    duration: 176,
    tag: 'Cinderella · Ang Boyfriend Kong Baduy',
    translation: 'Pa, pa-pa-pa, pa-pa-pa-pa, pa-pa',
  },
  {
    title: 'Yellow',
    artist: 'Coldplay',
    videoId: 'yKNxeF4KMsY',
    duration: 273,
    tag: 'Coldplay · Yellow',
    translation: 'Lihatlah bintang-bintang di langit',
  },
  {
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    videoId: 'fJ9rUzIMcZQ',
    duration: 355,
    tag: 'Queen · Bohemian Rhapsody',
    translation: 'Apakah ini kehidupan nyata?',
  },
  {
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    videoId: 'JGwWNGJdvx8',
    duration: 263,
    tag: 'Ed Sheeran · Shape of You',
    translation: 'Ed Sheeran — Shape of You',
  },
  {
    title: 'Never Gonna Give You Up',
    artist: 'Rick Astley',
    videoId: 'dQw4w9WgXcQ',
    duration: 214,
    tag: 'Rick Astley · Never Gonna Give You Up',
    translation: 'Rick Astley — Never Gonna Give You Up',
  },
  {
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    videoId: '4NRXx6U8ABQ',
    duration: 263,
    tag: 'The Weeknd · Blinding Lights',
    translation: 'The Weeknd — Blinding Lights (Official Video)',
  },
];

class MadtypeApp {
  constructor() {
    this.settings = new SettingsManager();
    this.stats = new StatisticsTracker();
    this.lyricsManager = new LyricsManager();

    this.yt = null;
    this.typingEngine = null;
    this.currentSong = null;
    this.isSeeking = false;
    this.lastPlayerTime = 0;
    
    // Core game rule: song will pause and wait if current line hasn't been typed!
    this.waitForTyping = true;
    this.isWaitingForUser = false;
    this.showTranslations = true;
    this.autoReplayInterval = null;
    this.isApplyingCloudPrefs = false;
    this.sessionSavedForCurrentRun = false;
    this.currentTypingMode = 'wait';

    this.initDOM();
    this.initTypingEngine();
    this.initYouTubePlayer();
    this.initAuth();
    this.bindUIEvents();
    this.renderPopularSongPicker();

    // Apply saved theme, practice font, and words-to-type settings
    this.applyTheme(this.settings.get('theme') || 'dark');
    this.applyPracticeFont(this.settings.get('fontFamily') || 'Be Vietnam Pro');
    this.applyWordsToType(this.settings.get('wordsToType') || 'all');

    // Load default song
    const first = DEMO_SONGS[0];
    this.loadSongById(first.videoId, first.title, first.artist, first.translation, first.duration);
  }

  initDOM() {
    this.dom = {
      // Large Video Screen
      videoWrapper: document.querySelector('.video-theater-wrapper'),
      videoLoading: document.getElementById('video-loading-screen'),
      waitingBadge: document.getElementById('waiting-badge'),

      // Mini HUD under video
      hudBarisVal: document.getElementById('hud-baris-val'),
      hudWpmVal: document.getElementById('hud-wpm-val'),
      hudAccVal: document.getElementById('hud-acc-val'),
      timelineSlider: document.getElementById('timeline-slider'),
      hudTimeDisplay: document.getElementById('hud-time-display'),
      hudPrevBtn: document.getElementById('hud-prev-btn'),
      hudPlayBtn: document.getElementById('hud-play-btn'),
      hudPlayIcon: document.getElementById('hud-play-icon'),
      hudRestartBtn: document.getElementById('hud-restart-btn'),
      hudNextBtn: document.getElementById('hud-next-btn'),
      hudTheaterBtn: document.getElementById('hud-theater-btn'),

      // Lyrics & Typing Arena
      activeLyricDisplay: document.getElementById('active-lyric-display'),
      arenaPlayToggle: document.getElementById('arena-play-toggle'),
      arenaPlayIcon: document.getElementById('arena-play-icon'),
      lyricTranslationText: document.getElementById('lyric-translation-text'),
      typingInputBar: document.getElementById('typing-input-bar'),
      lineProgressFill: document.getElementById('line-progress-mini-fill'),

      // Bottom Floating Toolbar
      toolbarRestartBtn: document.getElementById('toolbar-restart-btn'),
      toolbarPilihVideoBtn: document.getElementById('toolbar-pilih-video-btn'),
      toolbarModeBtn: document.getElementById('toolbar-mode-btn'),
      toolbarSubtitleBtn: document.getElementById('toolbar-subtitle-btn'),
      toolbarWordsBtn: document.getElementById('toolbar-words-btn'),
      toolbarFontBtn: document.getElementById('toolbar-font-btn'),
      toolbarCustomBtn: document.getElementById('toolbar-custom-btn'),
      toolbarCollapseBtn: document.getElementById('toolbar-collapse-btn'),
      bottomFloatingBar: document.querySelector('.bottom-floating-bar'),

      // Popovers
      popoverWords: document.getElementById('popover-words'),
      popoverFont: document.getElementById('popover-font'),
      popoverCustom: document.getElementById('popover-customizations'),
      popoverMode: document.getElementById('popover-mode'),
      popoverSubtitles: document.getElementById('popover-subtitles'),

      // Popover Controls
      wordsToTypeOptions: document.getElementById('words-to-type-options'),
      fontOptionsList: document.getElementById('font-options-list'),
      customFontInput: document.getElementById('custom-font-input'),
      applyCustomFontBtn: document.getElementById('apply-custom-font-btn'),
      customAutoReplay: document.getElementById('custom-auto-replay'),
      customKeySound: document.getElementById('custom-key-sound'),
      customErrorSound: document.getElementById('custom-error-sound'),
      modeOptionsList: document.getElementById('mode-options-list'),
      subtitleOptionsList: document.getElementById('subtitle-options-list'),

      // Modals
      videoPickerModal: document.getElementById('video-picker-modal'),
      resultsModal: document.getElementById('results-modal'),
      settingsModal: document.getElementById('settings-modal'),
      toastContainer: document.getElementById('toast-container'),

      // Video Picker & Lyrics Match Inputs
      customUrlInput: document.getElementById('custom-youtube-url-input'),
      loadCustomUrlBtn: document.getElementById('load-custom-url-btn'),
      popularSongsList: document.getElementById('popular-songs-list'),
      openSyncTextBtn: document.getElementById('open-sync-text-btn'),
      lyricsManualSearchInput: document.getElementById('lyrics-manual-search-input'),
      lyricsManualSearchBtn: document.getElementById('lyrics-manual-search-btn'),
      lyricsCandidatesList: document.getElementById('lyrics-candidates-list'),
      customTranscriptTextarea: document.getElementById('custom-transcript-textarea'),
      applyCustomTranscriptBtn: document.getElementById('apply-custom-transcript-btn'),

      // Results Modal Elements
      resultSongTitle: document.getElementById('result-song-title'),
      resultSongArtist: document.getElementById('result-song-artist'),
      resultFinalWpm: document.getElementById('result-final-wpm'),
      resultFinalAcc: document.getElementById('result-final-acc'),
      resultFinalCorrect: document.getElementById('result-final-correct'),
      resultFinalStreak: document.getElementById('result-final-streak'),
      resultPlayAgainBtn: document.getElementById('result-play-again-btn'),
      resultPickAnotherBtn: document.getElementById('result-pick-another-btn'),

      // Settings Modal Inputs
      settingWaitToggle: document.getElementById('setting-wait-for-typing'),
      settingSfxToggle: document.getElementById('setting-sfx-toggle'),
      settingThemeSelect: document.getElementById('setting-theme-select'),
      modalOffsetMinus: document.getElementById('modal-offset-minus'),
      modalOffsetPlus: document.getElementById('modal-offset-plus'),
      modalOffsetReset: document.getElementById('modal-offset-reset'),
      modalOffsetVal: document.getElementById('modal-offset-val'),

      // Theme Elements
      themeToggleBtn: document.getElementById('theme-toggle-btn'),
      themeIconSun: document.getElementById('theme-icon-sun'),
      themeIconMoon: document.getElementById('theme-icon-moon'),
      customThemeMode: document.getElementById('custom-theme-mode'),

      // Header Navigation & Auth / Account / History / Favorites
      headerStatsBtn: document.getElementById('header-stats-btn'),
      headerFavBtn: document.getElementById('header-fav-btn'),
      openSettingsIconBtn: document.getElementById('open-settings-icon-btn'),
      headerAuthBtn: document.getElementById('header-auth-btn'),
      headerAuthAvatar: document.getElementById('header-auth-avatar'),
      headerAuthGoogleIcon: document.getElementById('header-auth-google-icon'),
      headerAuthLabel: document.getElementById('header-auth-label'),

      accountModal: document.getElementById('account-modal'),
      accountSignedOutView: document.getElementById('account-signed-out-view'),
      accountSignedInView: document.getElementById('account-signed-in-view'),
      authErrorBanner: document.getElementById('auth-error-banner'),
      googleSigninBtn: document.getElementById('google-signin-btn'),
      googleSigninBtnText: document.getElementById('google-signin-btn-text'),
      googleSignoutBtn: document.getElementById('google-signout-btn'),
      accountProfileAvatar: document.getElementById('account-profile-avatar'),
      accountProfileName: document.getElementById('account-profile-name'),
      accountProfileEmail: document.getElementById('account-profile-email'),
      accountTotalSessions: document.getElementById('account-total-sessions'),
      accountBestWpm: document.getElementById('account-best-wpm'),
      accountAvgAcc: document.getElementById('account-avg-acc'),
      accountTotalFavs: document.getElementById('account-total-favs'),
      accountOpenHistoryBtn: document.getElementById('account-open-history-btn'),

      statsModal: document.getElementById('stats-modal'),
      statsLiveWpm: document.getElementById('stats-live-wpm'),
      statsLiveAcc: document.getElementById('stats-live-acc'),
      historySessionsList: document.getElementById('history-sessions-list'),

      favoritesModal: document.getElementById('favorites-modal'),
      favCurrentTitle: document.getElementById('fav-current-title'),
      favCurrentArtist: document.getElementById('fav-current-artist'),
      toggleCurrentFavBtn: document.getElementById('toggle-current-fav-btn'),
      favoritesSongsList: document.getElementById('favorites-songs-list'),
    };
  }

  initAuth() {
    this.authManager = new AuthManager({
      onAuthChanged: (user) => {
        this.updateAuthUI(user);
        this.renderHistoryList();
        this.renderFavoritesList();
      },
      onProfileLoaded: (profile) => {
        this.applyCloudPreferences(profile);
      },
      onSessionsUpdated: (sessions) => {
        this.updateAccountSummary(sessions, this.authManager?.favorites || []);
        this.renderHistoryList();
      },
      onFavoritesUpdated: (favorites) => {
        this.updateAccountSummary(this.authManager?.sessions || [], favorites);
        this.renderFavoritesList();
        this.updateFavoriteHeartUI();
      },
    });
  }

  initTypingEngine() {
    this.typingEngine = new TypingEngine({
      mode: 'continuous',
      onCharTyped: (isCorrect) => {
        this.stats.recordKey(isCorrect);
        this.settings.playKeySound(isCorrect);
        this.updateHUDStats();
      },
      onLineCompleted: (lineIdx) => {
        this.clearAutoReplay();
        this.stats.recordLineCompleted();
        this.settings.playLineSuccessSound();
        this.updateHUDStats();

        // If the player was paused waiting for the user to complete this line:
        if (this.isWaitingForUser) {
          this.isWaitingForUser = false;
          if (this.dom.waitingBadge) {
            this.dom.waitingBadge.classList.remove('active');
          }

          // Advance to next line immediately and resume playback
          const nextIdx = this.typingEngine.goToNextLine();
          if (nextIdx === -1 || nextIdx >= this.lyricsManager.lyricsData.length) {
            this.showResultsModal();
          } else {
            this.updateBarisCount(nextIdx + 1, this.lyricsManager.lyricsData.length);
            const nextLine = this.lyricsManager.lyricsData[nextIdx];
            if (nextLine && this.yt) {
              const offset = this.settings.get('syncOffset');
              this.yt.seekTo(nextLine.time + offset);
              this.yt.play();
            }
          }
        }
      },
      onAdvanceRequest: (nextLineIdx) => {
        this.updateBarisCount(nextLineIdx + 1, this.lyricsManager.lyricsData.length);
        const nextLine = this.lyricsManager.lyricsData[nextLineIdx];
        if (nextLine && this.yt) {
          const offset = this.settings.get('syncOffset');
          this.yt.seekTo(nextLine.time + offset);
          this.yt.play();
        }
      },
      onRender: ({ lineIndex, totalLines }) => {
        this.updateBarisCount(lineIndex + 1, totalLines);
        const curLine = this.lyricsManager.lyricsData[lineIndex];
        if (this.dom.lyricTranslationText) {
          if (curLine && curLine.translation) {
            this.dom.lyricTranslationText.textContent = curLine.translation;
          } else if (this.currentSong) {
            this.dom.lyricTranslationText.textContent = `${this.currentSong.title} — ${this.currentSong.artist}`;
          } else {
            this.dom.lyricTranslationText.textContent = '';
          }
        }
      },
    });

    this.typingEngine.setElements({
      activeLineContainer: this.dom.activeLyricDisplay,
      prevLineContainer: null,
      nextLineContainer: null,
      lineProgressFill: this.dom.lineProgressFill,
      hiddenInput: this.dom.typingInputBar,
    });
  }

  initYouTubePlayer() {
    this.yt = new YouTubeController({
      containerId: 'youtube-player',
      onReady: () => {
        if (this.dom.videoLoading) {
          this.dom.videoLoading.classList.add('hidden');
        }
        this.updateTimeDisplay(0, this.yt.getDuration());
      },
      onDurationReady: (duration, videoId) => {
        this.handleDurationReady(duration, videoId);
      },
      onStateChange: (state) => {
        this.handlePlayerState(state);
      },
      onTimeUpdate: (currentTime, duration) => {
        if (!this.isSeeking) {
          this.updateTimeDisplay(currentTime, duration);
          this.handleGameplayTimeSync(currentTime);
        }
      },
      onError: (err) => {
        this.showToast(err.message, 'error');
      },
    });
  }

  renderPopularSongPicker() {
    if (!this.dom.popularSongsList) return;
    this.dom.popularSongsList.innerHTML = '';

    DEMO_SONGS.forEach(song => {
      const item = document.createElement('div');
      item.className = 'song-picker-item';
      item.innerHTML = `
        <div class="song-picker-item-info">
          <span class="song-picker-item-title">${this.escapeHtml(song.title)}</span>
          <span class="song-picker-item-artist">${this.escapeHtml(song.artist)}</span>
        </div>
        <span style="font-size: 0.76rem; color: var(--accent-matte); font-weight: 600;">Pilih ▷</span>
      `;
      item.addEventListener('click', () => {
        this.closeAllModals();
        this.loadSongById(song.videoId, song.title, song.artist, song.translation, song.duration);
      });
      this.dom.popularSongsList.appendChild(item);
    });
  }

  bindUIEvents() {
    // 1. Typing Input Bar events (keep visible typed buffer synchronized; prevent direct paste/IME drift)
    if (this.dom.typingInputBar) {
      this.dom.typingInputBar.addEventListener('input', () => {
        const expected = this.typingEngine.typedBuffer
          .slice(0, this.typingEngine.currentCharIndex)
          .join('');
        if (this.dom.typingInputBar.value !== expected) {
          this.dom.typingInputBar.value = expected;
        }
      });

      // Keep focus on input bar on container click
      document.querySelector('.typing-arena-section')?.addEventListener('click', () => {
        this.dom.typingInputBar.focus();
      });

      this.dom.videoWrapper?.addEventListener('click', () => {
        this.dom.typingInputBar.focus();
      });
    }

    // 2. Play / Pause buttons (HUD & Center Arena)
    const togglePlayback = () => {
      this.yt.togglePlay();
    };

    if (this.dom.hudPlayBtn) this.dom.hudPlayBtn.addEventListener('click', togglePlayback);
    if (this.dom.arenaPlayToggle) this.dom.arenaPlayToggle.addEventListener('click', togglePlayback);

    // 3. Navigation Controls (< ▷ ↺ > ⛶)
    if (this.dom.hudPrevBtn) {
      this.dom.hudPrevBtn.addEventListener('click', () => {
        const idx = this.typingEngine.goToPrevLine();
        if (idx >= 0 && this.lyricsManager.lyricsData[idx]) {
          this.yt.seekTo(this.lyricsManager.lyricsData[idx].time + this.settings.get('syncOffset'));
        }
      });
    }

    if (this.dom.hudNextBtn) {
      this.dom.hudNextBtn.addEventListener('click', () => {
        const idx = this.typingEngine.goToNextLine();
        if (idx >= 0 && this.lyricsManager.lyricsData[idx]) {
          this.yt.seekTo(this.lyricsManager.lyricsData[idx].time + this.settings.get('syncOffset'));
        }
      });
    }

    if (this.dom.hudRestartBtn) {
      this.dom.hudRestartBtn.addEventListener('click', () => {
        this.restartSession();
      });
    }

    if (this.dom.toolbarRestartBtn) {
      this.dom.toolbarRestartBtn.addEventListener('click', () => {
        this.restartSession();
      });
    }

    // 4. Theater Mode Toggle
    if (this.dom.hudTheaterBtn) {
      this.dom.hudTheaterBtn.addEventListener('click', () => {
        if (this.dom.videoWrapper) {
          const isWide = this.dom.videoWrapper.style.maxWidth === '100%';
          this.dom.videoWrapper.style.maxWidth = isWide ? '860px' : '100%';
        }
      });
    }

    // 5. Timeline Scrubbing
    if (this.dom.timelineSlider) {
      this.dom.timelineSlider.addEventListener('input', (e) => {
        this.isSeeking = true;
        const targetSec = parseFloat(e.target.value);
        this.updateTimeDisplay(targetSec, this.yt.getDuration());
      });

      this.dom.timelineSlider.addEventListener('change', (e) => {
        const targetSec = parseFloat(e.target.value);
        this.yt.seekTo(targetSec);
        this.isSeeking = false;
        this.isWaitingForUser = false;
        if (this.dom.waitingBadge) this.dom.waitingBadge.classList.remove('active');

        // Synchronize active line to the seeked timestamp
        const offset = this.settings.get('syncOffset');
        const activeIdx = this.lyricsManager.getActiveLineIndex(targetSec, offset);
        this.typingEngine.initLine(activeIdx);
        this.updateBarisCount(activeIdx + 1, this.lyricsManager.lyricsData.length);
      });
    }

    // 6. Floating Toolbar Buttons & Popovers (Words to Type, Practice Font, Customizations, Mode, Subtitle)
    if (this.dom.toolbarPilihVideoBtn) {
      this.dom.toolbarPilihVideoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeAllPopovers();
        this.switchPickerTab('video');
        this.openModal(this.dom.videoPickerModal);
      });
    }

    const openPickerIcon = document.getElementById('open-video-picker-icon-btn');
    if (openPickerIcon) {
      openPickerIcon.addEventListener('click', () => {
        this.switchPickerTab('video');
        this.openModal(this.dom.videoPickerModal);
      });
    }

    if (this.dom.openSyncTextBtn) {
      this.dom.openSyncTextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeAllPopovers();
        this.switchPickerTab('lyrics');
        this.renderLyricsCandidates();
        this.openModal(this.dom.videoPickerModal);
      });
    }

    // Modal Tab switching
    document.querySelectorAll('[data-picker-tab]').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        const tab = tabBtn.getAttribute('data-picker-tab');
        this.switchPickerTab(tab);
        if (tab === 'lyrics') {
          this.renderLyricsCandidates();
        }
      });
    });

    // Manual LRCLIB search
    const runManualLyricsSearch = async () => {
      const q = (this.dom.lyricsManualSearchInput?.value || '').trim();
      if (!q) {
        this.showToast('Ketik judul lagu atau nama artis terlebih dahulu.', 'error');
        return;
      }
      if (this.dom.lyricsCandidatesList) {
        this.dom.lyricsCandidatesList.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 0.82rem;">Mencari versi lirik di LRCLIB...</div>';
      }
      const ytDur = this.yt ? this.yt.getDuration() : (this.currentSong?.duration || 0);
      const candidates = await this.lyricsManager.fetchLrclibCandidates('', q, ytDur, this.currentSong?.versionTags || [], q);
      this.lyricsManager.candidateLyrics = candidates;
      this.renderLyricsCandidates();
    };

    if (this.dom.lyricsManualSearchBtn) {
      this.dom.lyricsManualSearchBtn.addEventListener('click', runManualLyricsSearch);
    }
    if (this.dom.lyricsManualSearchInput) {
      this.dom.lyricsManualSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          runManualLyricsSearch();
        }
      });
    }

    // Apply custom pasted transcript / LRC / SRT
    if (this.dom.applyCustomTranscriptBtn && this.dom.customTranscriptTextarea) {
      this.dom.applyCustomTranscriptBtn.addEventListener('click', () => {
        const raw = this.dom.customTranscriptTextarea.value;
        const ytDur = this.yt ? this.yt.getDuration() : (this.currentSong?.duration || 0);
        const parsed = this.lyricsManager.parseCustomText(raw, ytDur);
        if (parsed.lyrics && parsed.lyrics.length > 0) {
          this.applyLoadedLyricsResult({
            success: true,
            isSynced: parsed.isSynced,
            lyrics: parsed.lyrics,
            duration: ytDur,
            trackInfo: this.currentSong || { title: 'Video YouTube', artist: 'Transkrip Kustom' },
          });
          this.closeAllModals();
          this.showToast(`Berhasil menerapkan ${parsed.lyrics.length} baris teks ke video!`, 'success');
        } else {
          this.showToast('Teks kosong atau format tidak dikenali.', 'error');
        }
      });
    }

    // Load custom URL
    const loadUrlHandler = () => {
      const url = this.dom.customUrlInput.value.trim();
      if (!url) {
        this.showToast('Masukkan link YouTube terlebih dahulu.', 'error');
        return;
      }
      const videoId = this.yt.extractVideoId(url);
      if (!videoId) {
        this.showToast('Link YouTube tidak valid.', 'error');
        return;
      }
      this.closeAllModals();
      this.loadSongById(videoId);
    };

    if (this.dom.loadCustomUrlBtn && this.dom.customUrlInput) {
      this.dom.loadCustomUrlBtn.addEventListener('click', loadUrlHandler);
      this.dom.customUrlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          loadUrlHandler();
        }
      });
    }

    // Popover Toggles
    if (this.dom.toolbarWordsBtn && this.dom.popoverWords) {
      this.dom.toolbarWordsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePopover(this.dom.popoverWords, this.dom.toolbarWordsBtn);
      });
    }

    if (this.dom.toolbarFontBtn && this.dom.popoverFont) {
      this.dom.toolbarFontBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePopover(this.dom.popoverFont, this.dom.toolbarFontBtn);
      });
    }

    if (this.dom.toolbarCustomBtn && this.dom.popoverCustom) {
      this.dom.toolbarCustomBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePopover(this.dom.popoverCustom, this.dom.toolbarCustomBtn);
      });
    }

    if (this.dom.toolbarModeBtn && this.dom.popoverMode) {
      this.dom.toolbarModeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePopover(this.dom.popoverMode, this.dom.toolbarModeBtn);
      });
    }

    if (this.dom.toolbarSubtitleBtn && this.dom.popoverSubtitles) {
      this.dom.toolbarSubtitleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePopover(this.dom.popoverSubtitles, this.dom.toolbarSubtitleBtn);
      });
    }

    // Collapse toolbar toggle
    if (this.dom.toolbarCollapseBtn && this.dom.bottomFloatingBar) {
      this.dom.toolbarCollapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeAllPopovers();
        const icon = document.getElementById('collapse-icon');
        const isCollapsed = this.dom.bottomFloatingBar.classList.toggle('collapsed');
        if (icon) {
          icon.innerHTML = isCollapsed 
            ? `<polyline points="18 15 12 9 6 15"/>`
            : `<polyline points="6 9 12 15 18 9"/>`;
        }
      });
    }

    // Popover 1: Words to Type Option Click
    if (this.dom.wordsToTypeOptions) {
      this.dom.wordsToTypeOptions.querySelectorAll('.popover-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const mode = btn.getAttribute('data-words-mode');
          this.applyWordsToType(mode);
          this.closeAllPopovers();
        });
      });
    }

    // Popover 2: Practice Font Option Click & Custom Font Input
    if (this.dom.fontOptionsList) {
      this.dom.fontOptionsList.querySelectorAll('.popover-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const font = btn.getAttribute('data-font');
          this.applyPracticeFont(font);
          this.closeAllPopovers();
        });
      });
    }

    if (this.dom.applyCustomFontBtn && this.dom.customFontInput) {
      const handleCustomFont = () => {
        const val = this.dom.customFontInput.value.trim();
        if (val) {
          this.applyPracticeFont(val);
          this.closeAllPopovers();
        }
      };
      this.dom.applyCustomFontBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleCustomFont();
      });
      this.dom.customFontInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleCustomFont();
        }
      });
    }

    // Popover 3: Customizations (Auto Replay, Key Sound, Error Sound)
    if (this.dom.customAutoReplay) {
      this.dom.customAutoReplay.value = this.settings.get('autoReplay') || '10';
      this.dom.customAutoReplay.addEventListener('change', (e) => {
        this.settings.set('autoReplay', e.target.value);
        this.showToast(`Auto Replay disetel ke: ${e.target.options[e.target.selectedIndex].text}`, 'info');
      });
    }

    if (this.dom.customKeySound) {
      this.dom.customKeySound.value = this.settings.get('keySound') || 'medium';
      this.dom.customKeySound.addEventListener('change', (e) => {
        this.settings.set('keySound', e.target.value);
        this.settings.playKeySound(true);
      });
    }

    if (this.dom.customErrorSound) {
      this.dom.customErrorSound.value = this.settings.get('errorSound') || 'error';
      this.dom.customErrorSound.addEventListener('change', (e) => {
        this.settings.set('errorSound', e.target.value);
        this.settings.playKeySound(false);
      });
    }

    // Theme Mode Select in Customizations Popover
    if (this.dom.customThemeMode) {
      this.dom.customThemeMode.value = this.settings.get('theme') || 'dark';
      this.dom.customThemeMode.addEventListener('change', (e) => {
        this.applyTheme(e.target.value);
        const name = e.target.value === 'light' ? 'Cream Soft Matte (Mode Terang)' : 'Gray Matte (Mode Gelap)';
        this.showToast(`Tema diubah ke: ${name}`, 'info');
      });
    }

    // Theme Mode Select in Settings Modal
    if (this.dom.settingThemeSelect) {
      this.dom.settingThemeSelect.value = this.settings.get('theme') || 'dark';
      this.dom.settingThemeSelect.addEventListener('change', (e) => {
        this.applyTheme(e.target.value);
        const name = e.target.value === 'light' ? 'Cream Soft Matte (Mode Terang)' : 'Gray Matte (Mode Gelap)';
        this.showToast(`Tema diubah ke: ${name}`, 'info');
      });
    }

    // Theme Toggle Button in Header
    if (this.dom.themeToggleBtn) {
      this.dom.themeToggleBtn.addEventListener('click', () => {
        this.toggleTheme();
      });
    }

    // Popover 4: Mode Ketik Click
    if (this.dom.modeOptionsList) {
      this.dom.modeOptionsList.querySelectorAll('.popover-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const mode = btn.getAttribute('data-type-mode');
          this.applyTypingMode(mode);
          this.closeAllPopovers();
        });
      });
    }

    // Popover 5: Subtitle Option Click
    if (this.dom.subtitleOptionsList) {
      this.dom.subtitleOptionsList.querySelectorAll('.popover-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const mode = btn.getAttribute('data-sub-mode');
          this.applySubtitleMode(mode);
          this.closeAllPopovers();
        });
      });
    }

    // Close popovers on click outside
    document.addEventListener('click', (e) => {
      const isInsidePopover = e.target.closest('.voca-popover');
      const isInsideToolbar = e.target.closest('.bottom-floating-bar');
      if (!isInsidePopover && !isInsideToolbar) {
        this.closeAllPopovers();
      }
    });

    // Settings inside modal & Header action buttons
    if (this.dom.openSettingsIconBtn) {
      this.dom.openSettingsIconBtn.addEventListener('click', () => {
        if (this.dom.modalOffsetVal) {
          const offset = this.settings.get('syncOffset') || 0;
          this.dom.modalOffsetVal.textContent = `${offset >= 0 ? '+' : ''}${offset.toFixed(1)}s`;
        }
        if (this.dom.settingWaitToggle) this.dom.settingWaitToggle.checked = this.waitForTyping;
        if (this.dom.settingSfxToggle) this.dom.settingSfxToggle.checked = Boolean(this.settings.get('soundFx'));
        this.openModal(this.dom.settingsModal);
      });
    }

    if (this.dom.headerStatsBtn) {
      this.dom.headerStatsBtn.addEventListener('click', () => {
        const s = this.stats.getStats();
        if (this.dom.statsLiveWpm) this.dom.statsLiveWpm.textContent = s.netWPM;
        if (this.dom.statsLiveAcc) this.dom.statsLiveAcc.textContent = `${s.accuracy}%`;
        this.renderHistoryList();
        this.openModal(this.dom.statsModal);
      });
    }

    if (this.dom.headerFavBtn) {
      this.dom.headerFavBtn.addEventListener('click', () => {
        this.updateFavoriteHeartUI();
        this.renderFavoritesList();
        this.openModal(this.dom.favoritesModal);
      });
    }

    if (this.dom.headerAuthBtn) {
      this.dom.headerAuthBtn.addEventListener('click', () => {
        if (this.dom.authErrorBanner) {
          this.dom.authErrorBanner.style.display = 'none';
          this.dom.authErrorBanner.textContent = '';
        }
        this.openModal(this.dom.accountModal);
      });
    }

    if (this.dom.googleSigninBtn) {
      this.dom.googleSigninBtn.addEventListener('click', async () => {
        if (this.dom.authErrorBanner) {
          this.dom.authErrorBanner.style.display = 'none';
        }
        this.dom.googleSigninBtn.disabled = true;
        if (this.dom.googleSigninBtnText) {
          this.dom.googleSigninBtnText.textContent = 'Menghubungkan ke Google...';
        }

        const res = await this.authManager.signInWithGoogle();
        this.dom.googleSigninBtn.disabled = false;
        if (this.dom.googleSigninBtnText) {
          this.dom.googleSigninBtnText.textContent = 'Masuk dengan Google';
        }

        if (res.success) {
          const name = res.user?.displayName || res.user?.email || 'Pengguna';
          this.showToast(`Berhasil masuk sebagai ${name}!`, 'success');
          this.closeAllModals();
        } else if (res.message) {
          if (this.dom.authErrorBanner) {
            this.dom.authErrorBanner.textContent = res.message;
            this.dom.authErrorBanner.style.display = 'block';
          }
          this.showToast(res.message, 'error');
        }
      });
    }

    if (this.dom.googleSignoutBtn) {
      this.dom.googleSignoutBtn.addEventListener('click', async () => {
        try {
          await this.authManager.signOutUser();
          this.closeAllModals();
          this.showToast('Anda telah keluar dari akun Google.', 'info');
        } catch (err) {
          this.showToast('Gagal keluar dari akun.', 'error');
        }
      });
    }

    if (this.dom.accountOpenHistoryBtn) {
      this.dom.accountOpenHistoryBtn.addEventListener('click', () => {
        this.closeAllModals();
        const s = this.stats.getStats();
        if (this.dom.statsLiveWpm) this.dom.statsLiveWpm.textContent = s.netWPM;
        if (this.dom.statsLiveAcc) this.dom.statsLiveAcc.textContent = `${s.accuracy}%`;
        this.renderHistoryList();
        this.openModal(this.dom.statsModal);
      });
    }

    if (this.dom.toggleCurrentFavBtn) {
      this.dom.toggleCurrentFavBtn.addEventListener('click', async () => {
        if (!this.currentSong) return;
        const res = await this.authManager.toggleFavoriteSong(this.currentSong);
        if (res.requiresAuth) {
          this.closeAllModals();
          this.openModal(this.dom.accountModal);
          this.showToast('Masuk dengan Google untuk menyimpan lagu favorit!', 'info');
          return;
        }
        if (res.success) {
          this.updateFavoriteHeartUI();
          this.showToast(
            res.favorited
              ? `"${this.currentSong.title}" ditambahkan ke favorit!`
              : `"${this.currentSong.title}" dihapus dari favorit.`,
            res.favorited ? 'success' : 'info'
          );
        }
      });
    }

    // Modal close buttons & backdrop click
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeAllModals();
      });
    });

    // Results Modal actions
    if (this.dom.resultPlayAgainBtn) {
      this.dom.resultPlayAgainBtn.addEventListener('click', () => {
        this.closeAllModals();
        this.restartSession();
      });
    }
    if (this.dom.resultPickAnotherBtn) {
      this.dom.resultPickAnotherBtn.addEventListener('click', () => {
        this.closeAllModals();
        this.switchPickerTab('video');
        this.openModal(this.dom.videoPickerModal);
      });
    }

    // Sync offset controls
    const updateOffsetDisplay = (val) => {
      if (this.dom.modalOffsetVal) {
        this.dom.modalOffsetVal.textContent = `${val >= 0 ? '+' : ''}${val.toFixed(1)}s`;
      }
    };
    if (this.dom.modalOffsetMinus) {
      this.dom.modalOffsetMinus.addEventListener('click', () => {
        updateOffsetDisplay(this.settings.adjustSyncOffset(-0.5));
      });
    }
    if (this.dom.modalOffsetPlus) {
      this.dom.modalOffsetPlus.addEventListener('click', () => {
        updateOffsetDisplay(this.settings.adjustSyncOffset(0.5));
      });
    }
    if (this.dom.modalOffsetReset) {
      this.dom.modalOffsetReset.addEventListener('click', () => {
        updateOffsetDisplay(this.settings.resetSyncOffset());
      });
    }

    if (this.dom.settingWaitToggle) {
      this.dom.settingWaitToggle.addEventListener('change', (e) => {
        this.waitForTyping = e.target.checked;
        this.syncPreferencesToCloud();
      });
    }

    if (this.dom.settingSfxToggle) {
      this.dom.settingSfxToggle.addEventListener('change', (e) => {
        this.settings.set('soundFx', e.target.checked);
        this.syncPreferencesToCloud();
      });
    }

    if (this.dom.customAutoReplay) {
      this.dom.customAutoReplay.addEventListener('change', () => this.syncPreferencesToCloud());
    }
    if (this.dom.customKeySound) {
      this.dom.customKeySound.addEventListener('change', () => this.syncPreferencesToCloud());
    }
    if (this.dom.customErrorSound) {
      this.dom.customErrorSound.addEventListener('change', () => this.syncPreferencesToCloud());
    }

    // Keyboard Global Shortcuts (Escape to pause/close)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const hasOpenModal = document.querySelector('.modal-overlay.open');
        const hasOpenPopover = document.querySelector('.voca-popover.open');
        if (hasOpenModal || hasOpenPopover) {
          this.closeAllModals();
          this.closeAllPopovers();
        } else {
          // Tip: Esc to pause...
          this.yt.togglePlay();
        }
      }
    });
  }

  openModal(el) {
    if (el) el.classList.add('open');
  }

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  }

  togglePopover(popoverEl, triggerBtn) {
    if (!popoverEl) return;
    const isOpen = popoverEl.classList.contains('open');
    this.closeAllPopovers();

    if (!isOpen) {
      popoverEl.classList.add('open');
      if (triggerBtn) triggerBtn.classList.add('active-popover');
    }
  }

  closeAllPopovers() {
    document.querySelectorAll('.voca-popover').forEach(p => p.classList.remove('open'));
    document.querySelectorAll('.toolbar-pill-btn').forEach(b => b.classList.remove('active-popover'));
  }

  applyTheme(theme) {
    if (theme !== 'dark' && theme !== 'light') theme = 'dark';
    this.settings.set('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);

    if (this.dom.themeIconSun && this.dom.themeIconMoon) {
      if (theme === 'dark') {
        this.dom.themeIconSun.style.display = 'block';
        this.dom.themeIconMoon.style.display = 'none';
        if (this.dom.themeToggleBtn) {
          this.dom.themeToggleBtn.setAttribute('title', 'Ganti ke Cream Soft Matte (Mode Terang)');
        }
      } else {
        this.dom.themeIconSun.style.display = 'none';
        this.dom.themeIconMoon.style.display = 'block';
        if (this.dom.themeToggleBtn) {
          this.dom.themeToggleBtn.setAttribute('title', 'Ganti ke Gray Matte (Mode Gelap)');
        }
      }
    }

    if (this.dom.customThemeMode && this.dom.customThemeMode.value !== theme) {
      this.dom.customThemeMode.value = theme;
    }
    if (this.dom.settingThemeSelect && this.dom.settingThemeSelect.value !== theme) {
      this.dom.settingThemeSelect.value = theme;
    }
    this.syncPreferencesToCloud();
  }

  toggleTheme() {
    const current = this.settings.get('theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
    const themeName = next === 'light' ? 'Cream Soft Matte (Mode Terang)' : 'Gray Matte (Mode Gelap)';
    this.showToast(`Tema diubah ke: ${themeName}`, 'info');
  }

  applyPracticeFont(fontName) {
    if (!fontName) return;
    const cleanName = fontName.trim();

    // Check if Google Font needs dynamic link injection
    const fontId = `gfont-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(cleanName)}:wght@400;500;600;700&display=swap`;
      document.head.appendChild(link);
    }

    if (this.dom.activeLyricDisplay) {
      this.dom.activeLyricDisplay.style.fontFamily = `"${cleanName}", sans-serif`;
    }

    // Update active check in popover
    if (this.dom.fontOptionsList) {
      this.dom.fontOptionsList.querySelectorAll('.popover-option-btn').forEach(btn => {
        const f = btn.getAttribute('data-font');
        const isMatch = f && f.toLowerCase() === cleanName.toLowerCase();
        btn.classList.toggle('selected', isMatch);
        const checkSpan = btn.querySelector('.option-check');
        if (checkSpan) checkSpan.textContent = isMatch ? '✓' : '';
      });
    }

    this.settings.set('fontFamily', cleanName);
    this.syncPreferencesToCloud();
  }

  applyWordsToType(mode) {
    if (!mode) return;

    if (this.dom.wordsToTypeOptions) {
      this.dom.wordsToTypeOptions.querySelectorAll('.popover-option-btn').forEach(btn => {
        const m = btn.getAttribute('data-words-mode');
        const isMatch = m === mode;
        btn.classList.toggle('selected', isMatch);
        const checkSpan = btn.querySelector('.option-check');
        if (checkSpan) checkSpan.textContent = isMatch ? '✓' : '';
      });
    }

    this.typingEngine.setWordsToType(mode);
    this.settings.set('wordsToType', mode);
    this.syncPreferencesToCloud();

    if (!this.isApplyingCloudPrefs) {
      const labels = {
        all: 'All words (100%)',
        moderate: 'Moderate (~55%)',
        light: 'Light (~35%)',
        first_letters: 'First letters only',
      };
      this.showToast(`Words to Type: ${labels[mode] || mode}`, 'info');
    }
  }

  applyTypingMode(mode) {
    if (!mode) return;
    this.currentTypingMode = mode;

    if (this.dom.modeOptionsList) {
      this.dom.modeOptionsList.querySelectorAll('.popover-option-btn').forEach(btn => {
        const m = btn.getAttribute('data-type-mode');
        const isMatch = m === mode;
        btn.classList.toggle('selected', isMatch);
        const checkSpan = btn.querySelector('.option-check');
        if (checkSpan) checkSpan.textContent = isMatch ? '✓' : '';
      });
    }

    if (mode === 'wait') {
      this.waitForTyping = true;
      this.typingEngine.setMode('continuous');
      if (!this.isApplyingCloudPrefs) this.showToast('Mode: Musik menunggu ketikan bait selesai', 'info');
    } else if (mode === 'continuous') {
      this.waitForTyping = false;
      this.typingEngine.setMode('continuous');
      if (!this.isApplyingCloudPrefs) this.showToast('Mode: Musik berjalan bebas mengikuti lagu', 'info');
    } else if (mode === 'line') {
      this.waitForTyping = true;
      this.typingEngine.setMode('line');
      if (!this.isApplyingCloudPrefs) this.showToast('Mode: Latihan satu baris mandiri', 'info');
    }
    this.syncPreferencesToCloud();
  }

  applySubtitleMode(mode) {
    if (!mode) return;

    if (this.dom.subtitleOptionsList) {
      this.dom.subtitleOptionsList.querySelectorAll('.popover-option-btn').forEach(btn => {
        const m = btn.getAttribute('data-sub-mode');
        const isMatch = m === mode;
        btn.classList.toggle('selected', isMatch);
        const checkSpan = btn.querySelector('.option-check');
        if (checkSpan) checkSpan.textContent = isMatch ? '✓' : '';
      });
    }

    this.showTranslations = mode === 'show';
    if (this.dom.lyricTranslationText) {
      this.dom.lyricTranslationText.style.display = this.showTranslations ? 'block' : 'none';
    }
    this.showToast(this.showTranslations ? 'Terjemahan lirik diaktifkan' : 'Terjemahan disembunyikan', 'info');
  }

  clearAutoReplay() {
    if (this.autoReplayInterval) {
      clearInterval(this.autoReplayInterval);
      this.autoReplayInterval = null;
    }
  }

  startAutoReplay(currentLine) {
    this.clearAutoReplay();
    const replaySetting = this.settings.get('autoReplay');
    if (!replaySetting || replaySetting === 'off') return;

    const seconds = parseInt(replaySetting, 10) || 10;
    this.autoReplayInterval = setInterval(() => {
      if (this.isWaitingForUser && currentLine && this.yt) {
        const offset = this.settings.get('syncOffset');
        this.yt.seekTo(Math.max(0, currentLine.time + offset));
        this.yt.play();
      } else {
        this.clearAutoReplay();
      }
    }, seconds * 1000);
  }

  switchPickerTab(tabName) {
    document.querySelectorAll('[data-picker-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-picker-tab') === tabName);
    });
    const videoPanel = document.getElementById('picker-tab-video');
    const lyricsPanel = document.getElementById('picker-tab-lyrics');
    if (videoPanel) videoPanel.classList.toggle('active', tabName === 'video');
    if (lyricsPanel) lyricsPanel.classList.toggle('active', tabName === 'lyrics');
  }

  renderLyricsCandidates() {
    if (!this.dom.lyricsCandidatesList) return;
    const candidates = this.lyricsManager.candidateLyrics || [];

    if (candidates.length === 0) {
      this.dom.lyricsCandidatesList.innerHTML = `
        <div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 0.82rem;">
          Belum ada versi lirik otomatis ditemukan. Coba cari manual di atas atau tempel transkrip YouTube di bawah.
        </div>
      `;
      return;
    }

    this.dom.lyricsCandidatesList.innerHTML = '';
    candidates.slice(0, 12).forEach(cand => {
      const isSelected = String(cand.id) === String(this.lyricsManager.activeCandidateId);
      const item = document.createElement('div');
      item.className = `song-picker-item ${isSelected ? 'active-match' : ''}`;
      const durText = cand.duration ? this.formatTime(cand.duration) : '--:--';
      const syncTag = cand.syncedLyrics ? 'Synced' : 'Plain';

      item.innerHTML = `
        <div class="song-picker-item-info">
          <span class="song-picker-item-title">${this.escapeHtml(cand.trackName || cand.name || 'Lagu')}</span>
          <span class="song-picker-item-artist">${this.escapeHtml(cand.artistName || '')} · ${durText}</span>
        </div>
        <span class="lyric-badge-tag">${isSelected ? '✓ ' : ''}${syncTag}</span>
      `;

      item.addEventListener('click', () => {
        const res = this.lyricsManager.applyCandidateById(cand.id);
        if (res && res.success) {
          this.applyLoadedLyricsResult(res);
          this.renderLyricsCandidates();
          this.showToast(`Lirik diganti ke: ${cand.trackName} (${durText})`, 'success');
        }
      });
      this.dom.lyricsCandidatesList.appendChild(item);
    });
  }

  handleDurationReady(duration, videoId) {
    if (!this.currentSong || this.currentSong.videoId !== videoId) return;
    this.currentSong.duration = duration;
    this.updateTimeDisplay(this.yt ? this.yt.getCurrentTime() : 0, duration);

    // If user hasn't typed yet and LRCLIB is active, re-verify best duration match!
    if (this.stats.totalChars === 0 && this.lyricsManager.sourceType === 'lrclib') {
      const updated = this.lyricsManager.reselectByDuration(
        duration,
        this.currentSong.title,
        this.currentSong.artist,
        this.currentSong.versionTags || []
      );
      if (updated && updated.success) {
        this.applyLoadedLyricsResult(updated);
        this.renderLyricsCandidates();
      }
    }
  }

  applyLoadedLyricsResult(res) {
    if (!res || !res.lyrics || res.lyrics.length === 0) return;

    this.clearAutoReplay();
    this.isWaitingForUser = false;
    if (this.dom.waitingBadge) this.dom.waitingBadge.classList.remove('active');

    this.typingEngine.setLyrics(res.lyrics);
    this.stats.reset();
    this.stats.setTotalLines(res.lyrics.length);
    this.updateHUDStats();
    this.updateBarisCount(1, res.lyrics.length);

    const ytDur = this.yt ? this.yt.getDuration() : 0;
    const trackDuration = ytDur || res.duration || this.currentSong?.duration || 0;
    this.updateTimeDisplay(0, trackDuration);

    // Re-sync immediately if video is already playing partway through
    if (this.yt && this.yt.getCurrentTime() > 0.5) {
      const offset = this.settings.get('syncOffset');
      const idx = this.lyricsManager.getActiveLineIndex(this.yt.getCurrentTime(), offset);
      this.typingEngine.syncToLine(idx);
      this.updateBarisCount(idx + 1, res.lyrics.length);
    }
  }

  /**
   * Loads a song, cues YouTube, queries LRCLIB for synced lyrics, and sets up typing
   */
  async loadSongById(videoId, presetTitle = '', presetArtist = '', presetTranslation = '', presetDuration = 0) {
    if (this.dom.videoLoading) this.dom.videoLoading.classList.remove('hidden');

    // Immediately clear old song's lyrics & state so mismatched text NEVER lingers!
    this.clearAutoReplay();
    this.isWaitingForUser = false;
    this.sessionSavedForCurrentRun = false;
    this.lastPlayerTime = 0;
    if (this.dom.waitingBadge) this.dom.waitingBadge.classList.remove('active');
    this.typingEngine.setLyrics([], 'Memuat teks & mencocokkan dengan video YouTube...');
    this.stats.reset();
    this.updateHUDStats();
    this.updateBarisCount(0, 0);

    try {
      this.yt.loadVideo(videoId);

      let title = presetTitle;
      let artist = presetArtist;
      let rawTitle = '';
      let versionTags = [];
      let duration = presetDuration || 0;

      if (!title || !artist) {
        const meta = await this.yt.fetchVideoMetadata(videoId);
        rawTitle = meta.title || '';
        const cleaned = this.lyricsManager.cleanYouTubeTitle(meta.title, meta.author);
        title = cleaned.track || meta.title;
        artist = cleaned.artist || meta.author;
        versionTags = cleaned.versionTags || [];
        duration = meta.duration || duration || (this.yt ? this.yt.getDuration() : 0);
      }

      this.currentSong = { videoId, title, artist, duration, rawTitle, versionTags };
      this.updateFavoriteHeartUI();

      if (this.dom.lyricsManualSearchInput) {
        this.dom.lyricsManualSearchInput.value = `${artist} ${title}`.trim();
      }

      // Update subtitle/translation
      if (this.dom.lyricTranslationText) {
        this.dom.lyricTranslationText.textContent = presetTranslation || `${title} — ${artist}`;
      }

      // Fetch lyrics matching videoId + duration + title/artist
      const res = await this.lyricsManager.fetchLyrics(artist, title, duration, {
        videoId,
        rawTitle,
        versionTags,
      });

      if (res.success && res.lyrics.length > 0) {
        this.applyLoadedLyricsResult(res);
        this.renderLyricsCandidates();
        const modeLabel = res.isSynced ? 'tersinkronisasi' : 'teks (belum bertimestamp)';
        this.showToast(`Teks ${modeLabel} dimuat untuk "${title}"!`, 'success');
      } else {
        this.typingEngine.setLyrics([], 'Teks/lirik otomatis tidak ditemukan. Klik "Video ▾ → Sesuaikan Teks / Lirik" untuk mencari atau menempel Transkrip YouTube.');
        this.renderLyricsCandidates();
        this.updateTimeDisplay(0, duration || (this.yt ? this.yt.getDuration() : 0));
        this.showToast(`Lirik tidak ditemukan otomatis untuk "${title}". Anda bisa menempel transkrip YouTube.`, 'info');
      }

      // Focus input
      if (this.dom.typingInputBar) {
        this.dom.typingInputBar.focus();
      }

    } catch (err) {
      console.error('Error loading song:', err);
      this.typingEngine.setLyrics([], 'Gagal memuat video atau teks.');
      this.showToast('Gagal memuat video atau lirik.', 'error');
    } finally {
      if (this.dom.videoLoading) this.dom.videoLoading.classList.add('hidden');
    }
  }

  /**
   * CORE LOGIC REQUESTED BY USER:
   * "dan lagu nya ga akan lanjut kalo paraglaf / beast lagu belum beres, jadi ga langsung semua"
   * The music pauses at the end of the current lyric beat if user hasn't finished typing!
   */
  handleGameplayTimeSync(currentTime) {
    if (!this.lyricsManager.lyricsData.length) return;

    const offset = this.settings.get('syncOffset');
    const effectiveTime = currentTime - offset;
    const currentIdx = this.typingEngine.currentLineIndex;
    const currentLine = this.lyricsManager.lyricsData[currentIdx];

    if (!currentLine) return;

    // Detect manual seek directly inside YouTube player iframe (jump > 1.8s)
    const timeDelta = Math.abs(currentTime - this.lastPlayerTime);
    this.lastPlayerTime = currentTime;

    if (timeDelta > 1.8) {
      const seekedIdx = this.lyricsManager.getActiveLineIndex(currentTime, offset);
      if (seekedIdx !== currentIdx) {
        this.clearAutoReplay();
        this.isWaitingForUser = false;
        if (this.dom.waitingBadge) this.dom.waitingBadge.classList.remove('active');
        this.typingEngine.syncToLine(seekedIdx);
        this.updateBarisCount(seekedIdx + 1, this.lyricsManager.lyricsData.length);
        return;
      }
    }

    // If wait-for-typing mode is active:
    // Check if song has reached the end of this lyric line
    if (this.waitForTyping) {
      const lineEndTime = currentLine.endTime;

      if (effectiveTime >= lineEndTime - 0.25) {
        // If user has NOT completed typing this line:
        if (!this.typingEngine.isLineCompleted) {
          if (!this.isWaitingForUser) {
            this.isWaitingForUser = true;
            this.yt.pause(); // PAUSE MUSIC AND WAIT FOR TYPING!
            if (this.dom.waitingBadge) {
              this.dom.waitingBadge.classList.add('active');
            }
            this.startAutoReplay(currentLine);
          }
          return;
        } else {
          this.clearAutoReplay();
          // User ALREADY finished typing this line!
          // Smoothly advance to the next line as the audio reaches the end of the beat
          const nextIdx = this.typingEngine.goToNextLine();
          if (nextIdx === -1 || nextIdx >= this.lyricsManager.lyricsData.length) {
            this.showResultsModal();
          } else {
            this.updateBarisCount(nextIdx + 1, this.lyricsManager.lyricsData.length);
          }
        }
      }
    } else {
      // In continuous loose mode: advance when song reaches next line
      const activeIdx = this.lyricsManager.getActiveLineIndex(currentTime, offset);
      if (activeIdx !== currentIdx) {
        this.typingEngine.syncToLine(activeIdx);
      }
    }
  }

  handlePlayerState(state) {
    // 1: PLAYING, 2: PAUSED, 0: ENDED
    const isPlaying = state === 1;

    // Update Play Icon in HUD
    if (this.dom.hudPlayIcon) {
      this.dom.hudPlayIcon.innerHTML = isPlaying
        ? `<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>`
        : `<polygon points="5 3 19 12 5 21 5 3"/>`;
    }

    // Update Arena Play Icon
    if (this.dom.arenaPlayIcon) {
      this.dom.arenaPlayIcon.innerHTML = isPlaying
        ? `<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>`
        : `<polygon points="5 3 19 12 5 21 5 3"/>`;
    }

    if (isPlaying) {
      this.stats.resume();
      if (this.dom.typingInputBar) {
        this.dom.typingInputBar.focus();
      }
    } else {
      this.stats.pause();
    }

    // When video ends, show results!
    if (state === 0) {
      this.showResultsModal();
    }
  }

  showResultsModal() {
    const s = this.stats.getStats();

    if (this.dom.resultSongTitle) {
      this.dom.resultSongTitle.textContent = this.currentSong?.title || 'Lagu';
    }
    if (this.dom.resultSongArtist) {
      this.dom.resultSongArtist.textContent = this.currentSong?.artist || '';
    }
    if (this.dom.resultFinalWpm) this.dom.resultFinalWpm.textContent = s.netWPM;
    if (this.dom.resultFinalAcc) this.dom.resultFinalAcc.textContent = `${s.accuracy}%`;
    if (this.dom.resultFinalCorrect) this.dom.resultFinalCorrect.textContent = `${s.correctChars} / ${s.totalChars}`;
    if (this.dom.resultFinalStreak) this.dom.resultFinalStreak.textContent = s.highestStreak;

    this.openModal(this.dom.resultsModal);

    // Save completed session to Firestore if signed in
    if (!this.sessionSavedForCurrentRun && s.totalChars > 0 && this.authManager?.user && this.currentSong?.videoId) {
      this.sessionSavedForCurrentRun = true;
      this.authManager
        .savePracticeSession({
          videoId: this.currentSong.videoId,
          songTitle: this.currentSong.title,
          songArtist: this.currentSong.artist,
          wpm: s.netWPM,
          accuracy: s.accuracy,
          correctChars: s.correctChars,
          totalChars: s.totalChars,
          highestStreak: s.highestStreak,
          completedLines: this.typingEngine.currentLineIndex + 1,
          totalLines: this.lyricsManager.lyricsData.length || 1,
        })
        .catch((err) => console.error('Failed to save session:', err));
    }
  }

  restartSession() {
    this.clearAutoReplay();
    this.stats.reset();
    this.isWaitingForUser = false;
    this.sessionSavedForCurrentRun = false;
    if (this.dom.waitingBadge) {
      this.dom.waitingBadge.classList.remove('active');
    }
    this.typingEngine.restart();
    if (this.yt) {
      this.yt.seekTo(0);
      this.yt.play();
    }
    this.updateHUDStats();
    this.showToast('Latihan diulang dari awal!', 'info');
  }

  // =========================================================================
  // Auth, Profile, Cloud Sync, History & Favorites UI Methods
  // =========================================================================
  syncPreferencesToCloud() {
    if (this.isApplyingCloudPrefs || !this.authManager?.user) return;
    this.authManager
      .savePreferences({
        theme: this.settings.get('theme') || 'dark',
        fontFamily: this.settings.get('fontFamily') || 'Be Vietnam Pro',
        wordsToType: this.settings.get('wordsToType') || 'all',
        typingMode: this.currentTypingMode || 'wait',
        autoReplay: this.settings.get('autoReplay') || '10',
        keySound: this.settings.get('keySound') || 'medium',
        errorSound: this.settings.get('errorSound') || 'error',
        waitForTyping: this.waitForTyping,
        soundFx: Boolean(this.settings.get('soundFx')),
      })
      .catch((err) => console.warn('Cloud preferences sync skipped:', err));
  }

  applyCloudPreferences(profile) {
    if (!profile) return;
    this.isApplyingCloudPrefs = true;
    try {
      if (profile.theme) this.applyTheme(profile.theme);
      if (profile.fontFamily) this.applyPracticeFont(profile.fontFamily);
      if (profile.wordsToType) this.applyWordsToType(profile.wordsToType);
      if (profile.typingMode) this.applyTypingMode(profile.typingMode);
      if (profile.autoReplay) {
        this.settings.set('autoReplay', profile.autoReplay);
        if (this.dom.customAutoReplay) this.dom.customAutoReplay.value = profile.autoReplay;
      }
      if (profile.keySound) {
        this.settings.set('keySound', profile.keySound);
        if (this.dom.customKeySound) this.dom.customKeySound.value = profile.keySound;
      }
      if (profile.errorSound) {
        this.settings.set('errorSound', profile.errorSound);
        if (this.dom.customErrorSound) this.dom.customErrorSound.value = profile.errorSound;
      }
      if (typeof profile.waitForTyping === 'boolean') {
        this.waitForTyping = profile.waitForTyping;
        if (this.dom.settingWaitToggle) this.dom.settingWaitToggle.checked = profile.waitForTyping;
      }
      if (typeof profile.soundFx === 'boolean') {
        this.settings.set('soundFx', profile.soundFx);
        if (this.dom.settingSfxToggle) this.dom.settingSfxToggle.checked = profile.soundFx;
      }
    } finally {
      this.isApplyingCloudPrefs = false;
    }
  }

  updateAuthUI(user) {
    const renderAvatar = (container, displayName, photoURL) => {
      if (!container) return;
      if (photoURL) {
        container.innerHTML = `<img src="${this.escapeHtml(photoURL)}" alt="${this.escapeHtml(displayName)}" referrerpolicy="no-referrer" />`;
      } else {
        const initials = (displayName || 'M').trim().charAt(0).toUpperCase();
        container.textContent = initials;
      }
    };

    if (user) {
      const displayName = user.displayName || user.email?.split('@')[0] || 'Pengguna';
      const firstName = displayName.split(' ')[0];

      if (this.dom.headerAuthBtn) {
        this.dom.headerAuthBtn.classList.add('signed-in');
        this.dom.headerAuthBtn.title = `Akun Google: ${displayName}`;
      }
      if (this.dom.headerAuthGoogleIcon) this.dom.headerAuthGoogleIcon.style.display = 'none';
      if (this.dom.headerAuthAvatar) {
        this.dom.headerAuthAvatar.style.display = 'inline-flex';
        renderAvatar(this.dom.headerAuthAvatar, displayName, user.photoURL);
      }
      if (this.dom.headerAuthLabel) this.dom.headerAuthLabel.textContent = firstName;

      if (this.dom.accountSignedOutView) this.dom.accountSignedOutView.style.display = 'none';
      if (this.dom.accountSignedInView) this.dom.accountSignedInView.style.display = 'flex';
      if (this.dom.accountProfileName) this.dom.accountProfileName.textContent = displayName;
      if (this.dom.accountProfileEmail) this.dom.accountProfileEmail.textContent = user.email || '';
      renderAvatar(this.dom.accountProfileAvatar, displayName, user.photoURL);
    } else {
      if (this.dom.headerAuthBtn) {
        this.dom.headerAuthBtn.classList.remove('signed-in');
        this.dom.headerAuthBtn.title = 'Masuk dengan Google';
      }
      if (this.dom.headerAuthGoogleIcon) this.dom.headerAuthGoogleIcon.style.display = 'block';
      if (this.dom.headerAuthAvatar) {
        this.dom.headerAuthAvatar.style.display = 'none';
        this.dom.headerAuthAvatar.innerHTML = '';
      }
      if (this.dom.headerAuthLabel) this.dom.headerAuthLabel.textContent = 'Masuk';

      if (this.dom.accountSignedOutView) this.dom.accountSignedOutView.style.display = 'flex';
      if (this.dom.accountSignedInView) this.dom.accountSignedInView.style.display = 'none';
      this.updateAccountSummary([], []);
    }
  }

  updateAccountSummary(sessions = [], favorites = []) {
    if (this.dom.accountTotalSessions) this.dom.accountTotalSessions.textContent = sessions.length;
    if (this.dom.accountTotalFavs) this.dom.accountTotalFavs.textContent = favorites.length;

    const bestWpm = sessions.reduce((max, s) => Math.max(max, Number(s.wpm) || 0), 0);
    const avgAcc =
      sessions.length > 0
        ? Math.round(sessions.reduce((sum, s) => sum + (Number(s.accuracy) || 0), 0) / sessions.length)
        : 0;

    if (this.dom.accountBestWpm) this.dom.accountBestWpm.textContent = bestWpm;
    if (this.dom.accountAvgAcc) this.dom.accountAvgAcc.textContent = `${avgAcc}%`;
  }

  updateFavoriteHeartUI() {
    const isFav = Boolean(this.currentSong?.videoId && this.authManager?.isFavorite(this.currentSong.videoId));
    if (this.dom.headerFavBtn) {
      this.dom.headerFavBtn.classList.toggle('favorited', isFav);
    }
    if (this.dom.favCurrentTitle) {
      this.dom.favCurrentTitle.textContent = this.currentSong?.title || 'Belum ada lagu';
    }
    if (this.dom.favCurrentArtist) {
      this.dom.favCurrentArtist.textContent = this.currentSong?.artist || '-';
    }
    if (this.dom.toggleCurrentFavBtn) {
      this.dom.toggleCurrentFavBtn.textContent = isFav ? '♥ Tersimpan (Hapus)' : '♡ Simpan Favorit';
    }
  }

  renderHistoryList() {
    if (!this.dom.historySessionsList) return;

    if (!this.authManager?.user) {
      this.dom.historySessionsList.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.84rem; display: flex; flex-direction: column; gap: 10px; align-items: center;">
          <span>Masuk dengan Google untuk melihat riwayat latihan Anda yang tersimpan di cloud.</span>
          <button type="button" id="history-prompt-login-btn" class="btn-cyan" style="height: 36px; font-size: 0.82rem;">Masuk dengan Google</button>
        </div>
      `;
      document.getElementById('history-prompt-login-btn')?.addEventListener('click', () => {
        this.closeAllModals();
        this.openModal(this.dom.accountModal);
      });
      return;
    }

    const sessions = this.authManager.sessions || [];
    if (sessions.length === 0) {
      this.dom.historySessionsList.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.84rem;">
          Belum ada sesi selesai. Selesaikan satu lagu untuk mencatat rekor Anda!
        </div>
      `;
      return;
    }

    this.dom.historySessionsList.innerHTML = '';
    sessions.forEach((sess) => {
      const item = document.createElement('div');
      item.className = 'song-picker-item';
      item.innerHTML = `
        <div class="song-picker-item-info">
          <span class="song-picker-item-title">${this.escapeHtml(sess.songTitle)}</span>
          <span class="song-picker-item-artist">${this.escapeHtml(sess.songArtist || 'YouTube')} · ${sess.completedLines}/${sess.totalLines} baris</span>
        </div>
        <span class="lyric-badge-tag">${sess.wpm} WPM · ${sess.accuracy}%</span>
      `;
      item.addEventListener('click', () => {
        if (sess.videoId) {
          this.closeAllModals();
          this.loadSongById(sess.videoId, sess.songTitle, sess.songArtist);
        }
      });
      this.dom.historySessionsList.appendChild(item);
    });
  }

  renderFavoritesList() {
    if (!this.dom.favoritesSongsList) return;

    if (!this.authManager?.user) {
      this.dom.favoritesSongsList.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.84rem; display: flex; flex-direction: column; gap: 10px; align-items: center;">
          <span>Masuk dengan Google untuk menyimpan dan mengakses lagu YouTube favorit Anda.</span>
          <button type="button" id="fav-prompt-login-btn" class="btn-cyan" style="height: 36px; font-size: 0.82rem;">Masuk dengan Google</button>
        </div>
      `;
      document.getElementById('fav-prompt-login-btn')?.addEventListener('click', () => {
        this.closeAllModals();
        this.openModal(this.dom.accountModal);
      });
      return;
    }

    const favorites = this.authManager.favorites || [];
    if (favorites.length === 0) {
      this.dom.favoritesSongsList.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.84rem;">
          Belum ada lagu favorit. Klik "Simpan Favorit" di atas untuk menandai lagu yang sedang diputar.
        </div>
      `;
      return;
    }

    this.dom.favoritesSongsList.innerHTML = '';
    favorites.forEach((fav) => {
      const item = document.createElement('div');
      item.className = 'song-picker-item';
      const durText = fav.duration ? ` · ${this.formatTime(fav.duration)}` : '';
      item.innerHTML = `
        <div class="song-picker-item-info">
          <span class="song-picker-item-title">${this.escapeHtml(fav.title)}</span>
          <span class="song-picker-item-artist">${this.escapeHtml(fav.artist || 'YouTube')}${durText}</span>
        </div>
        <span class="lyric-badge-tag">Putar ▷</span>
      `;
      item.addEventListener('click', () => {
        this.closeAllModals();
        this.loadSongById(fav.videoId, fav.title, fav.artist, '', fav.duration || 0);
      });
      this.dom.favoritesSongsList.appendChild(item);
    });
  }

  updateBarisCount(current, total) {
    if (this.dom.hudBarisVal) {
      this.dom.hudBarisVal.textContent = `${current}/${total || 1}`;
    }
  }

  updateHUDStats() {
    const s = this.stats.getStats();
    if (this.dom.hudWpmVal) this.dom.hudWpmVal.textContent = s.netWPM;
    if (this.dom.hudAccVal) this.dom.hudAccVal.textContent = `${s.accuracy}%`;
  }

  updateTimeDisplay(current, duration) {
    let validDuration = duration;
    if (!validDuration || validDuration <= 0) {
      if (this.lyricsManager.lyricsData && this.lyricsManager.lyricsData.length > 0) {
        validDuration = this.lyricsManager.lyricsData[this.lyricsManager.lyricsData.length - 1].endTime;
      } else {
        validDuration = 176;
      }
    }

    const curStr = this.formatTime(current);
    const durStr = this.formatTime(validDuration);

    if (this.dom.hudTimeDisplay) {
      this.dom.hudTimeDisplay.textContent = `${curStr} / ${durStr}`;
    }

    if (this.dom.timelineSlider && validDuration > 0) {
      this.dom.timelineSlider.max = validDuration;
      this.dom.timelineSlider.value = current;
    }
  }

  showToast(message, type = 'info') {
    if (!this.dom.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    this.dom.toastContainer.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 3200);
  }

  formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Start application
document.addEventListener('DOMContentLoaded', () => {
  window.madtypeApp = window.vocatypeApp = new MadtypeApp();
});
