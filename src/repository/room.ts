import {Router} from "mediasoup/node/lib/Router";
import {mediaCodecs} from "../constant/config.js";
import {Worker} from "mediasoup/node/lib/Worker.js";

export interface Room {
    router: Router;
    socketIds: string[];
}

class RoomRepository {
    #rooms: Map<string, Room> = new Map<string, Room>();

    createRoom = async (roomName: string, socketId: string, worker: Worker) => {
        // worker.createRouter(options)
        // options = { mediaCodecs, appData }
        // mediaCodecs -> defined above
        // appData -> custom application data - we are not supplying any
        // none of the two are required
        let router: Router;
        let socketIds: string[] = [];
        const room = this.getRoomByName(roomName);

        if (room !== undefined) {
            router = room.router;
            socketIds = room.socketIds || [];
        } else {
            router = await worker.createRouter({mediaCodecs});
        }
        console.log(`Router ID: ${router.id}`, socketIds.length);
        this.setRoom(roomName, {
            router: router,
            socketIds: [...socketIds, socketId],
        });

        return router;
    };

    getRoomByName = (roomName: string): Room | undefined => {
        return this.#rooms.get(roomName);
    };

    setRoom = (roomName: string, room: Room) => {
        this.#rooms.set(roomName, room);
    };

    removeSocketFromRoom = (socketId: string, roomName: string) => {
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
