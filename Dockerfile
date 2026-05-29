FROM node:20-alpine

WORKDIR /app

RUN wget -q https://github.com/benbjohnson/litestream/releases/download/v0.5.11/litestream-0.5.11-linux-x86_64.tar.gz \
    && tar -xzf litestream-0.5.11-linux-x86_64.tar.gz \
    && mv litestream /usr/local/bin/litestream \
    && rm litestream-0.5.11-linux-x86_64.tar.gz

COPY package*.json ./
RUN npm ci --production

COPY . .

RUN mkdir -p data data/uploads && chmod +x /app/start.sh

EXPOSE 3000

CMD ["/app/start.sh"]
