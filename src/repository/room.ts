import {Router} from "mediasoup/node/lib/Router";
import {mediaCodecs} from "../constant/config.js";
import {Worker} from "mediasoup/node/lib/Worker.js";

export interface Room {
    router: Router;
    socketIds: string[];
}

class RoomRepository {
    #rooms: Map<string, Room> = new Map<string, Room>();

    joinRoom = (roomName: string, socketId: string): Router | undefined => {
        const room = this.getRoomByName(roomName)
        if (room === undefined) {
            return undefined
        }
        this.#rooms.set(roomName, {
            router: room.router,
            socketIds: [...room.socketIds, socketId]
        })
        return room.router
    }

    createRoom = async (roomName: string, socketId: string, worker: Worker) => {
        const router = await worker.createRouter({mediaCodecs});
        this.#rooms.set(roomName, {
            router: router,
            socketIds: [socketId],
        });
        return router;
    };

    getRoomByName = (roomName: string): Room | undefined => {
        return this.#rooms.get(roomName);
    };

    removeSocket = (socketId: string, roomName: string) => {
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
