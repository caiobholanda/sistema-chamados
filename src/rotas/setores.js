const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../auth');

function san(str) {
  return typeof str === 'string' ? str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').trim() : str;
}

router.get('/', (req, res) => {
  res.json(db.listarSetores());
});

router.post('/', requireAdmin, (req, res) => {
  const nome = san(req.body.nome || '');
  if (!nome) return res.status(400).json({ erro: 'Nome obrigatório' });
  try {
    const id = db.criarSetor(nome);
    res.status(201).json({ id, nome });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) return res.status(409).json({ erro: 'Setor já existe' });
    throw e;
  }
});

router.put('/:id', requireAdmin, (req, res) => {
  const id = +req.params.id;
  const nome = san(req.body.nome || '');
  if (!nome) return res.status(400).json({ erro: 'Nome obrigatório' });
  try {
    db.editarSetor(id, nome);
    res.json({ ok: true });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) return res.status(409).json({ erro: 'Setor já existe' });
    throw e;
  }
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.excluirSetor(+req.params.id);
  res.json({ ok: true });
});

module.exports = router;
