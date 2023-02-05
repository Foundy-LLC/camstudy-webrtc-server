import { Room } from "../model/Room.js";
import { Peer } from "../model/Peer.js";
import { Router } from "mediasoup/node/lib/Router";
import { PrismaClient, room } from "@prisma/client";

const prisma = new PrismaClient();

const findRoomFromDB = async (roomId: string): Promise<room | null> => {
  return prisma.room.findUnique({
    where: {
      id: roomId
    }
  });
};

export class RoomRepository {

  private readonly _roomById = new Map<string, Room>();
  private readonly _roomIdBySocketId = new Map<string, string>();

  private _setRoom = (room: Room, socketId: string) => {
    this._roomById.set(room.id, room);
    this._roomIdBySocketId.set(socketId, room.id);
  };

  public createAndJoin = async (socketId: string, router: Router, roomId: string, firstPeer: Peer) => {
    const roomFromDB = await findRoomFromDB(roomId);
    if (roomFromDB == null) {
      throw Error("방이 DB에 존재하지 않습니다. 방이 DB에 존재할 때만 소켓에서 방을 생성할 수 있습니다.");
    }
    const newRoom: Room = new Room({
      router: router,
      id: roomId,
      peers: [firstPeer],
      masterPeerId: roomFromDB.master_id,
      timerLengthMinutes: roomFromDB.timer,
      shortBreakMinutes: roomFromDB.short_break,
      longBreakMinutes: roomFromDB.long_break,
      longBreakInterval: roomFromDB.long_break_interval
    });
    this._setRoom(newRoom, socketId);
    console.log("New room created!: ", newRoom);
  };

  public join = (
    roomId: string,
    peer: Peer,
    socketId: string
  ): Room | undefined => {
    const room = this.findRoomById(roomId);
    if (room === undefined) {
      return undefined;
    }
    room.join(peer);
    this._setRoom(room, socketId);
    return room;
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
    return room.findPeerBy(socketId);
  };

  public deleteSocketId = (socketId: string) => {
    this._roomIdBySocketId.delete(socketId);
  };

  public deleteRoom = (room: Room) => {
    this._roomById.delete(room.id);
  };
}
