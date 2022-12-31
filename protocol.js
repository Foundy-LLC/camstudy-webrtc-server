/**
 * 서버에서 연결을 수신할 IP 주소이다.
 */
export const IP_ADDRESS = "192.168.35.2";

/**
 * 소켓의 네임 스페이스이다.
 *
 * https://socket.io/docs/v4/namespaces/
 */
export const NAME_SPACE = "/mediasoup";

/**
 * 초기 소켓 연결을 위한 프로토콜이다.
 *
 * 클라이언트에서 서버로 전송된다.
 */
export const CONNECTION = "connection";

/**
 * 초기 소켓 연결 성공 응답 프로토콜이다.
 *
 * 서버에서 클라이언트로 전송된다.
 */
export const CONNECTION_SUCCESS = "connection-success";
