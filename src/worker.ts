import mediasoup from "mediasoup";
import * as protocol from "./constant/protocol.js";
import { Worker } from "mediasoup/node/lib/Worker.js";
import { Socket } from "socket.io";
import { ProducerOptions } from "mediasoup/node/lib/Producer.js";
import { MediaKind, RtpCapabilities, RtpParameters } from "mediasoup/node/lib/RtpParameters.js";
import { DtlsParameters, IceCandidate, IceParameters } from "mediasoup/node/lib/WebRtcTransport.js";
import { roomService } from "./service/room_service.js";
import { UserAndProducerId } from "./model/UserAndProducerId";
import { PomodoroTimerProperty } from "./model/PomodoroTimer";
import { WaitingRoomData } from "./model/WaitingRoomData";
import { JoinRoomSuccessCallbackProperty } from "./model/JoinRoomSuccessCallbackProperty.js";
import { JoinRoomFailureCallbackProperty } from "./model/JoinRoomFailureCallbackProperty.js";
import { getUserBy } from "./repository/user_repository.js";
import { Peer } from "./model/Peer.js";

/**
 * Worker
 * |-> Router(s)
 *     |-> Producer Transport(s)
 *         |-> Producer
 *     |-> Consumer Transport(s)
 *         |-> Consumer
 **/
let worker: Worker;

const createWorker = async (): Promise<Worker> => {
  worker = await mediasoup.createWorker({
    rtcMinPort: 2000,
    rtcMaxPort: 2020
  });
  console.log(`worker pid ${worker.pid}`);

  worker.on("died", () => {
    // This implies something serious happened, so kill the application
    console.error("mediasoup worker has died");
    setTimeout(() => process.exit(1), 2000); // exit in 2 seconds
  });

  return worker;
};

// We create a Worker as soon as our application starts
createWorker().then((value) => {
  worker = value;
});

export const handleConnect = async (socket: Socket) => {
  let roomIdToJoin: string;

  console.log(socket.id);

  socket.emit(protocol.CONNECTION_SUCCESS, {
    socketId: socket.id
  });

  socket.on(protocol.DISCONNECT, () => {
    console.log("peer disconnected");
    roomService.disconnect(socket.id);
  });

  socket.on(
    protocol.JOIN_WAITING_ROOM,
    async (roomId: string, callback: (waitingRoomData: WaitingRoomData) => void) => {
      console.log("CONNECT TO WAITING ROOM:", roomId);
      roomIdToJoin = roomId;
      const waitingRoomData = await roomService.joinWaitingRoom(roomId, socket);
      callback(waitingRoomData);
    }
  );

  socket.on(
    protocol.JOIN_ROOM,
    async (
      {
        userId,
        mutedHeadset,
        roomPasswordInput
      }: { userId: string, mutedHeadset: boolean, roomPasswordInput: string },
      callback: (
        data: JoinRoomSuccessCallbackProperty | JoinRoomFailureCallbackProperty
      ) => void
    ) => {
      if (roomIdToJoin === undefined) {
        throw Error("??? ?????? ??????????????? ???????????? ????????? ?????? ID??? ???????????? ????????????.");
      }

      const canJoinRoomResult = await roomService.canJoinRoom(userId, roomIdToJoin, roomPasswordInput);
      if (!canJoinRoomResult.canJoin) {
        callback({ message: canJoinRoomResult.message, type: "failure" });
        return;
      }
      const user = await getUserBy(userId);
      if (user == null) {
        throw Error("DB?????? ?????? ????????? ?????? ???????????????.");
      }
      console.log("JOIN ROOM:", roomIdToJoin);
      const peer = new Peer(userId, socket, user.name, mutedHeadset);
      let room = await roomService.joinRoom(roomIdToJoin, peer);
      if (room === undefined) {
        room = await roomService.createAndJoinRoom(roomIdToJoin, peer, socket, worker);
      }

      const rtpCapabilities = room.router.rtpCapabilities;
      callback({
        type: "success",
        rtpCapabilities,
        peerStates: room.getPeerStates(),
        // ex: 2023-02-05T11:48:59.636Z
        timerStartedDate: room.timerEventDate?.toISOString(),
        timerState: room.timerState,
        timerProperty: room.timerProperty
      });
    }
  );

  // Client emits a request to create server side Transport
  // We need to differentiate between the producer and consumer transports
  socket.on(
    protocol.CREATE_WEB_RTC_TRANSPORT,
    async (
      { isConsumer }: { isConsumer: boolean },
      callback: (data: {
        id: string;
        iceParameters: IceParameters;
        iceCandidates: IceCandidate[];
        dtlsParameters: DtlsParameters;
      }) => void
    ) => {
      try {
        const transport = await roomService.createTransport(socket.id, isConsumer);
        if (transport === undefined) {
          console.error(`There is no room! : ${protocol.CREATE_WEB_RTC_TRANSPORT}`);
          return;
        }
        callback({
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters
        });
      } catch (e) {
        // TODO: ?????????????????? ?????? ????????????
        console.log(e);
      }
    }
  );

  socket.on(
    protocol.GET_PRODUCER_IDS,
    (callback: (ids: UserAndProducerId[]) => void
    ) => {
      const ids = roomService.findOthersProducerIdsInRoom(socket.id);
      console.log("getProducers: callback with ", ids);
      callback(ids);
    }
  );

  // see client's socket.emit('transport-produce', ...)
  socket.on(
    protocol.TRANSPORT_PRODUCER,
    async (
      options: ProducerOptions,
      callback: (id: string) => void
    ) => {
      const producer = await roomService.createProducer(socket.id, options);
      if (producer === undefined) {
        return;
      }
      roomService.informConsumersNewProducerAppeared(socket.id, producer.id);

      console.log("Producer ID: ", producer.id, producer.kind);
      // Send back to the client the Producer's id
      callback(producer.id);

      producer.on("transportclose", () => {
        console.log("transport for this producer closed ");
        roomService.removeProducer(socket.id, producer);
      });
    }
  );

  // see client's socket.emit('transport-producer-connect', ...)
  socket.on(
    protocol.TRANSPORT_PRODUCER_CONNECT,
    (dtlsParameters: DtlsParameters) => {
      console.log("DTLS PARAMS... ", { dtlsParameters });
      roomService.connectSendTransport(socket.id, dtlsParameters);
    }
  );

  socket.on(
    protocol.CONSUME,
    async (
      {
        rtpCapabilities,
        remoteProducerId,
        serverReceiveTransportId
      }: {
        rtpCapabilities: RtpCapabilities;
        remoteProducerId: string;
        serverReceiveTransportId: string;
      },
      // TODO: media-soup??? ???????????? ???????????? ????????????
      callback: (
        data: {
          id: string;
          producerId: string;
          kind: MediaKind;
          rtpParameters: RtpParameters;
          serverConsumerId: string;
        } | { error: any }
      ) => void
    ) => {
      try {
        const consumer = await roomService.createConsumer(
          socket.id,
          remoteProducerId,
          serverReceiveTransportId,
          rtpCapabilities
        );
        if (consumer === undefined) {
          return;
        }
        const params = {
          id: consumer.id,
          producerId: remoteProducerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
          serverConsumerId: consumer.id
        };
        callback(params);

        consumer.on("transportclose", () => {
          // TODO: what should I do at here?
          console.log("transport close from consumer");
        });
        consumer.on("producerclose", () => {
          console.log("producer of consumer closed");
          roomService.removeConsumer(socket.id, consumer);
          socket.emit(protocol.PRODUCER_CLOSED, { remoteProducerId });
        });
      } catch (error: any) {
        console.log(error.message);
        callback({ error: error });
      }
    }
  );

  socket.on(
    protocol.TRANSPORT_RECEIVER_CONNECT,
    async ({
             dtlsParameters,
             serverReceiveTransportId
           }: {
      dtlsParameters: DtlsParameters;
      serverReceiveTransportId: string;
    }) => {
      roomService.connectReceiveTransport(socket.id, serverReceiveTransportId, dtlsParameters);
    }
  );

  socket.on(
    protocol.CONSUME_RESUME,
    async (serverConsumerId: string) => {
      console.log("consumer resume");
      await roomService.resumeConsumer(socket.id, serverConsumerId);
    }
  );

  socket.on(
    protocol.CLOSE_VIDEO_PRODUCER,
    () => {
      console.log("Close video producer: ", socket.id);
      roomService.closeVideoProducer(socket.id);
    }
  );

  socket.on(
    protocol.CLOSE_AUDIO_PRODUCER,
    () => {
      console.log("Close audio producer: ", socket.id);
      roomService.closeAudioProducer(socket.id);
    }
  );

  socket.on(
    protocol.HIDE_REMOTE_VIDEO,
    (producerId: string) => {
      roomService.hideRemoteVideo(socket.id, producerId);
    }
  );

  socket.on(
    protocol.SHOW_REMOTE_VIDEO,
    (userId: string, callback: (id: UserAndProducerId) => void) => {
      const id = roomService.findVideoProducerIdInRoom(socket.id, userId);
      if (id != null) {
        console.log("getProducer: callback with ", id);
        callback(id);
      }
    }
  );

  socket.on(
    protocol.MUTE_HEADSET,
    () => {
      roomService.muteHeadset(socket.id);
    }
  );

  socket.on(
    protocol.UNMUTE_HEADSET,
    (callback: (ids: UserAndProducerId[]) => void) => {
      roomService.unmuteHeadset(socket.id);
      const ids = roomService.findOthersAudioProducerIdsInRoom(socket.id);
      console.log("getProducers: callback with ", ids);
      callback(ids);
    }
  );

  socket.on(
    protocol.SEND_CHAT,
    (message: string) => {
      roomService.broadcastChat(message, socket.id);
    }
  );

  socket.on(
    protocol.START_TIMER,
    () => {
      roomService.startTimer(socket.id);
    }
  );

  socket.on(
    protocol.EDIT_AND_STOP_TIMER,
    (timerProperty: PomodoroTimerProperty) => {
      roomService.editAndStopTimer(socket.id, timerProperty);
    }
  );

  socket.on(
    protocol.KICK_USER,
    (userId: string) => {
      roomService.kickUser(socket.id, userId);
    }
  );

  socket.on(
    protocol.BLOCK_USER,
    (userId: string) => {
      roomService.blockUser(socket.id, userId);
    }
  );

  socket.on(
    protocol.UNBLOCK_USER,
    async (userId: string, callback: (isSuccess: boolean, message: string) => void) => {
      try {
        await roomService.unblockUser(socket.id, userId);
        callback(true, "?????? ????????? ??????????????????.");
      } catch (e) {
        let message = "?????? ?????? ????????? ??????????????????.";
        if (typeof e === "string") {
          message = e;
        }
        callback(false, message);
      }
    }
  );
};
