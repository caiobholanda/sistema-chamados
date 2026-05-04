const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../auth');

// GET /api/admin/relatorios?mes=YYYY-MM
router.get('/', requireAdmin, (req, res) => {
  try {
    const mes = req.query.mes || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(mes)) return res.status(400).json({ erro: 'Formato inválido. Use YYYY-MM' });
    return res.json(db.relatorioMes(mes));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/admin/relatorios/ranking?mes=YYYY-MM
router.get('/ranking', requireAdmin, (req, res) => {
  try {
    const mes = req.query.mes || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(mes)) return res.status(400).json({ erro: 'Formato inválido. Use YYYY-MM' });
    return res.json(db.rankingAdminsMes(mes));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/admin/relatorios/exportar?mes=YYYY-MM
router.get('/exportar', requireAdmin, (req, res) => {
  try {
    const mes = req.query.mes || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(mes)) return res.status(400).json({ erro: 'Formato inválido. Use YYYY-MM' });

    const chamados = db.exportarCsvMes(mes);

    const cabecalho = [
      'id', 'nome', 'setor', 'ramal', 'descricao', 'anexo_nome_original',
      'prioridade', 'status', 'prazo', 'admin_nome', 'solucao',
      'nota', 'comentario_avaliacao', 'criado_em', 'atualizado_em', 'concluido_em'
    ].join(';');

    const linhas = chamados.map(c => [
      c.id,
      `"${(c.nome || '').replace(/"/g, '""')}"`,
      `"${(c.setor || '').replace(/"/g, '""')}"`,
      c.ramal,
      `"${(c.descricao || '').replace(/"/g, '""')}"`,
      `"${(c.anexo_nome_original || '').replace(/"/g, '""')}"`,
      c.prioridade || '',
      c.status,
      c.prazo || '',
      `"${(c.admin_nome || '').replace(/"/g, '""')}"`,
      `"${(c.solucao || '').replace(/"/g, '""')}"`,
      c.nota || '',
      `"${(c.comentario_avaliacao || '').replace(/"/g, '""')}"`,
      c.criado_em || '',
      c.atualizado_em || '',
      c.concluido_em || '',
    ].join(';'));

    const csv = '﻿' + [cabecalho, ...linhas].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="chamados_${mes}.csv"`);
    return res.send(csv);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
