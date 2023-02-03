import mediasoup from "mediasoup";
import * as protocol from "./constant/protocol.js";
import { Worker } from "mediasoup/node/lib/Worker.js";
import { Socket } from "socket.io";
import { ProducerOptions } from "mediasoup/node/lib/Producer.js";
import { MediaKind, RtpCapabilities, RtpParameters } from "mediasoup/node/lib/RtpParameters.js";
import { DtlsParameters, IceCandidate, IceParameters } from "mediasoup/node/lib/WebRtcTransport.js";
import { roomService } from "./service/room_service.js";
import { UserProducerIdSet } from "./model/user_producer_id_set";

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
  console.log(socket.id);

  socket.emit(protocol.CONNECTION_SUCCESS, {
    socketId: socket.id
  });

  socket.on(protocol.DISCONNECT, () => {
    console.log("peer disconnected");
    roomService.disconnect(socket.id);
  });

  socket.on(
    protocol.JOIN_ROOM,
    async (
      { roomName, userId }: { roomName: string, userId: string },
      callback: ({ rtpCapabilities }: { rtpCapabilities: RtpCapabilities; }) => void
    ) => {
      let router = roomService.joinRoom(roomName, userId, socket);
      if (router === undefined) {
        router = await roomService.createAndJoinRoom(roomName, userId, socket, worker);
      }
      console.log("JOIN ROOM: ", roomName);

      const rtpCapabilities = router.rtpCapabilities;
      callback({ rtpCapabilities });
    }
  );

  // Client emits a request to create server side Transport
  // We need to differentiate between the producer and consumer transports
  socket.on(
    protocol.CREATE_WEB_RTC_TRANSPORT,
    async (
      { isConsumer }: { isConsumer: boolean },
      callback: ({ params }: {
        params: {
          id: string;
          iceParameters: IceParameters;
          iceCandidates: IceCandidate[];
          dtlsParameters: DtlsParameters;
        };
      }) => void
    ) => {
      try {
        const transport = await roomService.createTransport(socket.id, isConsumer);
        if (transport === undefined) {
          console.error(`There is no room! : ${protocol.CREATE_WEB_RTC_TRANSPORT}`);
          return;
        }
        callback({
          params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters
          }
        });
      } catch (e) {
        // TODO: 클라이언트에 에러 전달하기
        console.log(e);
      }
    }
  );

  socket.on(
    protocol.GET_PRODUCER_IDS,
    (callback: (ids: UserProducerIdSet[]) => void
    ) => {
      const ids = roomService.findOthersProducerIdsInRoom(socket.id);
      console.log("getProducers: callback with ", ids);
      callback(ids);
    });

  // see client's socket.emit('transport-produce', ...)
  socket.on(
    protocol.TRANSPORT_PRODUCER,
    async (
      options: ProducerOptions,
      callback: ({ id, producersExist }: { id: string; producersExist: boolean; }) => void
    ) => {
      const producer = await roomService.createProducer(socket.id, options);
      if (producer === undefined) {
        return;
      }
      roomService.informConsumersNewProducerAppeared(socket.id, producer.id);

      console.log("Producer ID: ", producer.id, producer.kind);
      // Send back to the client the Producer's id
      callback({
        id: producer.id,
        producersExist: roomService.isProducerExists(socket.id)
      });

      producer.on("transportclose", () => {
        console.log("transport for this producer closed ");
        roomService.removeProducer(socket.id, producer);
      });
    }
  );

  // see client's socket.emit('transport-producer-connect', ...)
  socket.on(
    protocol.TRANSPORT_PRODUCER_CONNECT,
    ({ dtlsParameters }: { dtlsParameters: DtlsParameters }) => {
      console.log("DTLS PARAMS... ", { dtlsParameters });
      roomService.connectProducerTransport(socket.id, dtlsParameters);
    }
  );

  socket.on(
    protocol.CONSUME,
    async (
      {
        rtpCapabilities,
        remoteProducerId,
        serverConsumerTransportId
      }: {
        rtpCapabilities: RtpCapabilities;
        remoteProducerId: string;
        serverConsumerTransportId: string;
      },
      callback: ({ params }: {
        // TODO: media-soup에 존자해는 타입으로 변환하기
        params: {
          id: string;
          producerId: string;
          kind: MediaKind;
          rtpParameters: RtpParameters;
          serverConsumerId: string;
        } | { error: any };
      }) => void
    ) => {
      try {
        const consumer = await roomService.createConsumer(
          socket.id,
          remoteProducerId,
          serverConsumerTransportId,
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
        callback({ params });

        consumer.on("transportclose", () => {
          // TODO: what should I do at here?
          console.log("transport close from consumer");
        });
        consumer.on("producerclose", () => {
          console.log("producer of consumer closed");
          roomService.removeConsumerAndNotify(socket.id, consumer, remoteProducerId);
        });
      } catch (error: any) {
        console.log(error.message);
        callback({
          params: { error: error }
        });
      }
    }
  );

  socket.on(
    protocol.TRANSPORT_RECEIVER_CONNECT,
    async ({
             dtlsParameters,
             serverConsumerTransportId
           }: {
      dtlsParameters: DtlsParameters;
      serverConsumerTransportId: string;
    }) => {
      roomService.connectConsumerTransport(socket.id, serverConsumerTransportId, dtlsParameters);
    }
  );

  socket.on(
    protocol.CONSUME_RESUME,
    async ({ serverConsumerId }: { serverConsumerId: string }) => {
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
};
