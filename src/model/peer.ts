import { Socket } from "socket.io";
import { Transport } from "mediasoup/node/lib/Transport";
import { Producer } from "mediasoup/node/lib/Producer";
import { Consumer } from "mediasoup/node/lib/Consumer";

export interface Peer {
  socket: Socket;
  name: string;
  isAdmin: boolean;
  producerTransport: Transport | undefined;
  consumerTransports: Transport[];
  producers: Producer[];
  consumers: Consumer[];
}

export const createPeer = (
  socket: Socket,
  name: string,
  isAdmin: boolean
): Peer => {
  return {
    socket,
    name: "",
    isAdmin: isAdmin,
    producerTransport: undefined,
    consumerTransports: [],
    producers: [],
    consumers: []
  };
};