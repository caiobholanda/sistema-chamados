'use strict';
const express = require('express');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();
const { requireAdmin, requireMaster } = require('../auth');
const db = require('../db');
const { uploadChamadoMiddleware, UPLOADS_DIR } = require('../upload');
const { calcularProxima, proximasN, avancarCanonica, aplicarSkip, derivarCanonicaAnterior } = require('../programados');
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
  // ̀-ͯ = Combining Diacritical Marks (acentos separados pelo NFD).
  // Usa escape Unicode em vez de literais para evitar problemas de encoding no
  // source (vimos report de regex corrompida — funciona na pratica, mas escape
  // e' robusto a transformacoes de arquivo).
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

// Fields que, se alterados num PUT, exigem recalculo de proxima_execucao/canonica.
// Se nenhum mudou, preservamos as datas do registro existente (evita pular slots
// ao editar so descricao/categoria/atribuicao).
const _SCHEDULE_FIELDS = ['frequencia','hora','dia_semana','dia_mes','mes','pular_feriados','data_unica'];
function _scheduleMudou(existing, agendamento) {
  if (!existing) return true;
  return _SCHEDULE_FIELDS.some(f => (existing[f] ?? null) !== (agendamento[f] ?? null));
}

function montarProg(body, req, existing = null) {
  const descricao = (body.descricao || '').trim();
  if (!descricao || descricao.length < 10) return { erro: 'Descrição obrigatória (mín. 10 caracteres)' };

  const { erro, agendamento } = validarAgendamento(body);
  if (erro) return { erro };

  const adminCriador = db.buscarAdminPorId(req.admin.sub);
  let nome      = adminCriador ? adminCriador.nome_completo : 'Admin';
  let setor     = 'TI';
  let usuarioId = null;

  const usuIdRawN = body.usuario_id ? parseInt(body.usuario_id, 10) : NaN;
  const usuIdRaw = Number.isInteger(usuIdRawN) && usuIdRawN > 0 ? usuIdRawN : null;
  if (usuIdRaw && req.admin.is_master) {
    const u = db.buscarUsuarioPorId(usuIdRaw);
    if (u && u.ativo) { usuarioId = u.id; nome = u.nome; setor = u.setor || 'TI'; }
  }

  let adminResponsavelId = req.admin.sub;
  const adminRespRawN = body.admin_responsavel_id ? parseInt(body.admin_responsavel_id, 10) : NaN;
  const adminRespRaw = Number.isInteger(adminRespRawN) && adminRespRawN > 0 ? adminRespRawN : null;
  if (adminRespRaw && adminRespRaw !== req.admin.sub) {
    // Gate: somente master pode delegar para OUTRO admin. Admin comum sempre
    // fica como responsavel de si mesmo. Sem este gate, qualquer admin podia
    // atribuir o agendamento para qualquer outro admin (incluindo master).
    if (!req.admin.is_master) return { erro: 'Apenas admin master pode atribuir para outro admin' };
    const alvo = db.buscarAdminPorId(adminRespRaw);
    if (alvo && alvo.ativo) adminResponsavelId = alvo.id;
  } else if (adminRespRaw) {
    adminResponsavelId = adminRespRaw; // proprio admin — sempre permitido
  }

  const prog = {
    // Resumo da descricao usado em cards, historico e push notification.
    // Limite 255 (vs descricao.maxlength=2000) mantem o titulo como resumo
    // sem virar paragrafo. SQLite TEXT nao tem teto, so a regra de produto.
    titulo: descricao.trim().slice(0, 255),
    nome, setor, ramal: null, descricao,
    categoria: (body.categoria || '').trim() || null,
    prioridade: 'normal',
    ...agendamento,
    admin_responsavel_id: adminResponsavelId,
    usuario_id: usuarioId,
  };
  // PUT: se schedule nao mudou, preserva proxima_canonica/proxima_execucao do
  // existente. Caso contrario (POST, ou PUT com mudanca de schedule), recalcula
  // a partir de "agora" usando avancarCanonica + aplicarSkip (mantem alinhamento
  // entre as duas colunas).
  if (existing && !_scheduleMudou(existing, agendamento)) {
    prog.proxima_canonica = existing.proxima_canonica || existing.proxima_execucao;
    prog.proxima_execucao = existing.proxima_execucao;
  } else {
    const canon = avancarCanonica(prog);
    prog.proxima_canonica = toISO(canon);
    prog.proxima_execucao = toISO(aplicarSkip(canon, prog.pular_feriados, prog.hora));
  }
  return { prog };
}

// POST /api/admin/programados/debug/trigger
router.post('/debug/trigger', requireMaster, async (req, res) => {
  const pendentesAntes = db.getProgramadosPendentes().map(p => ({ id: p.id, titulo: p.titulo, proxima: p.proxima_execucao }));
  const resultados = await executarChamadosProgramados();
  res.json({ ok: true, pendentesAntes, resultados });
});

// POST /api/admin/programados/debug/recompute-titulos
// Regenera `titulo` a partir de `descricao.trim().slice(0, 255)` para registros
// cujo titulo provavelmente foi cortado no limite antigo de 60 chars. Heuristica:
// LENGTH(titulo) >= 60 e (descricao mais longa que titulo OU titulo != prefixo de descricao).
// Default = dry-run. Passe ?dryRun=0 (ou {dryRun:false}) para aplicar.
router.post('/debug/recompute-titulos', requireMaster, (req, res) => {
  const dryRun = !(req.query.dryRun === '0' || req.body?.dryRun === false);
  const linhas = db.getDb().prepare('SELECT id, titulo, descricao FROM chamados_programados').all();
  const alteracoes = [];
  for (const l of linhas) {
    const novo = String(l.descricao || '').trim().slice(0, 255);
    if (novo !== l.titulo) {
      alteracoes.push({ id: l.id, antes: l.titulo, depois: novo });
    }
  }
  if (!dryRun) {
    const stmt = db.getDb().prepare('UPDATE chamados_programados SET titulo = ? WHERE id = ?');
    const tx = db.getDb().transaction(() => {
      for (const a of alteracoes) stmt.run(a.depois, a.id);
    });
    tx();
  }
  res.json({ ok: true, dryRun, total: linhas.length, alterados: alteracoes.length, alteracoes });
});

// POST /api/admin/programados/debug/recompute-proximas
// Backfill para registros legados: recompoe proxima_canonica/proxima_execucao
// a partir de ultima_execucao usando derivarCanonicaAnterior + avancarCanonica.
// Necessario para limpar registros gravados ANTES da migracao da coluna
// proxima_canonica (commit b00f20c) — esses registros tem proxima_execucao
// pulando 1 slot devido ao bug antigo (cron usava `new Date()` em vez do slot
// canonico). Default = dry-run; passe ?dryRun=0 para aplicar.
router.post('/debug/recompute-proximas', requireMaster, (req, res) => {
  const dryRun = !(req.query.dryRun === '0' || req.body?.dryRun === false);
  // Envolve SELECT + UPDATE em uma unica transacao IMMEDIATE para evitar race:
  // se dois admins disparam recompute em paralelo, sem o lock o segundo leria
  // os dados ja-corrigidos do primeiro e nao alteraria nada (idempotente OK),
  // mas leria estado parcial. Com IMMEDIATE, o segundo bloqueia ate o primeiro
  // terminar (sqlite garante ordenacao serializavel das writes).
  const dbi = db.getDb();
  const computar = dbi.transaction(() => {
    const linhas = dbi.prepare(`
      SELECT * FROM chamados_programados
      WHERE ativo = 1 AND ultima_execucao IS NOT NULL AND frequencia != 'data_unica'
    `).all();
    const alteracoes = [];
    for (const prog of linhas) {
      try {
        const ultimaUtc = new Date(prog.ultima_execucao.replace(' ', 'T') + 'Z');
        const canonicaAnt = derivarCanonicaAnterior(prog, ultimaUtc);
        if (!canonicaAnt) { alteracoes.push({ id: prog.id, titulo: prog.titulo, erro: 'canonica anterior nao derivavel' }); continue; }
        const novaCanon = avancarCanonica(prog, canonicaAnt);
        const novaEfetiva = aplicarSkip(novaCanon, prog.pular_feriados, prog.hora);
        const novaCanonISO = toISO(novaCanon);
        const novaEfetISO = toISO(novaEfetiva);
        if (novaEfetISO !== prog.proxima_execucao || novaCanonISO !== (prog.proxima_canonica || prog.proxima_execucao)) {
          alteracoes.push({
            id: prog.id, titulo: prog.titulo, frequencia: prog.frequencia,
            dia_semana: prog.dia_semana, dia_mes: prog.dia_mes, hora: prog.hora,
            ultima_execucao: prog.ultima_execucao,
            canonica_derivada: toISO(canonicaAnt),
            proxima_execucao_antes: prog.proxima_execucao,
            proxima_execucao_depois: novaEfetISO,
            proxima_canonica_antes: prog.proxima_canonica,
            proxima_canonica_depois: novaCanonISO,
          });
        }
      } catch (e) {
        alteracoes.push({ id: prog.id, titulo: prog.titulo, erro: e.message });
      }
    }
    if (!dryRun) {
      const stmt = dbi.prepare('UPDATE chamados_programados SET proxima_canonica = ?, proxima_execucao = ? WHERE id = ?');
      for (const a of alteracoes) {
        if (a.erro) continue;
        stmt.run(a.proxima_canonica_depois, a.proxima_execucao_depois, a.id);
      }
    }
    return { total: linhas.length, alteracoes };
  });
  const { total, alteracoes } = computar.immediate();
  res.json({ ok: true, dryRun, total, alterados: alteracoes.filter(a => !a.erro).length, erros: alteracoes.filter(a => a.erro).length, alteracoes });
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
      // Rollback: se rename ou update falharem, remove o registro recem-criado
      // para nao deixar um agendamento "orfao" sem anexos. O finally do try
      // externo ja cuida de limpar os arquivos temporarios via arquivos.forEach.
      try {
        const anexos = arquivos.map((f, i) => ({
          path: renomearAnexoProg(id, i, f.path, f.originalname),
          nome_original: f.originalname,
        }));
        db.atualizarChamadoProgramado(id, { ...prog, anexos_json: JSON.stringify(anexos) });
      } catch (anexoErr) {
        // Rollback: remove o agendamento recem-criado para nao virar orfao.
        try { db.deletarChamadoProgramado(id); } catch {}
        throw anexoErr;
      }
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
    const { erro, prog } = montarProg(req.body, req, existing);
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
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ ok: false, erro: 'ID inválido' });
  const item = db.buscarProgramadoPorId(id);
  if (!item) return res.status(404).json({ ok: false, erro: 'Não encontrado' });
  // Ordem: deleta o registro PRIMEIRO; so depois remove arquivos.
  // Inverso (anterior) deixava registros "vivos" com anexos perdidos se o DELETE
  // do DB falhasse (constraint, lock). Agora se a delecao de arquivos falhar,
  // o registro ja foi removido — arquivos viram orphans (problema menor,
  // resolviveis por GC futuro) em vez de inconsistencia DB/FS.
  db.deletarChamadoProgramado(id);
  limparArquivosProg(item.anexos_json);
  res.json({ ok: true });
});

module.exports = router;
