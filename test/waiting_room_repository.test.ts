import { WaitingRoomRepository } from "../src/repository/waiting_room_repository";
import { Socket } from "socket.io";
import { instance, mock, when } from "ts-mockito";

describe("WaitingRoomRepository", () => {
  it("should have empty sockets when there is nothing", () => {
    // given
    const repository = new WaitingRoomRepository();

    // then
    const result = repository.getSocketsBy("roomId");
    expect(result.length).toBe(0);
  });

  it("should contain socket when added", () => {
    // given
    const repository = new WaitingRoomRepository();
    const roomId = "room1";
    const socketId = "id";
    const mockSocket = mock<Socket>();
    when(mockSocket.id).thenReturn(socketId);

    // when
    repository.join(roomId, instance(mockSocket));

    // then
    const result = repository.getSocketsBy(roomId);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(socketId);
  });

  it("should remove socket appropriately", () => {
    // given
    const repository = new WaitingRoomRepository();
    const roomId = "room1";
    const socketId = "id";
    const mockSocket = mock<Socket>();
    when(mockSocket.id).thenReturn(socketId);
    const socket = instance(mockSocket);

    // when
    repository.join(roomId, socket);
    repository.remove(socket.id);

    // then
    const result = repository.getSocketsBy(roomId);
    expect(result.length).toBe(0);
  });

  it("should remove socket appropriately when there is many sockets", () => {
    // given
    const repository = new WaitingRoomRepository();
    const roomId = "room1";
    const socketId1 = "id1";
    const socketId2 = "id2";
    const mockSocket1 = mock<Socket>();
    const mockSocket2 = mock<Socket>();
    when(mockSocket1.id).thenReturn(socketId1);
    when(mockSocket2.id).thenReturn(socketId2);
    const socket1 = instance(mockSocket1);
    const socket2 = instance(mockSocket2);

    // when
    repository.join(roomId, socket1);
    repository.join(roomId, socket2);
    repository.remove(socket1.id);

    // then
    const result = repository.getSocketsBy(roomId);
    expect(result.length).toBe(1);
    expect(result[0]).toBe(socket2);
  });
});