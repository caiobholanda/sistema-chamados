// Rate limit in-memory por IP. Simples e suficiente para 1 máquina Fly.
// Janela de 15 min; 10 tentativas; bloqueio retorna 429.

const JANELA_MS = 15 * 60 * 1000;
const MAX_TENT = 10;
const tentativas = new Map();

function loginRateLimit(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const agora = Date.now();
  let reg = tentativas.get(ip);
  if (!reg || agora > reg.reset) {
    reg = { count: 0, reset: agora + JANELA_MS };
  }
  reg.count++;
  tentativas.set(ip, reg);
  if (reg.count > MAX_TENT) {
    const segundos = Math.ceil((reg.reset - agora) / 1000);
    res.setHeader('Retry-After', segundos);
    return res.status(429).json({ erro: `Muitas tentativas de login. Tente novamente em ${Math.ceil(segundos / 60)} minuto(s).` });
  }
  next();
}

// Limpeza periódica de IPs expirados (evita map crescer infinito)
setInterval(() => {
  const agora = Date.now();
  for (const [ip, reg] of tentativas) {
    if (agora > reg.reset) tentativas.delete(ip);
  }
}, JANELA_MS).unref();

module.exports = { loginRateLimit };
