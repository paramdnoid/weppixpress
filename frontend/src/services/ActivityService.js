class ActivityService {
  constructor(timeoutMinutes = 15) {
    this.timeoutDelay = timeoutMinutes * 60 * 1000;
    this.timer = null;
    this.eventTarget = new EventTarget();
    this.initListeners();
    this.resetTimer();
  }

  initListeners() {
    ['mousemove', 'keydown', 'mousedown', 'touchstart', 'visibilitychange'].forEach(evt => {
      window.addEventListener(evt, this.handleEvent.bind(this));
    });
  }

  handleEvent(evt) {
    if (evt.type === 'visibilitychange') {
      if (document.visibilityState === 'hidden') {
        this.pauseTimer();
      } else {
        this.resetTimer();
      }
    } else {
      this.eventTarget.dispatchEvent(new Event('activity'));
      this.resetTimer();
    }
  }

  resetTimer() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.eventTarget.dispatchEvent(new Event('idle'));
    }, this.timeoutDelay);
  }

  pauseTimer() {
    clearTimeout(this.timer);
  }

  on(event, handler) {
    this.eventTarget.addEventListener(event, handler);
  }
}
export const activityService = new ActivityService(15);