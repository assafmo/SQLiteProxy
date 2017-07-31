FROM node:latest

RUN mkdir /src/
COPY main.js /src/
COPY package*.json /src/

RUN cd /src/; npm install

EXPOSE 2048

ENTRYPOINT ["node", "/src/main.js", "--db", "/data/db.sqlite", "--port", "2048"]
