FROM node:20-alpine

WORKDIR /app

RUN wget -q https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-amd64-static.tar.gz \
    && tar -xzf litestream-v0.3.13-linux-amd64-static.tar.gz \
    && mv litestream /usr/local/bin/litestream \
    && rm litestream-v0.3.13-linux-amd64-static.tar.gz

COPY package*.json ./
RUN npm ci --production

COPY . .

RUN mkdir -p data data/uploads && chmod +x /app/start.sh

EXPOSE 3000

CMD ["/app/start.sh"]
