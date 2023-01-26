import {Consumer} from "mediasoup/node/lib/Consumer";

export interface ConsumerWrapper {
    socketId: string;
    roomName: string;
    consumer: Consumer;
}

let consumers: ConsumerWrapper[] = [];

export const addConsumer = (
    socketId: string,
    consumer: Consumer,
    roomName: string
) => {
    consumers = [...consumers, {socketId: socketId, consumer, roomName}];
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

export const removeConsumerBySocketId = (socketId: string) => {
    consumers.forEach((consumerData) => {
        if (consumerData.socketId === socketId) {
            consumerData.consumer.close();
        }
    });
    consumers = consumers.filter(
        (consumerData) => consumerData.socketId !== socketId
    );
};
