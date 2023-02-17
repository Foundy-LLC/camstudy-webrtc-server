// TODO: socket server와 중복되는 인터페이스라 한군데서 관리할 수 있도록 해야함
export interface BlockedUser {
  readonly id: string;
  readonly name: string;
}
