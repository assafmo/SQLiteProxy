FROM node:latest

RUN mkdir /src/
COPY main.js /src/
COPY package.json yarn.lock /src/

RUN cd /src/; yarn install --pure-lockfile

EXPOSE 2048

ENTRYPOINT ["node", "/src/main.js", "--port", "2048"]
