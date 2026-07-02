'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../auth');

const CAMPOS_VALIDOS = ['equipamento','processador','nobreak','memoria','so','hd_ssd','office','entradas_monitor','modelo_monitor','hostname'];

router.get('/', requireAdmin, (req, res) => {
  res.json(db.listarConfiguracoesTI());
});

router.post('/', requireAdmin, (req, res) => {
  const { campo, valor } = req.body;
  if (!campo || !CAMPOS_VALIDOS.includes(campo)) return res.status(400).json({ erro: 'Campo inválido' });
  if (!valor?.trim()) return res.status(400).json({ erro: 'Valor é obrigatório' });
  try {
    const result = db.criarConfiguracaoTI(campo, valor.trim());
    res.status(201).json({ id: result.lastInsertRowid, mensagem: 'Criado' });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) return res.status(409).json({ erro: 'Valor já existe' });
    res.status(500).json({ erro: err.message });
  }
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.deletarConfiguracaoTI(Number(req.params.id));
  res.json({ mensagem: 'Removido' });
});

module.exports = router;
