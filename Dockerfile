FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y procps && rm -rf /var/lib/apt/lists/*
RUN npm install -g npm@11
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
