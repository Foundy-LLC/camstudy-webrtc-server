import { RoomService, roomService } from "../src/service/room_service";
import { instance, mock, when } from "ts-mockito";
import { Socket } from "socket.io";
import { RoomRepository } from "../src/repository/room_repository.js";
import { fakeRoom, fakeRoomEntity } from "./fake_room.js";
import { mockPrisma } from "./mockPrisma.js";
import { MAX_ROOM_CAPACITY } from "../src/constant/room_constant";
import { RoomJoiner } from "../src/model/RoomJoiner";
import { BlockedUser } from "../src/model/BlockedUser";
import { Peer } from "../src/model/Peer";

describe("RoomService.joinRoom", () => {
  it("should return undefined when there is no room", async () => {
    // given
    const mockSocket: Socket = mock();
    const peer = new Peer("uid", instance(mockSocket), "name", null, false);

    // when
    const router = await roomService.joinRoom("roomId", peer);

    // then
    expect(router).toBeUndefined();
  });

  it("should return router when room exists", async () => {
    // given
    mockPrisma.room.findUnique.mockResolvedValue(fakeRoomEntity);
    mockPrisma.block.findMany.mockResolvedValue([]);
    const mockSocket: Socket = mock();
    const room = fakeRoom;
    const roomRepository = new RoomRepository();
    await roomRepository.createAndJoin("socketId", mock(), room.id, mock());
    const roomService = new RoomService(roomRepository);
    const peer = new Peer("uid", instance(mockSocket), "name", null, false);

    // when
    const router = await roomService.joinRoom(room.id, peer);

    // then
    expect(router).toBeDefined();
  });
});

describe("RoomService.canJoinRoom", () => {
  const roomId = "roomId";
  const roomPasswordInput = "password";
  const userId = "uid";

  it.each([
    [[], "otherId", [], roomPasswordInput],
    [[...new Array(MAX_ROOM_CAPACITY)], userId, [], roomPasswordInput],
    [[...new Array(MAX_ROOM_CAPACITY - 1)], "otherId", [], roomPasswordInput]
  ])("success", async (joiners: RoomJoiner[], masterId: string, blacklist: BlockedUser[], password: string) => {
    // given
    const mockRoomRepository = mock<RoomRepository>();
    when(mockRoomRepository.getJoinerList(roomId)).thenReturn(joiners);
    when(mockRoomRepository.getMasterId(roomId)).thenResolve(masterId);
    when(mockRoomRepository.getBlacklist(roomId)).thenResolve(blacklist);
    when(mockRoomRepository.getPassword(roomId)).thenResolve(password);
    const service = new RoomService(instance(mockRoomRepository), mock());

    // when
    const result = await service.canJoinRoom(userId, roomId, roomPasswordInput);

    // then
    expect(result.canJoin).toBe(true);
  });

  it("should return failure when room is full and user is not master", async () => {
    // given
    const mockRoomRepository = mock<RoomRepository>();
    when(mockRoomRepository.getJoinerList(roomId)).thenReturn([...new Array(MAX_ROOM_CAPACITY)]);
    when(mockRoomRepository.getMasterId(roomId)).thenResolve("others");
    when(mockRoomRepository.getBlacklist(roomId)).thenResolve([]);
    when(mockRoomRepository.getPassword(roomId)).thenResolve(roomPasswordInput);
    const service = new RoomService(instance(mockRoomRepository), mock());

    // when
    const result = await service.canJoinRoom(userId, roomId, roomPasswordInput);

    // then
    expect(result.canJoin).toBe(false);
  });

  it("should return failure when user is blocked", async () => {
    // given
    const mockRoomRepository = mock<RoomRepository>();
    when(mockRoomRepository.getJoinerList(roomId)).thenReturn([]);
    when(mockRoomRepository.getMasterId(roomId)).thenResolve("others");
    when(mockRoomRepository.getBlacklist(roomId)).thenResolve([{ id: userId, name: "name" }]);
    when(mockRoomRepository.getPassword(roomId)).thenResolve(roomPasswordInput);
    const service = new RoomService(instance(mockRoomRepository), mock());

    // when
    const result = await service.canJoinRoom(userId, roomId, roomPasswordInput);

    // then
    expect(result.canJoin).toBe(false);
  });

  it("should return failure when password is wrong", async () => {
    // given
    const mockRoomRepository = mock<RoomRepository>();
    when(mockRoomRepository.getJoinerList(roomId)).thenReturn([]);
    when(mockRoomRepository.getMasterId(roomId)).thenResolve("others");
    when(mockRoomRepository.getBlacklist(roomId)).thenResolve([]);
    when(mockRoomRepository.getPassword(roomId)).thenResolve("wrong");
    const service = new RoomService(instance(mockRoomRepository), mock());

    // when
    const result = await service.canJoinRoom(userId, roomId, roomPasswordInput);

    // then
    expect(result.canJoin).toBe(false);
  });
});