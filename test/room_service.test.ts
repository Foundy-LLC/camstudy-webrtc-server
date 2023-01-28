import { roomService } from "../src/service/room_service";
import { instance, mock } from "ts-mockito";
import { Socket } from "socket.io";

describe("joinRoom", () => {
  it("should return undefined when there is no room", () => {
    // given
    const mockSocket: Socket = mock();

    // when
    const router = roomService.joinRoom("roomName", instance(mockSocket));

    // then
    expect(router).toBeUndefined()
  });
});