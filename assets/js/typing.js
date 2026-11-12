/**
 * @license
 * VOCATYPE - Typing Engine
 * Real-time character-by-character input validation, cursor management, and mode handling.
 */

export class TypingEngine {
  constructor(options = {}) {
    this.lyrics = [];
    this.currentLineIndex = 0;
    this.currentCharIndex = 0;
    this.typedStatuses = []; // Array of boolean | null per character in active line
    this.isLineCompleted = false;
    this.mode = options.mode || 'continuous'; // 'continuous' | 'line'
    this.wordsToType = options.wordsToType || 'all'; // 'all' | 'moderate' | 'light' | 'first_letters'
    this.skipPunctuation = options.skipPunctuation || false;

    // Callbacks
    this.onCharTyped = options.onCharTyped || (() => {});
    this.onLineCompleted = options.onLineCompleted || (() => {});
    this.onAdvanceRequest = options.onAdvanceRequest || (() => {});
    this.onRender = options.onRender || (() => {});

    // DOM Elements
    this.activeLineContainer = null;
    this.prevLineContainer = null;
    this.nextLineContainer = null;
    this.lineProgressFill = null;
    this.hiddenInput = null;

    this.isListening = false;
    this.bindEvents();
  }

  setElements(elements) {
    this.activeLineContainer = elements.activeLineContainer;
    this.prevLineContainer = elements.prevLineContainer;
    this.nextLineContainer = elements.nextLineContainer;
    this.lineProgressFill = elements.lineProgressFill;
    this.hiddenInput = elements.hiddenInput;
  }

  setLyrics(lyrics) {
    this.lyrics = lyrics || [];
    this.currentLineIndex = 0;
    this.currentCharIndex = 0;
    this.typedStatuses = [];
    this.isLineCompleted = false;

    if (this.lyrics.length > 0) {
      this.initLine(0);
    } else {
      this.renderEmpty();
    }
  }

  setMode(mode) {
    this.mode = mode;
  }

  setWordsToType(mode) {
    this.wordsToType = mode;
    this.initLine(this.currentLineIndex);
  }

  setSkipPunctuation(skip) {
    this.skipPunctuation = skip;
  }

  initLine(index) {
    if (index < 0 || index >= this.lyrics.length) return;
    this.currentLineIndex = index;
    this.currentCharIndex = 0;
    this.isLineCompleted = false;

    const lineText = this.lyrics[index].text;
    this.typedStatuses = new Array(lineText.length).fill(null);

    // If moderate or light mode, pre-fill non-target words
    if (this.wordsToType === 'moderate' || this.wordsToType === 'light') {
      const words = lineText.split(/(\s+)/);
      let charPos = 0;
      let wordIdx = 0;
      for (const token of words) {
        const isSpace = /^\s+$/.test(token);
        if (!isSpace) {
          const mustType = (this.wordsToType === 'moderate') ? (wordIdx % 2 === 0) : (wordIdx % 3 === 0);
          if (!mustType) {
            for (let c = 0; c < token.length; c++) {
              this.typedStatuses[charPos + c] = true;
            }
          }
          wordIdx++;
        } else {
          this.typedStatuses[charPos] = true;
        }
        charPos += token.length;
      }

      while (this.currentCharIndex < lineText.length && this.typedStatuses[this.currentCharIndex] === true) {
        this.currentCharIndex++;
      }
    }

    this.render();
  }

  /**
   * Called by YouTube time sync loop in continuous mode.
   * If music has advanced to a new line, switch active line.
   */
  syncToLine(index) {
    if (index !== this.currentLineIndex && index >= 0 && index < this.lyrics.length) {
      this.initLine(index);
    }
  }

  bindEvents() {
    if (this.isListening) return;

    window.addEventListener('keydown', (e) => {
      // Don't intercept typing if any modal is currently open
      if (document.querySelector('.modal-overlay.open')) {
        return;
      }

      // Don't intercept typing if user is in an input or textarea other than our hiddenInput
      const targetTag = (e.target.tagName || '').toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
        if (e.target !== this.hiddenInput) return;
      }

      this.handleKeyDown(e);
    });

    this.isListening = true;
  }

  handleKeyDown(e) {
    if (!this.lyrics || this.lyrics.length === 0) return;
    if (this.currentLineIndex >= this.lyrics.length) return;

    const currentLine = this.lyrics[this.currentLineIndex];
    if (!currentLine) return;
    const lineText = currentLine.text;

    // Handle Enter to skip to next line if current line is already completed
    if (e.key === 'Enter') {
      if (this.isLineCompleted) {
        e.preventDefault();
        this.goToNextLine();
        this.onAdvanceRequest(this.currentLineIndex);
        return;
      }
    }

    // Handle Backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (this.currentCharIndex > 0) {
        this.currentCharIndex--;
        this.typedStatuses[this.currentCharIndex] = null;
        if (this.wordsToType === 'first_letters') {
          while (this.currentCharIndex > 0 && this.typedStatuses[this.currentCharIndex - 1] === true) {
            this.currentCharIndex--;
            this.typedStatuses[this.currentCharIndex] = null;
          }
        }
        this.isLineCompleted = false;
        this.render();
      }
      return;
    }

    // Ignore modifier and non-printable keys
    if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) {
      return;
    }

    // Prevent default on all printable keys (crucial for Spacebar so page does not scroll)
    e.preventDefault();

    // Stop if line already finished
    if (this.currentCharIndex >= lineText.length) {
      return;
    }

    const typedChar = e.key;
    const expectedChar = lineText[this.currentCharIndex];

    const isMatch = this.checkCharMatch(typedChar, expectedChar);

    this.typedStatuses[this.currentCharIndex] = isMatch;
    this.currentCharIndex++;

    this.onCharTyped(isMatch);

    if (isMatch && this.wordsToType === 'first_letters') {
      // In first_letters mode: auto-complete the rest of this word!
      while (this.currentCharIndex < lineText.length && lineText[this.currentCharIndex] !== ' ' && !/[\.,!?;:\-]/.test(lineText[this.currentCharIndex])) {
        this.typedStatuses[this.currentCharIndex] = true;
        this.currentCharIndex++;
      }
      // If next character is space or punctuation, auto-advance past it
      while (this.currentCharIndex < lineText.length && (lineText[this.currentCharIndex] === ' ' || /[\.,!?;:\-]/.test(lineText[this.currentCharIndex]))) {
        this.typedStatuses[this.currentCharIndex] = true;
        this.currentCharIndex++;
      }
    } else if (isMatch && (this.wordsToType === 'moderate' || this.wordsToType === 'light')) {
      // Auto-skip any prefilled characters
      while (this.currentCharIndex < lineText.length && this.typedStatuses[this.currentCharIndex] === true) {
        this.currentCharIndex++;
      }
    }

    // Check if line completed
    if (this.currentCharIndex >= lineText.length) {
      this.isLineCompleted = true;
      this.render();
      this.onLineCompleted(this.currentLineIndex);
    } else {
      this.render();
    }
  }

  /**
   * Normalizes characters (e.g. smart quotes ' vs ’, straight dashes, spaces)
   */
  checkCharMatch(typed, expected) {
    if (typed === expected) return true;

    // Smart single quote / apostrophe normalization
    if ((typed === "'" || typed === "’" || typed === "`") && 
        (expected === "'" || expected === "’" || expected === "`")) {
      return true;
    }

    // Smart double quote normalization
    if ((typed === '"' || typed === '”' || typed === '“') &&
        (expected === '"' || expected === '”' || expected === '“')) {
      return true;
    }

    // Smart dash normalization
    if ((typed === '-' || typed === '–' || typed === '—') &&
        (expected === '-' || expected === '–' || expected === '—')) {
      return true;
    }

    // Case-insensitive tolerance for convenience
    if (typed.toLowerCase() === expected.toLowerCase()) {
      return true;
    }

    return false;
  }

  goToNextLine() {
    if (this.currentLineIndex < this.lyrics.length - 1) {
      this.initLine(this.currentLineIndex + 1);
      return this.currentLineIndex;
    }
    return -1;
  }

  goToPrevLine() {
    if (this.currentLineIndex > 0) {
      this.initLine(this.currentLineIndex - 1);
      return this.currentLineIndex;
    }
    return -1;
  }

  restart() {
    this.initLine(0);
  }

  render() {
    if (!this.activeLineContainer || !this.lyrics || this.lyrics.length === 0) return;

    const currentLine = this.lyrics[this.currentLineIndex];
    if (!currentLine) return;
    const lineText = currentLine.text;

    // 1. Render Active Line characters grouped by words to prevent word-splitting & layout jitter
    const tokens = [];
    let currentWord = [];

    for (let i = 0; i < lineText.length; i++) {
      const char = lineText[i];
      const status = this.typedStatuses[i];
      let charClass = 'char untyped';

      if (status === true) {
        charClass = 'char correct';
      } else if (status === false) {
        charClass = 'char incorrect';
      }

      if (i === this.currentCharIndex && !this.isLineCompleted) {
        charClass += ' current';
      }

      const charObj = { index: i, char, charClass };

      if (char === ' ') {
        if (currentWord.length > 0) {
          tokens.push({ type: 'word', items: currentWord });
          currentWord = [];
        }
        tokens.push({ type: 'space', item: charObj });
      } else {
        currentWord.push(charObj);
      }
    }

    if (currentWord.length > 0) {
      tokens.push({ type: 'word', items: currentWord });
    }

    let html = '';
    for (const token of tokens) {
      if (token.type === 'word') {
        const wordHtml = token.items
          .map(c => `<span class="${c.charClass}" data-idx="${c.index}">${this.escapeHtml(c.char)}</span>`)
          .join('');
        html += `<span class="lyric-word">${wordHtml}</span>`;
      } else {
        const c = token.item;
        html += `<span class="lyric-space ${c.charClass}" data-idx="${c.index}">&nbsp;</span>`;
      }
    }

    this.activeLineContainer.innerHTML = html;

    // 2. Render Line Progress Bar
    if (this.lineProgressFill) {
      const progress = lineText.length > 0 ? (this.currentCharIndex / lineText.length) * 100 : 0;
      this.lineProgressFill.style.width = `${progress}%`;
    }

    // 3. Render Previous Line Preview (up to 2 previous lines)
    if (this.prevLineContainer) {
      const prevLines = [];
      if (this.currentLineIndex > 1) {
        prevLines.push(this.lyrics[this.currentLineIndex - 2].text);
      }
      if (this.currentLineIndex > 0) {
        prevLines.push(this.lyrics[this.currentLineIndex - 1].text);
      }

      this.prevLineContainer.innerHTML = prevLines
        .map(txt => `<div class="lyric-line-prev">${this.escapeHtml(txt)}</div>`)
        .join('');
    }

    // 4. Render Next Line Preview (up to 2 upcoming lines)
    if (this.nextLineContainer) {
      const nextLines = [];
      if (this.currentLineIndex + 1 < this.lyrics.length) {
        nextLines.push(this.lyrics[this.currentLineIndex + 1].text);
      }
      if (this.currentLineIndex + 2 < this.lyrics.length) {
        nextLines.push(this.lyrics[this.currentLineIndex + 2].text);
      }

      this.nextLineContainer.innerHTML = nextLines
        .map(txt => `<div class="lyric-line-next">${this.escapeHtml(txt)}</div>`)
        .join('');
    }

    this.onRender({
      lineIndex: this.currentLineIndex,
      totalLines: this.lyrics.length,
      charIndex: this.currentCharIndex,
      lineLength: lineText.length,
    });
  }

  renderEmpty() {
    if (this.activeLineContainer) {
      this.activeLineContainer.innerHTML = '<span class="char untyped">Load a YouTube music video to start typing lyrics.</span>';
    }
    if (this.prevLineContainer) this.prevLineContainer.innerHTML = '';
    if (this.nextLineContainer) this.nextLineContainer.innerHTML = '';
    if (this.lineProgressFill) this.lineProgressFill.style.width = '0%';
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
