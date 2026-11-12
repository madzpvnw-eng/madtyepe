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

// Popular curated demo tracks inspired by video.vocatype.app/id/
const DEMO_SONGS = [
  {
    title: 'Ang Boyfriend Kong Baduy',
    artist: 'Cinderella',
    videoId: '141HauTGBpQ',
    duration: 176,
    tag: 'Cinderella · Ang Boyfriend Kong Baduy',
    translation: 'Pacar saya sangat suka pergi ke disko.',
  },
  {
    title: 'Yellow',
    artist: 'Coldplay',
    videoId: 'yKNxeF4KMsY',
    duration: 269,
    tag: 'Coldplay · Yellow',
    translation: 'Lihatlah bintang-bintang, lihat bagaimana mereka bersinar untukmu',
  },
  {
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    videoId: 'fJ9rUzIMcZQ',
    duration: 359,
    tag: 'Queen · Bohemian Rhapsody',
    translation: 'Apakah ini kehidupan nyata? Atau hanya sekadar fantasi?',
  },
  {
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    videoId: 'JGwWNGJdvx8',
    duration: 233,
    tag: 'Ed Sheeran · Shape of You',
    translation: 'Klub bukanlah tempat terbaik mencari kekasih, jadi aku pergi ke bar',
  },
  {
    title: 'Never Gonna Give You Up',
    artist: 'Rick Astley',
    videoId: 'dQw4w9WgXcQ',
    duration: 213,
    tag: 'Rick Astley · Never Gonna Give You Up',
    translation: 'Kita bukan orang asing dalam cinta, kau tahu aturannya dan aku pun begitu',
  },
  {
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    videoId: '4NRXx6U8ABQ',
    duration: 200,
    tag: 'The Weeknd · Blinding Lights',
    translation: 'Kota ini dingin dan kosong, tak ada seorang pun di sekitarku',
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
    
    // Core game rule: song will pause and wait if current line hasn't been typed!
    this.waitForTyping = true;
    this.isWaitingForUser = false;
    this.showTranslations = true;
    this.autoReplayInterval = null;

    this.initDOM();
    this.initTypingEngine();
    this.initYouTubePlayer();
    this.bindUIEvents();
    this.renderPopularSongPicker();

    // Apply saved theme, practice font, and words-to-type settings
    this.applyTheme(this.settings.get('theme') || 'dark');
    this.applyPracticeFont(this.settings.get('fontFamily') || 'Be Vietnam Pro');
    this.applyWordsToType(this.settings.get('wordsToType') || 'all');

    // Load default song
    this.loadSongById(DEMO_SONGS[0].videoId, DEMO_SONGS[0].title, DEMO_SONGS[0].artist);
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

      // Video Picker Inputs
      customUrlInput: document.getElementById('custom-youtube-url-input'),
      loadCustomUrlBtn: document.getElementById('load-custom-url-btn'),
      popularSongsList: document.getElementById('popular-songs-list'),

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
    };
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
        if (curLine && this.dom.lyricTranslationText && this.showTranslations) {
          if (curLine.translation) {
            this.dom.lyricTranslationText.textContent = curLine.translation;
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
        <span style="font-size: 0.76rem; color: var(--accent-cyan); font-weight: 600;">Pilih ▷</span>
      `;
      item.addEventListener('click', () => {
        this.closeAllModals();
        this.loadSongById(song.videoId, song.title, song.artist, song.translation);
      });
      this.dom.popularSongsList.appendChild(item);
    });
  }

  bindUIEvents() {
    // 1. Typing Input Bar events
    if (this.dom.typingInputBar) {
      this.dom.typingInputBar.addEventListener('input', () => {
        this.dom.typingInputBar.value = '';
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
        this.openModal(this.dom.videoPickerModal);
      });
    }

    const openPickerIcon = document.getElementById('open-video-picker-icon-btn');
    if (openPickerIcon) {
      openPickerIcon.addEventListener('click', () => {
        this.openModal(this.dom.videoPickerModal);
      });
    }

    // Load custom URL
    if (this.dom.loadCustomUrlBtn && this.dom.customUrlInput) {
      this.dom.loadCustomUrlBtn.addEventListener('click', () => {
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

    // Settings inside modal
    if (this.dom.settingWaitToggle) {
      this.dom.settingWaitToggle.addEventListener('change', (e) => {
        this.waitForTyping = e.target.checked;
      });
    }

    if (this.dom.settingSfxToggle) {
      this.dom.settingSfxToggle.addEventListener('change', (e) => {
        this.settings.set('soundFx', e.target.checked);
      });
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

    const labels = {
      all: 'All words (100%)',
      moderate: 'Moderate (~55%)',
      light: 'Light (~35%)',
      first_letters: 'First letters only',
    };
    this.showToast(`Words to Type: ${labels[mode] || mode}`, 'info');
  }

  applyTypingMode(mode) {
    if (!mode) return;

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
      this.showToast('Mode: Musik menunggu ketikan bait selesai', 'info');
    } else if (mode === 'continuous') {
      this.waitForTyping = false;
      this.typingEngine.setMode('continuous');
      this.showToast('Mode: Musik berjalan bebas mengikuti lagu', 'info');
    } else if (mode === 'line') {
      this.waitForTyping = true;
      this.typingEngine.setMode('line');
      this.showToast('Mode: Latihan satu baris mandiri', 'info');
    }
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

  /**
   * Loads a song, cues YouTube, queries LRCLIB for synced lyrics, and sets up typing
   */
  async loadSongById(videoId, presetTitle = '', presetArtist = '', presetTranslation = '') {
    if (this.dom.videoLoading) this.dom.videoLoading.classList.remove('hidden');

    try {
      this.yt.loadVideo(videoId);

      let title = presetTitle;
      let artist = presetArtist;

      if (!title || !artist) {
        const meta = await this.yt.fetchVideoMetadata(videoId);
        const cleaned = this.lyricsManager.cleanYouTubeTitle(meta.title, meta.author);
        title = cleaned.track || meta.title;
        artist = cleaned.artist || meta.author;
      }

      this.currentSong = { videoId, title, artist };

      // Update subtitle/translation
      if (this.dom.lyricTranslationText) {
        this.dom.lyricTranslationText.textContent = presetTranslation || `${title} - ${artist}`;
      }

      // Fetch LRCLIB lyrics
      const res = await this.lyricsManager.fetchLyrics(artist, title);

      if (res.success && res.lyrics.length > 0) {
        this.typingEngine.setLyrics(res.lyrics);
        this.stats.reset();
        this.stats.setTotalLines(res.lyrics.length);
        this.updateBarisCount(1, res.lyrics.length);
        
        // Immediately initialize duration so timeline never shows 00:00 / 00:00
        const trackDuration = res.duration || (this.yt ? this.yt.getDuration() : 0);
        this.updateTimeDisplay(0, trackDuration);

        this.showToast(`Lirik tersinkronisasi untuk "${title}"!`, 'success');
      } else {
        this.showToast(`Lirik tidak ditemukan di LRCLIB untuk "${title}".`, 'info');
      }

      // Focus input
      if (this.dom.typingInputBar) {
        this.dom.typingInputBar.focus();
      }

    } catch (err) {
      console.error('Error loading song:', err);
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
    if (!this.lyricsManager.isSynced || !this.lyricsManager.lyricsData.length) return;

    const offset = this.settings.get('syncOffset');
    const effectiveTime = currentTime - offset;
    const currentIdx = this.typingEngine.currentLineIndex;
    const currentLine = this.lyricsManager.lyricsData[currentIdx];

    if (!currentLine) return;

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
  }

  restartSession() {
    this.clearAutoReplay();
    this.stats.reset();
    this.isWaitingForUser = false;
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
