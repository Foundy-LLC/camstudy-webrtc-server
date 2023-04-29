export type PeerDisconnectResult = PeerDisconnectRoomRemovedResult | PeerDisconnectNoneResult

export interface PeerDisconnectNoneResult {
  type: "none";
}

export interface PeerDisconnectRoomRemovedResult {
  type: "roomRemoved";
  roomId: string;
}
