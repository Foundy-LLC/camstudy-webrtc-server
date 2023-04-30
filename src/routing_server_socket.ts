import io, { Socket } from "socket.io-client";
import * as routingServerProtocol from "./constant/routing_server_protocol.js";
import { roomService } from "./service/room_service.js";
import { createMediaServerRegisterRequest } from "./constant/config.js";

export const createRoutingServerSocket = (): Socket => {
  const routingServerSocket = io(routingServerProtocol.ROUTING_SERVER_URL);

  routingServerSocket.on("connect", () => {
    const runningRoomIds = roomService.getRoomIds();
    const request = createMediaServerRegisterRequest(runningRoomIds);

    routingServerSocket.emit(routingServerProtocol.REGISTER_MEDIA_SERVER, request, () => {
      console.log("Registered to the Routing server successfully.");
    });
  });

  routingServerSocket.on("disconnect", () => {
    console.log("Disconnected the Routing server.");
  });

  return routingServerSocket;
};
