import { RtpCapabilities } from "mediasoup-client/lib/RtpParameters";
import { PomodoroTimerProperty, PomodoroTimerState } from "./PomodoroTimer";
import { PeerState } from "./PeerState";

// TODO: camstudy-web과 중복되는 인테페이스임. 하나로 관리할 방법을 찾아야함
export interface JoinRoomSuccessCallbackProperty {
  readonly type: "success";
  readonly rtpCapabilities: RtpCapabilities;
  readonly peerStates: PeerState[];
  readonly timerStartedDate?: string;
  readonly timerState: PomodoroTimerState;
  readonly timerProperty: PomodoroTimerProperty;
}