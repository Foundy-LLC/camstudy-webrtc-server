// https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerOptions
// https://mediasoup.org/documentation/v3/mediasoup-client/api/#transport-produce
const producerOptions = {
  // mediasoup params
  encodings: [
    {
      rid: "r0",
      maxBitrate: 100000,
      scalabilityMode: "S1T3"
    },
    {
      rid: "r1",
      maxBitrate: 300000,
      scalabilityMode: "S1T3"
    },
    {
      rid: "r2",
      maxBitrate: 900000,
      scalabilityMode: "S1T3"
    }
  ],
  // https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerCodecOptions
  codecOptions: {
    videoGoogleStartBitrate: 1000
  }
};

const mediaConstraints = {
  audio: true,
  video: {
    width: {
      min: 640,
      max: 1920
    },
    height: {
      min: 400,
      max: 1080
    }
  }
};

module.exports = {
  producerOptions,
  mediaConstraints
};