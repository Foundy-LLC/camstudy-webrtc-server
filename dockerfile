FROM node:17.1.0

ARG DATABASE_URL
ARG IP_ADDRESS
ARG PORT

RUN apt-get -y update
RUN apt-get -y install python3
RUN apt-get -y install python3-pip

ENV DATABASE_URL=$DATABASE_URL \
    IP_ADDRESS=$IP_ADDRESS \
    PORT=$PORT

RUN echo $PORT

WORKDIR /usr/src/app

COPY ./ ./

RUN npm install

EXPOSE 2000-3000

CMD ["npm", "run", "start"]
