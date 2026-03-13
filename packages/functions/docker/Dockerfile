FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends gosu \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g npm@latest \
  && mkdir -p /app/packages/functions \
  && chown -R node:node /app \
  && echo "alias ll='ls -al'" >> /home/node/.bashrc
COPY packages/functions/docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
WORKDIR /app/packages/functions
ENTRYPOINT ["entrypoint.sh"]
