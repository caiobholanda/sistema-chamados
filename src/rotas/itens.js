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

const TIPOS_VALIDOS = ['estoque', 'inventario'];
const STATUS_VALIDOS = ['disponivel', 'em_uso', 'em_manutencao', 'descartado'];

router.get('/chamados-compra', requireAdmin, (req, res) => {
  res.json(db.listarChamadosProcessoCompra());
});

router.get('/', requireAdmin, (req, res) => {
  const tipo = req.query.tipo;
  if (!TIPOS_VALIDOS.includes(tipo)) return res.status(400).json({ erro: 'tipo deve ser estoque ou inventario' });
  res.json(db.listarItens(tipo));
});

router.get('/:id', requireAdmin, (req, res) => {
  const item = db.buscarItemPorId(+req.params.id);
  if (!item) return res.status(404).json({ erro: 'Item não encontrado' });
  res.json(item);
});

router.post('/', requireAdmin, (req, res) => {
  const { nome, tipo, categoria, quantidade, quantidade_minima, localizacao, descricao, status, numero_serie, fabricante, modelo } = req.body;
  if (!nome || !tipo) return res.status(400).json({ erro: 'nome e tipo são obrigatórios' });
  if (!TIPOS_VALIDOS.includes(tipo)) return res.status(400).json({ erro: 'tipo inválido' });
  const id = db.criarItem({
    nome: san(nome),
    tipo,
    categoria: categoria ? san(categoria) : null,
    quantidade: quantidade !== undefined ? +quantidade : 0,
    quantidade_minima: quantidade_minima !== undefined ? +quantidade_minima : 0,
    localizacao: localizacao ? san(localizacao) : null,
    descricao: descricao ? san(descricao) : null,
    status: STATUS_VALIDOS.includes(status) ? status : 'disponivel',
    numero_serie: numero_serie ? san(numero_serie) : null,
    fabricante: fabricante ? san(fabricante) : null,
    modelo: modelo ? san(modelo) : null,
  });
  res.status(201).json({ id });
});

router.patch('/:id', requireAdmin, (req, res) => {
  const item = db.buscarItemPorId(+req.params.id);
  if (!item) return res.status(404).json({ erro: 'Item não encontrado' });
  const dados = {};
  for (const campo of ['nome', 'categoria', 'localizacao', 'descricao', 'numero_serie', 'fabricante', 'modelo']) {
    if (req.body[campo] !== undefined) dados[campo] = req.body[campo] ? san(req.body[campo]) : null;
  }
  if (req.body.quantidade !== undefined) dados.quantidade = +req.body.quantidade;
  if (req.body.quantidade_minima !== undefined) dados.quantidade_minima = +req.body.quantidade_minima;
  if (req.body.status !== undefined && STATUS_VALIDOS.includes(req.body.status)) dados.status = req.body.status;
  db.atualizarItem(+req.params.id, dados);
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const item = db.buscarItemPorId(+req.params.id);
  if (!item) return res.status(404).json({ erro: 'Item não encontrado' });
  db.deletarItem(+req.params.id);
  res.json({ ok: true });
});

module.exports = router;
