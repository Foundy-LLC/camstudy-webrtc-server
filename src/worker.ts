import mediasoup from "mediasoup";
import * as protocol from "./constant/protocol.js";
import { Worker } from "mediasoup/node/lib/Worker.js";
import { Socket } from "socket.io";
import { Router } from "mediasoup/node/lib/Router.js";
import { ProducerOptions } from "mediasoup/node/lib/Producer.js";
import { MediaKind, RtpCapabilities, RtpParameters } from "mediasoup/node/lib/RtpParameters.js";
import { DtlsParameters, IceCandidate, IceParameters, WebRtcTransport } from "mediasoup/node/lib/WebRtcTransport.js";
import { roomRepository } from "./repository/room_repository.js";

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
    roomRepository.disconnect(socket.id);
  });

  socket.on(
    protocol.JOIN_ROOM,
    async (
      { roomName }: { roomName: string },
      callback: ({ rtpCapabilities }: { rtpCapabilities: RtpCapabilities; }) => void
    ) => {
      let router = roomRepository.joinRoom(roomName, socket);
      if (router === undefined) {
        router = await roomRepository.createAndJoinRoom(roomName, socket, worker);
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
      const room = roomRepository.findRoomBySocketId(socket.id);
      if (room === undefined) {
        console.error(`There is no room! : ${protocol.CREATE_WEB_RTC_TRANSPORT}`);
        return;
      }

      try {
        const transport = await createWebRtcTransport(room.router);

        roomRepository.addTransport(socket.id, transport, isConsumer);

        callback({
          params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters
          }
        });
      } catch (e) {
        console.log(e);
      }
    }
  );

  socket.on(
    protocol.GET_PRODUCER_IDS,
    (callback: (ids: string[]) => void
    ) => {
      const producers = roomRepository.findOthersProducerInRoom(socket.id);
      const ids = producers.map((producer) => producer.id);
      console.log("getProducers: callback with ", ids);

      callback(ids);
    });

  // see client's socket.emit('transport-produce', ...)
  socket.on(
    protocol.TRANSPORT_PRODUCER,
    async (
      { kind, rtpParameters, appData }: ProducerOptions,
      callback: ({ id, producersExist }: { id: string; producersExist: boolean; }) => void
    ) => {
      const producerTransport = roomRepository.findProducerTransportBy(socket.id);
      if (producerTransport === undefined) {
        // TODO: 예외 처리가 필요할 수도?
        return;
      }
      const producer = await producerTransport.produce({
        kind,
        rtpParameters
      });

      roomRepository.addProducer(socket.id, producer);
      roomRepository.informConsumersNewProducerAppeared(socket.id, producer.id);

      console.log("Producer ID: ", producer.id, producer.kind);
      // Send back to the client the Producer's id
      callback({
        id: producer.id,
        producersExist: roomRepository.isProducerExists(socket.id)
      });
    }
  );

  // see client's socket.emit('transport-producer-connect', ...)
  socket.on(
    protocol.TRANSPORT_PRODUCER_CONNECT,
    ({ dtlsParameters }: { dtlsParameters: DtlsParameters }) => {
      console.log("DTLS PARAMS... ", { dtlsParameters });

      const producerTransport = roomRepository.findProducerTransportBy(socket.id);
      producerTransport?.connect({ dtlsParameters });
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
        const room = roomRepository.findRoomBySocketId(socket.id);
        if (room === undefined) {
          // TODO: 예외처리가 필요할 수도?
          return;
        }
        const consumerTransport = roomRepository.findConsumerTransportBy(
          socket.id,
          serverConsumerTransportId
        );
        if (consumerTransport === undefined) {
          // TODO: 예외처리가 필요할 수도?
          return;
        }
        const canConsume = room.router.canConsume({
          producerId: remoteProducerId,
          rtpCapabilities
        });

        console.log("can consume: ", canConsume);

        // check if the router can consume the specified producer
        if (canConsume) {
          // transport can now consume and return a consumer
          const consumer = await consumerTransport.consume({
            producerId: remoteProducerId,
            rtpCapabilities,
            paused: true
          });

          roomRepository.addConsumer(socket.id, consumer, remoteProducerId);

          // from the consumer extract the following params
          // to send back to the Client
          const params = {
            id: consumer.id,
            producerId: remoteProducerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            serverConsumerId: consumer.id
          };

          // send the parameters to the client
          callback({ params });
        }
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
      const consumerTransport = roomRepository.findConsumerTransportBy(
        socket.id,
        serverConsumerTransportId
      );
      await consumerTransport?.connect({ dtlsParameters });
    }
  );

  socket.on(
    protocol.CONSUME_RESUME,
    async ({ serverConsumerId }: { serverConsumerId: string }) => {
      console.log("consumer resume");
      const consumer = roomRepository.findConsumerById(socket.id, serverConsumerId);
      await consumer?.resume();
    }
  );
};

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
