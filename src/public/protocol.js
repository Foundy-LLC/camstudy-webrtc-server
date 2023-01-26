/**
 * 서버에서 연결을 수신할 IP 주소이다.
 */
const IP_ADDRESS = "192.168.35.2";

/**
 * 소켓의 네임 스페이스이다.
 *
 * https://socket.io/docs/v4/namespaces/
 */
const NAME_SPACE = "/mediasoup";

/**
 * 초기 소켓 연결을 위한 프로토콜이다.
 *
 * 클라이언트에서 서버로 전송된다.
 */
const CONNECTION = "connection";

/**
 * 초기 소켓 연결 성공 응답 프로토콜이다.
 *
 * 서버에서 클라이언트로 전송된다.
 */
const CONNECTION_SUCCESS = "connection-success";

/**
 * 소켓 연결이 끊어짐을 알리는 프로토콜이다.
 *
 * 클라이언트에서 서버로 전송된다.
 */
const DISCONNECT = "disconnect";

/**
 * 방 참여를 요청하는 프로토콜이다.
 *
 * 클라이언트에서 서버로 전송된다.
 */
const JOIN_ROOM = "joinRoom";

/**
 * WebRTC transport 생성을 요청하는 프로토콜이다.
 *
 * 클라이언트에서 서버로 전송되며 `isConsumer`가 `true`이면 소비자, 아니면 생성자 포트를 생성한다.
 */
const CREATE_WEB_RTC_TRANSPORT = "createWebRtcTransport";

/**
 * 생성자 포트를 생성하라는 요청이다.
 *
 * 클라이언트가 서버에 전송한다.
 */
const TRANSPORT_PRODUCER = "transport-produce";

/**
 * 생성자 트랜스포트가 성공적으로 연결되었다고 클라이언트가 서버에 보내는 프로토콜이다.
 */
const TRANSPORT_PRODUCER_CONNECT = "transport-producer-connected";

/**
 * 소비자 트랜스포트가 성공적으로 연결되었다고 클라이언트가 서버에 보내는 프로토콜이다.
 */
const TRANSPORT_RECEIVER_CONNECT = "transport-receiver-connected";

/**
 * 클라이언트가 소비할 준비가 되어 서버에 소비 요청을 보낸다.
 */
const CONSUME = "consume";

/**
 * 클라이언트가 소비를 다시 재개할 때 요청을 서버에 보낸다.
 */
const CONSUME_RESUME = "consumer-resume";

/**
 * 요청을 보낸 클라이언트의 생성자는 제외한 모든 생성자를 요청한다.
 *
 * 클라이언트에서 서버로 전송된다.
 */
const GET_PRODUCER_IDS = "getProducers";

/**
 * 새로운 생성자가 등장했다고 서버가 클라이언트에게 전송한다.
 */
const NEW_PRODUCER = "new-producer";

/**
 * 기존에 존재하던 생산자가 사라졌음을 알리는 프로토콜이다.
 *
 * 서버에서 클라이언트로 전달된다.
 */
const PRODUCER_CLOSED = "producer-closed";

module.exports = {
    IP_ADDRESS,
    NAME_SPACE,
    CONNECTION,
    CONNECTION_SUCCESS,
    DISCONNECT,
    JOIN_ROOM,
    CREATE_WEB_RTC_TRANSPORT,
    TRANSPORT_PRODUCER,
    TRANSPORT_PRODUCER_CONNECT,
    TRANSPORT_RECEIVER_CONNECT,
    CONSUME,
    CONSUME_RESUME,
    GET_PRODUCERS: GET_PRODUCER_IDS,
    NEW_PRODUCER,
    PRODUCER_CLOSED,
};
