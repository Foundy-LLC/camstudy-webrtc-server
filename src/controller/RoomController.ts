import { Router } from "mediasoup/node/lib/Router.js";
import { Socket } from "socket.io";
import { Transport } from "mediasoup/node/lib/Transport.js";
import { Producer } from "mediasoup/node/lib/Producer.js";
import { Consumer } from "mediasoup/node/lib/Consumer.js";
import { Worker } from "mediasoup/node/lib/Worker.js";
import { mediaCodecs } from "../constant/config.js";
import * as protocol from "../constant/protocol.js";
import { Peer } from "../model/peer.js";
import { Room } from "../model/room.js";
import { RoomRepository } from "../repository/RoomRepository.js";

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

class RoomController {

  private readonly _roomRepository: RoomRepository = new RoomRepository();

  /**
   * 방에 접속한다. 만약 방이 없다면 `undefined`를 반환한다.
   * @param roomId 접속할 방의 아이디
   * @param socket 접속하는 피어의 소켓
   */
  joinRoom = (roomId: string, socket: Socket): Router | undefined => {
    const room = this._roomRepository.findRoomById(roomId);
    if (room === undefined) {
      return undefined;
    }
    // TODO: admin인 경우 매개변수로 받아서 처리하기
    // TODO: 회원 이름 받아서 넣기
    const newPeer: Peer = createPeer(socket, "TODO", false);
    const newRoom: Room = {
      ...room,
      peers: [...room.peers, newPeer]
    };
    this._roomRepository.setRoom(newRoom, socket.id);
    return room.router;
  };

  createAndJoinRoom = async (roomName: string, socket: Socket, worker: Worker) => {
    const router = await worker.createRouter({ mediaCodecs });
    // TODO: admin인 경우 매개변수로 받아서 처리하기
    // TODO: 회원 이름 받아서 넣기
    const newPeer = createPeer(socket, "TODO", false);
    const newRoom: Room = {
      router: router,
      id: roomName,
      peers: [newPeer]
    };
    this._roomRepository.setRoom(newRoom, socket.id);
    return router;
  };

  disconnect = (socketId: string) => {
    const room = this._roomRepository.findRoomBySocketId(socketId);
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

    this._roomRepository.deleteSocketId(socketId)
    if (room.peers.length === 0) {
      this._roomRepository.deleteRoom(room);
    }
  };

  addTransport = (
    socketId: string,
    transport: Transport,
    isConsumer: boolean
  ) => {
    const peer = this._roomRepository.findPeerBy(socketId);
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

  findRoomRouterBy = (socketId: string): Router | undefined => {
    return this._roomRepository.findRoomBySocketId(socketId)?.router
  }

  findOthersProducerInRoom = (requesterSocketId: string): Producer[] => {
    const room = this._roomRepository.findRoomBySocketId(requesterSocketId);
    let producers: Producer[] = [];
    room?.peers.forEach((peer) => {
      if (peer.socket.id !== requesterSocketId) {
        producers = [...producers, ...peer.producers];
      }
    });
    return producers;
  };

  findProducerTransportBy = (socketId: string): Transport | undefined => {
    const peer = this._roomRepository.findPeerBy(socketId);
    return peer?.producerTransport;
  };

  findConsumerTransportBy = (
    socketId: string,
    consumerTransportId: string
  ): Transport | undefined => {
    const peer = this._roomRepository.findPeerBy(socketId);
    if (peer === undefined) {
      return;
    }
    return peer.consumerTransports.find((transport) => {
      return transport.id === consumerTransportId;
    });
  };

  findConsumerById = (socketId: string, consumerId: string): Consumer | undefined => {
    const peer = this._roomRepository.findPeerBy(socketId);
    if (peer === undefined) {
      return;
    }
    return peer.consumers.find((consumer) => {
      return consumer.id === consumerId;
    });
  };

  isProducerExists = (socketId: string): boolean => {
    const room = this._roomRepository.findRoomBySocketId(socketId);
    if (room === undefined) {
      return false;
    }
    return room.peers.some(peer => peer.producers.length > 0);
  };

  addProducer = (socketId: string, producer: Producer) => {
    const peer = this._roomRepository.findPeerBy(socketId);
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
    const peer = this._roomRepository.findPeerBy(socketId);
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
    const room = this._roomRepository.findRoomBySocketId(socketId);
    room?.peers.forEach((peer) => {
      if (socketId !== peer.socket.id) {
        peer.socket.emit(protocol.NEW_PRODUCER, { producerId: producerId });
      }
    });
  };
}

export const roomController = new RoomController();