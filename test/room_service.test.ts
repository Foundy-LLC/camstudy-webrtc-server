import { RoomService, roomService } from "../src/service/room_service";
import { instance, mock } from "ts-mockito";
import { Socket } from "socket.io";
import { RoomRepository } from "../src/repository/room_repository";
import { fakeRoom } from "./fake_room";

describe("joinRoom", () => {
  it("should return undefined when there is no room", () => {
    // given
    const mockSocket: Socket = mock();

    // when
    const router = roomService.joinRoom("roomId", instance(mockSocket));

    // then
    expect(router).toBeUndefined();
  });

  it("should return router when room exists", () => {
    // given
    const mockSocket: Socket = mock();
    const room = fakeRoom;
    const roomRepository = new RoomRepository();
    roomRepository.setRoom(room, "id");
    const roomService = new RoomService(roomRepository);

    // when
    const router = roomService.joinRoom(room.id, instance(mockSocket));

    // then
    expect(router).toBeDefined();
  });
});