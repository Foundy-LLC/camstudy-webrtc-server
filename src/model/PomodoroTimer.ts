import { convertToKoreaDate } from "../util/date.util";

export interface PomodoroTimerObserver {
  onEndTimer: () => void;
  onEndShortBreak: () => void;
  onEndLongBreak: () => void;
}

export class PomodoroTimerObservable {
  private readonly _observers: Set<PomodoroTimerObserver> = new Set();

  public addObserver(observer: PomodoroTimerObserver) {
    this._observers.add(observer);
  }

  public removeObserver(observer: PomodoroTimerObserver) {
    this._observers.delete(observer);
  }

  protected notifyTimerEnd() {
    for (const observer of this._observers) {
      observer.onEndTimer();
    }
  }

  protected notifyShortBreakEnd() {
    for (const observer of this._observers) {
      observer.onEndShortBreak();
    }
  }

  protected notifyLongBreakEnd() {
    for (const observer of this._observers) {
      observer.onEndLongBreak();
    }
  }
}

export class PomodoroTimer extends PomodoroTimerObservable {
  private _startedAt?: Date;
  private _timeout?: NodeJS.Timeout;
  private _shortBreakCount: number = 0;

  constructor(
    private _timerLengthMinutes: number,
    private _shortBreakMinutes: number,
    private _longBreakMinutes: number,
    private _longBreakInterval: number
  ) {
    super();
  }

  public start = () => {
    if (this._timeout != null) {
      clearTimeout(this._timeout);
    }
    this._startedAt = convertToKoreaDate(new Date());
    this._startFocusTimer();
  };

  private _startFocusTimer = () => {
    this._timeout = this._setTimeoutInMinutes(this._timerLengthMinutes, () => {
      super.notifyTimerEnd();
      if (this._shortBreakCount === this._longBreakInterval - 1) {
        this._shortBreakCount = 0;
        this._startLongBreakTimer();
      } else {
        ++this._shortBreakCount;
        this._startShortBreakTimer();
      }
    });
  };

  private _startShortBreakTimer = () => {
    this._timeout = this._setTimeoutInMinutes(this._shortBreakMinutes, () => {
      super.notifyShortBreakEnd();
      this._startFocusTimer();
    });
  };

  private _startLongBreakTimer = () => {
    this._timeout = this._setTimeoutInMinutes(this._longBreakMinutes, () => {
      super.notifyLongBreakEnd();
      this._startFocusTimer();
    });
  };

  private _setTimeoutInMinutes = (minutes: number, callback: () => void): NodeJS.Timeout => {
    return setTimeout(callback, minutes * 60 * 1000);
  };

  public editAndRestart = (
    {
      timerLengthMinutes,
      shortBreakMinutes,
      longBreakMinutes,
      longBreakInterval
    }: {
      timerLengthMinutes?: number,
      shortBreakMinutes?: number,
      longBreakMinutes?: number,
      longBreakInterval?: number
    }
  ) => {
    if (timerLengthMinutes != null) {
      this._timerLengthMinutes = timerLengthMinutes;
    }
    if (shortBreakMinutes != null) {
      this._shortBreakMinutes = shortBreakMinutes;
    }
    if (longBreakMinutes != null) {
      this._longBreakMinutes = longBreakMinutes;
    }
    if (longBreakInterval != null) {
      this._longBreakInterval = longBreakInterval;
    }

    this._shortBreakCount = 0;
    this.start();
  };
}