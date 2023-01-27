import { Socket } from "socket.io";
import { Transport } from "mediasoup/node/lib/Transport";
import { Producer } from "mediasoup/node/lib/Producer";
import { Consumer } from "mediasoup/node/lib/Consumer";

export class Peer {

  private readonly _socket: Socket;
  private readonly _name: string;
  private readonly _isAdmin: boolean;
  private _producerTransport: Transport | undefined;
  private _consumerTransports: Transport[];
  private _producers: Producer[];
  private _consumers: Consumer[];

  public constructor(
    socket: Socket,
    name: string,
    isAdmin: boolean
  ) {
    this._socket = socket;
    this._name = name;
    this._isAdmin = isAdmin;
    this._producerTransport = undefined;
    this._consumerTransports = [];
    this._producers = [];
    this._consumers = [];
  }

  public get socketId(): string {
    return this._socket.id;
  }

  public emit = (protocol: string, args: any) => {
    this._socket.emit(protocol, args);
  };

  public get producerTransport(): Transport | undefined {
    return this._producerTransport;
  }

  public addTransport = (transport: Transport, isConsumer: boolean) => {
    if (isConsumer) {
      this._consumerTransports = [...this._consumerTransports, transport];
    } else {
      this._producerTransport = transport;
    }
  };

  public findConsumerTransportBy = (id: string): Transport | undefined => {
    return this._consumerTransports.find((transport) => {
      return transport.id === id;
    });
  };

  public getProducerIds(): string[] {
    return this._producers.map((producer) => producer.id);
  }

  public resumeConsumer = async (consumerId: string) => {
    const consumer = this._consumers.find((consumer) => {
      return consumer.id === consumerId;
    });
    await consumer?.resume();
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
    this._consumers = [...this._consumers, consumer];
  };

  public removeConsumer = (consumer: Consumer) => {
    this._consumers = this._consumers.filter((e) => e.id !== consumer.id);
  };

  public dispose = () => {
    this._consumers.forEach((consumer: Consumer) => consumer.close());
    this._producers.forEach((producer: Producer) => producer.close());
    this._consumerTransports.forEach((transport: Transport) => transport.close());
    this._producerTransport?.close();
  };
}
