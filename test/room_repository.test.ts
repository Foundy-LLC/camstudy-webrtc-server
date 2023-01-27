import { RoomRepository } from "../src/repository/room_repository";
import { fakeRoom } from "./fake_room";
import { instance, mock, when } from "ts-mockito";
import { Room } from "../src/model/room";
import { Socket } from "socket.io";
import { Peer } from "../src/model/peer";

describe("findRoomBySocketId", () => {
  it("should return room when there is", async () => {
    // given
    const socketId = "id";
    const repository = new RoomRepository();
    repository.setRoom(fakeRoom, socketId);

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
    repository.setRoom(fakeRoom, "socketId");

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
    const peer = new Peer(instance(mockSocket), "name", false);
    const repository = new RoomRepository();
    const room: Room = new Room({
      router: fakeRoom.router,
      id: fakeRoom.id,
      peers: [peer]
    });
    repository.setRoom(room, socketId);

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
    repository.setRoom(fakeRoom, socketId);

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
    repository.setRoom(fakeRoom, "id");

    // when
    repository.deleteRoom(fakeRoom);
    const room = repository.findRoomById(fakeRoom.id);

    // then
    expect(room).toBeUndefined();
  });
});