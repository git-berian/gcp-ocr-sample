FROM node:22-slim
# web はデプロイしないため Firebase CLI は入れない（ADR-0015）。
RUN apt-get update && apt-get install -y --no-install-recommends gosu \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/packages/web \
  && chown -R node:node /app \
  && echo "alias ll='ls -al'" >> /home/node/.bashrc
COPY packages/web/docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
WORKDIR /app/packages/web
ENTRYPOINT ["entrypoint.sh"]
