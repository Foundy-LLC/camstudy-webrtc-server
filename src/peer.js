const peers = {}; // { socketId1: { roomName1, socket, transports = [id1, id2,] }, producers = [id1, id2,] }, consumers = [id1, id2,], peerDetails }, ...}

export const getPeer = (socketId) => {
  return peers[socketId];
};

export const deletePeer = (socketId) => {
  delete peers[socketId];
};

export const joinPeer = (socket, roomName) => {
  peers[socket.id] = {
    socket,
    roomName, // Name for the Router this Peer joined
    transports: [],
    producers: [],
    consumers: [],
    peerDetails: {
      name: "",
      isAdmin: false, // Is this Peer the Admin?
    },
  };
};

export const addPeerTransport = (socket, transport) => {
  peers[socket.id] = {
    ...peers[socket.id],
    transports: [...peers[socket.id].transports, transport.id],
  };
};

export const addPeerProducer = (socket, producer) => {
  peers[socket.id] = {
    ...peers[socket.id],
    producers: [...peers[socket.id].producers, producer.id],
  };
};

export const addPeerConsumer = (socket, consumer) => {
  peers[socket.id] = {
    ...peers[socket.id],
    consumers: [...peers[socket.id].consumers, consumer.id],
  };
};
