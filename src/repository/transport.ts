import { Transport } from "mediasoup/node/lib/Transport";

export interface TransportWrapper {
  socketId: number;
  roomName: string;
  transport: Transport;
  isConsumer: boolean;
}

let transports: TransportWrapper[] = []; // [ { socketId1, roomName1, transport, isConsumer }, ... ]

export const addTransport = (
  socketId: number,
  transport: Transport,
  roomName: string,
  isConsumer: boolean
) => {
  transports = [...transports, { socketId, transport, roomName, isConsumer }];
};

export const getTransport = (socketId: number) => {
  const [producerTransport] = transports.filter(
    (transport) => transport.socketId === socketId && !transport.isConsumer
  );
  return producerTransport.transport;
};

export const findConsumerTrasport = (consumerTransportId: string) => {
  return transports.find(
    (transportData) =>
      transportData.isConsumer &&
      transportData.transport.id == consumerTransportId
  );
};

export const removeTransportByTransportId = (transportId: string) => {
  transports.forEach((transportData) => {
    const transport = transportData.transport;
    if (transport.id === transportId) {
      transport.close();
    }
  });
  transports = transports.filter(
    (transportData) => transportData.transport.id !== transportId
  );
};

export const removeTransportBySocketId = (socketId: number) => {
  transports.forEach((transportData) => {
    if (transportData.socketId === socketId) {
      transportData.transport.close();
    }
  });
  transports = transports.filter(
    (transportData) => transportData.socketId !== socketId
  );
};
