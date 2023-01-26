import { Router } from "mediasoup/node/lib/Router.js";
import { Socket } from "socket.io";
import { Transport } from "mediasoup/node/lib/Transport.js";
import { Producer } from "mediasoup/node/lib/Producer.js";
import { Consumer } from "mediasoup/node/lib/Consumer.js";
import { Worker } from "mediasoup/node/lib/Worker.js";
import { mediaCodecs } from "../constant/config.js";
import * as protocol from "../constant/protocol.js";
import { Peer } from "../model/peer";
import { Room } from "../model/room";

const createPeer = (
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

class RoomRepository {

  readonly #roomByRoomName: Map<string, Room> = new Map<string, Room>();

  readonly #roomNameBySocketId: Map<string, string> = new Map<string, string>();

  /**
   * 방에 접속한다. 만약 {@link roomName} 방이 없다면 `undefined`를 반환한다.
   * @param roomName 접속할 방의 이름
   * @param socket 접속하는 피어의 소켓
   */
  joinRoom = (roomName: string, socket: Socket): Router | undefined => {
    const room = this.findRoomByName(roomName);
    if (room === undefined) {
      return undefined;
    }
    // TODO: admin인 경우 매개변수로 받아서 처리하기
    // TODO: 회원 이름 받아서 넣기
    const newPeer: Peer = createPeer(socket, "TODO", false);
    this.#roomByRoomName.set(roomName, {
      ...room,
      peers: [...room.peers, newPeer]
    });
    this.#roomNameBySocketId.set(socket.id, roomName);
    return room.router;
  };

  createAndJoinRoom = async (roomName: string, socket: Socket, worker: Worker) => {
    const router = await worker.createRouter({ mediaCodecs });
    // TODO: admin인 경우 매개변수로 받아서 처리하기
    // TODO: 회원 이름 받아서 넣기
    const newPeer = createPeer(socket, "TODO", false);
    this.#roomByRoomName.set(roomName, {
      router: router,
      name: roomName,
      peers: [newPeer]
    });
    this.#roomNameBySocketId.set(socket.id, roomName);
    return router;
  };

  disconnect = (socketId: string) => {
    const roomName = this.#roomNameBySocketId.get(socketId);
    if (roomName === undefined) {
      // TODO: 아마 예외처리가 필요할수도?
      return;
    }
    const room = this.#roomByRoomName.get(roomName);
    if (room === undefined) {
      // TODO: 아마 예외처리가 필요할수도?
      return;
    }
    const peer = room.peers.find((peer: Peer) => peer.socket.id === socketId);

    peer?.consumers.forEach((consumer: Consumer) => consumer.close());
    peer?.producers.forEach((producer: Producer) => producer.close());
    peer?.consumerTransports.forEach((transport: Transport) => transport.close());
    peer?.producerTransport?.close();

    room.peers = room.peers.filter((e: Peer) => e !== peer);
    this.#roomNameBySocketId.delete(socketId);
    if (room.peers.length === 0) {
      this.#roomByRoomName.delete(roomName);
    }
  };

  /**
   * {@link socketId}가 속한 방을 반환한다.
   * @param socketId 피어의 소켓 아이디
   */
  findRoomBySocketId = (socketId: string): Room | undefined => {
    const roomName = this.#roomNameBySocketId.get(socketId);
    if (roomName === undefined) {
      return undefined;
    }
    return this.findRoomByName(roomName);
  };

  findRoomByName = (roomName: string): Room | undefined => {
    return this.#roomByRoomName.get(roomName);
  };

  #findPeerBy = (socketId: string): Peer | undefined => {
    const room = this.findRoomBySocketId(socketId);
    if (room === undefined) {
      return;
    }
    return room.peers.find((peer) => peer.socket.id === socketId);
  };

  addTransport = (
    socketId: string,
    transport: Transport,
    isConsumer: boolean
  ) => {
    const peer = this.#findPeerBy(socketId);
    if (peer === undefined) {
      // TODO: 예외 처리가 필요할 수도?
      return;
    }
    if (isConsumer) {
      peer.consumerTransports = [...peer.consumerTransports, transport];
    } else {
      peer.producerTransport = transport;
    }
  };

  findOthersProducerInRoom = (requesterSocketId: string): Producer[] => {
    const room = this.findRoomBySocketId(requesterSocketId);
    let producers: Producer[] = [];
    room?.peers.forEach(peer => {
      if (peer.socket.id !== requesterSocketId) {
        producers = [...producers, ...peer.producers];
      }
    });
    return producers;
  };

  findProducerTransportBy = (socketId: string): Transport | undefined => {
    const peer = this.#findPeerBy(socketId);
    return peer?.producerTransport;
  };

  findConsumerTransportBy = (
    socketId: string,
    consumerTransportId: string
  ): Transport | undefined => {
    const peer = this.#findPeerBy(socketId);
    if (peer === undefined) {
      return;
    }
    return peer.consumerTransports.find((transport) => {
      return transport.id === consumerTransportId;
    });
  };

  findConsumerById = (socketId: string, consumerId: string): Consumer | undefined => {
    const peer = this.#findPeerBy(socketId);
    if (peer === undefined) {
      return;
    }
    return peer.consumers.find((consumer) => {
      return consumer.id === consumerId;
    });
  };

  isProducerExists = (socketId: string) : boolean => {
    const room = this.findRoomBySocketId(socketId)
    if (room === undefined) {
      return false;
    }
    return room.peers.some(peer => peer.producers.length > 0)
  }

  addProducer = (socketId: string, producer: Producer) => {
    const peer = this.#findPeerBy(socketId);
    if (peer === undefined) {
      // TODO: 예외 처리가 필요할 수도?
      return;
    }
    peer.producers = [...peer.producers, producer];

    producer.on("transportclose", () => {
      console.log("transport for this producer closed ");
      peer.producers = peer.producers.filter((e) => e.id !== producer.id);
      producer.close();
    });
  };

  addConsumer = (socketId: string, consumer: Consumer, remoteProducerId: string) => {
    const peer = this.#findPeerBy(socketId);
    if (peer === undefined) {
      // TODO: 예외 처리가 필요할 수도?
      return;
    }
    peer.consumers = [...peer.consumers, consumer];

    consumer.on("transportclose", () => {
      // TODO: what should I do at here?
      console.log("transport close from consumer");
    });

    consumer.on("producerclose", () => {
      console.log("producer of consumer closed");
      peer.socket.emit(protocol.PRODUCER_CLOSED, { remoteProducerId });
      peer.consumers = peer.consumers.filter((e) => e.id !== consumer.id);
      consumer.close();
    });
  };

  informConsumersNewProducerAppeared = (
    socketId: string,
    producerId: string
  ) => {
    const room = this.findRoomBySocketId(socketId);
    room?.peers.forEach((peer) => {
      if (socketId !== peer.socket.id) {
        peer.socket.emit(protocol.NEW_PRODUCER, { producerId: producerId });
      }
    });
  };
}

export const roomRepository = new RoomRepository();