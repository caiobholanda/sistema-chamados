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

// POST /api/usuarios/registro
router.post('/registro', async (req, res) => {
  try {
    let { nome, email, senha } = req.body;
    nome = sanitizar(nome || '');
    email = (email || '').trim().toLowerCase();

    if (!nome || nome.length < 2 || nome.length > 80) return res.status(400).json({ erro: 'Nome deve ter 2–80 caracteres' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ erro: 'E-mail inválido' });
    if (!senha || senha.length < 6) return res.status(400).json({ erro: 'Senha deve ter pelo menos 6 caracteres' });

    const existente = db.buscarUsuarioPorEmail(email);
    if (existente) return res.status(400).json({ erro: 'E-mail já cadastrado' });

    const senha_hash = await bcrypt.hash(senha, 12);
    const id = db.registrarUsuario({ nome, email, senha_hash });

    const token = jwt.sign({ sub: id, nome, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token_usuario', token, { httpOnly: true, sameSite: 'Strict', maxAge: 7 * 24 * 60 * 60 * 1000 });

    return res.status(201).json({ mensagem: 'Conta criada com sucesso', nome });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
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

module.exports = router;
