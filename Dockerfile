FROM node:boron 
MAINTAINER Tom Lodge <tlodge@gmail.com>

RUN mkdir /root/roomcast
WORKDIR /root/roomcast

ADD conf conf 
COPY worker.js .
COPY package.json .
RUN npm install --production
