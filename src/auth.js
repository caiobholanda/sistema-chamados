const jwt = require('jsonwebtoken');

function requireAdmin(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) return res.status(401).json({ erro: 'Não autenticado' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
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

module.exports = { requireAdmin, requireMaster };
