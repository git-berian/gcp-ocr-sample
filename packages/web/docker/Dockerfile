FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends gosu \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g npm@latest firebase-tools@15.11.0 \
  && mkdir -p /app/packages/web \
  && chown -R node:node /app \
  && echo "alias ll='ls -al'" >> /home/node/.bashrc
COPY packages/web/docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
WORKDIR /app/packages/web
ENTRYPOINT ["entrypoint.sh"]
