import express from "express";
import https from "httpolyglot";
import path from "path";
import { Server } from "socket.io";
import { handleConnect } from "./worker.js";
import { tlsconfig } from "./constant/config.js";
import * as protocol from "./constant/protocol.js";

const __dirname = path.resolve();
const app = express();

app.get("*", (req, res, next) => {
  const path = "/rooms/";

  if (req.path.indexOf(path) == 0 && req.path.length > path.length)
    return next();

  res.send(
    `You need to specify a room name in the path e.g. 'https://127.0.0.1/sfu/room'`
  );
});

app.use("/rooms/:roomId", express.static(path.join(__dirname, "src/public")));

const httpsServer = https.createServer(tlsconfig, app);
httpsServer.listen(3000, () => {
  console.log("listening on port: " + 3000);
});

const io = new Server(httpsServer);

// socket.io namespace (could represent a room?)
const connections = io.of(protocol.NAME_SPACE);

connections.on(protocol.CONNECTION, async (socket) => handleConnect(socket));
