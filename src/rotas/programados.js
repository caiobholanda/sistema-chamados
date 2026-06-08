'use strict';
const express = require('express');
const router  = express.Router();
const { requireAdmin } = require('../auth');
const {
  listarChamadosProgramados, buscarProgramadoPorId,
  inserirChamadoProgramado, atualizarChamadoProgramado,
  toggleChamadoProgramado, deletarChamadoProgramado,
  listarLogProgramado, listarUltimosGeradosProgramados,
} = require('../db');
const { calcularProxima, proximasN } = require('../programados');

const FREQS_VALIDAS = ['diario','semanal','mensal','bimestral','trimestral','semestral','anual'];

function toISO(d) { return d.toISOString().replace('T',' ').slice(0,19); }

function validarEMontar(body) {
  const { titulo, nome, setor, descricao, frequencia, hora = '08:00',
          ramal, categoria, prioridade = 'normal', pular_feriados = 1,
          admin_responsavel_id, dia_semana, dia_mes, mes } = body;

  if (!titulo?.trim()) return { erro: 'Título obrigatório' };
  if (!nome?.trim())   return { erro: 'Nome do solicitante obrigatório' };
  if (!setor?.trim())  return { erro: 'Setor obrigatório' };
  if (!descricao?.trim() || descricao.trim().length < 10)
    return { erro: 'Descrição obrigatória (mín. 10 caracteres)' };
  if (!FREQS_VALIDAS.includes(frequencia))
    return { erro: 'Frequência inválida' };
  if (!/^\d{2}:\d{2}$/.test(hora)) return { erro: 'Hora inválida (HH:MM)' };
  if (frequencia === 'semanal' && (dia_semana == null || dia_semana < 0 || dia_semana > 6))
    return { erro: 'Dia da semana obrigatório para frequência semanal (0=Dom … 6=Sáb)' };
  if (['mensal','bimestral','trimestral','semestral'].includes(frequencia) && (!dia_mes || dia_mes < 1 || dia_mes > 31))
    return { erro: 'Dia do mês obrigatório para esta frequência (1–31)' };
  if (frequencia === 'anual' && (!mes || mes < 1 || mes > 12 || !dia_mes || dia_mes < 1 || dia_mes > 31))
    return { erro: 'Mês e dia obrigatórios para frequência anual' };

  const prog = {
    titulo: titulo.trim(), nome: nome.trim(), setor: setor.trim(),
    ramal: ramal?.trim() || null, descricao: descricao.trim(),
    categoria: categoria?.trim() || null,
    prioridade: ['normal','urgente','baixa'].includes(prioridade) ? prioridade : 'normal',
    frequencia, hora, pular_feriados: pular_feriados ? 1 : 0,
    admin_responsavel_id: admin_responsavel_id ? parseInt(admin_responsavel_id) : null,
    dia_semana: dia_semana != null ? parseInt(dia_semana) : null,
    dia_mes: dia_mes != null ? parseInt(dia_mes) : null,
    mes: mes != null ? parseInt(mes) : null,
  };
  const proxima = calcularProxima(prog);
  prog.proxima_execucao = toISO(proxima);
  return { prog };
}

// GET /api/admin/programados
router.get('/', requireAdmin, (req, res) => {
  const items = listarChamadosProgramados();
  res.json({ ok: true, items });
});

// GET /api/admin/programados/recentes
router.get('/recentes', requireAdmin, (req, res) => {
  const items = listarUltimosGeradosProgramados(30);
  res.json({ ok: true, items });
});

// GET /api/admin/programados/:id
router.get('/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ ok: false, erro: 'ID inválido' });
  const item = buscarProgramadoPorId(id);
  if (!item) return res.status(404).json({ ok: false, erro: 'Não encontrado' });
  res.json({ ok: true, item });
});

// GET /api/admin/programados/:id/log
router.get('/:id/log', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ ok: false, erro: 'ID inválido' });
  const items = listarLogProgramado(id, 30);
  res.json({ ok: true, items });
});

// GET /api/admin/programados/:id/preview  — próximas 5 datas
router.get('/:id/preview', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ ok: false, erro: 'ID inválido' });
  const prog = buscarProgramadoPorId(id);
  if (!prog) return res.status(404).json({ ok: false, erro: 'Não encontrado' });
  const datas = proximasN(prog, 5).map(d => toISO(d));
  res.json({ ok: true, datas });
});

// POST /api/admin/programados  — preview de próximas 5 datas (sem salvar)
router.post('/preview', requireAdmin, (req, res) => {
  const { erro, prog } = validarEMontar(req.body);
  if (erro) return res.status(400).json({ ok: false, erro });
  const datas = proximasN(prog, 5).map(d => toISO(d));
  res.json({ ok: true, proxima: prog.proxima_execucao, datas });
});

// POST /api/admin/programados
router.post('/', requireAdmin, (req, res) => {
  const { erro, prog } = validarEMontar(req.body);
  if (erro) return res.status(400).json({ ok: false, erro });
  const id = inserirChamadoProgramado(prog);
  res.status(201).json({ ok: true, id });
});

// PUT /api/admin/programados/:id
router.put('/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ ok: false, erro: 'ID inválido' });
  if (!buscarProgramadoPorId(id)) return res.status(404).json({ ok: false, erro: 'Não encontrado' });
  const { erro, prog } = validarEMontar(req.body);
  if (erro) return res.status(400).json({ ok: false, erro });
  atualizarChamadoProgramado(id, prog);
  res.json({ ok: true });
});

// PATCH /api/admin/programados/:id/toggle
router.patch('/:id/toggle', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ ok: false, erro: 'ID inválido' });
  const item = buscarProgramadoPorId(id);
  if (!item) return res.status(404).json({ ok: false, erro: 'Não encontrado' });
  const novoAtivo = item.ativo ? 0 : 1;
  toggleChamadoProgramado(id, novoAtivo);
  res.json({ ok: true, ativo: novoAtivo });
});

// DELETE /api/admin/programados/:id
router.delete('/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ ok: false, erro: 'ID inválido' });
  if (!buscarProgramadoPorId(id)) return res.status(404).json({ ok: false, erro: 'Não encontrado' });
  deletarChamadoProgramado(id);
  res.json({ ok: true });
});

module.exports = router;
