import { Router } from "mediasoup/node/lib/Router";

export interface Room {
  router: Router;
  socketIds: number[];
}

class RoomRepository {
  #rooms: Map<string, Room> = new Map<string, Room>();

  getRoomByName = (roomName: string): Room | undefined => {
    return this.#rooms.get(roomName);
  };

  setRoom = (roomName: string, room: Room) => {
    this.#rooms.set(roomName, room);
  };

  removeSocketFromRoom = (socketId: number, roomName: string) => {
    const room = this.#rooms.get(roomName);
    if (room === undefined) {
      throw Error("해당 방이 존재하지 않습니다.");
    }
    this.#rooms.set(roomName, {
      router: room.router,
      socketIds: room.socketIds.filter((e) => e !== socketId),
    });
  };
}

export const roomRepository = new RoomRepository();
