export interface MediaServerRegisterRequest {
    readonly ip: string;
    readonly port: number;
    readonly runningRoomCount: number;
    readonly maxRoomCapacity: number;
}
