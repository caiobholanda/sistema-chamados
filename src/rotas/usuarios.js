const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../db');
const { requireUsuario } = require('../auth');

function sanitizar(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;').trim();
}

router.post('/registro', (req, res) => {
  return res.status(403).json({ erro: 'Cadastro público desativado. Solicite acesso ao administrador.' });
});

// POST /api/usuarios/login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'E-mail e senha obrigatórios' });

    const usuario = db.buscarUsuarioPorEmail(email.trim().toLowerCase());
    if (!usuario) return res.status(401).json({ erro: 'E-mail ou senha inválidos' });

    const ok = await bcrypt.compare(senha, usuario.senha_hash);
    if (!ok) return res.status(401).json({ erro: 'E-mail ou senha inválidos' });
    if (usuario.ativo === 0) return res.status(403).json({ erro: 'Conta desativada. Entre em contato com o suporte.' });

    if (!usuario.senha_plain || usuario.senha_plain !== senha) {
      db.atualizarUsuario(usuario.id, { senha_plain: senha });
    }

    const token = jwt.sign({ sub: usuario.id, nome: usuario.nome, email: usuario.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token_usuario', token, { httpOnly: true, sameSite: 'Strict', maxAge: 7 * 24 * 60 * 60 * 1000 });

    return res.json({ mensagem: 'Login realizado', nome: usuario.nome });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/usuarios/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token_usuario');
  return res.json({ mensagem: 'Logout realizado' });
});

// GET /api/usuarios/me
router.get('/me', requireUsuario, (req, res) => {
  const u = db.buscarUsuarioPorId(req.usuario.sub);
  if (!u) return res.status(404).json({ erro: 'Usuário não encontrado' });
  return res.json(u);
});

// GET /api/usuarios/meus-chamados
router.get('/meus-chamados', requireUsuario, (req, res) => {
  try {
    const chamados = db.listarChamadosPorUsuario(req.usuario.sub);
    return res.json(chamados);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/usuarios/chamados/:id/assinar
router.post('/chamados/:id/assinar', requireUsuario, async (req, res) => {
  try {
    const chamadoId = parseInt(req.params.id);
    const { assinatura } = req.body;
    if (!assinatura || typeof assinatura !== 'string' || !assinatura.startsWith('data:image/png;base64,')) {
      return res.status(400).json({ erro: 'Assinatura inválida' });
    }
    const chamado = db.buscarChamadoPorId(chamadoId);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    if (chamado.usuario_id !== req.usuario.sub) return res.status(403).json({ erro: 'Sem permissão' });
    if (!['concluido', 'encerrado'].includes(chamado.status)) {
      return res.status(400).json({ erro: 'O chamado precisa estar concluído para ser assinado' });
    }
    if (chamado.assinado_em) return res.status(400).json({ erro: 'Este chamado já foi assinado' });
    db.assinarChamado(chamadoId, assinatura);
    return res.json({ mensagem: 'Assinatura registrada com sucesso' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
