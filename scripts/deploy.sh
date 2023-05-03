cd /home/ubuntu/app || echo "There is no /home/ubuntu/app directory"
source .env
sudo docker login
sudo docker pull jja08111/camstudy-media-server:latest
sudo docker stop camstudy_media_server
sudo docker rm camstudy_media_server
sudo docker run -d --name camstudy_media_server \
  -p "$RTC_MIN_PORT-$RTC_MAX_PORT:$RTC_MIN_PORT-$RTC_MAX_PORT" \
  -p "$PORT:$PORT" \
  jja08111/camstudy-media-server:latest
sudo docker image prune -a -f
echo "success";
