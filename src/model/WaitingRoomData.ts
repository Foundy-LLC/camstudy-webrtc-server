import { RoomJoiner } from "./RoomJoiner";

// TODO: API server와 중복되는 인터페이스라 한군데서 관리할 수 있도록 해야함
export interface WaitingRoomData {
  /**
   * 공부방에 참여한 사람들의 목록이다.
   */
  readonly joinerList: RoomJoiner[];

  /**
   * 공부방의 최대 참여 가능한 인원이다.
   */
  readonly capacity: number;

  /**
   * 공부방의 방장 ID이다.
   */
  readonly masterId: string;
}
