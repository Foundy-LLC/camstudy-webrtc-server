import { Router } from "mediasoup/node/lib/Router.js";
import { Socket } from "socket.io";
import { Producer } from "mediasoup/node/lib/Producer.js";
import { Consumer } from "mediasoup/node/lib/Consumer.js";
import { Worker } from "mediasoup/node/lib/Worker.js";
import { mediaCodecs } from "../constant/config.js";
import * as protocol from "../constant/protocol.js";
import {
  BLOCK_USER,
  KICK_USER,
  OTHER_PEER_EXITED_ROOM,
  OTHER_PEER_JOINED_ROOM,
  PEER_STATE_CHANGED,
  START_LONG_BREAK,
  START_SHORT_BREAK,
  START_TIMER
} from "../constant/protocol.js";
import { Peer } from "../model/Peer.js";
import {
  blockUser,
  createStudyHistory,
  findRoomFromDB,
  finishRoomIgnition,
  RoomRepository,
  startRoomIgnition,
  unblockUser,
  updateExitAtOfStudyHistory
} from "../repository/room_repository.js";
import { DtlsParameters, WebRtcTransport } from "mediasoup/node/lib/WebRtcTransport";
import { ProducerOptions } from "mediasoup/node/lib/Producer";
import { Transport } from "mediasoup/node/lib/Transport";
import { RtpCapabilities } from "mediasoup/node/lib/RtpParameters";
import { UserAndProducerId } from "../model/UserAndProducerId";
import { ChatMessage } from "../model/ChatMessage";
import { uuid } from "uuidv4";
import { PomodoroTimerEvent, PomodoroTimerObserver, PomodoroTimerProperty } from "../model/PomodoroTimer.js";
import { Room } from "../model/Room";
import { MAX_ROOM_CAPACITY } from "../constant/room_constant.js";
import { WaitingRoomData } from "../model/WaitingRoomData.js";
import { WaitingRoomRepository } from "../repository/waiting_room_repository.js";
import { RoomJoiner } from "../model/RoomJoiner.js";
import { PeerDisconnectResult } from "../model/PeerDisconnectResult";

export class RoomService {

  constructor(
    private readonly _roomRepository = new RoomRepository(),
    private readonly _waitingRoomRepository = new WaitingRoomRepository()
  ) {
  }

  getRoomCount = (): number => {
    return this._roomRepository.getRoomCount();
  };

  joinWaitingRoom = async (roomId: string, socket: Socket): Promise<WaitingRoomData | undefined> => {
    const exists = (await findRoomFromDB(roomId)) != null;
    if (!exists) {
      return undefined;
    }
    const joinerList = this._roomRepository.getJoinerList(roomId);
    const capacity = MAX_ROOM_CAPACITY;
    const masterId = await this._roomRepository.getMasterId(roomId);
    const blacklist = await this._roomRepository.getBlacklist(roomId);
    const hasPassword = await this._roomRepository.getPassword(roomId) != null;

    this._waitingRoomRepository.join(roomId, socket);

    return {
      joinerList,
      capacity,
      masterId,
      blacklist,
      hasPassword
    };
  };

  // TODO: 이미 방에 접속한 경우도 체크하기
  canJoinRoom = async (
    userId: string,
    roomId: string,
    roomPasswordInput: string
  ): Promise<{ canJoin: boolean, message: string }> => {
    const joinerList = this._roomRepository.getJoinerList(roomId);
    const capacity = MAX_ROOM_CAPACITY;
    const masterId = await this._roomRepository.getMasterId(roomId);
    if (masterId !== userId && capacity <= joinerList.length) {
      return {
        canJoin: false,
        message: "방 인원이 가득 차서 입장할 수 없습니다."
      };
    }
    const blacklist = await this._roomRepository.getBlacklist(roomId);
    if (blacklist.some((user) => user.id === userId)) {
      return {
        canJoin: false,
        message: "방 접근이 차단되에 입장할 수 없습니다."
      };
    }
    const password = await this._roomRepository.getPassword(roomId);
    if (password !== undefined && password !== roomPasswordInput) {
      return {
        canJoin: false,
        message: "방 비밀번호가 일치하지 않습니다."
      };
    }
    return {
      canJoin: true,
      message: ""
    };
  };

  /**
   * 방에 접속한다. 만약 방이 없다면 `undefined`를 반환한다.
   * @param roomId 접속할 방의 아이디
   * @param peer 접속하는 유저
   */
  joinRoom = async (
    roomId: string,
    peer: Peer
  ): Promise<Room | undefined> => {
    const room = this._roomRepository.join(roomId, peer);
    if (room === undefined) {
      return undefined;
    }
    this._waitingRoomRepository.remove(peer.socketId);
    this._waitingRoomRepository.notifyOthers(
      roomId,
      OTHER_PEER_JOINED_ROOM,
      { id: peer.uid, name: peer.name, profileImage: peer.profileImage } as RoomJoiner
    );
    await createStudyHistory(room.id, peer.uid);
    await this._startRoomIgnitionIfPossible(room);
    return room;
  };

  createAndJoinRoom = async (
    roomId: string,
    peer: Peer,
    socket: Socket,
    worker: Worker
  ): Promise<Room> => {
    const router = await worker.createRouter({ mediaCodecs });
    this._waitingRoomRepository.remove(socket.id);
    this._waitingRoomRepository.notifyOthers(
      roomId,
      OTHER_PEER_JOINED_ROOM,
      { id: peer.uid, name: peer.name, profileImage: peer.profileImage } as RoomJoiner
    );
    const room = await this._roomRepository.createAndJoin(socket.id, router, roomId, peer);
    await createStudyHistory(roomId, peer.uid);
    await this._startRoomIgnitionIfPossible(room);
    return room;
  };

  disconnect = async (
    socketId: string
  ): Promise<PeerDisconnectResult> => {
    this._waitingRoomRepository.remove(socketId);
    const room = this._roomRepository.findRoomBySocketId(socketId);
    let result: PeerDisconnectResult = { type: "none" };
    if (room === undefined) {
      // TODO: 아마 예외처리가 필요할수도?
      return result;
    }
    const disposedPeer = room.disposePeer(socketId);
    this._roomRepository.deleteSocketId(socketId);
    if (room.hasPeer) {
      room.broadcastProtocol({
        protocol: protocol.OTHER_PEER_DISCONNECTED,
        args: { disposedPeerId: disposedPeer.uid },
        where: (peer) => peer.socketId !== socketId
      });
    } else {
      room.dispose();
      this._roomRepository.deleteRoom(room);
      result = { type: "roomRemoved", roomId: room.id };
    }

    this._waitingRoomRepository.notifyOthers(
      room.id,
      OTHER_PEER_EXITED_ROOM,
      disposedPeer.uid
    );

    await updateExitAtOfStudyHistory(room.id, disposedPeer.uid);
    await this._finishRoomIgnitionIfEnded(room);
    return result;
  };

  private _startRoomIgnitionIfPossible = async (room: Room) => {
    if (room.peerCount == 2) {
      await startRoomIgnition(room.id);
    }
  };

  private _finishRoomIgnitionIfEnded = async (room: Room) => {
    if (room.peerCount == 1) {
      await finishRoomIgnition(room.id);
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

  connectSendTransport = (
    socketId: string,
    dtlsParameters: DtlsParameters
  ) => {
    const sendTransport = this.findSendTransportBy(socketId);
    sendTransport?.connect({ dtlsParameters });
  };

  connectReceiveTransport = (
    socketId: string,
    receiveTransportId: string,
    dtlsParameters: DtlsParameters
  ) => {
    const receiveTransport = this.findReceiveTransportBy(
      socketId,
      receiveTransportId
    );
    receiveTransport?.connect({ dtlsParameters });
  };

  closeVideoProducer = async (socketId: string) => {
    const peer = this._roomRepository.findPeerBy(socketId);
    if (peer === undefined) {
      throw Error(`There is no peer by ${socketId}`);
    }
    peer.closeAndRemoveVideoProducer();
    await this.broadcastPeerStateChanged(socketId);
  };

  closeAudioProducer = async (socketId: string) => {
    const peer = this._roomRepository.findPeerBy(socketId);
    if (peer === undefined) {
      throw Error(`There is no peer by ${socketId}`);
    }
    peer.closeAndRemoveAudioProducer();
    await this.broadcastPeerStateChanged(socketId);
  };

  hideRemoteVideo = async (socketId: string, producerId: string) => {
    const peer = this._roomRepository.findPeerBy(socketId);
    if (peer === undefined) {
      throw Error(`There is no peer by ${socketId}`);
    }
    peer.hideRemoteVideo(producerId);
    await this.broadcastPeerStateChanged(socketId);
  };

  muteHeadset = async (socketId: string) => {
    const peer = this._roomRepository.findPeerBy(socketId);
    if (peer === undefined) {
      return;
    }
    peer.muteHeadset();
    await this.broadcastPeerStateChanged(socketId);
  };

  unmuteHeadset = async (socketId: string) => {
    const peer = this._roomRepository.findPeerBy(socketId);
    if (peer === undefined) {
      return;
    }
    peer.unmuteHeadset();
    await this.broadcastPeerStateChanged(socketId);
  };

  findRoomRouterBy = (socketId: string): Router | undefined => {
    return this._roomRepository.findRoomBySocketId(socketId)?.router;
  };

  findOthersProducerIdsInRoom = (requesterSocketId: string): UserAndProducerId[] => {
    const room = this._roomRepository.findRoomBySocketId(requesterSocketId);
    return room?.findOthersProducerIds(requesterSocketId) ?? [];
  };

  findOthersAudioProducerIdsInRoom = (requesterSocketId: string): UserAndProducerId[] => {
    const room = this._roomRepository.findRoomBySocketId(requesterSocketId);
    return room?.findOthersAudioProducerIds(requesterSocketId) ?? [];
  };

  findVideoProducerIdInRoom = (requesterSocketId: string, userId: string): UserAndProducerId | undefined => {
    const room = this._roomRepository.findRoomBySocketId(requesterSocketId);
    return room?.findVideoProducerId(userId) ?? undefined;
  };

  findSendTransportBy = (socketId: string): Transport | undefined => {
    const peer = this._roomRepository.findPeerBy(socketId);
    return peer?.sendTransport;
  };

  findReceiveTransportBy = (
    socketId: string,
    receiveTransportId: string
  ): Transport | undefined => {
    const peer = this._roomRepository.findPeerBy(socketId);
    if (peer === undefined) {
      return;
    }
    return peer.findReceiveTransportBy(receiveTransportId);
  };

  resumeConsumer = async (socketId: string, consumerId: string) => {
    const peer = this._roomRepository.findPeerBy(socketId);
    if (peer === undefined) {
      return;
    }
    await peer?.resumeConsumer(consumerId);
    await this.broadcastPeerStateChanged(socketId);
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
    const sendTransport = this.findSendTransportBy(socketId);
    if (sendTransport === undefined) {
      return undefined;
    }
    const producer = await sendTransport.produce(options);
    const peer = this._roomRepository.findPeerBy(socketId);
    if (peer === undefined) {
      producer.close();
      return;
    }
    peer.addProducer(producer);
    await this.broadcastPeerStateChanged(socketId);
    return producer;
  };

  removeProducer = async (socketId: string, producer: Producer) => {
    const peer = this._roomRepository.findPeerBy(socketId);
    if (peer === undefined) {
      // TODO: 예외 처리가 필요할 수도?
      return;
    }
    peer.removeProducer(producer);
    await this.broadcastPeerStateChanged(socketId);
  };

  createConsumer = async (
    socketId: string,
    producerId: string,
    receiveTransportId: string,
    rtpCapabilities: RtpCapabilities
  ): Promise<Consumer | undefined> => {
    const router = roomService.findRoomRouterBy(socketId);
    if (router === undefined) {
      throw Error("router를 찾을 수 없습니다.");
    }
    const receiveTransport = roomService.findReceiveTransportBy(
      socketId,
      receiveTransportId
    );
    if (receiveTransport === undefined) {
      throw Error(`receiveTransport가 없어 consumer를 만들 수 없습니다. ID: ${receiveTransportId}`);
    }
    const peer = this._roomRepository.findPeerBy(socketId);
    if (peer === undefined) {
      return undefined;
    }
    const canConsume = router.canConsume({
      producerId: producerId,
      rtpCapabilities
    });
    if (canConsume) {
      const consumer = await receiveTransport.consume({
        producerId: producerId,
        rtpCapabilities,
        paused: true
      });
      if (!peer.state.enabledHeadset && consumer.kind === "audio") {
        consumer.close();
        return undefined;
      }
      peer.addConsumer(consumer);
      await this.broadcastPeerStateChanged(socketId);
      return consumer;
    }
    return undefined;
  };

  removeConsumer = async (
    socketId: string,
    consumer: Consumer
  ) => {
    const peer = this._roomRepository.findPeerBy(socketId);
    if (peer === undefined) {
      return;
    }
    peer.removeConsumer(consumer);
    await this.broadcastPeerStateChanged(socketId);
  };

  informConsumersNewProducerAppeared = (
    socketId: string,
    producerId: string
  ) => {
    const room = this._roomRepository.findRoomBySocketId(socketId);
    if (room === undefined) {
      throw Error("There is no room!");
    }
    const peer = room.findPeerBySocketId(socketId);
    if (peer === undefined) {
      throw Error("There is no peer!");
    }
    room.broadcastProtocol({
      protocol: protocol.NEW_PRODUCER,
      args: {
        producerId: producerId,
        userId: peer.uid
      },
      where: (peer) => peer.socketId !== socketId
    });
  };

  broadcastChat = (message: string, socketId: string) => {
    const room = this._roomRepository.findRoomBySocketId(socketId);
    if (room === undefined) {
      throw Error("There is no room!");
    }
    const peer = room.findPeerBySocketId(socketId);
    if (peer === undefined) {
      throw Error("There is no peer in the room!");
    }
    const chatMessage: ChatMessage = {
      id: uuid(),
      authorId: peer.uid,
      authorName: peer.name,
      content: message,
      sentAt: new Date().toISOString()
    };
    room.broadcastProtocol({
      protocol: protocol.SEND_CHAT,
      args: chatMessage
    });
  };

  broadcastPeerStateChanged = (peerSocketId: string) => {
    const room = this._roomRepository.findRoomBySocketId(peerSocketId);
    if (room === undefined) {
      throw Error("There is no room!");
    }
    const peer = room.findPeerBySocketId(peerSocketId);
    if (peer === undefined) {
      throw Error("There is no peer!");
    }
    console.log(peer.state);
    room.broadcastProtocol({
      protocol: PEER_STATE_CHANGED,
      args: peer.state,
      where: (p) => p.uid !== peer.uid
    });
  };

  startTimer = (socketId: string) => {
    const room = this._roomRepository.findRoomBySocketId(socketId);
    if (room === undefined) {
      throw Error("There is no room!");
    }
    const observer: PomodoroTimerObserver = {
      onEvent: (event: PomodoroTimerEvent) => {
        let protocolMessage: string;
        switch (event) {
          case PomodoroTimerEvent.ON_START:
            protocolMessage = START_TIMER;
            break;
          case PomodoroTimerEvent.ON_SHORT_BREAK:
            protocolMessage = START_SHORT_BREAK;
            break;
          case PomodoroTimerEvent.ON_LONG_BREAK:
            protocolMessage = START_LONG_BREAK;
            break;
        }
        room.broadcastProtocol({ protocol: protocolMessage });
      }
    };
    room.startTimer(observer);
  };

  editAndStopTimer = (socketId: string, property: PomodoroTimerProperty) => {
    const room = this._roomRepository.findRoomBySocketId(socketId);
    if (room === undefined) {
      throw Error("There is no room!");
    }
    room.editAndStopTimer(property);
  };

  kickUser(socketId: string, userIdToKick: string) {
    const room = this._roomRepository.findRoomBySocketId(socketId);
    if (room === undefined) {
      throw Error("There is no room!");
    }
    const masterPeer = room.findPeerBySocketId(socketId);
    if (masterPeer === undefined) {
      throw Error("There is no peer!");
    }
    if (masterPeer.uid !== room.masterId) {
      throw Error("방장이 아닌 회원이 강퇴를 시도했습니다.");
    }
    const userToKick = room.findPeerById(userIdToKick);
    if (userToKick === undefined) {
      throw Error("강퇴할 해당 회원이 존재하지 않습니다.");
    }
    room.broadcastProtocol({ protocol: KICK_USER, args: userIdToKick });
    userToKick.disconnectSocket();
  }

  async blockUser(socketId: string, userIdToBlock: string) {
    const room = this._roomRepository.findRoomBySocketId(socketId);
    if (room === undefined) {
      throw Error("There is no room!");
    }
    const masterPeer = room.findPeerBySocketId(socketId);
    if (masterPeer === undefined) {
      throw Error("There is no peer!");
    }
    if (masterPeer.uid !== room.masterId) {
      throw Error("방장이 아닌 회원이 차단을 시도했습니다.");
    }
    const userToBlock = room.findPeerById(userIdToBlock);
    if (userToBlock === undefined) {
      throw Error("차단할 해당 회원이 존재하지 않습니다.");
    }
    await blockUser(userToBlock.uid, room.id);
    room.broadcastProtocol({ protocol: BLOCK_USER, args: userIdToBlock });
    room.blockUser(userToBlock.uid, userToBlock.name);
    userToBlock.disconnectSocket();
  }

  async unblockUser(socketId: string, userIdToUnblock: string) {
    const room = this._roomRepository.findRoomBySocketId(socketId);
    if (room === undefined) {
      throw Error("There is no room!");
    }
    const masterPeer = room.findPeerBySocketId(socketId);
    if (masterPeer === undefined) {
      throw Error("There is no peer!");
    }
    if (masterPeer.uid !== room.masterId) {
      throw Error("방장이 아닌 회원이 차단 해제를 시도했습니다.");
    }
    await unblockUser(userIdToUnblock, room.id);
    room.unblockUser(userIdToUnblock);
  }
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
            ip: "0.0.0.0",
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

      resolve(transport);
    } catch (error) {
      reject(error);
    }
  });
};

export const roomService = new RoomService();