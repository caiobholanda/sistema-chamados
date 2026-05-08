const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin, requireMaster } = require('../auth');

function san(s) {
  if (typeof s !== 'string') return String(s || '');
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;').trim();
}

// GET /api/admin/inventario
router.get('/', requireAdmin, (req, res) => {
  try {
    const lista = db.listarInventario({ setor: req.query.setor, status: req.query.status, search: req.query.search });
    return res.json(lista);
  } catch (err) { console.error(err); return res.status(500).json({ erro: 'Erro interno' }); }
});

// POST /api/admin/inventario
router.post('/', requireAdmin, (req, res) => {
  try {
    const campos = ['setor','usuario','processador','memoria','sistema_operacional','hd_ssd','office','tag','entradas_monitor','modelo_monitor','status','hostname','data_troca','observacao','atualizacao_win11'];
    const dados = {};
    for (const c of campos) dados[c] = san(req.body[c] || '');
    if (!dados.setor) return res.status(400).json({ erro: 'Setor obrigatório' });
    const id = db.criarInventario(dados);
    return res.status(201).json({ id, mensagem: 'Equipamento adicionado' });
  } catch (err) { console.error(err); return res.status(500).json({ erro: 'Erro interno' }); }
});

// PATCH /api/admin/inventario/:id
router.patch('/:id', requireAdmin, (req, res) => {
  try {
    const item = db.buscarInventarioPorId(req.params.id);
    if (!item) return res.status(404).json({ erro: 'Não encontrado' });
    const campos = ['setor','usuario','processador','memoria','sistema_operacional','hd_ssd','office','tag','entradas_monitor','modelo_monitor','status','hostname','data_troca','observacao','atualizacao_win11'];
    const dados = {};
    for (const c of campos) { if (req.body[c] !== undefined) dados[c] = san(req.body[c]); }
    db.atualizarInventario(req.params.id, dados);
    return res.json({ mensagem: 'Atualizado' });
  } catch (err) { console.error(err); return res.status(500).json({ erro: 'Erro interno' }); }
});

// DELETE /api/admin/inventario/:id
router.delete('/:id', requireMaster, (req, res) => {
  try {
    db.deletarInventario(req.params.id);
    return res.json({ mensagem: 'Excluído' });
  } catch (err) { console.error(err); return res.status(500).json({ erro: 'Erro interno' }); }
});

module.exports = router;
