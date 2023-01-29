import { Router } from "mediasoup/node/lib/Router.js";
import { Socket } from "socket.io";
import { Producer } from "mediasoup/node/lib/Producer.js";
import { Consumer } from "mediasoup/node/lib/Consumer.js";
import { Worker } from "mediasoup/node/lib/Worker.js";
import { mediaCodecs } from "../constant/config.js";
import * as protocol from "../../../shared/protocol.js";
import { Peer } from "../model/peer.js";
import { Room } from "../model/room.js";
import { RoomRepository } from "../repository/room_repository.js";
import { DtlsParameters, WebRtcTransport } from "mediasoup/node/lib/WebRtcTransport";
import { ProducerOptions } from "mediasoup/node/lib/Producer";
import { Transport } from "mediasoup/node/lib/Transport";
import { RtpCapabilities } from "mediasoup/node/lib/RtpParameters";
import { UserProducerIdSet } from "../model/user_producer_id_set";

export class RoomService {

  constructor(
    private readonly _roomRepository: RoomRepository = new RoomRepository()
  ) {
  }

  /**
   * 방에 접속한다. 만약 방이 없다면 `undefined`를 반환한다.
   * @param roomId 접속할 방의 아이디
   * @param userId 접속하는 유저의 아이디
   * @param socket 접속하는 피어의 소켓
   */
  joinRoom = (roomId: string, userId: string, socket: Socket): Router | undefined => {
    const room = this._roomRepository.findRoomById(roomId);
    if (room === undefined) {
      return undefined;
    }
    // TODO: admin인 경우 매개변수로 받아서 처리하기
    // TODO: 회원 이름 받아서 넣기
    const newPeer: Peer = new Peer(userId, socket, "TODO", false);
    const newRoom: Room = room.copyWithNewPeer(newPeer);
    this._roomRepository.setRoom(newRoom, socket.id);
    return room.router;
  };

  createAndJoinRoom = async (roomName: string, userId: string, socket: Socket, worker: Worker) => {
    const router = await worker.createRouter({ mediaCodecs });
    // TODO: admin인 경우 매개변수로 받아서 처리하기
    // TODO: 회원 이름 받아서 넣기
    const newPeer = new Peer(userId, socket, "TODO", false);
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

    const disposedPeerId = room.disposePeer(socketId);
    this._roomRepository.deleteSocketId(socketId);
    if (room.hasPeer) {
      room.broadcastMessage(
        socketId,
        protocol.OTHER_PEER_DISCONNECTED,
        { disposedPeerId: disposedPeerId }
      );
    } else {
      this._roomRepository.deleteRoom(room);
    }
  };

  createTransport = async (
    socketId: string,
    isConsumer: boolean
  ): Promise<WebRtcTransport | undefined> => {
    const router = this.findRoomRouterBy(socketId);
    if (router === undefined) {
      return undefined;
    }
    const transport = await createWebRtcTransport(router);
    const peer = this._roomRepository.findPeerBy(socketId);
    if (peer === undefined) {
      return undefined;
    }
    peer.addTransport(transport, isConsumer);
    return transport;
  };

  connectProducerTransport = (
    socketId: string,
    dtlsParameters: DtlsParameters
  ) => {
    const producerTransport = this.findProducerTransportBy(socketId);
    producerTransport?.connect({ dtlsParameters });
  };

  connectConsumerTransport = (
    socketId: string,
    consumerTransportId: string,
    dtlsParameters: DtlsParameters
  ) => {
    const consumerTransport = this.findConsumerTransportBy(
      socketId,
      consumerTransportId
    );
    consumerTransport?.connect({ dtlsParameters });
  };

  closeProducer = (socketId: string) => {
    const peer = this._roomRepository.findPeerBy(socketId);
    if (peer === undefined) {
      throw Error(`There is no peer by ${socketId}`);
    }
    peer.closeAndRemoveVideoProducer();
  };

  findRoomRouterBy = (socketId: string): Router | undefined => {
    return this._roomRepository.findRoomBySocketId(socketId)?.router;
  };

  findOthersProducerIdsInRoom = (requesterSocketId: string): UserProducerIdSet[] => {
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

  createProducer = async (
    socketId: string,
    options: ProducerOptions
  ): Promise<Producer | undefined> => {
    const producerTransport = roomService.findProducerTransportBy(socketId);
    if (producerTransport === undefined) {
      return undefined;
    }
    const producer = await producerTransport.produce(options);
    const peer = this._roomRepository.findPeerBy(socketId);
    if (peer === undefined) {
      producer.close();
      return;
    }
    peer.addProducer(producer);
    return producer;
  };

  removeProducer = (socketId: string, producer: Producer) => {
    const peer = this._roomRepository.findPeerBy(socketId);
    if (peer === undefined) {
      // TODO: 예외 처리가 필요할 수도?
      return;
    }
    peer.removeProducer(producer);
  };

  createConsumer = async (
    socketId: string,
    producerId: string,
    consumerTransportId: string,
    rtpCapabilities: RtpCapabilities
  ): Promise<Consumer | undefined> => {
    const router = roomService.findRoomRouterBy(socketId);
    if (router === undefined) {
      return undefined;
    }
    const consumerTransport = roomService.findConsumerTransportBy(
      socketId,
      consumerTransportId
    );
    if (consumerTransport === undefined) {
      return undefined;
    }
    const canConsume = router.canConsume({
      producerId: producerId,
      rtpCapabilities
    });
    if (canConsume) {
      const consumer = await consumerTransport.consume({
        producerId: producerId,
        rtpCapabilities,
        paused: true
      });
      const peer = this._roomRepository.findPeerBy(socketId);
      if (peer === undefined) {
        consumer.close();
        return undefined;
      }
      peer.addConsumer(consumer);
      return consumer;
    }
    return undefined;
  };

  removeConsumerAndNotify = (
    socketId: string,
    consumer: Consumer,
    remoteProducerId: string
  ) => {
    const peer = this._roomRepository.findPeerBy(socketId);
    if (peer === undefined) {
      return;
    }
    peer.emit(protocol.PRODUCER_CLOSED, { remoteProducerId });
    peer.removeConsumer(consumer);
  };

  informConsumersNewProducerAppeared = (
    socketId: string,
    producerId: string
  ) => {
    const room = this._roomRepository.findRoomBySocketId(socketId);
    if (room === undefined) {
      throw Error("There is no room!");
    }
    const peer = room.findPeerBy(socketId);
    if (peer === undefined) {
      throw Error("There is no peer!");
    }
    room?.broadcastMessage(
      socketId,
      protocol.NEW_PRODUCER,
      { producerId: producerId, userId: peer.uid }
    );
  };
}

const createWebRtcTransport = async (
  router: Router
): Promise<WebRtcTransport> => {
  return new Promise(async (resolve, reject) => {
    try {
      // https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
      const webRtcTransport_options = {
        listenIps: [
          {
            ip: protocol.IP_ADDRESS,
            announcedIp: protocol.IP_ADDRESS
          }
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true
      };

      // https://mediasoup.org/documentation/v3/mediasoup/api/#router-createWebRtcTransport
      const transport = await router.createWebRtcTransport(
        webRtcTransport_options
      );
      console.log(`transport id: ${transport.id}`);

      transport.on("dtlsstatechange", (dtlsState) => {
        if (dtlsState === "closed") {
          transport.close();
        }
      });

      transport.on("close", () => {
        console.log("transport closed");
      });

      resolve(transport);
    } catch (error) {
      reject(error);
    }
  });
};

export const roomService = new RoomService();