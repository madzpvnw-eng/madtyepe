/**
 * @license
 * VOCATYPE - Typing Statistics Tracker
 * Calculates real-time WPM, Accuracy, Keystroke counts, and Progress.
 * 
 * Standard WPM Formula:
 * - 1 standard typing word is defined as 5 keystrokes/characters.
 * - Elapsed Time = elapsed seconds of active typing / 60.
 * - Gross WPM = (Total Characters Typed / 5) / Elapsed Minutes
 * - Net WPM = Math.max(0, ((Correct Characters - Error Characters) / 5) / Elapsed Minutes)
 * - Accuracy = (Correct Characters / Total Characters Typed) * 100%
 */

export class StatisticsTracker {
  constructor() {
    this.reset();
  }

  reset() {
    this.totalCharsTyped = 0;
    this.correctChars = 0;
    this.errorChars = 0;
    
    this.totalLines = 0;
    this.completedLines = 0;

    this.currentStreak = 0;
    this.highestStreak = 0;

    this.startTime = null;
    this.pausedTime = null;
    this.totalActiveTimeMs = 0;
    this.isTracking = false;
  }

  setTotalLines(count) {
    this.totalLines = Math.max(0, count);
  }

  start() {
    if (!this.isTracking) {
      this.isTracking = true;
      this.startTime = Date.now();
    }
  }

  pause() {
    if (this.isTracking && this.startTime) {
      this.totalActiveTimeMs += Date.now() - this.startTime;
      this.startTime = null;
      this.isTracking = false;
    }
  }

  resume() {
    if (!this.isTracking) {
      this.isTracking = true;
      this.startTime = Date.now();
    }
  }

  recordKey(isCorrect) {
    if (!this.isTracking) {
      this.start();
    }

    this.totalCharsTyped++;

    if (isCorrect) {
      this.correctChars++;
      this.currentStreak++;
      if (this.currentStreak > this.highestStreak) {
        this.highestStreak = this.currentStreak;
      }
    } else {
      this.errorChars++;
      this.currentStreak = 0;
    }
  }

  recordLineCompleted() {
    this.completedLines++;
  }

  getElapsedSeconds() {
    let elapsed = this.totalActiveTimeMs;
    if (this.isTracking && this.startTime) {
      elapsed += Date.now() - this.startTime;
    }
    return Math.max(0, elapsed / 1000);
  }

  getStats() {
    const elapsedSecs = this.getElapsedSeconds();
    const elapsedMins = Math.max(0.016, elapsedSecs / 60); // min 1 second

    // Standard 5 chars = 1 word
    const grossWPM = Math.round((this.totalCharsTyped / 5) / elapsedMins);
    const netWPM = Math.max(0, Math.round(((this.correctChars - this.errorChars) / 5) / elapsedMins));

    const accuracy = this.totalCharsTyped > 0 
      ? Math.max(0, Math.min(100, Math.round((this.correctChars / this.totalCharsTyped) * 100))) 
      : 100;

    const progressPercent = this.totalLines > 0 
      ? Math.min(100, Math.round((this.completedLines / this.totalLines) * 100))
      : 0;

    return {
      grossWPM,
      netWPM,
      accuracy,
      totalChars: this.totalCharsTyped,
      correctChars: this.correctChars,
      errorChars: this.errorChars,
      completedLines: this.completedLines,
      totalLines: this.totalLines,
      progressPercent,
      currentStreak: this.currentStreak,
      highestStreak: this.highestStreak,
      elapsedSeconds: Math.floor(elapsedSecs),
    };
  }
}
