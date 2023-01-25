let transports = []; // [ { socketId1, roomName1, transport, isConsumer }, ... ]

export const addTransport = (socketId, transport, roomName, isConsumer) => {
  transports = [
    ...transports,
    { socketId: socketId, transport, roomName, isConsumer },
  ];
};

export const getTransport = (socketId) => {
  const [producerTransport] = transports.filter(
    (transport) => transport.socketId === socketId && !transport.isConsumer
  );
  return producerTransport.transport;
};

export const findConsumerTrasport = (consumerTransportId) => {
  return transports.find(
    (transportData) =>
      transportData.isConsumer &&
      transportData.transport.id == consumerTransportId
  );
};

export const removeTransportByTransportId = (transportId) => {
  transports.forEach((transportData) => {
    const transport = transportData.transport;
    if (transport.id === transportId) {
      transport.close([]);
    }
  });
  transports = transports.filter(
    (transportData) => transportData.transport.id !== transportId
  );
};

export const removeTransportBySocketId = (socketId) => {
  transports.forEach((transportData) => {
    if (transportData.socketId === socketId) {
      transportData.transport.close();
    }
  });
  transports = transports.filter(
    (transportData) => transportData.socketId !== socketId
  );
};
