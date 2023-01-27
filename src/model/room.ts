import { Peer } from "./peer";
import { Router } from "mediasoup/node/lib/Router.js";
import * as protocol from "../constant/protocol.js";

export class Room {

  private readonly _router: Router;
  private readonly _id: string;
  private _peers: Peer[];

  public constructor({ router, id, peers }: { router: Router, id: string, peers: Peer[] }) {
    this._router = router;
    this._id = id;
    this._peers = peers;
  }

  public get router(): Router {
    return this._router;
  }

  public get id(): string {
    return this._id;
  }

  public get hasPeer(): boolean {
    return this._peers.length > 0;
  }

  public hasProducer = (): boolean => {
    return this._peers.some(peer => peer.hasProducer);
  };

  public findPeerBy = (socketId: string): Peer | undefined => {
    return this._peers.find((peer: Peer) => peer.socketId === socketId);
  };

  public findOthersProducerIds = (requesterSocketId: string): string[] => {
    let producers: string[] = [];
    this._peers.forEach((peer) => {
      if (peer.socketId !== requesterSocketId) {
        producers = [...producers, ...peer.getProducerIds()];
      }
    });
    return producers;
  };

  public informConsumersNewProducerAppeared = (
    socketId: string,
    producerId: string
  ) => {
    this._peers.forEach((peer) => {
      if (socketId !== peer.socketId) {
        peer.emit(protocol.NEW_PRODUCER, { producerId: producerId });
      }
    });
  };

  public disposePeer = (socketId: string) => {
    const peer = this.findPeerBy(socketId);
    peer?.dispose();
    this._peers = this._peers.filter((e: Peer) => e !== peer);
  };

  public copyWithNewPeer = (newPeer: Peer): Room => {
    return new Room({
      router: this._router,
      id: this._id,
      peers: [...this._peers, newPeer]
    });
  };
}