import { Producer } from "mediasoup/node/lib/Producer";

export interface ProducerWrapper {
  socketId: string;
  roomName: string;
  producer: Producer;
}

let producers: ProducerWrapper[] = []; // [ { socketId1, roomName1, producer, }, ... ]

export const addProducer = (
  socketId: string,
  producer: Producer,
  roomName: string
) => {
  producers = [...producers, { socketId: socketId, producer, roomName }];
};

export const getOthersProducerBy = (
  mySocketId: string,
  roomName: string
): ProducerWrapper[] => {
  return producers.filter(
    (producerWrapper) =>
      producerWrapper.socketId !== mySocketId &&
      producerWrapper.roomName === roomName
  );
};

export const isProducerExists = (): boolean => producers.length > 1;

export const removeProducerBySocketId = (socketId: string) => {
  producers.forEach((producerData) => {
    if (producerData.socketId === socketId) {
      producerData.producer.close();
    }
  });
  producers = producers.filter(
    (producerData) => producerData.socketId !== socketId
  );
};
