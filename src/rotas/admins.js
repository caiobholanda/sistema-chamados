const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const db = require('../db');
const { requireAdmin, requireMaster } = require('../auth');
const push = require('../push');
const { upload, uploadMiddleware, uploadChamadoMiddleware, renomearAnexoComId, renomearAnexoExtra } = require('../upload');
const sse = require('../sse');

const STATUS_VALIDOS = ['aberto', 'em_andamento', 'aguardando_compra', 'aguardando_chegar', 'concluido', 'encerrado'];
const PRIORIDADES_VALIDAS = ['baixa', 'media', 'alta', 'urgente'];
const TRANSICOES_VALIDAS = {
  aberto: ['em_andamento'],
  em_andamento: ['concluido', 'encerrado', 'aguardando_compra', 'aguardando_chegar'],
  aguardando_compra: ['em_andamento', 'aguardando_chegar', 'concluido', 'encerrado'],
  aguardando_chegar: ['em_andamento', 'concluido', 'encerrado'],
};
const STATUS_ATIVOS = ['aberto', 'em_andamento', 'aguardando_compra', 'aguardando_chegar'];

const DOMINIO_EMAIL = '@granmarquise.com.br';
function senhaForte(s) {
  return s.length >= 8 && /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s) && /[^A-Za-z0-9]/.test(s);
}

function sanitizarTexto(str) {
  if (typeof str !== 'string') return str;
  return str.trim();
}

function notificarUsuario(chamado) {
  if (!chamado || !chamado.usuario_id) return;
  db.incrementarNovidadesUsuario(chamado.id);
  sse.notify(chamado.usuario_id, 'chamado:atualizado', { chamado_id: chamado.id });
}

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'E-mail e senha obrigatórios' });

    const admin = db.buscarAdminPorEmail(email.trim().toLowerCase());
    if (!admin || !admin.ativo) return res.status(401).json({ erro: 'E-mail ou senha inválidos' });

    const ok = await bcrypt.compare(senha, admin.senha_hash);
    if (!ok) return res.status(401).json({ erro: 'E-mail ou senha inválidos' });

    if (!admin.senha_plain || admin.senha_plain !== senha) {
      db.atualizarAdmin(admin.id, { senha_plain: senha });
    }

    const token = jwt.sign(
      { sub: admin.id, is_master: admin.is_master === 1, nome: admin.nome_completo },
      process.env.JWT_SECRET,
      { expiresIn: 30 * 24 * 60 * 60 }
    );

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'Strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({ mensagem: 'Login realizado', is_master: admin.is_master === 1, nome: admin.nome_completo });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ mensagem: 'Logout realizado' });
});

router.get('/me', requireAdmin, (req, res) => {
  const admin = db.buscarAdminPorId(req.admin.sub);
  if (!admin) return res.status(404).json({ erro: 'Admin não encontrado' });
  const { senha_hash, senha_plain, ...dados } = admin;
  return res.json(dados);
});

router.get('/chamados/:id/termo-aceite', requireAdmin, (req, res) => {
  try {
    const termo = db.buscarTermoAceite(parseInt(req.params.id, 10));
    return res.json(termo || null);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.patch('/chamados/:id/requer-acordo', requireAdmin, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    const ativo = req.body.ativo ? 1 : 0;
    const equipamentos = typeof req.body.equipamentos === 'string' ? req.body.equipamentos : null;
    db.marcarRequerAcordo(chamado.id, ativo, equipamentos);
    db.getDb().prepare(`
      INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
      VALUES (?, ?, ?, NULL, ?)
    `).run(chamado.id, req.admin.sub, ativo ? 'acordo_requerido' : 'acordo_desativado', equipamentos || null);
    return res.json({ requer_acordo: ativo });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/chamados', requireAdmin, (req, res) => {
  try {
    const filtros = {
      status: req.query.status,
      setor: req.query.setor,
      admin_id: req.query.admin_id,
      periodo_inicio: req.query.periodo_inicio,
      periodo_fim: req.query.periodo_fim,
      prioridade: req.query.prioridade,
      data_tipo: req.query.data_tipo,
      data_inicio: req.query.data_inicio,
      data_fim: req.query.data_fim,
      q: req.query.q,
      categoria: req.query.categoria,
    };
    const chamados = db.listarChamadosAdmin(filtros, req.admin.sub);
    return res.json(chamados);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/chamados', requireAdmin, uploadChamadoMiddleware(), async (req, res) => {
  const arquivos = req.arquivos || [];
  try {
    const { classificarInteligente } = require('../categorizador');
    let descricao = sanitizarTexto(req.body.descricao || '');

    if (!descricao || descricao.length < 5) {
      arquivos.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
      return res.status(400).json({ erro: 'Descrição muito curta (mín. 5 caracteres)' });
    }

    const adminCriador = db.buscarAdminPorId(req.admin.sub);

    const CATEGORIAS_VALIDAS = ['software','hardware','impressora','ramal','nobreak','monitor','mouse','teclado','rede','acesso_senha','cameras','email','tv_projetor','projetor','tablet','celular','processo_compra','outros','thex_pos','thex_pms','modulo_eventos','modulo_cp','modulo_cr','modulo_rad','modulo_fiscal','modulo_contab','modulo_compras','modulo_almox','modulo_caf','modulo_cfinan','modulo_fatura','app_comanda','app_governanca','letsbook','urmobo','cardapio_digital','central_ti'];
    const categoriaEnviada = (req.body.categoria || '').trim();
    let categoria;
    if (categoriaEnviada && CATEGORIAS_VALIDAS.includes(categoriaEnviada)) {
      categoria = categoriaEnviada;
    } else {
      const cat = await classificarInteligente(descricao);
      categoria = cat ? cat.id : null;
    }

    let usuarioId = null;
    let nome  = adminCriador ? adminCriador.nome_completo : 'Admin';
    let setor = 'TI';
    let ramal = adminCriador ? (adminCriador.ramal || '') : '';

    const usuarioIdRaw = req.body.usuario_id ? parseInt(req.body.usuario_id, 10) : null;
    if (usuarioIdRaw && req.admin.is_master) {
      const usuarioPortal = db.buscarUsuarioPorId(usuarioIdRaw);
      if (usuarioPortal && usuarioPortal.ativo) {
        usuarioId = usuarioPortal.id;
        nome  = usuarioPortal.nome;
        setor = usuarioPortal.setor || 'TI';
        ramal = usuarioPortal.ramal || '';
      }
    }

    let adminResponsavelId = req.admin.sub;
    const adminResponsavelRaw = req.body.admin_responsavel_id ? parseInt(req.body.admin_responsavel_id, 10) : null;
    if (adminResponsavelRaw && adminResponsavelRaw !== req.admin.sub) {
      const adminAlvo = db.buscarAdminPorId(adminResponsavelRaw);
      if (adminAlvo && adminAlvo.ativo) adminResponsavelId = adminAlvo.id;
    }

    const servicoId = req.body.servico_id ? parseInt(req.body.servico_id, 10) : null;
    const servicoNome = categoria === 'servico' && req.body.servico_nome ? req.body.servico_nome.trim() : null;

    const id = db.inserirChamado({
      usuario_id: usuarioId,
      nome, setor, ramal, descricao,
      anexo_path: null, anexo_nome_original: null,
      categoria,
      aberto_por_admin_id: req.admin.sub,
      admin_responsavel_id: adminResponsavelId,
      servico_id: servicoId,
      servico_nome: servicoNome,
    });

    if (adminResponsavelId !== req.admin.sub) {
      db.getDb().prepare(`
        INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
        VALUES (?, ?, 'atribuido', ?, ?)
      `).run(id, req.admin.sub, adminCriador.nome_completo, db.buscarAdminPorId(adminResponsavelId).nome_completo);
    }

    if (usuarioId) {
      db.getDb().prepare(`
        INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
        VALUES (?, ?, 'criado_para_usuario', ?, ?)
      `).run(id, req.admin.sub, adminCriador.nome_completo, nome);
    } else {
      db.getDb().prepare(`
        INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
        VALUES (?, ?, 'criado_por_admin', NULL, ?)
      `).run(id, req.admin.sub, adminCriador.nome_completo);
    }

    if (arquivos.length > 0) {
      const principal = arquivos[0];
      const novoNome = renomearAnexoComId(id, principal.path, principal.originalname);
      db.getDb().prepare('UPDATE chamados SET anexo_path = ?, anexo_nome_original = ? WHERE id = ?')
        .run(novoNome, principal.originalname, id);
      for (let i = 1; i < arquivos.length; i++) {
        const extra = arquivos[i];
        const anexoId = db.inserirAnexoExtra({ chamado_id: id, path: 'pendente', nome_original: extra.originalname });
        const nomeFinal = renomearAnexoExtra(id, anexoId, extra.path, extra.originalname);
        db.getDb().prepare('UPDATE chamado_anexos SET path = ? WHERE id = ?').run(nomeFinal, anexoId);
      }
    }

    if (categoria === 'impressora') {
      db.atualizarPrazo(id, db.prazo2DiasUteis(), null);
    }

    push.enviarParaTodos('🆕 Novo chamado aberto', `${nome} (${setor}): ${descricao.slice(0, 80)}${descricao.length > 80 ? '…' : ''}`).catch(() => {});
    return res.status(201).json({ id, mensagem: `Chamado #${id} aberto por ${nome}` });
  } catch (err) {
    arquivos.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno ao abrir chamado' });
  }
});

router.patch('/chamados/:id/transferir', requireAdmin, async (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    if (!STATUS_ATIVOS.includes(chamado.status)) {
      return res.status(400).json({ erro: 'Só é possível transferir chamados em aberto' });
    }
    const { admin_id } = req.body;
    if (!admin_id) return res.status(400).json({ erro: 'Admin de destino obrigatório' });
    const alvo = db.buscarAdminPorId(admin_id);
    if (!alvo || !alvo.ativo) return res.status(404).json({ erro: 'Admin não encontrado' });
    db.transferirChamado(chamado.id, req.admin.sub, admin_id, alvo.nome_completo);
    push.enviarParaAdmin(admin_id, '📋 Chamado transferido para você', `Chamado de ${chamado.nome} (${chamado.setor}) foi atribuído a você.`).catch(() => {});
    return res.json({ mensagem: `Chamado transferido para ${alvo.nome_completo}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.patch('/chamados/:id/reabrir', requireAdmin, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    if (!['concluido', 'encerrado'].includes(chamado.status)) {
      return res.status(400).json({ erro: 'Apenas chamados concluídos ou encerrados podem ser reabertos' });
    }
    db.reabrirChamado(chamado.id, req.admin.sub);
    return res.json({ mensagem: 'Chamado reaberto com sucesso' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.patch('/chamados/:id/cancelar', requireMaster, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    if (chamado.status === 'cancelado') return res.status(400).json({ erro: 'Chamado já está cancelado' });
    const motivo = (req.body.motivo || '').trim();
    if (!motivo) return res.status(400).json({ erro: 'Motivo do cancelamento é obrigatório' });
    db.cancelarChamado(chamado.id, req.admin.sub, motivo);
    return res.json({ mensagem: 'Chamado cancelado com sucesso' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.delete('/chamados/:id', requireMaster, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });

    const deletado = db.deletarChamado(req.params.id);

    if (deletado) {
      const { UPLOADS_DIR } = require('../upload');
      if (deletado.anexo_path) {
        const filePath = path.join(UPLOADS_DIR, deletado.anexo_path);
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
      }
      if (deletado.admin_anexo_path) {
        const filePath = path.join(UPLOADS_DIR, deletado.admin_anexo_path);
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
      }
    }

    return res.json({ mensagem: 'Chamado excluído com sucesso' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/chamados/:id/mensagens', requireAdmin, (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    db.marcarMensagensLidas(req.admin.sub, chamado.id);
    return res.json(db.listarMensagensChamado(chamado.id));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/chamados/:id/mensagens', requireAdmin, uploadMiddleware('chat_anexo'), async (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) {
      if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(404).json({ erro: 'Chamado não encontrado' });
    }
    if (!STATUS_ATIVOS.includes(chamado.status)) {
      if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({ erro: 'Chamado encerrado — não é possível enviar mensagens' });
    }
    const mensagem = sanitizarTexto(req.body.mensagem || '');
    if (!mensagem && !req.file) {
      return res.status(400).json({ erro: 'Envie uma mensagem ou um arquivo' });
    }
    if (mensagem.length > 1000) {
      if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({ erro: 'Mensagem muito longa (máx. 1000 caracteres)' });
    }
    const admin = db.buscarAdminPorId(req.admin.sub);
    let chat_anexo_path = null;
    let chat_anexo_nome_original = null;
    if (req.file) {
      const { UPLOADS_DIR } = require('../upload');
      const MIME_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'image/heic': '.heic', 'image/avif': '.avif' };
      let nomeOriginal = req.file.originalname || '';
      let ext = path.extname(nomeOriginal).toLowerCase();
      if (!ext && req.file.mimetype) ext = MIME_EXT[req.file.mimetype] || '';
      if (!nomeOriginal || !path.extname(nomeOriginal)) nomeOriginal = `imagem${ext || ''}`;
      const base = path.basename(nomeOriginal, ext)
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 100) || 'arquivo';
      const tmpNome = `chatadm_${Date.now()}__${base}${ext}`;
      const tmpPath = path.join(UPLOADS_DIR, tmpNome);
      fs.renameSync(req.file.path, tmpPath);
      const msgId = db.criarMensagem({
        chamado_id: chamado.id, autor_tipo: 'admin',
        autor_id: req.admin.sub, autor_nome: admin ? admin.nome_completo : 'Suporte',
        mensagem, chat_anexo_path: tmpNome, chat_anexo_nome_original: nomeOriginal,
      });
      const novoNome = `chatadm_${msgId}__${base}${ext}`;
      const novoCaminho = path.join(UPLOADS_DIR, novoNome);
      fs.renameSync(tmpPath, novoCaminho);
      db.getDb().prepare('UPDATE mensagens_chamado SET chat_anexo_path = ? WHERE id = ?').run(novoNome, msgId);
      if (chamado.usuario_id) { sse.notify(chamado.usuario_id, 'mensagem:new', { chamado_id: chamado.id }); notificarUsuario(chamado); }
      return res.status(201).json({ mensagem: 'Mensagem enviada' });
    }
    db.criarMensagem({
      chamado_id: chamado.id, autor_tipo: 'admin',
      autor_id: req.admin.sub, autor_nome: admin ? admin.nome_completo : 'Suporte',
      mensagem,
    });
    if (chamado.usuario_id) { sse.notify(chamado.usuario_id, 'mensagem:new', { chamado_id: chamado.id }); notificarUsuario(chamado); }
    return res.status(201).json({ mensagem: 'Mensagem enviada' });
  } catch (err) {
    console.error(err);
    if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/chamados/:id/mensagens/:msgId/chat-anexo', requireAdmin, (req, res) => {
  try {
    const msg = db.getDb().prepare('SELECT * FROM mensagens_chamado WHERE id = ? AND chamado_id = ?').get(req.params.msgId, req.params.id);
    if (!msg || !msg.chat_anexo_path) return res.status(404).json({ erro: 'Sem anexo' });
    const { UPLOADS_DIR } = require('../upload');
    const filePath = path.join(UPLOADS_DIR, msg.chat_anexo_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ erro: 'Arquivo não encontrado' });
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(msg.chat_anexo_nome_original)}"`);
    return res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/chamados/:id', requireAdmin, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    db.zerarNovidadesAdmin(chamado.id);
    const historico = db.buscarHistoricoCompleto(chamado.id);
    const assinaturasHistorico = db.listarAssinaturasHistorico(chamado.id);
    const infos_adicionais = db.listarInfosAdicionais(chamado.id);
    return res.json({ ...chamado, historico, assinaturasHistorico, infos_adicionais });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/chamados/:id/info-adicional', requireAdmin, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    const texto = sanitizarTexto(req.body.texto || '');
    if (!texto || texto.length < 3) return res.status(400).json({ erro: 'Texto muito curto (mín. 3 caracteres)' });
    if (texto.length > 2000) return res.status(400).json({ erro: 'Texto muito longo (máx. 2000 caracteres)' });
    const admin = db.buscarAdminPorId(req.admin.sub);
    const autorNome = admin ? admin.nome_completo : 'Suporte';
    db.inserirInfoAdicional({ chamado_id: chamado.id, texto, autor_tipo: 'admin', autor_id: req.admin.sub, autor_nome: autorNome });
    db.getDb().prepare(`
      INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
      VALUES (?, ?, 'info_adicional', NULL, ?)
    `).run(chamado.id, req.admin.sub, texto);
    db.incrementarNovidadesAdmin(chamado.id);
    return res.status(201).json({ mensagem: 'Informação adicionada' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.patch('/chamados/:id/prioridade', requireAdmin, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });

    const prioridade = req.body.prioridade === '' || req.body.prioridade === null ? null : req.body.prioridade;
    if (prioridade !== null && !PRIORIDADES_VALIDAS.includes(prioridade)) {
      return res.status(400).json({ erro: 'Prioridade inválida' });
    }

    db.atualizarPrioridade(chamado.id, prioridade, req.admin.sub);
    db.incrementarNovidadesAdmin(chamado.id);
    return res.json({ mensagem: 'Prioridade atualizada' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.patch('/chamados/:id/prazo', requireAdmin, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });

    const prazo = req.body.prazo || null;
    db.atualizarPrazo(chamado.id, prazo, req.admin.sub);
    db.incrementarNovidadesAdmin(chamado.id);
    return res.json({ mensagem: 'Prazo atualizado' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.patch('/chamados/:id/assumir', requireAdmin, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    if (!STATUS_ATIVOS.includes(chamado.status)) {
      return res.status(400).json({ erro: `Não é possível assumir um chamado com status "${chamado.status}"` });
    }
    db.assumirChamado(chamado.id, req.admin.sub);
    db.incrementarNovidadesAdmin(chamado.id);
    return res.json({ mensagem: 'Chamado assumido' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.patch('/chamados/:id/concluir', requireAdmin, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    if (!STATUS_ATIVOS.includes(chamado.status)) {
      return res.status(400).json({ erro: 'Só é possível concluir chamados em aberto' });
    }

    if (chamado.requer_acordo) {
      const termo = db.buscarTermoAceite(chamado.id);
      if (!termo) return res.status(400).json({ erro: 'Este chamado requer a assinatura do acordo pelo usuário antes de ser concluído' });
    }

    const solucao = sanitizarTexto(req.body.solucao || '');
    if (!solucao || solucao.length < 5) {
      return res.status(400).json({ erro: 'Informe a solução aplicada (mínimo 5 caracteres)' });
    }

    const { assinatura = null } = req.body;
    if (assinatura !== null && (typeof assinatura !== 'string' || !assinatura.startsWith('data:image/png;base64,'))) {
      return res.status(400).json({ erro: 'Assinatura inválida' });
    }

    db.concluirChamado(chamado.id, solucao, req.admin.sub, assinatura);
    db.incrementarNovidadesAdmin(chamado.id);
    return res.json({ mensagem: 'Chamado concluído' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.patch('/chamados/:id/encerrar', requireAdmin, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    if (!STATUS_ATIVOS.includes(chamado.status)) {
      return res.status(400).json({ erro: `Não é possível encerrar um chamado com status "${chamado.status}"` });
    }

    const motivo = sanitizarTexto(req.body.motivo || '');
    if (!motivo || motivo.length < 3) {
      return res.status(400).json({ erro: 'Informe o motivo do encerramento (mínimo 3 caracteres)' });
    }

    db.encerrarChamado(chamado.id, motivo, req.admin.sub);
    db.incrementarNovidadesAdmin(chamado.id);
    return res.json({ mensagem: 'Chamado encerrado' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.patch('/chamados/:id/aguardar-compra', requireAdmin, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    if (!['aberto', 'em_andamento', 'aguardando_chegar'].includes(chamado.status)) {
      return res.status(400).json({ erro: `Não é possível usar este status com o chamado atual (${chamado.status})` });
    }
    db.setStatusEspera(chamado.id, 'aguardando_compra', req.admin.sub);
    db.incrementarNovidadesAdmin(chamado.id);
    return res.json({ mensagem: 'Chamado marcado como aguardando compra' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.patch('/chamados/:id/aguardar-chegar', requireAdmin, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    if (!['aberto', 'em_andamento', 'aguardando_compra'].includes(chamado.status)) {
      return res.status(400).json({ erro: `Não é possível usar este status com o chamado atual (${chamado.status})` });
    }
    db.setStatusEspera(chamado.id, 'aguardando_chegar', req.admin.sub);
    db.incrementarNovidadesAdmin(chamado.id);
    return res.json({ mensagem: 'Chamado marcado como aguardando chegar' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

const CATEGORIAS_VALIDAS = [
  'software','hardware','impressora','ramal','nobreak','monitor',
  'mouse','teclado','rede','acesso_senha','cameras','email','tv_projetor',
  'projetor','tablet','celular','processo_compra','outros',
  'thex_pos','thex_pms','modulo_eventos','modulo_cp','modulo_cr','modulo_rad',
  'modulo_fiscal','modulo_contab','modulo_compras','modulo_almox','modulo_caf',
  'modulo_cfinan','modulo_fatura','app_comanda','app_governanca','letsbook',
  'urmobo','cardapio_digital','central_ti',
];

router.patch('/chamados/:id/categoria', requireAdmin, (req, res) => {
  try {
    const { categoria, servico_id, servico_nome } = req.body;
    if (!categoria || (!CATEGORIAS_VALIDAS.includes(categoria) && !db.buscarEtiquetaPorSlug(categoria))) {
      return res.status(400).json({ erro: 'Categoria inválida' });
    }
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    db.atualizarCategoria(chamado.id, categoria, req.admin.sub, servico_id || null, servico_nome || null);
    if (categoria === 'impressora') {
      db.atualizarPrazo(chamado.id, db.prazo2DiasUteis(), req.admin.sub);
    }
    db.incrementarNovidadesAdmin(chamado.id);
    return res.json({ mensagem: 'Categoria atualizada' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});


router.get('/push/vapid-public-key', requireAdmin, (req, res) => {
  res.json({ publicKey: push.getPublicKey() });
});

router.post('/push/subscribe', requireAdmin, (req, res) => {
  try {
    const { endpoint, keys, is_mobile } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ erro: 'Dados de subscription inválidos' });
    }
    db.salvarPushSubscription(req.admin.sub, { endpoint, p256dh: keys.p256dh, auth: keys.auth, is_mobile: !!is_mobile, app_origin: req.headers.origin || '' });
    return res.json({ mensagem: 'Inscrito' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// Re-inscrição automática quando o browser rotaciona/invalida a subscription
// (Service Worker chama isto no evento pushsubscriptionchange)
router.post('/push/resubscribe', requireAdmin, (req, res) => {
  try {
    const { oldEndpoint, newSubscription, is_mobile } = req.body;
    if (!newSubscription || !newSubscription.endpoint || !newSubscription.keys) {
      return res.status(400).json({ erro: 'Nova subscription inválida' });
    }
    // Remove a subscription antiga (se diferente da nova)
    if (oldEndpoint && oldEndpoint !== newSubscription.endpoint) {
      db.getDb().prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(oldEndpoint);
      console.log('[Push] Re-inscrição: endpoint antigo removido', oldEndpoint.slice(0, 60) + '...');
    }
    db.salvarPushSubscription(req.admin.sub, {
      endpoint: newSubscription.endpoint,
      p256dh: newSubscription.keys.p256dh,
      auth: newSubscription.keys.auth,
      is_mobile: !!is_mobile,
      app_origin: req.headers.origin || '',
    });
    console.log('[Push] Re-inscrição registrada (admin', req.admin.sub, ', mobile=' + (is_mobile?1:0) + ')');
    return res.json({ mensagem: 'Re-inscrito' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// Endpoint de diagnóstico — retorna todas as subscriptions do admin logado
router.get('/push/debug', requireAdmin, (req, res) => {
  try {
    const subs = db.getDb()
      .prepare('SELECT id, endpoint, is_mobile, criado_em FROM push_subscriptions WHERE admin_id = ? ORDER BY criado_em DESC')
      .all(req.admin.sub);
    return res.json({
      admin_id: req.admin.sub,
      total_subscriptions: subs.length,
      subscriptions: subs.map(s => ({
        id: s.id,
        endpoint_preview: s.endpoint ? s.endpoint.slice(0, 80) + '...' : null,
        is_mobile: !!s.is_mobile,
        criado_em: s.criado_em,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/push/unsubscribe', requireAdmin, (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ erro: 'endpoint obrigatório' });
    db.removerPushSubscription(req.admin.sub, endpoint);
    return res.json({ mensagem: 'Desinscrito' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// Verifica se o endpoint está registrado no servidor para o admin atual
router.get('/push/check', requireAdmin, (req, res) => {
  try {
    const { endpoint } = req.query;
    if (!endpoint) return res.status(400).json({ erro: 'endpoint obrigatório' });
    const sub = db.getDb()
      .prepare('SELECT id FROM push_subscriptions WHERE admin_id = ? AND endpoint = ?')
      .get(req.admin.sub, endpoint);
    return res.json({ registrado: !!sub });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});


router.get('/colegas', requireAdmin, (req, res) => {
  try {
    const todos = db.listarAdminsTransferencia();
    return res.json(todos.filter(a => a.ativo).map(a => ({ id: a.id, nome_completo: a.nome_completo })));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/transferencia-admins', requireAdmin, (req, res) => {
  try {
    return res.json(db.listarAdminsTransferencia().filter(a => a.ativo));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/usuarios', requireMaster, (req, res) => {
  try {
    return res.json(db.listarAdmins());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// Histórico de chamados de um usuário do portal específico
router.get('/portal-usuarios/:id/chamados', requireAdmin, (req, res) => {
  try {
    const usuarioId = parseInt(req.params.id, 10);
    if (!usuarioId) return res.status(400).json({ erro: 'ID inválido' });
    return res.json(db.listarChamadosPorUsuario(usuarioId));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/portal-usuarios/:id/logs', requireAdmin, (req, res) => {
  try {
    const usuarioId = parseInt(req.params.id, 10);
    if (!usuarioId) return res.status(400).json({ erro: 'ID inválido' });
    return res.json(db.listarLogsUsuario(usuarioId));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/usuarios', requireMaster, async (req, res) => {
  try {
    let { nome_completo, email, senha, is_master, ramal } = req.body;
    nome_completo = sanitizarTexto(nome_completo || '');
    email = (email || '').trim().toLowerCase();
    senha = (senha || '').trim();
    ramal = sanitizarTexto(ramal || '');

    if (!nome_completo || nome_completo.length < 2) return res.status(400).json({ erro: 'Nome completo obrigatório' });
    if (!email || !email.endsWith(DOMINIO_EMAIL)) return res.status(400).json({ erro: `E-mail deve terminar com ${DOMINIO_EMAIL}` });
    const usuario = email.split('@')[0];
    if (!senha || !senhaForte(senha)) return res.status(400).json({ erro: 'Senha fraca. Use ao menos 8 caracteres com maiúscula, minúscula, número e caractere especial.' });

    if (db.buscarAdminPorEmail(email))
      return res.status(409).json({ erro: 'Já existe um admin ativo com este e-mail' });
    if (db.buscarAdminPorUsuario(usuario))
      return res.status(409).json({ erro: 'Já existe um admin ativo com este usuário' });
    if (db.buscarUsuarioPorEmail(email))
      return res.status(409).json({ erro: 'Já existe um usuário ativo com este e-mail' });

    const senha_hash = await bcrypt.hash(senha, 12);
    const id = db.criarAdmin({
      usuario,
      nome_completo,
      email,
      ramal: ramal || null,
      senha_hash,
      senha_plain: senha,
      is_master: is_master ? 1 : 0,
    });
    return res.status(201).json({ id, mensagem: 'Admin criado com sucesso' });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ erro: 'Usuário já existe' });
    }
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.patch('/usuarios/:id', requireMaster, async (req, res) => {
  try {
    const alvo = db.buscarAdminPorId(req.params.id);
    if (!alvo) return res.status(404).json({ erro: 'Admin não encontrado' });

    const dados = {};
    if (req.body.nome_completo !== undefined) dados.nome_completo = sanitizarTexto(req.body.nome_completo);
    if (req.body.ramal !== undefined) dados.ramal = sanitizarTexto(req.body.ramal || '') || null;
    if (req.body.email !== undefined) {
      const email = (req.body.email || '').trim().toLowerCase();
      if (email && !email.endsWith(DOMINIO_EMAIL)) return res.status(400).json({ erro: `E-mail deve terminar com ${DOMINIO_EMAIL}` });
      if (email) {
        const adminComEmail = db.buscarAdminPorEmail(email);
        if (adminComEmail && adminComEmail.id !== alvo.id)
          return res.status(409).json({ erro: 'Já existe um admin ativo com este e-mail' });
        if (db.buscarUsuarioPorEmail(email))
          return res.status(409).json({ erro: 'Já existe um usuário ativo com este e-mail' });
      }
      dados.email = email || null;
    }
    if (req.body.ativo !== undefined) {
      const reativando = req.body.ativo && !alvo.ativo;
      if (reativando) {
        if (alvo.email && db.buscarAdminPorEmail(alvo.email))
          return res.status(409).json({ erro: 'Já existe um admin ativo com este e-mail. Desative-o primeiro.' });
        if (db.buscarAdminPorUsuario(alvo.usuario))
          return res.status(409).json({ erro: 'Já existe um admin ativo com este usuário. Desative-o primeiro.' });
        if (alvo.email && db.buscarUsuarioPorEmail(alvo.email))
          return res.status(409).json({ erro: 'Já existe um usuário ativo com este e-mail. Desative-o primeiro.' });
      }
      dados.ativo = req.body.ativo ? 1 : 0;
    }
    if (req.body.is_master !== undefined) {
      if (alvo.id === req.admin.sub && !req.body.is_master)
        return res.status(400).json({ erro: 'Você não pode remover seu próprio status de master' });
      dados.is_master = req.body.is_master ? 1 : 0;
    }
    if (req.body.senha) {
      const mesma = await bcrypt.compare(req.body.senha, alvo.senha_hash);
      if (mesma) {
        dados.senha_plain = req.body.senha;
      } else {
        if (!senhaForte(req.body.senha)) return res.status(400).json({ erro: 'Senha fraca. Use ao menos 8 caracteres com maiúscula, minúscula, número e caractere especial.' });
        dados.senha_hash = await bcrypt.hash(req.body.senha, 12);
        dados.senha_plain = req.body.senha;
      }
    }

    db.atualizarAdmin(alvo.id, dados);
    if (Array.isArray(req.body.etiquetas)) {
      const slugs = req.body.etiquetas.filter(s => typeof s === 'string' && s.trim());
      db.sincronizarEtiquetasAdmin(alvo.id, slugs);
    }
    return res.json({ mensagem: 'Admin atualizado' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/usuarios/:id/etiquetas', requireAdmin, (req, res) => {
  const admin = db.buscarAdminPorId(+req.params.id);
  if (!admin) return res.status(404).json({ erro: 'Admin não encontrado' });
  res.json(db.listarEtiquetasDeAdmin(+req.params.id));
});

router.delete('/usuarios/:id', requireMaster, (req, res) => {
  try {
    const alvo = db.buscarAdminPorId(req.params.id);
    if (!alvo) return res.status(404).json({ erro: 'Admin não encontrado' });
    if (alvo.id === req.admin.sub) return res.status(400).json({ erro: 'Não é possível remover a si mesmo' });
    db.deletarAdmin(alvo.id);
    return res.json({ mensagem: 'Admin excluído permanentemente' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});


router.get('/portal-usuarios', requireAdmin, (req, res) => {
  try {
    return res.json(db.listarUsuarios());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/portal-usuarios', requireAdmin, async (req, res) => {
  try {
    let { nome, email, senha, ramal, setor } = req.body;
    nome = sanitizarTexto(nome || '');
    email = (email || '').trim().toLowerCase();
    senha = (senha || '').trim();
    ramal = (ramal || '').trim();
    setor = sanitizarTexto(setor || '');

    if (!nome || nome.length < 2) return res.status(400).json({ erro: 'Nome deve ter ao menos 2 caracteres' });
    if (!email || !email.endsWith(DOMINIO_EMAIL)) return res.status(400).json({ erro: `E-mail deve terminar com ${DOMINIO_EMAIL}` });
    if (!senha || !senhaForte(senha)) return res.status(400).json({ erro: 'Senha fraca. Use ao menos 8 caracteres com maiúscula, minúscula, número e caractere especial.' });
    if (ramal && !/^\d{4}$/.test(ramal)) return res.status(400).json({ erro: 'Ramal deve ter exatamente 4 dígitos' });

    if (db.buscarUsuarioPorEmail(email))
      return res.status(409).json({ erro: 'Já existe um usuário ativo com este e-mail' });
    if (db.buscarAdminPorEmail(email))
      return res.status(409).json({ erro: 'Já existe um admin ativo com este e-mail' });

    const senha_hash = await bcrypt.hash(senha, 12);
    const id = db.registrarUsuario({ nome, email, senha_hash, senha_plain: senha, ramal: ramal || null, setor: setor || null });
    return res.status(201).json({ id, mensagem: 'Usuário criado com sucesso' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.patch('/portal-usuarios/:id', requireAdmin, async (req, res) => {
  try {
    const u = db.buscarUsuarioPorId(req.params.id);
    if (!u) return res.status(404).json({ erro: 'Usuário não encontrado' });

    // Apenas ativo/inativo (toggle)
    if (req.body.ativo !== undefined && Object.keys(req.body).length === 1) {
      if (req.body.ativo && !u.ativo) {
        if (db.buscarUsuarioPorEmail(u.email))
          return res.status(409).json({ erro: 'Já existe um usuário ativo com este e-mail. Desative-o primeiro.' });
        if (db.buscarAdminPorEmail(u.email))
          return res.status(409).json({ erro: 'Já existe um admin ativo com este e-mail. Desative-o primeiro.' });
      }
      db.atualizarUsuario(u.id, { ativo: req.body.ativo ? 1 : 0 });
      return res.json({ mensagem: req.body.ativo ? 'Usuário reativado' : 'Usuário desativado' });
    }

    // Edição completa do perfil
    const dados = {};
    if (req.body.nome !== undefined) {
      const nome = sanitizarTexto(req.body.nome || '');
      if (nome.length < 2) return res.status(400).json({ erro: 'Nome deve ter ao menos 2 caracteres' });
      dados.nome = nome;
    }
    if (req.body.email !== undefined) {
      const email = (req.body.email || '').trim().toLowerCase();
      if (!email.endsWith(DOMINIO_EMAIL)) return res.status(400).json({ erro: `E-mail deve terminar com ${DOMINIO_EMAIL}` });
      const existente = db.buscarUsuarioPorEmail(email);
      if (existente && existente.id !== u.id) return res.status(409).json({ erro: 'Já existe um usuário ativo com este e-mail' });
      if (db.buscarAdminPorEmail(email)) return res.status(409).json({ erro: 'Já existe um admin ativo com este e-mail' });
      dados.email = email;
    }
    if (req.body.senha) {
      const senha = req.body.senha;
      const mesma = await bcrypt.compare(senha, u.senha_hash);
      if (mesma) {
        dados.senha_plain = senha;
      } else {
        if (!senhaForte(senha)) return res.status(400).json({ erro: 'Senha fraca. Use ao menos 8 caracteres com maiúscula, minúscula, número e caractere especial.' });
        dados.senha_hash = await bcrypt.hash(senha, 12);
        dados.senha_plain = senha;
      }
    }
    if (req.body.ramal !== undefined) {
      const ramal = (req.body.ramal || '').trim();
      if (ramal && !/^\d{4}$/.test(ramal)) return res.status(400).json({ erro: 'Ramal deve ter exatamente 4 dígitos' });
      dados.ramal = ramal || null;
    }
    if (req.body.setor !== undefined) {
      dados.setor = sanitizarTexto(req.body.setor || '') || null;
    }

    db.atualizarUsuario(u.id, dados);
    return res.json({ mensagem: 'Usuário atualizado com sucesso' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.delete('/portal-usuarios/:id', requireMaster, (req, res) => {
  try {
    const u = db.buscarUsuarioPorId(req.params.id);
    if (!u) return res.status(404).json({ erro: 'Usuário não encontrado' });
    db.deletarUsuario(u.id);
    return res.json({ mensagem: 'Usuário excluído permanentemente' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.patch('/chamados/:id/transferir-usuario', requireMaster, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    if (!chamado.aberto_por_admin_id) {
      return res.status(403).json({ erro: 'Só é possível trocar o usuário de chamados criados por admins.' });
    }
    const novoUsuarioId = parseInt(req.body.usuario_id, 10);
    if (!novoUsuarioId) return res.status(400).json({ erro: 'usuario_id obrigatório' });
    const novoUsuario = db.buscarUsuarioPorId(novoUsuarioId);
    if (!novoUsuario || !novoUsuario.ativo) return res.status(404).json({ erro: 'Usuário não encontrado ou inativo' });
    if (Number(chamado.usuario_id) === Number(novoUsuario.id)) {
      return res.status(400).json({ erro: 'Este já é o usuário do chamado.' });
    }
    const nomeAnterior = chamado.nome || '—';
    db.getDb().prepare(`
      UPDATE chamados SET usuario_id = ?, nome = ?, setor = ?, ramal = ?, atualizado_em = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(novoUsuario.id, novoUsuario.nome, novoUsuario.setor || chamado.setor || 'TI', novoUsuario.ramal || '', chamado.id);
    db.getDb().prepare(`
      INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
      VALUES (?, ?, 'usuario_transferido', ?, ?)
    `).run(chamado.id, req.admin.sub, nomeAnterior, novoUsuario.nome);
    return res.json({ mensagem: `Chamado transferido para ${novoUsuario.nome}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/chamados/:id/anexos', requireAdmin, uploadChamadoMiddleware(), async (req, res) => {
  const arquivos = req.arquivos || [];
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) {
      arquivos.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
      return res.status(404).json({ erro: 'Chamado não encontrado' });
    }
    if (!arquivos.length) return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
    const adminInfo = db.buscarAdminPorId(req.admin.sub);
    const adicionados = [];
    for (const arq of arquivos) {
      const anexoId = db.inserirAnexoExtra({ chamado_id: chamado.id, path: 'pendente', nome_original: arq.originalname });
      const nomeFinal = renomearAnexoExtra(chamado.id, anexoId, arq.path, arq.originalname);
      db.getDb().prepare('UPDATE chamado_anexos SET path = ? WHERE id = ?').run(nomeFinal, anexoId);
      adicionados.push(arq.originalname);
    }
    db.getDb().prepare(`
      INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
      VALUES (?, ?, 'anexos_adicionados', NULL, ?)
    `).run(chamado.id, req.admin.sub, adicionados.join(', '));
    db.incrementarNovidadesAdmin(chamado.id);
    return res.json({ adicionados });
  } catch (err) {
    arquivos.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao salvar anexos' });
  }
});

router.delete('/chamados/:id/anexos/:anexoId', requireAdmin, (req, res) => {
  try {
    const anexo = db.buscarAnexoExtra(req.params.anexoId);
    if (!anexo || Number(anexo.chamado_id) !== Number(req.params.id))
      return res.status(404).json({ erro: 'Anexo não encontrado' });
    const { UPLOADS_DIR } = require('../upload');
    const filePath = path.join(UPLOADS_DIR, anexo.path);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
    db.getDb().prepare('DELETE FROM chamado_anexos WHERE id = ?').run(req.params.anexoId);
    db.getDb().prepare(`
      INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
      VALUES (?, ?, 'anexo_removido', ?, NULL)
    `).run(req.params.id, req.admin.sub, anexo.nome_original);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/chamados/:id/admin-anexo', requireAdmin, uploadMiddleware('admin_anexo'), async (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ erro: 'Chamado não encontrado' });
    }
    if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado' });

    const { UPLOADS_DIR } = require('../upload');

    const oldAnexoNome = chamado.admin_anexo_nome_original || null;

    const ext = path.extname(req.file.originalname).toLowerCase();
    const base = path.basename(req.file.originalname, ext)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 100);
    const novoNome = `admin_${chamado.id}__${base}${ext}`;
    fs.renameSync(req.file.path, path.join(UPLOADS_DIR, novoNome));

    db.getDb().prepare('UPDATE chamados SET admin_anexo_path = ?, admin_anexo_nome_original = ? WHERE id = ?')
      .run(novoNome, req.file.originalname, chamado.id);

    db.getDb().prepare(`
      INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
      VALUES (?, ?, 'admin_anexo_adicionado', ?, ?)
    `).run(chamado.id, req.admin.sub, oldAnexoNome, JSON.stringify({ nome: req.file.originalname, path: novoNome }));

    return res.json({ mensagem: 'Arquivo enviado', nome: req.file.originalname });
  } catch (err) {
    console.error(err);
    if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/chamados/:id/admin-anexo', requireAdmin, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado || !chamado.admin_anexo_path) return res.status(404).json({ erro: 'Sem anexo' });
    const { UPLOADS_DIR } = require('../upload');
    const filePath = path.join(UPLOADS_DIR, chamado.admin_anexo_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ erro: 'Arquivo não encontrado' });
    const nomeAnexo = chamado.admin_anexo_nome_original || chamado.admin_anexo_path;
    const isImg = /\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|avif)$/i.test(nomeAnexo);
    res.setHeader('Content-Disposition', `${isImg ? 'inline' : 'attachment'}; filename="${encodeURIComponent(nomeAnexo)}"`);
    return res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/chamados/:id/historico-anexo/:filename', requireAdmin, (req, res) => {
  try {
    const { UPLOADS_DIR } = require('../upload');
    const filename = req.params.filename;
    // Validação de segurança: só arquivos que pertencem a este chamado
    if (!filename || !/^admin_\d+__[a-zA-Z0-9._-]+$/.test(filename)) {
      return res.status(400).json({ erro: 'Nome de arquivo inválido' });
    }
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ erro: 'Arquivo não encontrado' });
    const nomeOriginal = filename.replace(/^admin_\d+__/, '');
    const isImg = /\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|avif)$/i.test(nomeOriginal);
    res.setHeader('Content-Disposition', `${isImg ? 'inline' : 'attachment'}; filename="${encodeURIComponent(nomeOriginal)}"`);
    return res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.delete('/chamados/:id/admin-anexo', requireAdmin, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado || !chamado.admin_anexo_path) return res.status(404).json({ erro: 'Sem anexo' });
    const { UPLOADS_DIR } = require('../upload');
    const filePath = path.join(UPLOADS_DIR, chamado.admin_anexo_path);
    const nomeAnexoRemovido = chamado.admin_anexo_nome_original || chamado.admin_anexo_path;
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
    db.getDb().prepare('UPDATE chamados SET admin_anexo_path = NULL, admin_anexo_nome_original = NULL WHERE id = ?').run(chamado.id);
    db.getDb().prepare(`
      INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
      VALUES (?, ?, 'admin_anexo_removido', ?, NULL)
    `).run(chamado.id, req.admin.sub, nomeAnexoRemovido);
    return res.json({ mensagem: 'Anexo removido' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
