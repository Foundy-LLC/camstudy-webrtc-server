// TODO: camstudy-web과 중복되는 인테페이스임. 하나로 관리할 방법을 찾아야함
export interface ChatMessage {
  readonly id: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly content: string;
  /** ISO time string format */
  readonly sentAt: string;
}