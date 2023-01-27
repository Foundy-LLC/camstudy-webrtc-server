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
import { RoomRepository } from "../repository/room_repository.js";

class RoomService {

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
    const newPeer: Peer = new Peer(socket, "TODO", false);
    const newRoom: Room = room.copyWithNewPeer(newPeer);
    this._roomRepository.setRoom(newRoom, socket.id);
    return room.router;
  };

  createAndJoinRoom = async (roomName: string, socket: Socket, worker: Worker) => {
    const router = await worker.createRouter({ mediaCodecs });
    // TODO: admin인 경우 매개변수로 받아서 처리하기
    // TODO: 회원 이름 받아서 넣기
    const newPeer = new Peer(socket, "TODO", false);
    const newRoom: Room = new Room({
      router: router,
      id: roomName,
      peers: [newPeer]
    });
    this._roomRepository.setRoom(newRoom, socket.id);
    return router;
  };

  disconnect = (socketId: string) => {
    const room = this._roomRepository.findRoomBySocketId(socketId);
    if (room === undefined) {
      // TODO: 아마 예외처리가 필요할수도?
      return;
    }

    room.disposePeer(socketId);

    this._roomRepository.deleteSocketId(socketId);
    if (!room.hasPeer) {
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
    peer.addTransport(transport, isConsumer);
  };

  findRoomRouterBy = (socketId: string): Router | undefined => {
    return this._roomRepository.findRoomBySocketId(socketId)?.router;
  };

  findOthersProducerIdsInRoom = (requesterSocketId: string): string[] => {
    const room = this._roomRepository.findRoomBySocketId(requesterSocketId);
    return room?.findOthersProducerIds(requesterSocketId) ?? [];
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
    return peer.findConsumerTransportBy(consumerTransportId);
  };

  resumeConsumer = async (socketId: string, consumerId: string) => {
    const peer = this._roomRepository.findPeerBy(socketId);
    if (peer === undefined) {
      return;
    }
    await peer?.resumeConsumer(consumerId);
  };

  isProducerExists = (socketId: string): boolean => {
    const room = this._roomRepository.findRoomBySocketId(socketId);
    if (room === undefined) {
      return false;
    }
    return room.hasProducer();
  };

  addProducer = (socketId: string, producer: Producer) => {
    const peer = this._roomRepository.findPeerBy(socketId);
    if (peer === undefined) {
      // TODO: 예외 처리가 필요할 수도?
      return;
    }
    peer.addProducer(producer);

    producer.on("transportclose", () => {
      console.log("transport for this producer closed ");
      peer.removeProducer(producer);
      producer.close();
    });
  };

  addConsumer = (socketId: string, consumer: Consumer, remoteProducerId: string) => {
    const peer = this._roomRepository.findPeerBy(socketId);
    if (peer === undefined) {
      // TODO: 예외 처리가 필요할 수도?
      return;
    }
    peer.addConsumer(consumer);

    consumer.on("transportclose", () => {
      // TODO: what should I do at here?
      console.log("transport close from consumer");
    });

    consumer.on("producerclose", () => {
      console.log("producer of consumer closed");
      peer.emit(protocol.PRODUCER_CLOSED, { remoteProducerId });
      peer.removeConsumer(consumer);
      consumer.close();
    });
  };

  informConsumersNewProducerAppeared = (
    socketId: string,
    producerId: string
  ) => {
    const room = this._roomRepository.findRoomBySocketId(socketId);
    room?.informConsumersNewProducerAppeared(socketId, producerId);
  };
}

export const roomService = new RoomService();