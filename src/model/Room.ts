import { Peer } from "./Peer";
import { Router } from "mediasoup/node/lib/Router.js";
import { UserProducerIdSet } from "./UserProducerIdSet";
import { PomodoroTimer } from "./PomodoroTimer.js";

export class Room {

  private readonly _router: Router;
  private readonly _id: string;
  private _peers: Peer[];

  private readonly _masterPeerId: string;
  private readonly _pomodoroTimer: PomodoroTimer;

  public constructor(
    {
      router,
      id,
      peers,
      masterPeerId,
      timerLengthMinutes,
      shortBreakMinutes,
      longBreakMinutes,
      longBreakInterval
    }: {
      router: Router,
      id: string,
      peers: Peer[],
      masterPeerId: string,
      timerLengthMinutes: number,
      shortBreakMinutes: number,
      longBreakMinutes: number,
      longBreakInterval: number
    }
  ) {
    this._router = router;
    this._id = id;
    this._peers = peers;
    this._masterPeerId = masterPeerId;
    this._pomodoroTimer = new PomodoroTimer(
      timerLengthMinutes,
      shortBreakMinutes,
      longBreakMinutes,
      longBreakInterval
    );
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

  public join = (peer: Peer) => {
    this._peers = [...this._peers, peer]
  }

  public findOthersProducerIds = (requesterSocketId: string): UserProducerIdSet[] => {
    let result: UserProducerIdSet[] = [];
    this._peers.forEach((peer) => {
      if (peer.socketId !== requesterSocketId) {
        const producerIds = peer.getProducerIds();
        const userProducerIdSets = producerIds.map<UserProducerIdSet>((producerId) => {
          return { producerId, userId: peer.uid };
        });
        result = [
          ...result,
          ...userProducerIdSets
        ];
      }
    });
    return result;
  };

  public broadcastProtocol = (
    excludeSocketId: string | undefined,
    protocol: string,
    args: any = undefined,
    callback: any = undefined
  ) => {
    this._peers.forEach((peer) => {
      if (excludeSocketId === undefined || excludeSocketId !== peer.socketId) {
        peer.emit(protocol, args, callback);
      }
    });
  };

  public disposePeer = (socketId: string): string => {
    const peer = this.findPeerBy(socketId);
    if (peer === undefined) {
      throw Error("There is no peer to dispose!");
    }
    peer.dispose();
    this._peers = this._peers.filter((e: Peer) => e !== peer);
    return peer.uid;
  };
}