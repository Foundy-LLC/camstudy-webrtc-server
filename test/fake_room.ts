import { Room } from "../src/model/room";
import { Router } from "mediasoup/node/lib/Router";
import { Channel } from "mediasoup/node/lib/Channel";
import { PayloadChannel } from "mediasoup/node/lib/PayloadChannel";

const fakeSocket = {
  on: () => {
  }
};

export const fakeRoom: Room = new Room({
  router: new Router({
    internal: 0,
    data: 0,
    channel: new Channel({ producerSocket: fakeSocket, consumerSocket: fakeSocket, pid: 0 }),
    appData: 0,
    payloadChannel: new PayloadChannel({ producerSocket: fakeSocket, consumerSocket: fakeSocket })
  }),
  id: "roomId",
  peers: []
});