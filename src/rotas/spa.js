'use strict';
const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();
const {
  inserirSpaPerfil, getSpaPerfil, listarSpaPerfis,
  listarSpaTerapeutas, criarSpaTerapeuta, atualizarSpaTerapeuta, toggleSpaTerapeuta,
  listarSpaReservas, buscarSpaReservaPorId, buscarSpaReservaPorToken,
  criarSpaReserva, atualizarSpaReserva, deletarSpaReserva,
  liberarPesquisaSpa, iniciarPesquisaSpa, concluirPesquisaSpa, expirarPesquisaSpa,
  inserirRespostaSpa, buscarRespostaSpa,
  inserirHistoricoSpa, listarHistoricoSpa,
} = require('../db');
const { requireAdmin } = require('../auth');

function san(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').trim();
}

function validarEmail(e) {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

function nowISO() {
  return new Date().toISOString();
}

// Verifica expiry on-demand e transiciona para NAO_REALIZADA se necessário.
// Retorna a reserva com status atualizado.
function verificarExpiry(reserva) {
  if (!reserva) return null;
  const agora = Date.now();

  if (reserva.status_pesquisa === 'LIBERADA') {
    const liberadaTs = new Date(reserva.liberada_em).getTime();
    if (agora > liberadaTs + 30 * 60 * 1000) {
      expirarPesquisaSpa(reserva.id);
      inserirHistoricoSpa(reserva.id, 'NAO_REALIZADA', 'Expirou: hóspede não iniciou dentro de 30min');
      return { ...reserva, status_pesquisa: 'NAO_REALIZADA' };
    }
  }

  if (reserva.status_pesquisa === 'EM_ANDAMENTO') {
    const iniciadaTs = new Date(reserva.iniciada_em).getTime();
    if (agora > iniciadaTs + 15 * 60 * 1000) {
      expirarPesquisaSpa(reserva.id);
      inserirHistoricoSpa(reserva.id, 'NAO_REALIZADA', 'Expirou: hóspede não respondeu dentro de 15min');
      return { ...reserva, status_pesquisa: 'NAO_REALIZADA' };
    }
  }

  return reserva;
}

// ── Perfil de hóspede (pré-tratamento) ───────────────────────────────────────

/* POST /api/spa/perfil — público */
router.post('/perfil', async (req, res) => {
  try {
    const b = req.body || {};
    const erros = [];

    if (!b.nome || !String(b.nome).trim())          erros.push('nome');
    if (!b.sobrenome || !String(b.sobrenome).trim()) erros.push('sobrenome');
    if (!b.documento || !String(b.documento).trim()) erros.push('documento');
    if (!validarEmail(b.email))                      erros.push('email');
    if (!b.telefone || String(b.telefone).trim().length < 6) erros.push('telefone');
    if (!b.info_medica || !String(b.info_medica).trim())     erros.push('info_medica');
    if (!b.consentimento_saude)                      erros.push('consentimento_saude');

    if (erros.length) return res.status(400).json({ erro: 'Campos obrigatórios ausentes', campos: erros });

    const assinatura = typeof b.assinatura_data_url === 'string'
      ? b.assinatura_data_url.substring(0, 200000)
      : null;

    const dados = {
      nome:                    san(b.nome),
      sobrenome:               san(b.sobrenome),
      tipo_documento:          san(String(b.tipo_documento || 'cpf')),
      documento:               san(b.documento),
      email:                   san(b.email),
      telefone:                san(b.telefone),
      data_nascimento:         b.data_nascimento ? san(String(b.data_nascimento)) : null,
      rotina_facial:           JSON.stringify(Array.isArray(b.rotina_facial) ? b.rotina_facial.map(s => san(String(s))) : []),
      rotina_corporal:         JSON.stringify(Array.isArray(b.rotina_corporal) ? b.rotina_corporal.map(s => san(String(s))) : []),
      produto_especifico:      b.produto_especifico ? san(String(b.produto_especifico)) : null,
      pressao_massagem:        b.pressao_massagem ? san(String(b.pressao_massagem)) : null,
      info_medica:             san(b.info_medica),
      consentimento_saude:     b.consentimento_saude ? 1 : 0,
      consentimento_marketing: b.consentimento_marketing ? 1 : 0,
      canais_marketing:        JSON.stringify(Array.isArray(b.canais_marketing) ? b.canais_marketing : []),
      assinatura_data_url:     assinatura,
      idioma:                  san(String(b.idioma || 'pt-BR')),
    };

    const id = inserirSpaPerfil(dados);
    console.log(`[Spa] Perfil #${id} registrado — ${dados.nome} ${dados.sobrenome} (${dados.idioma})`);
    res.json({ id, apto: true });
  } catch (err) {
    console.error('[Spa] erro ao salvar perfil:', err);
    res.status(500).json({ erro: 'Erro interno ao salvar perfil' });
  }
});

/* GET /api/spa/perfis — lista resumida (admin) */
router.get('/perfis', requireAdmin, (req, res) => {
  try {
    res.json(listarSpaPerfis());
  } catch (err) {
    console.error('[Spa] erro ao listar perfis:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

/* GET /api/spa/perfil/:id — detalhe completo (admin) */
router.get('/perfil/:id', requireAdmin, (req, res) => {
  try {
    const perfil = getSpaPerfil(parseInt(req.params.id, 10));
    if (!perfil) return res.status(404).json({ erro: 'Perfil não encontrado' });
    res.json(perfil);
  } catch (err) {
    console.error('[Spa] erro ao buscar perfil:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── Terapeutas (admin) ────────────────────────────────────────────────────────

router.get('/terapeutas', requireAdmin, (req, res) => {
  try { res.json(listarSpaTerapeutas()); }
  catch (err) { res.status(500).json({ erro: 'Erro interno' }); }
});

router.post('/terapeutas', requireAdmin, (req, res) => {
  const nome = san(String(req.body?.nome || '').trim());
  if (!nome) return res.status(400).json({ erro: 'Nome obrigatório' });
  try {
    const id = criarSpaTerapeuta(nome);
    res.json({ id, nome, ativo: 1 });
  } catch (err) { res.status(500).json({ erro: 'Erro interno' }); }
});

router.put('/terapeutas/:id', requireAdmin, (req, res) => {
  const id   = parseInt(req.params.id, 10);
  const nome = san(String(req.body?.nome || '').trim());
  if (!nome) return res.status(400).json({ erro: 'Nome obrigatório' });
  try {
    atualizarSpaTerapeuta(id, nome);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ erro: 'Erro interno' }); }
});

router.post('/terapeutas/:id/toggle', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    toggleSpaTerapeuta(id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ erro: 'Erro interno' }); }
});

// ── Reservas (admin CRUD) ─────────────────────────────────────────────────────

router.get('/reservas', requireAdmin, (req, res) => {
  try { res.json(listarSpaReservas()); }
  catch (err) { res.status(500).json({ erro: 'Erro interno' }); }
});

router.get('/reservas/:id', requireAdmin, (req, res) => {
  try {
    const r = buscarSpaReservaPorId(parseInt(req.params.id, 10));
    if (!r) return res.status(404).json({ erro: 'Reserva não encontrada' });
    res.json(r);
  } catch (err) { res.status(500).json({ erro: 'Erro interno' }); }
});

router.post('/reservas', requireAdmin, (req, res) => {
  const b = req.body || {};
  const hospede_nome  = san(String(b.hospede_nome  || '').trim());
  const servico       = san(String(b.servico        || '').trim());
  const data_termino  = String(b.data_termino || '').trim();

  if (!hospede_nome)  return res.status(400).json({ erro: 'Nome do hóspede obrigatório' });
  if (!servico)       return res.status(400).json({ erro: 'Serviço obrigatório' });
  if (!data_termino)  return res.status(400).json({ erro: 'Data/hora de término obrigatória' });

  try {
    const token = crypto.randomBytes(24).toString('hex');
    const id = criarSpaReserva({
      hospede_nome,
      hospede_email:  b.hospede_email ? san(String(b.hospede_email).trim()) : null,
      terapeuta_id:   b.terapeuta_id  ? parseInt(b.terapeuta_id, 10) : null,
      servico,
      data_termino,
      token,
    });
    inserirHistoricoSpa(id, 'CRIADA', `Reserva criada por admin`);
    res.json({ id, token });
  } catch (err) {
    console.error('[Spa] erro ao criar reserva:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.put('/reservas/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const b  = req.body || {};
  const reserva = buscarSpaReservaPorId(id);
  if (!reserva) return res.status(404).json({ erro: 'Reserva não encontrada' });

  const hospede_nome = san(String(b.hospede_nome || '').trim());
  const servico      = san(String(b.servico      || '').trim());
  const data_termino = String(b.data_termino || '').trim();

  if (!hospede_nome) return res.status(400).json({ erro: 'Nome do hóspede obrigatório' });
  if (!servico)      return res.status(400).json({ erro: 'Serviço obrigatório' });
  if (!data_termino) return res.status(400).json({ erro: 'Data/hora de término obrigatória' });

  try {
    atualizarSpaReserva(id, {
      hospede_nome,
      hospede_email: b.hospede_email ? san(String(b.hospede_email).trim()) : null,
      terapeuta_id:  b.terapeuta_id  ? parseInt(b.terapeuta_id, 10) : null,
      servico,
      data_termino,
    });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ erro: 'Erro interno' }); }
});

router.delete('/reservas/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    deletarSpaReserva(id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ erro: 'Erro interno' }); }
});

/* POST /api/spa/reservas/:id/liberar — libera pesquisa (janela de 30 min após data_termino) */
router.post('/reservas/:id/liberar', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const reserva = buscarSpaReservaPorId(id);
  if (!reserva) return res.status(404).json({ erro: 'Reserva não encontrada' });
  if (reserva.status_pesquisa !== 'BLOQUEADA')
    return res.status(409).json({ erro: 'Pesquisa já foi liberada ou encerrada' });

  const agora    = Date.now();
  const termino  = new Date(reserva.data_termino).getTime();
  const janela   = 30 * 60 * 1000;

  if (agora < termino)
    return res.status(400).json({ erro: 'O tratamento ainda não terminou' });
  if (agora > termino + janela)
    return res.status(400).json({ erro: 'Janela de liberação expirou (30 min após término)' });

  try {
    const liberadaEm = nowISO();
    liberarPesquisaSpa(id, liberadaEm);
    inserirHistoricoSpa(id, 'LIBERADA', 'Admin liberou a pesquisa');
    res.json({ ok: true, liberada_em: liberadaEm });
  } catch (err) {
    console.error('[Spa] erro ao liberar pesquisa:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

/* GET /api/spa/reservas/:id/historico */
router.get('/reservas/:id/historico', requireAdmin, (req, res) => {
  try {
    res.json(listarHistoricoSpa(parseInt(req.params.id, 10)));
  } catch (err) { res.status(500).json({ erro: 'Erro interno' }); }
});

// ── Pesquisa (pública, via token) ─────────────────────────────────────────────

/* GET /api/spa/pesquisa?t=TOKEN */
router.get('/pesquisa', (req, res) => {
  const token = String(req.query.t || '').trim();
  if (!token) return res.status(400).json({ erro: 'Token ausente' });

  let reserva = buscarSpaReservaPorToken(token);
  if (!reserva) return res.status(404).json({ erro: 'Pesquisa não encontrada' });

  reserva = verificarExpiry(reserva);

  const agora   = Date.now();
  const termino = new Date(reserva.data_termino).getTime();
  const janela  = 30 * 60 * 1000;

  const resposta = {
    id:               reserva.id,
    hospede_nome:     reserva.hospede_nome,
    terapeuta_nome:   reserva.terapeuta_nome,
    servico:          reserva.servico,
    data_termino:     reserva.data_termino,
    status_pesquisa:  reserva.status_pesquisa,
    liberada_em:      reserva.liberada_em,
    iniciada_em:      reserva.iniciada_em,
    concluida_em:     reserva.concluida_em,
  };

  if (reserva.status_pesquisa === 'EM_ANDAMENTO') {
    const iniciadaTs = new Date(reserva.iniciada_em).getTime();
    resposta.segundos_restantes = Math.max(0, Math.floor((iniciadaTs + 15 * 60 * 1000 - agora) / 1000));
  }

  if (reserva.status_pesquisa === 'LIBERADA') {
    resposta.janela_expira_em = new Date(new Date(reserva.liberada_em).getTime() + 30 * 60 * 1000).toISOString();
  }

  if (reserva.status_pesquisa === 'CONCLUIDA') {
    resposta.resposta = buscarRespostaSpa(reserva.id);
  }

  res.json(resposta);
});

/* POST /api/spa/pesquisa/iniciar */
router.post('/pesquisa/iniciar', (req, res) => {
  const token = String(req.body?.token || '').trim();
  if (!token) return res.status(400).json({ erro: 'Token ausente' });

  let reserva = buscarSpaReservaPorToken(token);
  if (!reserva) return res.status(404).json({ erro: 'Pesquisa não encontrada' });

  reserva = verificarExpiry(reserva);

  if (reserva.status_pesquisa === 'EM_ANDAMENTO') {
    const iniciadaTs = new Date(reserva.iniciada_em).getTime();
    const segundos   = Math.max(0, Math.floor((iniciadaTs + 15 * 60 * 1000 - Date.now()) / 1000));
    return res.json({ ok: true, iniciada_em: reserva.iniciada_em, segundos_restantes: segundos });
  }

  if (reserva.status_pesquisa !== 'LIBERADA')
    return res.status(409).json({ erro: `Pesquisa não pode ser iniciada (${reserva.status_pesquisa})` });

  try {
    const iniciadaEm = nowISO();
    iniciarPesquisaSpa(reserva.id, iniciadaEm);
    inserirHistoricoSpa(reserva.id, 'EM_ANDAMENTO', 'Hóspede iniciou a pesquisa');
    res.json({ ok: true, iniciada_em: iniciadaEm, segundos_restantes: 15 * 60 });
  } catch (err) {
    console.error('[Spa] erro ao iniciar pesquisa:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

/* POST /api/spa/pesquisa/responder */
router.post('/pesquisa/responder', (req, res) => {
  const token = String(req.body?.token || '').trim();
  if (!token) return res.status(400).json({ erro: 'Token ausente' });

  let reserva = buscarSpaReservaPorToken(token);
  if (!reserva) return res.status(404).json({ erro: 'Pesquisa não encontrada' });

  reserva = verificarExpiry(reserva);

  if (reserva.status_pesquisa !== 'EM_ANDAMENTO')
    return res.status(409).json({ erro: `Pesquisa não está em andamento (${reserva.status_pesquisa})` });

  const iniciadaTs = new Date(reserva.iniciada_em).getTime();
  if (Date.now() > iniciadaTs + 15 * 60 * 1000) {
    expirarPesquisaSpa(reserva.id);
    inserirHistoricoSpa(reserva.id, 'NAO_REALIZADA', 'Tempo esgotado ao tentar responder');
    return res.status(409).json({ erro: 'Tempo esgotado', expirado: true });
  }

  const b  = req.body || {};
  const nota_geral          = parseInt(b.nota_geral, 10);
  const nota_terapeuta      = parseInt(b.nota_terapeuta, 10);
  const nota_ambiente       = parseInt(b.nota_ambiente, 10);
  const nota_custo_beneficio = parseInt(b.nota_custo_beneficio, 10);

  const notas = [nota_geral, nota_terapeuta, nota_ambiente, nota_custo_beneficio];
  if (notas.some(n => isNaN(n) || n < 1 || n > 5))
    return res.status(400).json({ erro: 'Todas as notas devem ser entre 1 e 5' });

  try {
    const concluidaEm = nowISO();
    concluirPesquisaSpa(reserva.id, concluidaEm);
    inserirRespostaSpa({
      reserva_id:          reserva.id,
      nota_geral,
      nota_terapeuta,
      nota_ambiente,
      nota_custo_beneficio,
      recomendaria:        b.recomendaria ? 1 : 0,
      comentario:          b.comentario ? san(String(b.comentario)).substring(0, 2000) : null,
    });
    inserirHistoricoSpa(reserva.id, 'CONCLUIDA', `Notas: ${nota_geral}/${nota_terapeuta}/${nota_ambiente}/${nota_custo_beneficio}`);
    res.json({ ok: true, concluida_em: concluidaEm });
  } catch (err) {
    console.error('[Spa] erro ao responder pesquisa:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
