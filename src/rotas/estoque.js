const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin, requireMaster } = require('../auth');

function san(s) {
  if (typeof s !== 'string') return String(s || '');
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;').trim();
}

// GET /api/admin/estoque/itens
router.get('/itens', requireAdmin, (req, res) => {
  try { return res.json(db.listarEstoqueItens()); }
  catch (err) { console.error(err); return res.status(500).json({ erro: 'Erro interno' }); }
});

// POST /api/admin/estoque/itens
router.post('/itens', requireAdmin, (req, res) => {
  try {
    const { nome, tipo } = req.body;
    if (!nome) return res.status(400).json({ erro: 'Nome obrigatório' });
    const id = db.criarEstoqueItem({
      nome: san(nome), tipo: san(tipo || 'outro'),
      urgente: req.body.urgente ? 1 : 0,
      observacao: req.body.observacao !== undefined ? san(req.body.observacao) : '',
      especificacao: req.body.especificacao !== undefined ? san(req.body.especificacao) : '',
    });
    return res.status(201).json({ id, mensagem: 'Item criado' });
  } catch (err) { console.error(err); return res.status(500).json({ erro: 'Erro interno' }); }
});

// PATCH /api/admin/estoque/itens/:id
router.patch('/itens/:id', requireAdmin, (req, res) => {
  try {
    if (!db.buscarEstoqueItemPorId(req.params.id)) return res.status(404).json({ erro: 'Não encontrado' });
    const dados = {};
    if (req.body.nome !== undefined)          dados.nome          = san(req.body.nome);
    if (req.body.tipo !== undefined)          dados.tipo          = san(req.body.tipo);
    if (req.body.urgente !== undefined)       dados.urgente       = req.body.urgente ? 1 : 0;
    if (req.body.observacao !== undefined)    dados.observacao    = san(req.body.observacao);
    if (req.body.especificacao !== undefined) dados.especificacao = san(req.body.especificacao);
    db.atualizarEstoqueItem(req.params.id, dados);
    return res.json({ mensagem: 'Atualizado' });
  } catch (err) { console.error(err); return res.status(500).json({ erro: 'Erro interno' }); }
});

// DELETE /api/admin/estoque/itens/:id
router.delete('/itens/:id', requireMaster, (req, res) => {
  try {
    db.deletarEstoqueItem(req.params.id);
    return res.json({ mensagem: 'Excluído' });
  } catch (err) { console.error(err); return res.status(500).json({ erro: 'Erro interno' }); }
});

// POST /api/admin/estoque/itens/:id/movimentacao
router.post('/itens/:id/movimentacao', requireAdmin, (req, res) => {
  try {
    const item = db.buscarEstoqueItemPorId(req.params.id);
    if (!item) return res.status(404).json({ erro: 'Item não encontrado' });
    const { tipo, cor, quantidade, observacao, chamado_id, setor_destino, setor_origem } = req.body;
    if (!['entrada','saida'].includes(tipo)) return res.status(400).json({ erro: 'Tipo inválido' });
    const qtd = parseInt(quantidade, 10);
    if (!qtd || qtd < 1) return res.status(400).json({ erro: 'Quantidade inválida' });

    // Check sufficient stock for saída
    if (tipo === 'saida') {
      const campo = cor && cor !== 'geral' ? `qtd_${cor}` : 'qtd_geral';
      if ((item[campo] || 0) < qtd) return res.status(400).json({ erro: 'Estoque insuficiente' });
    }

    const adminNome = req.admin ? req.admin.nome || '' : '';
    const cid = chamado_id ? parseInt(chamado_id, 10) : null;
    const setor = tipo === 'saida' ? san(setor_destino || '') : '';
    const origem = tipo === 'entrada' ? san(setor_origem || '') : '';
    db.registrarMovimentacao(req.params.id, tipo, cor || '', qtd, adminNome, san(observacao || ''), cid, setor, origem);
    return res.json({ mensagem: tipo === 'entrada' ? 'Entrada registrada' : 'Saída registrada' });
  } catch (err) { console.error(err); return res.status(500).json({ erro: 'Erro interno' }); }
});

// GET /api/admin/estoque/itens/:id/movimentacoes
router.get('/itens/:id/movimentacoes', requireAdmin, (req, res) => {
  try { return res.json(db.listarMovimentacoes(req.params.id)); }
  catch (err) { console.error(err); return res.status(500).json({ erro: 'Erro interno' }); }
});

// GET /api/admin/estoque/impressoras
router.get('/impressoras', requireAdmin, (req, res) => {
  try { return res.json(db.listarImpressoras()); }
  catch (err) { console.error(err); return res.status(500).json({ erro: 'Erro interno' }); }
});

// POST /api/admin/estoque/impressoras
router.post('/impressoras', requireAdmin, (req, res) => {
  try {
    const { nome, ip, selb, localizacao, numero_serie } = req.body;
    if (!nome) return res.status(400).json({ erro: 'Nome obrigatório' });
    const id = db.criarImpressora({ nome: san(nome), ip: san(ip||''), selb: san(selb||''), localizacao: san(localizacao||''), numero_serie: san(numero_serie||'') });
    return res.status(201).json({ id, mensagem: 'Impressora adicionada' });
  } catch (err) { console.error(err); return res.status(500).json({ erro: 'Erro interno' }); }
});

// PATCH /api/admin/estoque/impressoras/:id
router.patch('/impressoras/:id', requireAdmin, (req, res) => {
  try {
    if (!db.listarImpressoras().find(i => i.id == req.params.id)) return res.status(404).json({ erro: 'Não encontrada' });
    const dados = {};
    ['nome','ip','selb','localizacao','numero_serie'].forEach(f => { if (req.body[f] !== undefined) dados[f] = san(req.body[f]); });
    db.atualizarImpressora(req.params.id, dados);
    return res.json({ mensagem: 'Atualizada' });
  } catch (err) { console.error(err); return res.status(500).json({ erro: 'Erro interno' }); }
});

// DELETE /api/admin/estoque/impressoras/:id
router.delete('/impressoras/:id', requireMaster, (req, res) => {
  try {
    db.deletarImpressora(req.params.id);
    return res.json({ mensagem: 'Excluída' });
  } catch (err) { console.error(err); return res.status(500).json({ erro: 'Erro interno' }); }
});

// ── Patrimônio individual ──────────────────────────────────

const TIPOS_MOV_PAT = ['entrada','saida','retorno','manutencao','descarte'];

router.get('/patrimonio', requireAdmin, (req, res) => {
  try {
    const { status, categoria, busca } = req.query;
    return res.json(db.listarPatrimonio({ status, categoria, busca }));
  } catch (err) { console.error(err); return res.status(500).json({ erro: 'Erro interno' }); }
});

router.get('/patrimonio/:id', requireAdmin, (req, res) => {
  try {
    const item = db.buscarPatrimonioPorId(req.params.id);
    if (!item) return res.status(404).json({ erro: 'Não encontrado' });
    return res.json(item);
  } catch (err) { console.error(err); return res.status(500).json({ erro: 'Erro interno' }); }
});

router.post('/patrimonio', requireAdmin, (req, res) => {
  try {
    const { descricao, categoria, status, setor_atual, observacao, codigo } = req.body;
    if (!descricao) return res.status(400).json({ erro: 'Descrição obrigatória' });
    const id = db.criarPatrimonio({
      codigo: codigo ? san(codigo) : '',
      descricao: san(descricao),
      categoria: san(categoria || ''),
      status: san(status || 'disponivel'),
      setor_atual: san(setor_atual || ''),
      observacao: san(observacao || ''),
    });
    return res.status(201).json({ id, mensagem: 'Item de patrimônio criado' });
  } catch (err) { console.error(err); return res.status(500).json({ erro: 'Erro interno' }); }
});

router.patch('/patrimonio/:id', requireAdmin, (req, res) => {
  try {
    if (!db.buscarPatrimonioPorId(req.params.id)) return res.status(404).json({ erro: 'Não encontrado' });
    const dados = {};
    ['codigo','descricao','categoria','status','setor_atual','observacao'].forEach(f => {
      if (req.body[f] !== undefined) dados[f] = san(req.body[f]);
    });
    db.atualizarPatrimonio(req.params.id, dados);
    return res.json({ mensagem: 'Atualizado' });
  } catch (err) { console.error(err); return res.status(500).json({ erro: 'Erro interno' }); }
});

router.delete('/patrimonio/:id', requireMaster, (req, res) => {
  try {
    db.deletarPatrimonio(req.params.id);
    return res.json({ mensagem: 'Excluído' });
  } catch (err) { console.error(err); return res.status(500).json({ erro: 'Erro interno' }); }
});

router.post('/patrimonio/:id/movimentacao', requireAdmin, (req, res) => {
  try {
    const item = db.buscarPatrimonioPorId(req.params.id);
    if (!item) return res.status(404).json({ erro: 'Não encontrado' });
    const { tipo, setor_origem, setor_destino, chamado_id, observacao } = req.body;
    if (!TIPOS_MOV_PAT.includes(tipo)) return res.status(400).json({ erro: 'Tipo de movimentação inválido' });
    if (tipo === 'saida' && !setor_destino) return res.status(400).json({ erro: 'Informe o setor de destino' });
    const adminNome = req.admin ? req.admin.nome || '' : '';
    const cid = chamado_id ? parseInt(chamado_id, 10) : null;
    db.registrarMovimentacaoPatrimonio(item.id, tipo, san(setor_origem||''), san(setor_destino||''), adminNome, cid, san(observacao||''));
    return res.json({ mensagem: 'Movimentação registrada' });
  } catch (err) { console.error(err); return res.status(500).json({ erro: 'Erro interno' }); }
});

router.get('/patrimonio/:id/historico', requireAdmin, (req, res) => {
  try { return res.json(db.listarMovimentacoesPatrimonio(req.params.id)); }
  catch (err) { console.error(err); return res.status(500).json({ erro: 'Erro interno' }); }
});

module.exports = router;
