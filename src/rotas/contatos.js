const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../auth');

function san(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;').trim();
}

function sanPessoas(pessoas) {
  if (!Array.isArray(pessoas)) return [];
  return pessoas
    .filter(p => p.nome || p.responsabilidade || p.celular)
    .map(p => ({
      nome: p.nome ? san(p.nome) : null,
      responsabilidade: p.responsabilidade ? san(p.responsabilidade) : null,
      celular: p.celular ? san(p.celular) : null,
    }));
}

router.get('/', requireAdmin, (req, res) => {
  res.json(db.listarContatos());
});

router.post('/', requireAdmin, (req, res) => {
  const { area, wpp, telefone_fixo, email, pessoas } = req.body;
  const id = db.criarContato({
    area: area ? san(area) : null,
    wpp: wpp ? san(wpp) : null,
    telefone_fixo: telefone_fixo ? san(telefone_fixo) : null,
    email: email ? san(email) : null,
  });
  db.sincronizarPessoas(id, sanPessoas(pessoas));
  res.status(201).json({ id });
});

router.put('/:id', requireAdmin, (req, res) => {
  const id = +req.params.id;
  const { area, wpp, telefone_fixo, email, pessoas } = req.body;
  db.atualizarContato(id, {
    area: area !== undefined ? (area ? san(area) : null) : undefined,
    wpp: wpp !== undefined ? (wpp ? san(wpp) : null) : undefined,
    telefone_fixo: telefone_fixo !== undefined ? (telefone_fixo ? san(telefone_fixo) : null) : undefined,
    email: email !== undefined ? (email ? san(email) : null) : undefined,
  });
  if (pessoas !== undefined) db.sincronizarPessoas(id, sanPessoas(pessoas));
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.deletarContato(+req.params.id);
  res.json({ ok: true });
});

module.exports = router;
