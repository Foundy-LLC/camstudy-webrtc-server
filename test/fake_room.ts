import { Room } from "../src/model/Room";
import { Router } from "mediasoup/node/lib/Router";
import { Channel } from "mediasoup/node/lib/Channel";
import { PayloadChannel } from "mediasoup/node/lib/PayloadChannel";
import { room } from "@prisma/client";

const fakeSocket = {
  on: () => {
  }
};

export const fakeRoom: Room = new Room({
  router: new Router({
    internal: { routerId: "0" },
    data: 0,
    channel: new Channel({ producerSocket: fakeSocket, consumerSocket: fakeSocket, pid: 0 }),
    appData: { "0": 0 },
    payloadChannel: new PayloadChannel({ producerSocket: fakeSocket, consumerSocket: fakeSocket })
  }),
  id: "roomId",
  peers: [],
  masterPeerId: "masterId",
  timerLengthMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4
});

export const fakeRoomEntity: room = {
  expired_at: new Date(),
  id: fakeRoom.id,
  long_break: 15,
  long_break_interval: 4,
  master_id: "123",
  password: "undefined",
  short_break: 5,
  thumbnail: "undefined",
  timer: 25,
  title: "444"
}
