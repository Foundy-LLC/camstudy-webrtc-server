# camstudy-webrtc-server

# How to run

## 1. 환경변수 설정

루트에 `.env` 파일을 생성하여 환경 변수들을 설정한다.

- DATABASE_URL
- IP_ADDRESS
- PORT

## 2. 도커 이미지 생성 or 허브에서 받기

```console
docker build -t camstudy-media-server:{x.y.z} .
```

or

도커 허브에서 이미지 받기

## 3. 도커 컨테이너 실행

```console
docker run -d -p 2000-2020:2000-2020 camstudy-media-server:0.0.1
```

# Port 번호 바꿀 때

아래의 모든 항목을 수정해주세요.(나중에 환경변수로 한꺼번에 바꿀수 있도록 하겠습니다.)

- `./.github/workflows/docker-deploy.yml`
- `./src/worker.ts`의 `rtcMaxPort`
- `./dockerfile`의 EXPOSE
