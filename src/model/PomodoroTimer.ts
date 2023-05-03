import { convertToKoreaDate } from "../util/date_util.js";

// TODO: 클라이언트랑 같이 쓰이는 클래스임 때문에 한군데다 모으고 동시에 쓰는 방법을 찾아야함
export enum PomodoroTimerState {
  STOPPED = "stopped",
  STARTED = "started",
  SHORT_BREAK = "shortBreak",
  LONG_BREAK = "longBreak",
}

// TODO: API repo에서 중복됨. 하나로 공유할 수 있는 방법을 찾아야함.
export enum PomodoroTimerEvent {
  ON_START,
  ON_SHORT_BREAK,
  ON_LONG_BREAK,
}

// TODO: API repo에서 중복됨. 하나로 공유할 수 있는 방법을 찾아야함.
export interface PomodoroTimerProperty {
  timerLengthMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
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
  private _eventDate?: Date;
  private _timeout?: NodeJS.Timeout;
  private _shortBreakCount: number = 0;
  private _state = PomodoroTimerState.STOPPED;

  constructor(
    private _property: PomodoroTimerProperty
  ) {
    super();
  }

  public get state(): PomodoroTimerState {
    return this._state;
  }

  public get eventDate(): Date | undefined {
    return this._eventDate;
  }

  public get property(): PomodoroTimerProperty {
    return this._property;
  }

  public start = (): boolean => {
    if (this._timeout != null) {
      return false;
    }
    this._startFocusTimer();
    return true;
  };

  private _updateEventDate = () => {
    this._eventDate = convertToKoreaDate(new Date());
  }

  private _startFocusTimer = () => {
    this._state = PomodoroTimerState.STARTED;
    this._updateEventDate();
    super.notifyTimerStarted();
    this._timeout = this._setTimeoutInMinutes(this._property.timerLengthMinutes, () => {
      if (this._shortBreakCount === this._property.longBreakInterval - 1) {
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
    this._updateEventDate();
    super.notifyShortBreakStarted();
    this._timeout = this._setTimeoutInMinutes(this._property.shortBreakMinutes, () => {
      this._startFocusTimer();
    });
  };

  private _startLongBreakTimer = () => {
    this._state = PomodoroTimerState.LONG_BREAK;
    this._updateEventDate();
    super.notifyLongBreakStarted();
    this._timeout = this._setTimeoutInMinutes(this._property.longBreakMinutes, () => {
      this._startFocusTimer();
    });
  };

  private _setTimeoutInMinutes = (minutes: number, callback: () => void): NodeJS.Timeout => {
    return setTimeout(callback, minutes * 60 * 1000);
  };

  public editAndStop = (
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
    this._property = {
      timerLengthMinutes: timerLengthMinutes ?? this._property.timerLengthMinutes,
      shortBreakMinutes: shortBreakMinutes ?? this._property.shortBreakMinutes,
      longBreakMinutes: longBreakMinutes ?? this._property.longBreakMinutes,
      longBreakInterval: longBreakInterval ?? this._property.longBreakInterval
    };
    this._shortBreakCount = 0;
    this._clearTimeout();
  };

  private _clearTimeout = () => {
    if (this._timeout != null) {
      clearTimeout(this._timeout);
      this._timeout = undefined;
    }
    this._eventDate = undefined;
    this._state = PomodoroTimerState.STOPPED;
  };

  public dispose = () => {
    this._clearTimeout();
    this._state = PomodoroTimerState.STOPPED;
  };
}