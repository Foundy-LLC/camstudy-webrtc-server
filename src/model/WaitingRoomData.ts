import { RoomJoiner } from "./RoomJoiner";
import { BlockedUser } from "./BlockedUser";

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

  /**
   * 공부방의 차단 인원의 ID 목록이다.
   */
  readonly blacklist: BlockedUser[];

  /**
   * 공부방이 비밀번호를 가지고 있는 경우 `true`이다.
   */
  readonly hasPassword: boolean;
}
