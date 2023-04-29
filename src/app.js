import express from "express";
import https from "httpolyglot";
import { Server } from "socket.io";
import { handleConnect } from "./worker.js";
import { mediaServerRegisterRequest, tlsconfig } from "./constant/config.js";
import * as protocol from "./constant/protocol.js";
import * as routingServerProtocol from "./constant/routing_server_protocol.js";
import io from "socket.io-client";

const app = express();

app.get("*", (req, res, next) => {
  const path = "/rooms/";

  if (req.path.indexOf(path) === 0 && req.path.length > path.length)
    return next();

  res.send(
    `You need to specify a room name in the path e.g. 'https://127.0.0.1/rooms/:roomId'`
  );
});

const httpsServer = https.createServer(tlsconfig, app);
httpsServer.listen(protocol.PORT, () => {
  console.log("listening on port: " + protocol.PORT);
});

const server = new Server(httpsServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const routingServerSocket = io(routingServerProtocol.ROUTING_SERVER_URL);
routingServerSocket.on("connect", () => {
  routingServerSocket.emit(routingServerProtocol.REGISTER_MEDIA_SERVER, mediaServerRegisterRequest, () => {
    console.log("Registered to the Routing server successfully.");
  });
});
routingServerSocket.on("disconnect", () => {
  // TODO(민성): 라우팅 서버가 죽는 경우 예외처리를 고민해봐야함
});

const connections = server.of(protocol.NAME_SPACE);
connections.on(protocol.CONNECTION, async (socket) => {
  await handleConnect(socket, routingServerSocket);
});
