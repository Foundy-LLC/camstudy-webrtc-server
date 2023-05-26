# camstudy-webrtc-server

캠 스터디 서비스에서 공부방을 위한 SFU 방식의 미디어 서버입니다. WebRTC 라이브러리인 mediasoup을 이용하여 개발되었습니다.

## 자동 배포 프로세스

1. `main` 리모트 브런치에 커밋 후 GitHub Actions 작동
2. 빌드 테스트
3. 도커 이미지 빌드 후 도커 허브에 푸시
4. AWS Codedeploy를 이용하여 그룹핑된 미디어 서버 인스턴스들에게 배포 코드 트리거
5. 배포 코드에서 미디어 서버들에게 도커 컨테이너 실행
