#!/bin/sh
set -e

if [ ! -f /app/data/chamados.db ]; then
  echo "[litestream] Banco nao encontrado. Tentando restaurar do R2..."
  litestream restore -if-replica-exists -config /app/litestream.yml /app/data/chamados.db \
    && echo "[litestream] Banco restaurado com sucesso." \
    || echo "[litestream] Nenhum backup encontrado. Iniciando banco novo."
fi

echo "[litestream] Iniciando replicacao continua..."
exec litestream replicate -config /app/litestream.yml -exec "node /app/server.js"
