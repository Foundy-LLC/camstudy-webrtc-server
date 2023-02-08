import { Socket } from "socket.io";

export class WaitingRoomRepository {
  private readonly _socketsByRoomId = new Map<string, Socket[]>();
  private readonly _roomIdBySocketId = new Map<string, string>();

  public join = (roomId: string, socket: Socket) => {
    this._roomIdBySocketId.set(socket.id, roomId);

    const previousSockets = this._socketsByRoomId.get(roomId);
    if (previousSockets === undefined) {
      this._socketsByRoomId.set(roomId, [socket]);
      return;
    }
    this._socketsByRoomId.set(roomId, [...previousSockets, socket]);
  };

  public getSocketsBy = (roomId: string): Socket[] => {
    return this._socketsByRoomId.get(roomId) ?? [];
  };

  public remove = (socketId: string) => {
    const roomId = this._roomIdBySocketId.get(socketId);
    if (roomId !== undefined) {
      this._roomIdBySocketId.delete(socketId);
      const sockets = this._socketsByRoomId.get(roomId);
      if (sockets !== undefined) {
        const newSockets = sockets.filter((e) => e.id !== socketId);
        if (newSockets.length === 0) {
          this._socketsByRoomId.delete(roomId);
        } else {
          this._socketsByRoomId.set(roomId, newSockets);
        }
      }
    }
  };
}