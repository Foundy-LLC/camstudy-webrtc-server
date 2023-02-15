// TODO: camstudy-webrtc-server와 중복되는 인테페이스임. 하나로 관리할 방법을 찾아야함
export interface PeerState {
  readonly uid: string;
  readonly name: string;
  readonly enabledMicrophone: boolean;
  readonly enabledHeadset: boolean;
}
