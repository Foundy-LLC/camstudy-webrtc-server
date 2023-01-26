import { Router } from "mediasoup/node/lib/Router";
import { Peer } from "./peer";

export interface Room {
  router: Router;
  name: string;
  peers: Peer[];
}