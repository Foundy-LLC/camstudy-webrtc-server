import {Socket} from "socket.io";

export interface Peer {
    socket: Socket;
    roomName: string;
    name: string;
    isAdmin: boolean;
    // ID만 있음
    transports: string[];
    producers: string[];
    consumers: string[];
}

const peers: Map<string, Peer> = new Map<string, Peer>();

export const getPeer = (socketId: string): Peer | undefined => {
    return peers.get(socketId);
};

export const deletePeer = (socketId: string) => {
    peers.delete(socketId);
};

export const joinPeer = (socket: Socket, roomName: string) => {
    peers.set(socket.id, {
        socket,
        roomName, // Name for the Router this Peer joined
        name: "",
        isAdmin: false, // Is this Peer the Admin?
        transports: [],
        producers: [],
        consumers: [],
    });
};

export const addPeerTransport = (socketId: string, transportId: string) => {
    const peer = requirePeerBySocket(socketId);
    peers.set(socketId, {
        ...peer,
        transports: [...peer.transports, transportId],
    });
};

export const addPeerProducer = (socketId: string, producerId: string) => {
    const peer = requirePeerBySocket(socketId);
    peers.set(socketId, {
        ...peer,
        producers: [...peer.producers, producerId],
    });
};

export const addPeerConsumer = (socketId: string, consumerId: string) => {
    const peer = requirePeerBySocket(socketId);
    peers.set(socketId, {
        ...peer,
        consumers: [...peer.consumers, consumerId],
    });
};

const requirePeerBySocket = (socketId: string): Peer => {
    const peer = peers.get(socketId);
    if (peer === undefined) {
        throw Error("해당 피어가 존재하지 않습니다.");
    }
    return peer;
};
