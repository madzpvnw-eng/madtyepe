/**
 * @license
 * VOCATYPE - YouTube Player Controller
 * Official integration with YouTube IFrame Player API.
 */

export class YouTubeController {
  constructor(options = {}) {
    this.containerId = options.containerId || 'youtube-player';
    this.onStateChange = options.onStateChange || (() => {});
    this.onTimeUpdate = options.onTimeUpdate || (() => {});
    this.onError = options.onError || (() => {});
    this.onReady = options.onReady || (() => {});
    this.onDurationReady = options.onDurationReady || (() => {});

    this.player = null;
    this.isApiReady = false;
    this.currentVideoId = null;
    this.timeUpdateTimer = null;
    this.duration = 0;
    this.isReady = false;
    this._notifiedDurationForVideo = null;

    this.loadIFrameApi();
  }

  /**
   * Load the YouTube IFrame API script tag safely
   */
  loadIFrameApi() {
    if (window.YT && window.YT.Player) {
      this.isApiReady = true;
      return;
    }

    // Set callback if not yet registered
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      this.isApiReady = true;
      if (typeof prevReady === 'function') prevReady();
      if (this.pendingVideoId) {
        this.loadVideo(this.pendingVideoId);
        this.pendingVideoId = null;
      }
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }

  /**
   * Extract Video ID from varied YouTube URL formats
   */
  extractVideoId(input) {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();

    // Direct 11-char video ID (e.g., dQw4w9WgXcQ)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    // Standard YouTube URL patterns:
    // - youtube.com/watch?v=ID
    // - youtu.be/ID
    // - youtube.com/embed/ID
    // - youtube.com/shorts/ID
    // - music.youtube.com/watch?v=ID
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i,
      /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match && match[1] && match[1].length === 11) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Load and initialize a YouTube video by ID
   */
  loadVideo(videoId) {
    if (!this.isApiReady) {
      this.pendingVideoId = videoId;
      return;
    }

    this.currentVideoId = videoId;
    this.duration = 0;
    this._notifiedDurationForVideo = null;
    this.stopTimeTicker();

    if (this.player && typeof this.player.loadVideoById === 'function') {
      try {
        this.player.loadVideoById({ videoId });
      } catch (err) {
        console.warn('Re-initializing player instance:', err);
        this.createPlayer(videoId);
      }
    } else {
      this.createPlayer(videoId);
    }
  }

  createPlayer(videoId) {
    // Clear existing container node safely
    const container = document.getElementById(this.containerId);
    if (!container) return;

    this.player = new window.YT.Player(this.containerId, {
      videoId: videoId,
      playerVars: {
        enablejsapi: 1,
        autoplay: 0,
        controls: 1,
        rel: 0,
        fs: 1,
        modestbranding: 1,
        playsinline: 1,
      },
      events: {
        onReady: (event) => {
          this.isReady = true;
          this.checkAndNotifyDuration();
          this.onReady(event);
        },
        onStateChange: (event) => {
          this.checkAndNotifyDuration();
          this.handleStateChange(event.data);
        },
        onError: (event) => {
          this.handleError(event.data);
        },
      },
    });
  }

  checkAndNotifyDuration() {
    if (!this.player || typeof this.player.getDuration !== 'function') return;
    const dur = this.player.getDuration() || 0;
    if (dur > 0) {
      this.duration = dur;
      if (this._notifiedDurationForVideo !== this.currentVideoId) {
        this._notifiedDurationForVideo = this.currentVideoId;
        this.onDurationReady(dur, this.currentVideoId);
      }
    }
  }

  handleStateChange(state) {
    // YT.PlayerState: -1 (UNSTARTED), 0 (ENDED), 1 (PLAYING), 2 (PAUSED), 3 (BUFFERING), 5 (CUED)
    if (state === window.YT.PlayerState.PLAYING) {
      this.startTimeTicker();
    } else {
      this.stopTimeTicker();
    }
    this.onStateChange(state);
  }

  handleError(errorCode) {
    let message = 'An error occurred while loading the YouTube video.';
    switch (errorCode) {
      case 2:
        message = 'Invalid YouTube video ID or parameter.';
        break;
      case 5:
        message = 'HTML5 player error. The video could not be played.';
        break;
      case 100:
        message = 'The YouTube video was not found, is private, or has been removed.';
        break;
      case 101:
      case 150:
        message = 'Embedding is disabled by the video owner on YouTube. Please try another video or official audio version.';
        break;
      default:
        message = `YouTube Player error code (${errorCode}).`;
    }
    this.onError({ code: errorCode, message });
  }

  startTimeTicker() {
    this.stopTimeTicker();
    this.timeUpdateTimer = setInterval(() => {
      if (this.player && typeof this.player.getCurrentTime === 'function') {
        const currentTime = this.player.getCurrentTime() || 0;
        const duration = this.player.getDuration() || this.duration;
        this.onTimeUpdate(currentTime, duration);
      }
    }, 100);
  }

  stopTimeTicker() {
    if (this.timeUpdateTimer) {
      clearInterval(this.timeUpdateTimer);
      this.timeUpdateTimer = null;
    }
  }

  play() {
    if (this.player && typeof this.player.playVideo === 'function') {
      this.player.playVideo();
    }
  }

  pause() {
    if (this.player && typeof this.player.pauseVideo === 'function') {
      this.player.pauseVideo();
    }
  }

  togglePlay() {
    if (!this.player || typeof this.player.getPlayerState !== 'function') return;
    const state = this.player.getPlayerState();
    if (state === window.YT.PlayerState.PLAYING) {
      this.pause();
    } else {
      this.play();
    }
  }

  seekTo(seconds) {
    if (this.player && typeof this.player.seekTo === 'function') {
      this.player.seekTo(Math.max(0, seconds), true);
      const duration = this.player.getDuration() || this.duration;
      this.onTimeUpdate(seconds, duration);
    }
  }

  setVolume(volume) {
    if (this.player && typeof this.player.setVolume === 'function') {
      this.player.setVolume(Math.max(0, Math.min(100, volume)));
    }
  }

  getCurrentTime() {
    if (this.player && typeof this.player.getCurrentTime === 'function') {
      return this.player.getCurrentTime() || 0;
    }
    return 0;
  }

  getDuration() {
    if (this.player && typeof this.player.getDuration === 'function') {
      return this.player.getDuration() || this.duration;
    }
    return this.duration;
  }

  /**
   * Retrieves video title & author using player's video data or oEmbed
   */
  async fetchVideoMetadata(videoId) {
    // 1. Try YouTube Player's internal metadata if it matches this videoId
    if (this.player && typeof this.player.getVideoData === 'function') {
      const data = this.player.getVideoData();
      if (data && data.title && (!data.video_id || data.video_id === videoId)) {
        return {
          title: data.title,
          author: data.author || '',
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          duration: this.getDuration() || 0,
        };
      }
    }

    // 2. Fallback to noembed / oEmbed endpoint
    try {
      const oembedUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`;
      const res = await fetch(oembedUrl);
      if (res.ok) {
        const json = await res.json();
        return {
          title: json.title || 'Unknown Title',
          author: json.author_name || '',
          thumbnail: json.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          duration: this.getDuration() || 0,
        };
      }
    } catch (e) {
      console.warn('oEmbed fetch error:', e);
    }

    // 3. Absolute fallback
    return {
      title: 'YouTube Music Track',
      author: '',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
}
