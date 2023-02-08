import { WaitingRoomRepository } from "../src/repository/waiting_room_repository";
import { Socket } from "socket.io";
import { instance, mock, when } from "ts-mockito";

const protocol = "PROTOCOL";

describe("WaitingRoomRepository", () => {
  it("should notify peers that is in waiting room", () => {
    // given
    const repository = new WaitingRoomRepository();
    const roomId = "room1";
    const mockSocket = mock<Socket>();
    let notifiedCount = 0;
    when(mockSocket.id).thenReturn("socketId");
    when(mockSocket.emit(protocol, undefined)).thenCall(() => {
      notifiedCount++;
    });
    const socket = instance(mockSocket);

    // when
    repository.join(roomId, socket);
    repository.notifyOthers(roomId, protocol, undefined);

    // then
    expect(notifiedCount).toBe(1);
  });

  it("should not notify peers that is in other waiting room", () => {
    // given
    const repository = new WaitingRoomRepository();
    const mockSocket = mock<Socket>();
    let notifiedCount = 0;
    when(mockSocket.id).thenReturn("socketId");
    when(mockSocket.emit(protocol, undefined)).thenCall(() => {
      notifiedCount++;
    });
    const socket = instance(mockSocket);

    // when
    repository.join("roomId", socket);
    repository.notifyOthers("other", protocol, undefined);

    // then
    expect(notifiedCount).toBe(0);
  });
});