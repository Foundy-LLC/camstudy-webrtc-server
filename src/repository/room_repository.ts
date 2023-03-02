import { Room } from "../model/Room.js";
import { Peer } from "../model/Peer.js";
import { Router } from "mediasoup/node/lib/Router";
import { room } from "@prisma/client";
import { uuid } from "uuidv4";
import { PomodoroTimerProperty } from "../model/PomodoroTimer";
import prisma from "../../prisma/client.js";
import { RoomJoiner } from "../model/RoomJoiner";
import { BlockedUser } from "../model/BlockedUser";

export const findRoomFromDB = async (roomId: string): Promise<room | null> => {
  return prisma.room.findUnique({
    where: {
      id: roomId
    }
  });
};

export const findBlacklistFromDB = async (roomId: string): Promise<BlockedUser[]> => {
  const blocks = await prisma.block.findMany({
    where: {
      room_id: roomId
    },
    include: {
      user_account: {
        select: {
          name: true
        }
      }
    }
  });
  return blocks.map((block) => {
    return {
      id: block.user_id,
      name: block.user_account.name
    };
  });
};

export const findMasterIdFromDB = async (roomId: string): Promise<string | undefined> => {
  const result = await prisma.room.findUnique({
    where: {
      id: roomId
    },
    select: {
      master_id: true
    }
  });
  return result?.master_id;
};

export const createStudyHistory = async (
  roomId: string,
  userId: string
) => {
  await prisma.study_history.create({
    data: {
      id: uuid(),
      room_id: roomId,
      user_id: userId,
      join_at: new Date()
    }
  });
};

export const updateExitAtOfStudyHistory = async (
  roomId: string,
  userId: string
) => {
  await prisma.$transaction(async (tx) => {
    const history = await tx.study_history.findFirst({
      where: {
        room_id: roomId,
        user_id: userId,
        exit_at: null
      }
    });
    if (history == null) {
      return;
    }
    await tx.study_history.update({
      where: {
        id_user_id_room_id: {
          id: history.id,
          user_id: userId,
          room_id: roomId
        }
      },
      data: {
        exit_at: new Date()
      }
    });
  });
};

export const updatePomodoroTimerInRoom = async (
  roomId: string,
  newProperty: PomodoroTimerProperty
) => {
  await prisma.room.update({
    where: {
      id: roomId
    },
    data: {
      timer: newProperty.timerLengthMinutes,
      short_break: newProperty.shortBreakMinutes,
      long_break: newProperty.longBreakMinutes,
      long_break_interval: newProperty.longBreakInterval
    }
  });
};

export const blockUser = async (
  userId: string,
  roomId: string
) => {
  await prisma.block.create({
    data: {
      room_id: roomId,
      user_id: userId
    }
  });
};

export const unblockUser = async (
  userId: string,
  roomId: string
) => {
  await prisma.block.delete({
    where: {
      room_id_user_id: {
        room_id: roomId,
        user_id: userId
      }
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

  public createAndJoin = async (
    socketId: string,
    router: Router,
    roomId: string,
    firstPeer: Peer
  ): Promise<Room> => {
    const roomFromDB = await findRoomFromDB(roomId);
    if (roomFromDB == null) {
      throw Error("방이 DB에 존재하지 않습니다. 방이 DB에 존재할 때만 소켓에서 방을 생성할 수 있습니다.");
    }
    const blacklist = await findBlacklistFromDB(roomId);

    const newRoom: Room = new Room({
      router: router,
      id: roomId,
      peers: [firstPeer],
      masterPeerId: roomFromDB.master_id,
      timerLengthMinutes: roomFromDB.timer,
      shortBreakMinutes: roomFromDB.short_break,
      longBreakMinutes: roomFromDB.long_break,
      longBreakInterval: roomFromDB.long_break_interval,
      blacklist: blacklist
    });
    this._setRoom(newRoom, socketId);
    console.log("New room created!: ", newRoom.id);
    return newRoom;
  };

  public join = (
    roomId: string,
    peer: Peer
  ): Room | undefined => {
    const room = this.findRoomById(roomId);
    if (room === undefined) {
      return undefined;
    }
    room.join(peer);
    this._setRoom(room, peer.socketId);
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
    return room.findPeerBySocketId(socketId);
  };

  public getJoinerList = (roomId: string): RoomJoiner[] => {
    const room = this.findRoomById(roomId);
    if (room === undefined) {
      return [];
    }
    return room.getJoiners();
  };

  public getMasterId = async (roomId: string): Promise<string> => {
    const room = this.findRoomById(roomId);
    if (room === undefined) {
      const masterId = await findMasterIdFromDB(roomId);
      if (masterId === undefined) {
        throw Error("해당 방이 존재하지 않습니다.");
      }
      return masterId;
    }
    return room.masterId;
  };

  public getBlacklist = async (roomId: string): Promise<BlockedUser[]> => {
    const room = this.findRoomById(roomId);
    if (room === undefined) {
      return findBlacklistFromDB(roomId);
    }
    return room.blacklist;
  };

  public getPassword = async (roomId: string): Promise<string | undefined> => {
    const roomFromDB = await findRoomFromDB(roomId);
    return roomFromDB?.password ?? undefined;
  };

  public deleteSocketId = (socketId: string) => {
    this._roomIdBySocketId.delete(socketId);
  };

  public deleteRoom = (room: Room) => {
    this._roomById.delete(room.id);
  };
}
