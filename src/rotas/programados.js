'use strict';
const express = require('express');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();
const { requireAdmin } = require('../auth');
const db = require('../db');
const { uploadChamadoMiddleware, UPLOADS_DIR } = require('../upload');
const { calcularProxima, proximasN } = require('../programados');
const { executarChamadosProgramados } = require('../scheduler');

const FREQS_VALIDAS = ['diario','semanal','mensal','bimestral','trimestral','semestral','anual','data_unica'];

// 'YYYY-MM-DD' de hoje no fuso de Fortaleza. Usado para validar que data_unica
// nao e' no passado. Usar new Date() local do server (UTC) entregaria o dia
// errado nas horas finais do dia em Fortaleza.
function _hojeFortalezaISO() {
  const agora = new Date();
  const ftz = new Date(agora.getTime() + (-3 * 60 * 60 * 1000));
  const y = ftz.getUTCFullYear(), m = String(ftz.getUTCMonth() + 1).padStart(2, '0'), d = String(ftz.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toISO(d) { return d.toISOString().replace('T',' ').slice(0,19); }

function _sanitizarNomeArq(nome) {
  return nome.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 100);
}

function renomearAnexoProg(progId, idx, tempPath, nomeOriginal) {
  const ext  = path.extname(nomeOriginal).toLowerCase();
  const base = _sanitizarNomeArq(path.basename(nomeOriginal, ext));
  const nome = `prog_${progId}_${idx}__${base}${ext}`;
  fs.renameSync(tempPath, path.join(UPLOADS_DIR, nome));
  return nome;
}

function limparArquivosProg(anexosJson) {
  if (!anexosJson) return;
  try {
    const arr = JSON.parse(anexosJson);
    for (const a of arr) {
      try { fs.unlinkSync(path.join(UPLOADS_DIR, a.path)); } catch {}
    }
  } catch {}
}

function validarAgendamento(body) {
  const { frequencia, hora = '08:00', pular_feriados, dia_semana, dia_mes, mes, data_unica } = body;
  if (!FREQS_VALIDAS.includes(frequencia)) return { erro: 'Frequência inválida' };
  if (!/^\d{2}:\d{2}$/.test(hora)) return { erro: 'Hora inválida (HH:MM)' };
  // Valida HH:MM dentro de 00:00-23:59
  const [hh, mm] = hora.split(':').map(Number);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return { erro: 'Hora fora do intervalo (00:00–23:59)' };
  if (frequencia === 'semanal' && (dia_semana == null || dia_semana < 0 || dia_semana > 6))
    return { erro: 'Dia da semana obrigatório para frequência semanal (0=Dom…6=Sáb)' };
  if (['mensal','bimestral','trimestral','semestral'].includes(frequencia) && (!dia_mes || dia_mes < 1 || dia_mes > 31))
    return { erro: 'Dia do mês obrigatório para esta frequência (1–31)' };
  if (frequencia === 'anual' && (!mes || mes < 1 || mes > 12 || !dia_mes || dia_mes < 1 || dia_mes > 31))
    return { erro: 'Mês e dia obrigatórios para frequência anual' };
  // 'data_unica': data alvo no formato YYYY-MM-DD, deve ser hoje ou futura
  // (comparacao no fuso de Fortaleza para nao bloquear dia atual nas ultimas
  // horas em servidores UTC).
  if (frequencia === 'data_unica') {
    if (!data_unica || !/^\d{4}-\d{2}-\d{2}$/.test(data_unica)) {
      return { erro: 'Informe a data específica (YYYY-MM-DD)' };
    }
    if (data_unica < _hojeFortalezaISO()) {
      return { erro: 'A data específica não pode ser no passado' };
    }
  }
  // Conflito semanal sab/dom + pular fins-de-semana: combinacao impossivel.
  // Se aceitarmos, _proxDiaUtil silenciosamente move TODA execucao para segunda,
  // anulando a escolha do usuario.
  const pularFlag = parseInt(pular_feriados ?? '1') ? 1 : 0;
  if (frequencia === 'semanal' && pularFlag && (dia_semana === 0 || dia_semana === 6)) {
    return { erro: 'Conflito: agendamentos semanais aos sábados/domingos não podem ter "pular fins de semana" ativo (a data sempre seria movida para segunda). Desligue a opção de pular ou escolha outro dia da semana.' };
  }
  return {
    agendamento: {
      frequencia, hora,
      pular_feriados: pularFlag,
      dia_semana: dia_semana != null ? parseInt(dia_semana) : null,
      dia_mes:    dia_mes    != null ? parseInt(dia_mes)    : null,
      mes:        mes        != null ? parseInt(mes)        : null,
      data_unica: frequencia === 'data_unica' ? data_unica : null,
    },
  };
}

function montarProg(body, req) {
  const descricao = (body.descricao || '').trim();
  if (!descricao || descricao.length < 10) return { erro: 'Descrição obrigatória (mín. 10 caracteres)' };

  const { erro, agendamento } = validarAgendamento(body);
  if (erro) return { erro };

  const adminCriador = db.buscarAdminPorId(req.admin.sub);
  let nome      = adminCriador ? adminCriador.nome_completo : 'Admin';
  let setor     = 'TI';
  let usuarioId = null;

  const usuIdRaw = body.usuario_id ? parseInt(body.usuario_id, 10) : null;
  if (usuIdRaw && req.admin.is_master) {
    const u = db.buscarUsuarioPorId(usuIdRaw);
    if (u && u.ativo) { usuarioId = u.id; nome = u.nome; setor = u.setor || 'TI'; }
  }

  let adminResponsavelId = req.admin.sub;
  const adminRespRaw = body.admin_responsavel_id ? parseInt(body.admin_responsavel_id, 10) : null;
  if (adminRespRaw) {
    const alvo = db.buscarAdminPorId(adminRespRaw);
    if (alvo && alvo.ativo) adminResponsavelId = alvo.id;
  }

  const prog = {
    titulo: descricao.slice(0, 60).trim(),
    nome, setor, ramal: null, descricao,
    categoria: (body.categoria || '').trim() || null,
    prioridade: 'normal',
    ...agendamento,
    admin_responsavel_id: adminResponsavelId,
    usuario_id: usuarioId,
  };
  prog.proxima_execucao = toISO(calcularProxima(prog));
  return { prog };
}

// POST /api/admin/programados/debug/trigger
router.post('/debug/trigger', requireAdmin, async (req, res) => {
  const pendentesAntes = db.getProgramadosPendentes().map(p => ({ id: p.id, titulo: p.titulo, proxima: p.proxima_execucao }));
  const resultados = await executarChamadosProgramados();
  res.json({ ok: true, pendentesAntes, resultados });
});

// GET /api/admin/programados
router.get('/', requireAdmin, (req, res) => {
  res.json({ ok: true, items: db.listarChamadosProgramados() });
});

// GET /api/admin/programados/recentes
router.get('/recentes', requireAdmin, (req, res) => {
  res.json({ ok: true, items: db.listarUltimosGeradosProgramados(30) });
});

// GET /api/admin/programados/:id
router.get('/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ ok: false, erro: 'ID inválido' });
  const item = db.buscarProgramadoPorId(id);
  if (!item) return res.status(404).json({ ok: false, erro: 'Não encontrado' });
  res.json({ ok: true, item });
});

// GET /api/admin/programados/:id/log
router.get('/:id/log', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ ok: false, erro: 'ID inválido' });
  // Valida existencia para nao retornar 200+vazio para id fantasma (engana auditoria).
  const prog = db.buscarProgramadoPorId(id);
  if (!prog) return res.status(404).json({ ok: false, erro: 'Agendamento não encontrado' });
  res.json({ ok: true, items: db.listarLogProgramado(id, 30) });
});

// GET /api/admin/programados/:id/preview
router.get('/:id/preview', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ ok: false, erro: 'ID inválido' });
  const prog = db.buscarProgramadoPorId(id);
  if (!prog) return res.status(404).json({ ok: false, erro: 'Não encontrado' });
  res.json({ ok: true, datas: proximasN(prog, 5).map(d => toISO(d)) });
});

// POST /api/admin/programados/preview  — calcula próximas datas sem salvar (JSON)
router.post('/preview', requireAdmin, (req, res) => {
  const descricao = (req.body.descricao || '').trim();
  if (!descricao || descricao.length < 10)
    return res.status(400).json({ ok: false, erro: 'Descrição obrigatória (mín. 10 caracteres)' });
  const { erro, agendamento } = validarAgendamento(req.body);
  if (erro) return res.status(400).json({ ok: false, erro });
  const proxima = calcularProxima(agendamento);
  const datas   = proximasN(agendamento, 5).map(d => toISO(d));
  res.json({ ok: true, proxima: toISO(proxima), datas });
});

// POST /api/admin/programados
router.post('/', requireAdmin, uploadChamadoMiddleware(), (req, res) => {
  const arquivos = req.arquivos || [];
  try {
    const { erro, prog } = montarProg(req.body, req);
    if (erro) {
      arquivos.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
      return res.status(400).json({ ok: false, erro });
    }
    prog.anexos_json = null;
    const id = db.inserirChamadoProgramado(prog);
    if (arquivos.length) {
      const anexos = arquivos.map((f, i) => ({
        path: renomearAnexoProg(id, i, f.path, f.originalname),
        nome_original: f.originalname,
      }));
      db.atualizarChamadoProgramado(id, { ...prog, anexos_json: JSON.stringify(anexos) });
    }
    res.status(201).json({ ok: true, id });
  } catch (err) {
    arquivos.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
    console.error('[programados] POST erro:', err);
    res.status(500).json({ ok: false, erro: 'Erro interno' });
  }
});

// PUT /api/admin/programados/:id
router.put('/:id', requireAdmin, uploadChamadoMiddleware(), (req, res) => {
  const id = parseInt(req.params.id);
  const arquivos = req.arquivos || [];
  if (isNaN(id)) {
    arquivos.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
    return res.status(400).json({ ok: false, erro: 'ID inválido' });
  }
  const existing = db.buscarProgramadoPorId(id);
  if (!existing) {
    arquivos.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
    return res.status(404).json({ ok: false, erro: 'Não encontrado' });
  }
  try {
    const { erro, prog } = montarProg(req.body, req);
    if (erro) {
      arquivos.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
      return res.status(400).json({ ok: false, erro });
    }
    if (arquivos.length) {
      limparArquivosProg(existing.anexos_json);
      prog.anexos_json = JSON.stringify(arquivos.map((f, i) => ({
        path: renomearAnexoProg(id, i, f.path, f.originalname),
        nome_original: f.originalname,
      })));
    } else {
      prog.anexos_json = existing.anexos_json || null;
    }
    db.atualizarChamadoProgramado(id, prog);
    res.json({ ok: true });
  } catch (err) {
    arquivos.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
    console.error('[programados] PUT erro:', err);
    res.status(500).json({ ok: false, erro: 'Erro interno' });
  }
});

// PATCH /api/admin/programados/:id/toggle
router.patch('/:id/toggle', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ ok: false, erro: 'ID inválido' });
  const item = db.buscarProgramadoPorId(id);
  if (!item) return res.status(404).json({ ok: false, erro: 'Não encontrado' });
  const novoAtivo = item.ativo ? 0 : 1;
  db.toggleChamadoProgramado(id, novoAtivo);
  res.json({ ok: true, ativo: novoAtivo });
});

// DELETE /api/admin/programados/:id
router.delete('/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ ok: false, erro: 'ID inválido' });
  const item = db.buscarProgramadoPorId(id);
  if (!item) return res.status(404).json({ ok: false, erro: 'Não encontrado' });
  limparArquivosProg(item.anexos_json);
  db.deletarChamadoProgramado(id);
  res.json({ ok: true });
});

module.exports = router;
