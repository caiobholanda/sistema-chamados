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
  // 'ativo' NAO e aceito aqui de proposito: ativar/desativar tem endpoints
  // dedicados (/desativar e /reativar) que preservam/restauram a hierarquia.
  // Permitir o toggle por aqui contornaria essa logica.
  const { nome, descricao, parent_slug, cor } = req.body;
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
    db.atualizarEtiqueta(id, { nome, descricao, parent_slug, cor });
    res.json({ mensagem: 'Atualizado' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Desativar (soft-delete reversivel): substitui a exclusao no fluxo normal.
router.patch('/:id/desativar', requireMaster, (req, res) => {
  try {
    const ok = db.desativarEtiqueta(Number(req.params.id));
    if (!ok) return res.status(400).json({ erro: 'Etiqueta não encontrada ou já inativa' });
    res.json({ mensagem: 'Desativada' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Reativar: restaura a etiqueta e a hierarquia original.
router.patch('/:id/reativar', requireMaster, (req, res) => {
  try {
    const ok = db.reativarEtiqueta(Number(req.params.id));
    if (!ok) return res.status(404).json({ erro: 'Etiqueta não encontrada' });
    res.json({ mensagem: 'Reativada' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Exclusao definitiva (fisica): so permitida para etiquetas JA inativas.
router.delete('/:id', requireMaster, (req, res) => {
  try {
    const id = Number(req.params.id);
    const alvo = db.listarEtiquetasAdmin().find(e => e.id === id);
    if (!alvo) return res.status(404).json({ erro: 'Etiqueta não encontrada' });
    if (alvo.ativo) return res.status(400).json({ erro: 'Desative a etiqueta antes de excluir definitivamente.' });
    db.deletarEtiqueta(id);
    res.json({ mensagem: 'Removido' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
