import { Consumer } from "mediasoup-client/lib/Consumer";

export interface ConsumerWrapper {
  socketId: number;
  roomName: string;
  consumer: Consumer;
}

let consumers: ConsumerWrapper[] = []; // [ { socketId1, roomName1, consumer, }, ... ]

export const addConsumer = (
  socketId: number,
  consumer: Consumer,
  roomName: string
) => {
  consumers = [...consumers, { socketId: socketId, consumer, roomName }];
};

export const removeConsumer = (consumer: Consumer) => {
  consumer.close();
  consumers = consumers.filter(
    (consumerData) => consumerData.consumer.id !== consumer.id
  );
};

export const getConsumer = (
  consumerId: string
): ConsumerWrapper | undefined => {
  return consumers.find(
    (consumerData) => consumerData.consumer.id === consumerId
  );
};

export const removeConsumerBySocketId = (socketId: number) => {
  consumers.forEach((consumerData) => {
    if (consumerData.socketId === socketId) {
      consumerData.consumer.close();
    }
  });
  consumers = consumers.filter(
    (consumerData) => consumerData.socketId !== socketId
  );
};
