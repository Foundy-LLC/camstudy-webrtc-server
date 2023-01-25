let consumers = []; // [ { socketId1, roomName1, consumer, }, ... ]

export const addConsumer = (socketId, consumer, roomName) => {
  consumers = [...consumers, { socketId: socketId, consumer, roomName }];
};

export const removeConsumer = (consumer) => {
  consumer.close();
  consumers = consumers.filter(
    (consumerData) => consumerData.consumer.id !== consumer.id
  );
};

export const getConsumer = (consumerId) => {
  return consumers.find(
    (consumerData) => consumerData.consumer.id === consumerId
  );
};

export const removeConsumerBySocketId = (socketId) => {
  consumers.forEach((consumerData) => {
    if (consumerData.socketId === socketId) {
      consumerData.consumer.close();
    }
  });
  consumers = consumers.filter(
    (consumerData) => consumerData.socketId !== socketId
  );
};
