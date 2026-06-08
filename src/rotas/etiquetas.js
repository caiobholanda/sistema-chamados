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
    const id = Number(req.params.id);
    if (parent_slug) {
      const todas = db.listarEtiquetas();
      const alvo = todas.find(e => e.id === id);
      if (alvo) {
        const descendentes = new Set();
        const queue = [alvo.slug];
        while (queue.length) {
          const s = queue.shift();
          if (!s || descendentes.has(s)) continue;
          descendentes.add(s);
          todas.filter(e => e.parent_slug === s).forEach(e => queue.push(e.slug));
        }
        if (descendentes.has(parent_slug)) {
          return res.status(400).json({ erro: 'Referência circular: o pai escolhido é descendente desta etiqueta.' });
        }
      }
    }
    db.atualizarEtiqueta(id, { nome, descricao, parent_slug, cor, ativo });
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
