'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin, requireMaster } = require('../auth');

router.get('/', (req, res) => {
  res.json(db.listarEtiquetas());
});

router.get('/admin', requireMaster, (req, res) => {
  res.json(db.listarEtiquetasAdmin());
});

router.post('/', requireMaster, (req, res) => {
  const { nome, descricao, parent_slug, cor } = req.body;
  if (!nome?.trim()) return res.status(400).json({ erro: 'Nome é obrigatório' });
  try {
    const r = db.criarEtiqueta({ nome, descricao, parent_slug, cor });
    res.status(201).json(r);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.patch('/:id', requireMaster, (req, res) => {
  const { nome, descricao, parent_slug, cor, ativo } = req.body;
  try {
    db.atualizarEtiqueta(Number(req.params.id), { nome, descricao, parent_slug, cor, ativo });
    res.json({ mensagem: 'Atualizado' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.delete('/:id', requireMaster, (req, res) => {
  db.deletarEtiqueta(Number(req.params.id));
  res.json({ mensagem: 'Removido' });
});

module.exports = router;
