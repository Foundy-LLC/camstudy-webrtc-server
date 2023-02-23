import {Socket} from "socket.io";
import {Transport} from "mediasoup/node/lib/Transport";
import {Producer} from "mediasoup/node/lib/Producer";
import {Consumer} from "mediasoup/node/lib/Consumer";
import {PeerState} from "./PeerState";

export class Peer {

  private _sendTransport: Transport | undefined = undefined;
  private _receiveTransports: Transport[] = [];
  private _producers: Producer[] = [];
  private _consumers: Consumer[] = [];
  private _mutedHeadset: boolean = false;

  public constructor(
    private readonly _uid: string,
    private readonly _socket: Socket,
    private readonly _name: string
  ) {
  }

  public get uid(): string {
    return this._uid;
  }

  public get socketId(): string {
    return this._socket.id;
  }

  public get name(): string {
    return this._name;
  }

  public get state(): PeerState {
    return {
      uid: this._uid,
      name: this._name,
      enabledHeadset: !this._mutedHeadset,
      enabledMicrophone: this._producers.some((p) => p.kind === "audio")
    };
  }

  public emit = (protocol: string, args: any, callback: any = undefined) => {
    this._socket.emit(protocol, args, callback);
  };

  public get sendTransport(): Transport | undefined {
    return this._sendTransport;
  }

  public addTransport = (transport: Transport, isConsumer: boolean) => {
    if (isConsumer) {
      transport.observer.on("close", () => {
        this._receiveTransports = this._receiveTransports.filter((t) => t.id !== transport.id);
      });
      this._receiveTransports.push(transport);
    } else {
      this._sendTransport = transport;
    }
  };

  public findReceiveTransportBy = (id: string): Transport | undefined => {
    return this._receiveTransports.find((transport) => {
      return transport.id === id;
    });
  };

  public getProducerIds(): string[] {
    return this._producers.map((producer) => producer.id);
  }

  public getVideoProducerIds(): string[] {
    return this._producers.filter(p => p.kind === "video").map((producer) => producer.id);
  }

  public getAudioProducerIds(): string[] {
    return this._producers.filter(p => p.kind === "audio").map((producer) => producer.id);
  }

  public resumeConsumer = async (consumerId: string) => {
    const consumer = this._consumers.find((consumer) => {
      return consumer.id === consumerId;
    });
    await consumer?.resume();
  };

  public pauseConsumer = async (consumerId: string) => {
    console.log("consumerId", consumerId)
    this._consumers.map((consumer) => {
      console.log(consumer.id)
    })
    const consumer = this._consumers.find(consumer => consumer.id === consumerId);
    console.log(consumer)
    if (consumer != undefined) {
      await consumer.pause();
      console.log("consumer pause success")
    }
  };

  public get hasProducer(): boolean {
    return this._producers.length > 0;
  }

  public addProducer = (producer: Producer) => {
    this._producers = [...this._producers, producer];
  };

  public removeProducer = (producer: Producer) => {
    this._producers = this._producers.filter((e) => e.id !== producer.id);
  };

  public addConsumer = (consumer: Consumer) => {
    if (consumer.kind === "audio") {
      this._mutedHeadset = false;
    }
    this._consumers = [...this._consumers, consumer];
  };

  public removeConsumer = (consumer: Consumer) => {
    this._consumers = this._consumers.filter((e) => e.id !== consumer.id);
  };

  public closeAndRemoveVideoProducer = () => {
    this._producers = this._producers.filter((producer) => {
      if (producer.kind === "video") {
        producer.close();
        return false;
      }
      return true;
    });
  };

  public closeAndRemoveAudioProducer = () => {
    this._producers = this._producers.filter((producer) => {
      if (producer.kind === "audio") {
        producer.close();
        return false;
      }
      return true;
    });
  };

  public hideRemoteVideo = (producerId: string) => {
    this._consumers = this._consumers.filter((consumer) => {
      if (consumer.kind === "video" && consumer.producerId === producerId) {
        consumer.close()
        return false;
      }
      return true
    })
  }

  public muteHeadset = () => {
    this._mutedHeadset = true;
    this._consumers = this._consumers.filter((consumer) => {
      if (consumer.kind === "audio") {
        consumer.close();
        return false;
      }
      return true;
    });
  };

  public unmuteHeadset = () => {
    this._mutedHeadset = false;
  };

  public dispose = () => {
    this._consumers.forEach((consumer: Consumer) => consumer.close());
    this._producers.forEach((producer: Producer) => producer.close());
    this._receiveTransports.forEach((transport: Transport) => transport.close());
    this._sendTransport?.close();
  };

  public disconnectSocket = () => {
    this._socket.disconnect();
  };
}
