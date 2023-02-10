// TODO: camstudy-web과 중복되는 인테페이스임. 하나로 관리할 방법을 찾아야함
export interface JoinRoomFailureCallbackProperty {
  readonly type: "failure";
  readonly message: string;
}
