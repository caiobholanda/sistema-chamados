const jwt = require('jsonwebtoken');

const DURACAO = 30 * 24 * 60 * 60;        // 30 dias em segundos
const COOKIE_MAX_AGE = DURACAO * 1000;     // em milissegundos
const COOKIE_SECURE = process.env.NODE_ENV === 'production';

function _renovar(payload, res, nome) {
  const { iat, exp, ...claims } = payload;
  const novoToken = jwt.sign(claims, process.env.JWT_SECRET, { expiresIn: DURACAO });
  res.cookie(nome, novoToken, { httpOnly: true, sameSite: 'Strict', secure: COOKIE_SECURE, maxAge: COOKIE_MAX_AGE });
}

function requireAdmin(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) return res.status(401).json({ erro: 'Não autenticado' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Revalida no banco: admin pode ter sido desativado/excluído depois do login.
    // Também ressincroniza is_master para evitar privilégio congelado no JWT.
    const db = require('./db');
    const admin = db.buscarAdminPorId(payload.sub);
    if (!admin || !admin.ativo) {
      res.clearCookie('token');
      return res.status(401).json({ erro: 'Conta desativada ou removida' });
    }
    payload.is_master = admin.is_master === 1;
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
    if (!req.admin || !req.admin.is_master) {
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
    // Revalida no banco: usuário pode ter sido desativado/excluído depois do login.
    const db = require('./db');
    const usuario = db.buscarUsuarioPorId(payload.sub);
    if (!usuario || !usuario.ativo) {
      res.clearCookie('token_usuario');
      return res.status(401).json({ erro: 'Conta desativada ou removida' });
    }
    req.usuario = payload;
    _renovar(payload, res, 'token_usuario');
    next();
  } catch {
    res.clearCookie('token_usuario');
    return res.status(401).json({ erro: 'Sessão expirada ou inválida' });
  }
}

module.exports = { requireAdmin, requireMaster, requireUsuario };
