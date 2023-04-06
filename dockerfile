FROM node:17.1.0
RUN apt-get -y update
RUN apt-get -y install python3
RUN apt-get -y install python3-pip

WORKDIR /usr/src/app

COPY ./ ./

RUN npm install

EXPOSE 2000-3000

CMD ["npm", "run", "start"]
