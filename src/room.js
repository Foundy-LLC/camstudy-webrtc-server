const rooms = {}; // { roomName1: { Router, rooms: [ sicketId1, ... ] }, ...}

export const removeSocketFromRoom = (socket, roomName) => {
  rooms[roomName] = {
    router: rooms[roomName].router,
    peers: rooms[roomName].peers.filter((socketId) => socketId !== socket.id),
  };
};

export const getRoomByName = (roomName) => {
  return rooms[roomName];
};

export const setRoom = (roomName, room) => {
  rooms[roomName] = room;
};
