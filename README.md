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
