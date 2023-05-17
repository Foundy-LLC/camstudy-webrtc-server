import { RtpCodecCapability } from "mediasoup/node/lib/RtpParameters";
import { MediaServerRegisterRequest } from "../model/MediaServerRegisterRequest.js";
import * as protocol from "./protocol.js";
import { MAX_SERVER_ROOM_CAPACITY } from "./room_constant.js";
import dotenv from "dotenv";

dotenv.config();

// SSL cert for HTTPS access
export const tlsconfig = {
    key: process.env.SSL_KEY!.replace(/\\n/g, "\n"),
    cert: process.env.SSL_CERT!.replace(/\\n/g, "\n"),
};

// This is an Array of RtpCapabilities
// https://mediasoup.org/documentation/v3/mediasoup/rtp-parameters-and-capabilities/#RtpCodecCapability
// list of media codecs supported by mediasoup ...
// https://github.com/versatica/mediasoup/blob/v3/src/supportedRtpCapabilities.ts
export const mediaCodecs: RtpCodecCapability[] = [
    {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
    },
    {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000,
        parameters: {
            "x-google-start-bitrate": 1000,
        },
    },
];

export const createMediaServerRegisterRequest = (
  runningRooms: string[]
): MediaServerRegisterRequest => {
    return {
        ip: protocol.IP_ADDRESS,
        port: protocol.PORT,
        runningRooms: runningRooms,
        maxRoomCapacity: MAX_SERVER_ROOM_CAPACITY
    }
}
