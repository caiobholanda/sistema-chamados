// Rate limit in-memory por IP. Simples e suficiente para 1 máquina Fly.
// Login: janela de 15 min; 10 FALHAS; bloqueio retorna 429.
// Logins bem-sucedidos não consomem cota — só falhas contam (registrarFalhaLogin).

const JANELA_MS = 15 * 60 * 1000;
const MAX_TENT = 10;
const falhasLogin = new Map();
const mapasLimiters = [falhasLogin];

function _ip(req) {
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

// Middleware: apenas VERIFICA o contador de falhas por IP (não incrementa).
function loginRateLimit(req, res, next) {
  const ip = _ip(req);
  const agora = Date.now();
  const reg = falhasLogin.get(ip);
  if (reg && agora <= reg.reset && reg.count >= MAX_TENT) {
    const segundos = Math.ceil((reg.reset - agora) / 1000);
    res.setHeader('Retry-After', segundos);
    return res.status(429).json({ erro: `Muitas tentativas de login. Tente novamente em ${Math.ceil(segundos / 60)} minuto(s).` });
  }
  next();
}

// Incrementa o contador de falhas do IP (chamar quando o login falhar).
function registrarFalhaLogin(req) {
  const ip = _ip(req);
  const agora = Date.now();
  let reg = falhasLogin.get(ip);
  if (!reg || agora > reg.reset) {
    reg = { count: 0, reset: agora + JANELA_MS };
  }
  reg.count++;
  falhasLogin.set(ip, reg);
}

// Zera o contador do IP (chamar em login bem-sucedido).
function limparFalhasLogin(req) {
  falhasLogin.delete(_ip(req));
}

// Factory: middleware genérico que conta TODA requisição por IP em Map próprio.
function criarRateLimit({ max, janelaMs, mensagem }) {
  const contadores = new Map();
  mapasLimiters.push(contadores);
  return function rateLimit(req, res, next) {
    const ip = _ip(req);
    const agora = Date.now();
    let reg = contadores.get(ip);
    if (!reg || agora > reg.reset) {
      reg = { count: 0, reset: agora + janelaMs };
    }
    reg.count++;
    contadores.set(ip, reg);
    if (reg.count > max) {
      const segundos = Math.ceil((reg.reset - agora) / 1000);
      res.setHeader('Retry-After', segundos);
      return res.status(429).json({ erro: mensagem || `Muitas requisições. Tente novamente em ${Math.ceil(segundos / 60)} minuto(s).` });
    }
    next();
  };
}

// Limpeza periódica de IPs expirados em todos os maps (evita crescer infinito)
setInterval(() => {
  const agora = Date.now();
  for (const mapa of mapasLimiters) {
    for (const [ip, reg] of mapa) {
      if (agora > reg.reset) mapa.delete(ip);
    }
  }
}, JANELA_MS).unref();

module.exports = { loginRateLimit, registrarFalhaLogin, limparFalhasLogin, criarRateLimit };
