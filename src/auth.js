const jwt = require('jsonwebtoken');

const DURACAO = 30 * 24 * 60 * 60;        // 30 dias em segundos
const COOKIE_MAX_AGE = DURACAO * 1000;     // em milissegundos

function _renovar(payload, res, nome) {
  const { iat, exp, ...claims } = payload;
  const novoToken = jwt.sign(claims, process.env.JWT_SECRET, { expiresIn: DURACAO });
  res.cookie(nome, novoToken, { httpOnly: true, sameSite: 'Strict', maxAge: COOKIE_MAX_AGE });
}

function requireAdmin(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) return res.status(401).json({ erro: 'Não autenticado' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    _renovar(payload, res, 'token');
    next();
  } catch {
    res.clearCookie('token');
    return res.status(401).json({ erro: 'Sessão expirada ou inválida' });
  }
}

function requireMaster(req, res, next) {
  requireAdmin(req, res, () => {
    if (!req.admin.is_master) {
      return res.status(403).json({ erro: 'Acesso restrito ao master' });
    }
    next();
  });
}

function requireUsuario(req, res, next) {
  const token = req.cookies && req.cookies.token_usuario;
  if (!token) return res.status(401).json({ erro: 'Não autenticado' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload;
    _renovar(payload, res, 'token_usuario');
    next();
  } catch {
    res.clearCookie('token_usuario');
    return res.status(401).json({ erro: 'Sessão expirada ou inválida' });
  }
}

module.exports = { requireAdmin, requireMaster, requireUsuario };
