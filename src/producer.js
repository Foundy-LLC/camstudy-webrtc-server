let producers = []; // [ { socketId1, roomName1, producer, }, ... ]

export const addProducer = (socket, producer, roomName) => {
  producers = [...producers, { socketId: socket.id, producer, roomName }];
};

export const getProducersWithFilter = (filter) => {
  return producers.filter((producerData) => {
    return filter(producerData);
  });
};

export const getProducerIdsWithFilter = (filter) => {
  return getProducersWithFilter(filter).map(
    (producerData) => producerData.producer.id
  );
};

export const isProducerExists = () => producers.length > 1;

export const removeProducerBySocketId = (socketId) => {
  producers.forEach((producerData) => {
    if (producerData.socketId === socketId) {
      producerData.producer.close();
    }
  });
  producers = producers.filter(
    (producerData) => producerData.socketId !== socketId
  );
};
