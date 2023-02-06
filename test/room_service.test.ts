import { RoomService, roomService } from "../src/service/room_service";
import { instance, mock } from "ts-mockito";
import { Socket } from "socket.io";
import { RoomRepository } from "../src/repository/room_repository.js";
import { fakeRoom, fakeRoomEntity } from "./fake_room.js";
import { mockPrisma } from "./mockPrisma.js";

describe("joinRoom", () => {
  it("should return undefined when there is no room", async () => {
    // given
    const mockSocket: Socket = mock();

    // when
    const router = await roomService.joinRoom("roomId", "uid", "roomName", instance(mockSocket));

    // then
    expect(router).toBeUndefined();
  });

  it("should return router when room exists", async () => {
    // given
    mockPrisma.room.findUnique.mockResolvedValue(fakeRoomEntity);
    const mockSocket: Socket = mock();
    const room = fakeRoom;
    const roomRepository = new RoomRepository();
    await roomRepository.createAndJoin("socketId", mock(), room.id, mock());
    const roomService = new RoomService(roomRepository);

    // when
    const router = await roomService.joinRoom(room.id, "uid", "roomName", instance(mockSocket));

    // then
    expect(router).toBeDefined();
  });
});