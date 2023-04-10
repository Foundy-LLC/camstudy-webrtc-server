FROM node:17.1.0

ARG DATABASE_URL
ARG IP_ADDRESS
ARG PORT

ENV DATABASE_URL=$DATABASE_URL \
    IP_ADDRESS=$IP_ADDRESS \
    PORT=$PORT

RUN apt-get -y update
RUN apt-get -y install python3
RUN apt-get -y install python3-pip

WORKDIR /usr/src/app

COPY ./ ./

RUN npm install

EXPOSE 3000
EXPOSE 4000-4080

CMD ["npm", "run", "start"]
