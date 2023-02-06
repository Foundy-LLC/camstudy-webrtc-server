import { PomodoroTimer, PomodoroTimerEvent, PomodoroTimerObserver } from "../src/model/PomodoroTimer";
import { jest } from "@jest/globals";

describe("PomodoroTimer.start", () => {
  it("should call callbacks appropriately", () => {
    // given
    jest.useFakeTimers();
    const longBreakInterval = 4;
    let timerStartCount = 0;
    let shortBreakStartCount = 0;
    let longBreakStartCount = 0;
    const observer: PomodoroTimerObserver = {
      onEvent: (event) => {
        switch (event) {
          case PomodoroTimerEvent.ON_START:
            timerStartCount++;
            break;
          case PomodoroTimerEvent.ON_SHORT_BREAK:
            shortBreakStartCount++;
            break;
          case PomodoroTimerEvent.ON_LONG_BREAK:
            longBreakStartCount++;
            break;
        }
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
    expect(timerStartCount).toBe(longBreakInterval + 1);
    expect(shortBreakStartCount).toBe(longBreakInterval - 1);
    expect(longBreakStartCount).toBe(1);
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
    timer.editAndStop({});

    // then
    expect(jest.getTimerCount()).toBe(1);
  });

  it("should restart timer", () => {
    // given
    jest.useFakeTimers();
    const longBreakInterval = 4;
    let timerStartCount = 0;
    let shortBreakStartCount = 0;
    let longBreakStartCount = 0;
    const observer: PomodoroTimerObserver = {
      onEvent: (event) => {
        switch (event) {
          case PomodoroTimerEvent.ON_START:
            timerStartCount++;
            break;
          case PomodoroTimerEvent.ON_SHORT_BREAK:
            shortBreakStartCount++;
            break;
          case PomodoroTimerEvent.ON_LONG_BREAK:
            longBreakStartCount++;
            break;
        }
      }
    };
    const timer = new PomodoroTimer(25, 5, 15, longBreakInterval);
    timer.addObserver(observer);

    // when
    timer.start();
    // longInterval 직전까지 집중 및 휴식 수행
    for (let i = 0; i < longBreakInterval - 1; ++i) {
      // 집중시간 타이머 진행
      jest.runOnlyPendingTimers();
      // 휴식시간 타이머 진행
      jest.runOnlyPendingTimers();
    }

    timer.editAndStop({})
    // 휴식 시작
    jest.runOnlyPendingTimers();

    // then
    expect(timerStartCount).toBe(longBreakInterval + 1);
    expect(shortBreakStartCount).toBe(longBreakInterval);
    expect(longBreakStartCount).toBe(0);
  });
});