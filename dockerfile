FROM node:17.1.0

ARG DATABASE_URL
ARG IP_ADDRESS
ARG PORT
ARG RTC_MIN_PORT
ARG RTC_MAX_PORT

ENV DATABASE_URL=$DATABASE_URL \
    IP_ADDRESS=$IP_ADDRESS \
    PORT=$PORT \
    RTC_MIN_PORT=$RTC_MIN_PORT \
    RTC_MAX_PORT=$RTC_MAX_PORT

RUN apt-get -y update
RUN apt-get -y install python3
RUN apt-get -y install python3-pip

WORKDIR /usr/src/app

COPY ./ ./

RUN npm install

EXPOSE ${PORT}
EXPOSE ${RTC_MIN_PORT}-${RTC_MAX_PORT}

CMD ["npm", "run", "start"]
