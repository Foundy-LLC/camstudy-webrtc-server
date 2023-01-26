import mediasoup from "mediasoup";
import { mediaCodecs } from "./constant/config.js";
import {
  addConsumer,
  getConsumer,
  removeConsumerBySocketId,
} from "./repository/consumer.ts";
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
} from "./repository/producer.ts";
import { roomRepository } from "./repository/room.ts";
import {
  addTransport,
  findConsumerTrasport,
  getTransport,
  removeTransportBySocketId,
  removeTransportByTransportId,
} from "./repository/transport.ts";
import * as protocol from "./constant/protocol.cjs";

/**
 * Worker
 * |-> Router(s)
 *     |-> Producer Transport(s)
 *         |-> Producer
 *     |-> Consumer Transport(s)
 *         |-> Consumer
 **/
let worker;

const createWorker = async () => {
  worker = await mediasoup.createWorker({
    rtcMinPort: 2000,
    rtcMaxPort: 2020,
  });
  console.log(`worker pid ${worker.pid}`);

  worker.on("died", (error) => {
    // This implies something serious happened, so kill the application
    console.error("mediasoup worker has died");
    setTimeout(() => process.exit(1), 2000); // exit in 2 seconds
  });

  return worker;
};

// We create a Worker as soon as our application starts
worker = createWorker();

export const handleConnect = async (socket) => {
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
      roomRepository.removeSocketFromRoom(socket, roomName);
    }
  });

  socket.on(protocol.JOIN_ROOM, async ({ roomName }, callback) => {
    // create Router if it does not exist
    // const router1 = rooms[roomName] && rooms[roomName].get('data').router || await createRoom(roomName, socket.id)
    const router1 = await createRoom(roomName, socket.id);
    console.log("JOIN ROOM: ", roomName);
    joinPeer(socket, roomName);

    // get Router RTP Capabilities
    const rtpCapabilities = router1.rtpCapabilities;

    // call callback from the client and send back the rtpCapabilities
    callback({ rtpCapabilities });
  });

  const createRoom = async (roomName, socketId) => {
    // worker.createRouter(options)
    // options = { mediaCodecs, appData }
    // mediaCodecs -> defined above
    // appData -> custom application data - we are not supplying any
    // none of the two are required
    let router;
    let peers = [];
    const room = roomRepository.getRoomByName(roomName);
    if (room !== undefined) {
      router = room.router;
      peers = room.peers || [];
    } else {
      router = await worker.createRouter({ mediaCodecs });
    }

    console.log(`Router ID: ${router.id}`, peers.length);

    roomRepository.setRoom(roomName, {
      router: router,
      socketIds: [...peers, socketId],
    });

    return router;
  };

  // Client emits a request to create server side Transport
  // We need to differentiate between the producer and consumer transports
  socket.on(
    protocol.CREATE_WEB_RTC_TRANSPORT,
    async ({ isConsumer }, callback) => {
      // get Room Name from Peer's properties
      const roomName = getPeer(socket.id).roomName;

      // get Router (Room) object this peer is in based on RoomName
      const router = roomRepository.getRoomByName(roomName).router;

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

  const onTransportCreated = (transport, roomName, isConsumer) => {
    addTransport(socket.id, transport, roomName, isConsumer);
    addPeerTransport(socket, transport);
  };

  const onProducerCreated = (producer, roomName) => {
    addProducer(socket.id, producer, roomName);
    addPeerProducer(socket, producer);
  };

  const onConsume = (consumer, roomName) => {
    addConsumer(socket.id, consumer, roomName);
    addPeerConsumer(socket, consumer);
  };

  socket.on(protocol.GET_PRODUCERS, (callback) => {
    //return all producer transports
    const { roomName } = getPeer(socket.id);
    const producerIds = getOthersProducerBy(socket.id, roomName).map(
      (wrapper) => wrapper.producer.id
    );
    console.log("getProducers: callback with ", producerIds);
    // return the producer list back to the client
    callback(producerIds);
  });

  const informConsumers = (roomName, socketId, id) => {
    console.log(`just joined, id ${id} ${roomName}, ${socketId}`);
    // A new producer just joined
    // let all consumers to consume this producer
    const producers = getOthersProducerBy(socketId, roomName);

    producers.forEach((producerWrapper) => {
      const peer = getPeer(producerWrapper.socketId);
      const producerSocket = peer.socket;
      // use socket to send producer id to producer
      producerSocket.emit(protocol.NEW_PRODUCER, { producerId: id });
    });
  };

  // see client's socket.emit('transport-producer-connect', ...)
  socket.on(protocol.TRANSPORT_PRODUCER_CONNECT, ({ dtlsParameters }) => {
    console.log("DTLS PARAMS... ", { dtlsParameters });

    getTransport(socket.id).connect({ dtlsParameters });
  });

  // see client's socket.emit('transport-produce', ...)
  socket.on(
    protocol.TRANSPORT_PRODUCER,
    async ({ kind, rtpParameters, appData }, callback) => {
      // call produce based on the prameters from the client
      const producer = await getTransport(socket.id).produce({
        kind,
        rtpParameters,
      });

      // add producer to the producers array
      const { roomName } = getPeer(socket.id);

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
    async ({ dtlsParameters, serverConsumerTransportId }) => {
      console.log(`DTLS PARAMS: ${dtlsParameters}`);
      const consumerTransport = findConsumerTrasport(
        serverConsumerTransportId
      ).transport;
      await consumerTransport.connect({ dtlsParameters });
    }
  );

  socket.on(
    protocol.CONSUME,
    async (
      { rtpCapabilities, remoteProducerId, serverConsumerTransportId },
      callback
    ) => {
      try {
        const { roomName } = getPeer(socket.id);
        const router = roomRepository.getRoomByName(roomName).router;
        const consumerTransport = findConsumerTrasport(
          serverConsumerTransportId
        ).transport;
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

            removeTransportByTransportId(consumerTransport.transport.id);

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
      } catch (error) {
        console.log(error.message);
        callback({
          params: {
            error: error,
          },
        });
      }
    }
  );

  socket.on(protocol.CONSUME_RESUME, async ({ serverConsumerId }) => {
    console.log("consumer resume");
    const { consumer } = getConsumer(serverConsumerId);
    await consumer.resume();
  });
};

const createWebRtcTransport = async (router) => {
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
