import { Room } from "../model/room.js";
import { Peer } from "../model/peer.js";

export class RoomRepository {

  private readonly _roomById = new Map<string, Room>();
  private readonly _roomIdBySocketId = new Map<string, string>();

  public setRoom = (room: Room, socketId: string) => {
    this._roomById.set(room.id, room);
    this._roomIdBySocketId.set(socketId, room.id);
  };

  public findRoomBySocketId = (socketId: string): Room | undefined => {
    const roomId = this._roomIdBySocketId.get(socketId);
    if (roomId === undefined) {
      return undefined;
    }
    return this.findRoomById(roomId);
  };

  public findRoomById = (roomId: string): Room | undefined => {
    return this._roomById.get(roomId);
  };

  public findPeerBy = (socketId: string): Peer | undefined => {
    const room = this.findRoomBySocketId(socketId);
    if (room === undefined) {
      return;
    }
    return room.peers.find((peer) => peer.socket.id === socketId);
  };

  public deleteSocketId = (socketId: string) => {
    this._roomIdBySocketId.delete(socketId);
  };

  public deleteRoom = (room: Room) => {
    this._roomById.delete(room.id);
  };
}
