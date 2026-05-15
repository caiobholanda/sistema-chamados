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

router.get('/', requireAdmin, (req, res) => {
  res.json(db.listarContatos());
});

router.post('/', requireAdmin, (req, res) => {
  const { area, nome, responsabilidade, wpp, telefone_fixo, celular, email } = req.body;
  const id = db.criarContato({
    area: area ? san(area) : null,
    nome: nome ? san(nome) : null,
    responsabilidade: responsabilidade ? san(responsabilidade) : null,
    wpp: wpp ? san(wpp) : null,
    telefone_fixo: telefone_fixo ? san(telefone_fixo) : null,
    celular: celular ? san(celular) : null,
    email: email ? san(email) : null,
  });
  res.status(201).json({ id });
});

router.put('/:id', requireAdmin, (req, res) => {
  const id = +req.params.id;
  const { area, nome, responsabilidade, wpp, telefone_fixo, celular, email } = req.body;
  db.atualizarContato(id, {
    area: area !== undefined ? (area ? san(area) : null) : undefined,
    nome: nome !== undefined ? (nome ? san(nome) : null) : undefined,
    responsabilidade: responsabilidade !== undefined ? (responsabilidade ? san(responsabilidade) : null) : undefined,
    wpp: wpp !== undefined ? (wpp ? san(wpp) : null) : undefined,
    telefone_fixo: telefone_fixo !== undefined ? (telefone_fixo ? san(telefone_fixo) : null) : undefined,
    celular: celular !== undefined ? (celular ? san(celular) : null) : undefined,
    email: email !== undefined ? (email ? san(email) : null) : undefined,
  });
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.deletarContato(+req.params.id);
  res.json({ ok: true });
});

module.exports = router;
