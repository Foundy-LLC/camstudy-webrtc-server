import { Router } from "mediasoup/node/lib/Router";
import { Peer } from "./peer";

export interface Room {
  router: Router;
  id: string;
  peers: Peer[];
}