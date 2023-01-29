const protocol = require("./protocol.js");
const io = require("socket.io-client");
const mediasoupClient = require("mediasoup-client");
const { producerOptions, mediaConstraints } = require("./constants.js");
const { uuid } = require("uuidv4");

const roomName = window.location.pathname.split("/")[2];
const socket = io(protocol.NAME_SPACE);

const videoToggleButton = document.getElementById("video-toggle");
const audioToggleButton = document.getElementById("audio-toggle");
const localVideo = document.getElementById("localVideo");
const remoteVideoContainer = document.getElementById("remote-video-container");

// TODO: 실제 회원의 uuid 넣기
const userId = uuid();

let device;
let rtpCapabilities;
let producerTransport;
let consumerTransports = [];
let audioProducer;
let videoProducer;
let consumer;
let isProducer = false;

let audioParams;
let videoParams = { producerOptions };
let consumingTransports = [];

socket.on(protocol.CONNECTION_SUCCESS, async ({ socketId }) => {
  console.log("Connected: ", socketId);
  await setLocalStream();
  setToggleButtons();

  // TODO: 방 입장은 입장 버튼으로 수행하기
  joinRoom();
});

const setLocalStream = async () => {
  try {
    const media = await navigator.mediaDevices.getUserMedia(mediaConstraints);
    localVideo.srcObject = media;
    audioParams = { track: media.getAudioTracks()[0], ...audioParams };
    videoParams = { track: media.getVideoTracks()[0], ...videoParams };
  } catch (e) {
    onDeniedMediaPermission();
    console.log(e.message);
  }
};

const onDeniedMediaPermission = () => {
  // TODO 구현
};

const setToggleButtons = () => {
  videoToggleButton.onclick = onClickVideoToggleButton;
  audioToggleButton.onclick = onClickAudioToggleButton;
};

const onClickVideoToggleButton = async () => {
  const enabledVideo = videoProducer !== undefined;

  if (enabledVideo) {
    disableVideoTrack();
  } else {
    try {
      await enableVideoTrack();
    } catch (e) {
      console.error(e.message);
    }
  }
};

const disableVideoTrack = () => {
  console.log(videoProducer);
  videoProducer.close();
  videoProducer = undefined;
  videoToggleButton.innerText = "Show Video";
  socket.emit(protocol.CLOSE_PRODUCER);
};

const enableVideoTrack = async () => {

  // const media = await navigator.mediaDevices.getUserMedia({ video: true });
  // videoParams = { track: media.getVideoTracks()[0], ...videoParams };
  // localVideo.srcObject = media;
  // videoToggleButton.innerText = "Hide Video";
};

const onClickAudioToggleButton = () => {
  const enabledAudio = audioProducer !== undefined;

  if (enabledAudio) {
    audioToggleButton.innerText = "Audio OFF";
    audioParams.track.enabled = true;
  } else {
    audioToggleButton.innerText = "Audio ON";
    audioParams.track.enabled = false;
  }
};

const joinRoom = () => {
  socket.emit(protocol.JOIN_ROOM, { roomName, userId }, (data) => {

    console.log(`Router RTP Capabilities... ${data.rtpCapabilities}`);
    // we assign to local variable and will be used when
    // loading the client Device (see createDevice above)
    rtpCapabilities = data.rtpCapabilities;

    // once we have rtpCapabilities from the Router, create Device
    createDevice();
  });
};

// A device is an endpoint connecting to a Router on the
// server side to send/recive media
const createDevice = async () => {
  try {
    device = new mediasoupClient.Device();

    // https://mediasoup.org/documentation/v3/mediasoup-client/api/#device-load
    // Loads the device with RTP capabilities of the Router (server side)
    await device.load({
      // see getRtpCapabilities() below
      routerRtpCapabilities: rtpCapabilities
    });

    console.log("Device RTP Capabilities", device.rtpCapabilities);

    // once the device loads, create transport
    createSendTransport();
  } catch (error) {
    console.log(error);
    if (error.name === "UnsupportedError")
      console.warn("browser not supported");
  }
};

const createSendTransport = () => {
  // see server's socket.on('createWebRtcTransport', sender?, ...)
  // this is a call from Producer, so sender = true
  socket.emit(
    protocol.CREATE_WEB_RTC_TRANSPORT,
    { isConsumer: false },
    async ({ params }) => {
      // The server sends back params needed
      // to create Send Transport on the client side
      if (params.error) {
        console.log(params.error);
        return;
      }

      console.log(params);

      // creates a new WebRTC Transport to send media
      // based on the server's producer transport params
      // https://mediasoup.org/documentation/v3/mediasoup-client/api/#TransportOptions
      producerTransport = device.createSendTransport(params);

      // https://mediasoup.org/documentation/v3/communication-between-client-and-server/#producing-media
      // this event is raised when a first call to transport.produce() is made
      // see connectSendTransport() below
      producerTransport.on(
        "connect",
        async ({ dtlsParameters }, callback, errback) => {
          try {
            // Signal local DTLS parameters to the server side transport
            // see server's socket.on('transport-producer-connect', ...)
            await socket.emit(protocol.TRANSPORT_PRODUCER_CONNECT, {
              dtlsParameters
            });

            // Tell the transport that parameters were transmitted.
            callback();
          } catch (error) {
            errback(error);
          }
        }
      );

      producerTransport.on("produce", async (parameters, callback, errback) => {
        console.log(parameters);

        try {
          // tell the server to create a Producer
          // with the following parameters and produce
          // and expect back a server side producer id
          // see server's socket.on('transport-produce', ...)
          await socket.emit(
            protocol.TRANSPORT_PRODUCER,
            {
              kind: parameters.kind,
              rtpParameters: parameters.rtpParameters,
              appData: parameters.appData
            },
            ({ id, producersExist }) => {
              // Tell the transport that parameters were transmitted and provide it with the
              // server side producer's id.
              callback({ id });

              // if producers exist, then join room
              if (producersExist) getProducers();
            }
          );
        } catch (error) {
          errback(error);
        }
      });

      await connectSendTransport();
    }
  );
};

const connectSendTransport = async () => {
  // we now call produce() to instruct the producer transport
  // to send media to the Router
  // https://mediasoup.org/documentation/v3/mediasoup-client/api/#transport-produce
  // this action will trigger the 'connect' and 'produce' events above

  audioProducer = await producerTransport.produce(audioParams);
  videoProducer = await producerTransport.produce(videoParams);

  audioProducer.on("trackended", () => {
    console.log("audio track ended");

    // TODO: close audio track
  });

  audioProducer.on("transportclose", () => {
    console.log("audio transport ended");

    // close audio track
  });

  videoProducer.on("trackended", () => {
    console.log("video track ended");

    // TODO: close video track
  });

  videoProducer.on("transportclose", () => {
    console.log("video transport ended");

    // TODO: close video track
  });
};

const onComeNewProducer = async (remoteProducerId, userId) => {
  //check if we are already consuming the remoteProducerId
  if (consumingTransports.includes(remoteProducerId)) return;
  consumingTransports.push(remoteProducerId);

  await socket.emit(
    protocol.CREATE_WEB_RTC_TRANSPORT,
    { isConsumer: true },
    ({ params }) => {
      // The server sends back params needed
      // to create Send Transport on the client side
      if (params.error) {
        console.log(params.error);
        return;
      }
      console.log(`PARAMS... ${params}`);

      let consumerTransport;
      try {
        consumerTransport = device.createRecvTransport(params);
      } catch (error) {
        // exceptions:
        // {InvalidStateError} if not loaded
        // {TypeError} if wrong arguments.
        console.log(error);
        return;
      }

      consumerTransport.on(
        "connect",
        async ({ dtlsParameters }, callback, errback) => {
          try {
            // Signal local DTLS parameters to the server side transport
            // see server's socket.on('transport-recv-connect', ...)
            await socket.emit(protocol.TRANSPORT_RECEIVER_CONNECT, {
              dtlsParameters,
              serverConsumerTransportId: params.id
            });

            // Tell the transport that parameters were transmitted.
            callback();
          } catch (error) {
            // Tell the transport that something was wrong
            errback(error);
          }
        }
      );

      connectRecvTransport(consumerTransport, remoteProducerId, params.id, userId);
    }
  );
};

// server informs the client of a new producer just joined
socket.on(protocol.NEW_PRODUCER, ({ producerId, userId }) =>
  onComeNewProducer(producerId, userId)
);

const getProducers = () => {
  socket.emit(protocol.GET_PRODUCERS, (producerIds) => {
    console.log(producerIds);
    // for each of the producer create a consumer
    // producerIds.forEach(id => signalNewConsumerTransport(id))
    producerIds.forEach(onComeNewProducer);
  });
};

const connectRecvTransport = async (
  consumerTransport,
  remoteProducerId,
  serverConsumerTransportId,
  userId
) => {
  // for consumer, we need to tell the server first
  // to create a consumer based on the rtpCapabilities and consume
  // if the router can consume, it will send back a set of params as below
  await socket.emit(
    protocol.CONSUME,
    {
      rtpCapabilities: device.rtpCapabilities,
      remoteProducerId,
      serverConsumerTransportId
    },
    async ({ params }) => {
      if (params.error) {
        console.log("Cannot Consume");
        return;
      }

      console.log(`Consumer Params ${params}`);
      // then consume with the local consumer transport
      // which creates a consumer
      const consumer = await consumerTransport.consume({
        id: params.id,
        producerId: params.producerId,
        kind: params.kind,
        rtpParameters: params.rtpParameters
      });
      consumerTransports = [
        ...consumerTransports,
        {
          userId,
          consumerTransport,
          serverConsumerTransportId: params.id,
          producerId: remoteProducerId,
          consumer
        }
      ];

      // create a new div element for the new consumer media
      const newElem = document.createElement("div");

      if (params.kind === "audio") {
        newElem.setAttribute("id", createAudioNodeIdWith(userId));
        //append to the audio container
        newElem.innerHTML =
          "<audio id=\"" + remoteProducerId + "\" autoplay></audio>";
      } else {
        newElem.setAttribute("id", createVideoNodeIdWith(userId));
        //append to the video container
        newElem.innerHTML =
          "<video id=\"" +
          remoteProducerId +
          "\" autoplay class=\"video\" ></video>";
      }

      remoteVideoContainer.appendChild(newElem);

      // destructure and retrieve the video track from the producer
      const { track } = consumer;

      document.getElementById(remoteProducerId).srcObject = new MediaStream([
        track
      ]);

      // the server consumer started with media paused
      // so we need to inform the server to resume
      socket.emit(protocol.CONSUME_RESUME, {
        serverConsumerId: params.serverConsumerId
      });
    }
  );
};

socket.on(protocol.PRODUCER_CLOSED, ({ remoteProducerId }) => {
  // server notification is received when a producer is closed
  // we need to close the client-side consumer and associated transport
  const consumerTransport = consumerTransports.find(
    (transportData) => transportData.producerId === remoteProducerId
  );
  if (consumerTransport === undefined) {
    return;
  }
  consumerTransport.consumer.close();
});

socket.on(protocol.OTHER_PEER_DISCONNECTED, ({ disposedPeerId }) => {
  // server notification is received when a producer is closed
  // we need to close the client-side consumer and associated transport
  const producerToClose = consumerTransports.find(
    (transportData) => transportData.userId === disposedPeerId
  );
  producerToClose.consumerTransport.close();
  producerToClose.consumer.close();

  // remove the consumer transport from the list
  consumerTransports = consumerTransports.filter(
    (transportData) => transportData.userId !== disposedPeerId
  );

  // remove the video div element
  const nodes = [
    document.getElementById(createVideoNodeIdWith(disposedPeerId)),
    document.getElementById(createAudioNodeIdWith(disposedPeerId))
  ];
  for (let i = 0; i < nodes.length; ++i) {
    console.log(nodes[i])
    remoteVideoContainer.removeChild(nodes[i])
  }
});

const createAudioNodeIdWith = (userId) => `audio-${userId}`;
const createVideoNodeIdWith = (userId) => `video-${userId}`;