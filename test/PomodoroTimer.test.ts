import { PomodoroTimer, PomodoroTimerObserver } from "../src/model/PomodoroTimer";
import { jest } from "@jest/globals";

describe("PomodoroTimer.start", () => {
  it("should call callbacks appropriately", () => {
    // given
    jest.useFakeTimers();
    const longBreakInterval = 4;
    let timerEndCount = 0;
    let shortBreakEndCount = 0;
    let longBreakEndCount = 0;
    const observer: PomodoroTimerObserver = {
      onEndTimer: () => {
        timerEndCount++;
      },
      onEndShortBreak: () => {
        shortBreakEndCount++;
      },
      onEndLongBreak: () => {
        longBreakEndCount++;
      }
    };
    const timer = new PomodoroTimer(25, 5, 15, longBreakInterval);
    timer.addObserver(observer);

    // when
    timer.start();
    for (let i = 0; i < longBreakInterval; ++i) {
      // 집중시간 타이머 진행
      jest.runOnlyPendingTimers();
      // 휴식시간 타이머 진행
      jest.runOnlyPendingTimers();
    }

    // then
    expect(timerEndCount).toBe(longBreakInterval);
    expect(shortBreakEndCount).toBe(longBreakInterval - 1);
    expect(longBreakEndCount).toBe(1);
  });
});

describe("PomodoroTimer.endAndRestart", () => {
  it("should cancel previous timeout", () => {
    // given
    jest.useFakeTimers();
    const timer = new PomodoroTimer(25, 5, 15, 4);
    timer.start();
    expect(jest.getTimerCount()).toBe(1);

    // when
    timer.editAndRestart({});

    // then
    expect(jest.getTimerCount()).toBe(1);
  });

  it("should restart timer", () => {
    // given
    jest.useFakeTimers();
    const longBreakInterval = 4;
    let timerEndCount = 0;
    let shortBreakEndCount = 0;
    let longBreakEndCount = 0;
    const observer: PomodoroTimerObserver = {
      onEndTimer: () => {
        timerEndCount++;
      },
      onEndShortBreak: () => {
        shortBreakEndCount++;
      },
      onEndLongBreak: () => {
        longBreakEndCount++;
      }
    };
    const timer = new PomodoroTimer(25, 5, 15, longBreakInterval);
    timer.addObserver(observer);

    // when
    timer.start();
    for (let i = 0; i < longBreakInterval - 1; ++i) {
      // 집중시간 타이머 진행
      jest.runOnlyPendingTimers();
      // 휴식시간 타이머 진행
      jest.runOnlyPendingTimers();
    }
    timer.editAndRestart({})
    jest.runOnlyPendingTimers();
    jest.runOnlyPendingTimers();

    // then
    expect(timerEndCount).toBe(longBreakInterval);
    expect(shortBreakEndCount).toBe(longBreakInterval);
    expect(longBreakEndCount).toBe(0);
  });
});