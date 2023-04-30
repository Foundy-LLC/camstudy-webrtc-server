export interface MediaServerRegisterRequest {
    readonly ip: string;
    readonly port: number;
    readonly runningRooms: string[];
    readonly maxRoomCapacity: number;
}
