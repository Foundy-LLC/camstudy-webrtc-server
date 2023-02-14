/**
 * 서버에서 연결을 수신할 IP 주소이다.
 */
const IP_ADDRESS = "192.168.35.113";

const PORT = 2000;

/**
 * 소켓의 네임 스페이스이다.
 *
 * https://socket.io/docs/v4/namespaces/
 */
const NAME_SPACE = "/room";

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
 * 방 접속 준비화면에 초기정보를 전달하기 위한 프로토콜이다.
 */
const JOIN_WAITING_ROOM = "join-waiting-room";

/**
 * 다른 회원이 공부방에 접속했을 때 대기실에 있는 회원들에게 알리기 위한 프로토콜이다.
 */
const OTHER_PEER_JOINED_ROOM = "other-peer-joined-room";

/**
 * 다른 회원이 공부방에서 나갔을 때 대기실에 있는 회원들에게 알리기 위한 프로토콜이다.
 */
const OTHER_PEER_EXITED_ROOM = "other-peer-exited-room";

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

/**
 * 클라이언트가 서버에게 비디오 생산자를 닫으라는 요청을 보낸다.
 */
const CLOSE_VIDEO_PRODUCER = "close-video-producer";

/**
 * 클라이언트가 서버에게 오디오 생산자를 닫으라는 요청을 보낸다.
 */
const CLOSE_AUDIO_PRODUCER = "close-audio-producer";

/**
 * 오디오를 수신하지 않기 위해 모든 오디오 생산자를 끊는 프로토콜이다.
 *
 * 클라이언트가 서버에게 전달한다.
 */
const MUTE_HEADSET = "mute-headset";

/**
 * 헤드셋 음소거 해제를 위한 프로토콜이다.
 */
const UNMUTE_HEADSET = "unmute-headset";

/**
 * 특정 피어의 상태가 변경되었다고 서버가 클라이언트에게 알린다.
 */
const PEER_STATE_CHANGED = "peer-state-changed";

/**
 * 다른 피어가 연결을 끊었을 때 서버에서 클라이언트들에게 브로드캐스트한다.
 */
const OTHER_PEER_DISCONNECTED = "other-peer-disconnected";

/**
 * 채팅을 보내는 프로토콜이다.
 *
 * 클라이언트가 서버에 전송하면 모든 클라이언트에게 브로드캐스트된다.
 */
const SEND_CHAT = "send-chat";

/**
 * 뽀모도로 타이머를 시작하라고 클라이언트가 서버에게 요청하고 서버가 방의 모든
 * 클라이언트에게 브로드캐스트한다.
 */
const START_TIMER = "start-timer";
const START_SHORT_BREAK = "start-short-break";
const START_LONG_BREAK = "start-long-break";

/**
 * 타이머 정보를 수정하는 프로토콜이다. 클라이언트가 서버에 요청한다.
 */
const EDIT_AND_STOP_TIMER = "edit-and-stop-timer";

export {
  IP_ADDRESS,
  PORT,
  NAME_SPACE,
  CONNECTION,
  CONNECTION_SUCCESS,
  DISCONNECT,
  JOIN_WAITING_ROOM,
  OTHER_PEER_JOINED_ROOM,
  OTHER_PEER_EXITED_ROOM,
  JOIN_ROOM,
  CREATE_WEB_RTC_TRANSPORT,
  TRANSPORT_PRODUCER,
  TRANSPORT_PRODUCER_CONNECT,
  TRANSPORT_RECEIVER_CONNECT,
  CONSUME,
  CONSUME_RESUME,
  GET_PRODUCER_IDS,
  NEW_PRODUCER,
  PRODUCER_CLOSED,
  PEER_STATE_CHANGED,
  CLOSE_VIDEO_PRODUCER,
  CLOSE_AUDIO_PRODUCER,
  MUTE_HEADSET,
  UNMUTE_HEADSET,
  OTHER_PEER_DISCONNECTED,
  SEND_CHAT,
  START_TIMER,
  START_SHORT_BREAK,
  START_LONG_BREAK,
  EDIT_AND_STOP_TIMER,
};
