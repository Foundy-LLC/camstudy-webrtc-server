import mediasoup from "mediasoup";
import { mediaCodecs } from "./constant/config.js";
import {
  addConsumer,
  getConsumer,
  removeConsumer,
  removeConsumerBySocketId,
} from "./repository/consumer.js";
import {
  addPeerConsumer,
  addPeerProducer,
  addPeerTransport,
  deletePeer,
  getPeer,
  joinPeer,
} from "./repository/peer.js";
import {
  addProducer,
  getOthersProducerBy,
  isProducerExists,
  removeProducerBySocketId,
} from "./repository/producer.js";
import { roomRepository } from "./repository/room.js";
import {
  addTransport,
  findConsumerTrasport,
  getTransport,
  removeTransportBySocketId,
  removeTransportByTransportId,
} from "./repository/transport.js";
import * as protocol from "./constant/protocol.js";
import { Worker } from "mediasoup/node/lib/Worker.js";
import { Socket } from "socket.io";
import { Router } from "mediasoup/node/lib/Router.js";
import { Transport } from "mediasoup/node/lib/Transport.js";
import { Producer, ProducerOptions } from "mediasoup/node/lib/Producer.js";
import { Consumer } from "mediasoup/node/lib/Consumer.js";
import {
  MediaKind,
  RtpCapabilities,
  RtpParameters,
} from "mediasoup/node/lib/RtpParameters.js";
import {
  DtlsParameters,
  IceCandidate,
  IceParameters,
  WebRtcTransport,
} from "mediasoup/node/lib/WebRtcTransport.js";

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
    rtcMaxPort: 2020,
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
    socketId: socket.id,
  });

  socket.on(protocol.DISCONNECT, () => {
    // do some cleanup
    console.log("peer disconnected");

    removeConsumerBySocketId(socket.id);
    removeProducerBySocketId(socket.id);
    removeTransportBySocketId(socket.id);

    const peer = getPeer(socket.id);
    if (peer !== undefined) {
      const { roomName } = peer;
      deletePeer(socket.id);
      roomRepository.removeSocketFromRoom(socket.id, roomName);
    }
  });

  socket.on(
    protocol.JOIN_ROOM,
    async (
      { roomName }: { roomName: string },
      callback: ({
        rtpCapabilities,
      }: {
        rtpCapabilities: RtpCapabilities;
      }) => void
    ) => {
      // create Router if it does not exist
      // const router1 = rooms[roomName] && rooms[roomName].get('data').router || await createRoom(roomName, socket.id)
      const router1 = await createRoom(roomName, socket.id);
      console.log("JOIN ROOM: ", roomName);
      joinPeer(socket, roomName);

      // get Router RTP Capabilities
      const rtpCapabilities = router1.rtpCapabilities;

      // call callback from the client and send back the rtpCapabilities
      callback({ rtpCapabilities });
    }
  );

  const createRoom = async (roomName: string, socketId: string) => {
    // worker.createRouter(options)
    // options = { mediaCodecs, appData }
    // mediaCodecs -> defined above
    // appData -> custom application data - we are not supplying any
    // none of the two are required
    let router: Router;
    let socketIds: string[] = [];
    const room = roomRepository.getRoomByName(roomName);
    if (room !== undefined) {
      router = room.router;
      socketIds = room.socketIds || [];
    } else {
      router = await worker.createRouter({ mediaCodecs });
    }

    console.log(`Router ID: ${router.id}`, socketIds.length);

    roomRepository.setRoom(roomName, {
      router: router,
      socketIds: [...socketIds, socketId],
    });

    return router;
  };

  // Client emits a request to create server side Transport
  // We need to differentiate between the producer and consumer transports
  socket.on(
    protocol.CREATE_WEB_RTC_TRANSPORT,
    async (
      { isConsumer }: { isConsumer: boolean },
      callback: ({
        params,
      }: {
        params: {
          id: string;
          iceParameters: IceParameters;
          iceCandidates: IceCandidate[];
          dtlsParameters: DtlsParameters;
        };
      }) => void
    ) => {
      const peer = getPeer(socket.id);
      if (peer === undefined) {
        console.error(
          `There is no peer on ${protocol.CREATE_WEB_RTC_TRANSPORT}`
        );
        return;
      }
      const roomName = peer.roomName;
      const room = roomRepository.getRoomByName(roomName);
      if (room === undefined) {
        console.error(
          `There is no room on ${protocol.CREATE_WEB_RTC_TRANSPORT}`
        );
        return;
      }
      // get Router (Room) object this peer is in based on RoomName
      const router = room.router;

      try {
        const transport = await createWebRtcTransport(router);

        callback({
          params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          },
        });

        // add transport to Peer's properties
        onTransportCreated(transport, roomName, isConsumer);
      } catch (e) {
        console.log(e);
      }
    }
  );

  const onTransportCreated = (
    transport: Transport,
    roomName: string,
    isConsumer: boolean
  ) => {
    addTransport(socket.id, transport, roomName, isConsumer);
    addPeerTransport(socket.id, transport.id);
  };

  const onProducerCreated = (producer: Producer, roomName: string) => {
    addProducer(socket.id, producer, roomName);
    addPeerProducer(socket.id, producer.id);
  };

  const onConsume = (consumer: Consumer, roomName: string) => {
    addConsumer(socket.id, consumer, roomName);
    addPeerConsumer(socket.id, consumer.id);
  };

  socket.on(protocol.GET_PRODUCERS, (callback: (ids: string[]) => void) => {
    const peer = getPeer(socket.id);
    if (peer === undefined) {
      console.error(`There is no peer!! : ${protocol.GET_PRODUCERS}`);
      return;
    }
    //return all producer transports
    const roomName = peer.roomName;
    const producerIds = getOthersProducerBy(socket.id, roomName).map(
      (wrapper) => wrapper.producer.id
    );
    console.log("getProducers: callback with ", producerIds);
    // return the producer list back to the client
    callback(producerIds);
  });

  const informConsumers = (
    roomName: string,
    socketId: string,
    producerId: string
  ) => {
    console.log(`just joined, id ${producerId} ${roomName}, ${socketId}`);
    // A new producer just joined
    // let all consumers to consume this producer
    const producers = getOthersProducerBy(socketId, roomName);

    producers.forEach((producerWrapper) => {
      const peer = getPeer(producerWrapper.socketId);
      if (peer !== undefined) {
        const producerSocket = peer.socket;
        // use socket to send producer id to producer
        producerSocket.emit(protocol.NEW_PRODUCER, { producerId: producerId });
      }
    });
  };

  // see client's socket.emit('transport-producer-connect', ...)
  socket.on(
    protocol.TRANSPORT_PRODUCER_CONNECT,
    ({ dtlsParameters }: { dtlsParameters: DtlsParameters }) => {
      console.log("DTLS PARAMS... ", { dtlsParameters });

      getTransport(socket.id).connect({ dtlsParameters });
    }
  );

  // see client's socket.emit('transport-produce', ...)
  socket.on(
    protocol.TRANSPORT_PRODUCER,
    async (
      { kind, rtpParameters, appData }: ProducerOptions,
      callback: ({
        id,
        producersExist,
      }: {
        id: string;
        producersExist: boolean;
      }) => void
    ) => {
      // call produce based on the prameters from the client
      const producer = await getTransport(socket.id).produce({
        kind,
        rtpParameters,
      });
      const peer = getPeer(socket.id);
      if (peer === undefined) {
        console.error(`There is no peer! : ${protocol.TRANSPORT_PRODUCER}`);
        return;
      }
      // add producer to the producers array
      const { roomName } = peer;

      onProducerCreated(producer, roomName);

      informConsumers(roomName, socket.id, producer.id);

      console.log("Producer ID: ", producer.id, producer.kind);

      producer.on("transportclose", () => {
        console.log("transport for this producer closed ");
        producer.close();
      });

      // Send back to the client the Producer's id
      callback({
        id: producer.id,
        producersExist: isProducerExists(),
      });
    }
  );

  socket.on(
    protocol.TRANSPORT_RECEIVER_CONNECT,
    async ({
      dtlsParameters,
      serverConsumerTransportId,
    }: {
      dtlsParameters: DtlsParameters;
      serverConsumerTransportId: string;
    }) => {
      console.log(`DTLS PARAMS: ${dtlsParameters}`);
      const wrapper = findConsumerTrasport(serverConsumerTransportId);
      if (wrapper === undefined) {
        console.error(
          `There is no consumer transport! : ${protocol.TRANSPORT_RECEIVER_CONNECT}`
        );
        return;
      }
      const consumerTransport = wrapper.transport;
      await consumerTransport.connect({ dtlsParameters });
    }
  );

  socket.on(
    protocol.CONSUME,
    async (
      {
        rtpCapabilities,
        remoteProducerId,
        serverConsumerTransportId,
      }: {
        rtpCapabilities: RtpCapabilities;
        remoteProducerId: string;
        serverConsumerTransportId: string;
      },
      callback: ({
        params,
      }: {
        params:
          | {
              id: string;
              producerId: string;
              kind: MediaKind;
              rtpParameters: RtpParameters;
              serverConsumerId: string;
            }
          | { error: any };
      }) => void
    ) => {
      try {
        const peer = getPeer(socket.id);
        if (peer === undefined) {
          console.error(`There is no peer! : ${protocol.CONSUME}`);
          return;
        }
        const { roomName } = peer;
        const room = roomRepository.getRoomByName(roomName);
        if (room === undefined) {
          console.error(`There is no room! : ${protocol.CONSUME}`);
          return;
        }
        const router = room.router;
        const transportWrapper = findConsumerTrasport(
          serverConsumerTransportId
        );
        if (transportWrapper === undefined) {
          console.error(`There is no transportWrapper! : ${protocol.CONSUME}`);
          return;
        }
        const consumerTransport = transportWrapper.transport;
        const canConsume = router.canConsume({
          producerId: remoteProducerId,
          rtpCapabilities,
        });

        console.log("can consume: ", canConsume);

        // check if the router can consume the specified producer
        if (canConsume) {
          // transport can now consume and return a consumer
          const consumer = await consumerTransport.consume({
            producerId: remoteProducerId,
            rtpCapabilities,
            paused: true,
          });

          consumer.on("transportclose", () => {
            console.log("transport close from consumer");
          });

          consumer.on("producerclose", () => {
            console.log("producer of consumer closed");
            socket.emit(protocol.PRODUCER_CLOSED, { remoteProducerId });

            removeTransportByTransportId(consumerTransport.id);
            removeConsumer(consumer);
          });

          onConsume(consumer, roomName);

          // from the consumer extract the following params
          // to send back to the Client
          const params = {
            id: consumer.id,
            producerId: remoteProducerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            serverConsumerId: consumer.id,
          };

          // send the parameters to the client
          callback({ params });
        }
      } catch (error: any) {
        console.log(error.message);
        callback({
          params: {
            error: error,
          },
        });
      }
    }
  );

  socket.on(
    protocol.CONSUME_RESUME,
    async ({ serverConsumerId }: { serverConsumerId: string }) => {
      console.log("consumer resume");
      const consumerWrapper = getConsumer(serverConsumerId);
      if (consumerWrapper === undefined) {
        console.error(
          `There is no consumerWrapper : ${protocol.CONSUME_RESUME}`
        );
        return;
      }
      const { consumer } = consumerWrapper;
      await consumer.resume();
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
            announcedIp: protocol.IP_ADDRESS,
          },
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      };

      // https://mediasoup.org/documentation/v3/mediasoup/api/#router-createWebRtcTransport
      let transport = await router.createWebRtcTransport(
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
