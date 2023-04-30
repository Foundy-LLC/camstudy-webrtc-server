import io, { Socket } from "socket.io-client";
import * as routingServerProtocol from "./constant/routing_server_protocol";
import { roomService } from "./service/room_service";
import { createMediaServerRegisterRequest } from "./constant/config";

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
