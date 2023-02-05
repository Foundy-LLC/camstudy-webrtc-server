import { convertToKoreaDate } from "../util/dateUtil.js";

// TODO: 클라이언트랑 같이 쓰이는 클래스임 때문에 한군데다 모으고 동시에 쓰는 방법을 찾아야함
export enum PomodoroTimerState {
  STOPPED = "stopped",
  STARTED = "started",
  SHORT_BREAK = "shortBreak",
  LONG_BREAK = "longBreak",
}

export enum PomodoroTimerEvent {
  ON_START,
  ON_SHORT_BREAK,
  ON_LONG_BREAK,
}

export interface PomodoroTimerObserver {
  onEvent: (event: PomodoroTimerEvent) => void;
}

abstract class PomodoroTimerObservable {
  private readonly _observers: Set<PomodoroTimerObserver> = new Set();

  public addObserver(observer: PomodoroTimerObserver) {
    this._observers.add(observer);
  }

  public removeObserver(observer: PomodoroTimerObserver) {
    this._observers.delete(observer);
  }

  protected notifyTimerStarted() {
    for (const observer of this._observers) {
      observer.onEvent(PomodoroTimerEvent.ON_START);
    }
  }

  protected notifyShortBreakStarted() {
    for (const observer of this._observers) {
      observer.onEvent(PomodoroTimerEvent.ON_SHORT_BREAK);
    }
  }

  protected notifyLongBreakStarted() {
    for (const observer of this._observers) {
      observer.onEvent(PomodoroTimerEvent.ON_LONG_BREAK);
    }
  }
}

export class PomodoroTimer extends PomodoroTimerObservable {
  private _startedAt?: Date;
  private _timeout?: NodeJS.Timeout;
  private _shortBreakCount: number = 0;
  private _state = PomodoroTimerState.STOPPED;

  constructor(
    private _timerLengthMinutes: number,
    private _shortBreakMinutes: number,
    private _longBreakMinutes: number,
    private _longBreakInterval: number
  ) {
    super();
  }

  public get state(): PomodoroTimerState {
    return this._state;
  }

  public get startedDate(): Date | undefined {
    return this._startedAt;
  }

  public start = () => {
    if (this._timeout != null) {
      return;
    }
    this._startedAt = convertToKoreaDate(new Date());
    this._startFocusTimer();
  };

  private _startFocusTimer = () => {
    this._state = PomodoroTimerState.STARTED;
    super.notifyTimerStarted();
    this._timeout = this._setTimeoutInMinutes(this._timerLengthMinutes, () => {
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
    this._state = PomodoroTimerState.SHORT_BREAK;
    super.notifyShortBreakStarted();
    this._timeout = this._setTimeoutInMinutes(this._shortBreakMinutes, () => {
      this._startFocusTimer();
    });
  };

  private _startLongBreakTimer = () => {
    this._state = PomodoroTimerState.LONG_BREAK;
    super.notifyLongBreakStarted();
    this._timeout = this._setTimeoutInMinutes(this._longBreakMinutes, () => {
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
    this._clearTimeout();
    this.start();
  };

  private _clearTimeout = () => {
    if (this._timeout != null) {
      clearTimeout(this._timeout);
      this._timeout = undefined;
    }
  };

  public dispose = () => {
    this._clearTimeout();
    this._state = PomodoroTimerState.STOPPED;
  };
}