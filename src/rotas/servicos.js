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

router.get('/', (req, res) => {
  res.json(db.listarServicos());
});

router.get('/admin', requireAdmin, (req, res) => {
  res.json(db.listarServicosAdmin());
});

router.post('/', requireAdmin, (req, res) => {
  const { nome, descricao } = req.body;
  if (!nome?.trim()) return res.status(400).json({ erro: 'Nome obrigatório' });
  const id = db.criarServico({ nome: san(nome), descricao: descricao ? san(descricao) : null });
  res.status(201).json({ id });
});

router.patch('/:id', requireAdmin, (req, res) => {
  const id = +req.params.id;
  const { nome, descricao, ativo } = req.body;
  const upd = {};
  if (nome !== undefined) upd.nome = san(nome);
  if (descricao !== undefined) upd.descricao = descricao ? san(descricao) : null;
  if (ativo !== undefined) upd.ativo = ativo;
  db.atualizarServico(id, upd);
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.deletarServico(+req.params.id);
  res.json({ ok: true });
});

module.exports = router;
