import { Peer } from "./peer";
import { Router } from "mediasoup/node/lib/Router.js";

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

  public broadcastMessage = (
    excludeSocketId: string,
    protocol: string,
    args: any = undefined,
    callback: any = undefined
  ) => {
    this._peers.forEach((peer) => {
      if (excludeSocketId !== peer.socketId) {
        peer.emit(protocol, args, callback);
      }
    });
  };

  public disposePeer = (socketId: string): string => {
    const peer = this.findPeerBy(socketId);
    if (peer === undefined) {
      throw Error("There is no peer to dispose!")
    }
    peer.dispose();
    this._peers = this._peers.filter((e: Peer) => e !== peer);
    return peer.uid
  };

  public copyWithNewPeer = (newPeer: Peer): Room => {
    return new Room({
      router: this._router,
      id: this._id,
      peers: [...this._peers, newPeer]
    });
  };
}