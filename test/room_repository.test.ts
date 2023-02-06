import { RoomRepository } from "../src/repository/room_repository";
import { fakeRoom, fakeRoomEntity } from "./fake_room";
import { instance, mock, when } from "ts-mockito";
import { Room } from "../src/model/Room";
import { Socket } from "socket.io";
import { Peer } from "../src/model/Peer";
import { mockPrisma } from "./mockPrisma";

describe("findRoomBySocketId", () => {
  it("should return room when there is", async () => {
    // given
    const socketId = "id";
    const repository = new RoomRepository();
    mockPrisma.room.findUnique.mockResolvedValue(fakeRoomEntity);
    await repository.createAndJoin(socketId, mock(), fakeRoom.id, mock());

    // when
    const room = repository.findRoomBySocketId(socketId);

    // then
    expect(room).toBeDefined();
  });

  it("should return undefined when there is not", async () => {
    // given
    const socketId = "id";
    const repository = new RoomRepository();

    // when
    const room = repository.findRoomBySocketId(socketId);

    // then
    expect(room).toBeUndefined();
  });
});

describe("findRoomById", () => {
  it("should return room when there is", async () => {
    // given
    const repository = new RoomRepository();
    mockPrisma.room.findUnique.mockResolvedValue(fakeRoomEntity);
    await repository.createAndJoin("socketId", mock(), fakeRoom.id, mock());

    // when
    const room = repository.findRoomById(fakeRoom.id);

    // then
    expect(room).toBeDefined();
  });

  it("should return undefined when there is not", async () => {
    // given
    const repository = new RoomRepository();

    // when
    const room = repository.findRoomById(fakeRoom.id);

    // then
    expect(room).toBeUndefined();
  });
});


describe("findPeerBy", () => {
  it("should return peer when there is", async () => {
    // given
    const socketId = "id";
    const mockSocket: Socket = mock();
    when(mockSocket.id).thenReturn(socketId);
    const peer = new Peer("uid", instance(mockSocket), "name");
    const repository = new RoomRepository();
    mockPrisma.room.findUnique.mockResolvedValue(fakeRoomEntity);
    await repository.createAndJoin(socketId, mock(), "room.id", peer);

    // when
    const result = repository.findPeerBy(peer.socketId);

    // then
    expect(result).toBeDefined();
  });

  it("should return undefined when there is not", async () => {
    // given
    const repository = new RoomRepository();

    // when
    const room = repository.findPeerBy("id");

    // then
    expect(room).toBeUndefined();
  });
});

describe("deleteSocketId", () => {
  it("should delete socketId", async () => {
    // given
    const socketId = "id";
    const repository = new RoomRepository();
    mockPrisma.room.findUnique.mockResolvedValue(fakeRoomEntity);
    await repository.createAndJoin(socketId, mock(), fakeRoom.id, mock());

    // when
    repository.deleteSocketId(socketId);
    const room = repository.findRoomBySocketId(socketId);

    // then
    expect(room).toBeUndefined();
  });
});

describe("deleteRoom", () => {
  it("should delete socketId", async () => {
    // given
    const repository = new RoomRepository();
    mockPrisma.room.findUnique.mockResolvedValue(fakeRoomEntity);
    await repository.createAndJoin("socketId", mock(), fakeRoom.id, mock());

    // when
    repository.deleteRoom(fakeRoom);
    const room = repository.findRoomById(fakeRoom.id);

    // then
    expect(room).toBeUndefined();
  });
});