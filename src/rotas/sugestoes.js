const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../db');
const { requireAdmin, requireUsuario } = require('../auth');
const push = require('../push');
const { uploadMiddleware, UPLOADS_DIR } = require('../upload');
const sse = require('../sse');

const STATUS_VALIDOS = ['enviada', 'em_analise', 'em_producao', 'feita', 'negada'];
const STATUS_COM_CAMPO = ['feita', 'negada'];

function sanitizar(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;').trim();
}

// ── Rotas do usuário ────────────────────────────────────────

router.post('/', uploadMiddleware('anexo'), requireUsuario, (req, res) => {
  try {
    const texto = sanitizar(req.body.texto || '');
    if (!texto || texto.length < 10) { if (req.file) try { fs.unlinkSync(req.file.path); } catch {} return res.status(400).json({ erro: 'Sugestão muito curta (mín. 10 caracteres)' }); }
    if (texto.length > 2000) { if (req.file) try { fs.unlinkSync(req.file.path); } catch {} return res.status(400).json({ erro: 'Sugestão muito longa (máx. 2000 caracteres)' }); }

    const usuario = db.buscarUsuarioPorId(req.usuario.sub);
    if (!usuario) { if (req.file) try { fs.unlinkSync(req.file.path); } catch {} return res.status(404).json({ erro: 'Usuário não encontrado' }); }

    let anexo_path = null, anexo_nome_original = null;
    if (req.file) {
      const MIME_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'image/heic': '.heic', 'image/avif': '.avif' };
      let nomeOrig = req.file.originalname || '';
      let ext = path.extname(nomeOrig).toLowerCase();
      if (!ext && req.file.mimetype) ext = MIME_EXT[req.file.mimetype] || '';
      if (!nomeOrig || !path.extname(nomeOrig)) nomeOrig = `arquivo${ext || ''}`;
      const base = path.basename(nomeOrig, ext).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 100) || 'arquivo';
      const tmpNome = `sug_${Date.now()}__${base}${ext}`;
      fs.renameSync(req.file.path, path.join(UPLOADS_DIR, tmpNome));
      const id = db.criarSugestao({ usuario_id: usuario.id, usuario_nome: usuario.nome, texto, anexo_path: tmpNome, anexo_nome_original: nomeOrig });
      const novoNome = `sug_${id}__${base}${ext}`;
      fs.renameSync(path.join(UPLOADS_DIR, tmpNome), path.join(UPLOADS_DIR, novoNome));
      db.getDb().prepare('UPDATE sugestoes SET anexo_path = ? WHERE id = ?').run(novoNome, id);
      push.enviarParaTodos('💡 Nova sugestão recebida', `${usuario.nome}: ${texto.slice(0, 80)}${texto.length > 80 ? '…' : ''}`).catch(() => {});
      return res.status(201).json({ id, mensagem: 'Sugestão enviada com sucesso!' });
    }

    const id = db.criarSugestao({ usuario_id: usuario.id, usuario_nome: usuario.nome, texto });
    push.enviarParaTodos('💡 Nova sugestão recebida', `${usuario.nome}: ${texto.slice(0, 80)}${texto.length > 80 ? '…' : ''}`).catch(() => {});
    return res.status(201).json({ id, mensagem: 'Sugestão enviada com sucesso!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/minhas', requireUsuario, (req, res) => {
  try {
    return res.json(db.listarSugestoesPorUsuario(req.usuario.sub));
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/:id/mensagens', requireUsuario, (req, res) => {
  try {
    const s = db.buscarSugestaoPorId(parseInt(req.params.id, 10));
    if (!s) return res.status(404).json({ erro: 'Sugestão não encontrada' });
    if (s.usuario_id !== req.usuario.sub) return res.status(403).json({ erro: 'Acesso negado' });
    db.marcarMensagensLidasUsuario(s.id);
    return res.json(db.listarMensagensSugestao(s.id));
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/:id/anexo', requireUsuario, (req, res) => {
  try {
    const s = db.buscarSugestaoPorId(parseInt(req.params.id, 10));
    if (!s) return res.status(404).json({ erro: 'Sugestão não encontrada' });
    if (s.usuario_id !== req.usuario.sub) return res.status(403).json({ erro: 'Acesso negado' });
    if (!s.anexo_path) return res.status(404).json({ erro: 'Sem anexo' });
    const filePath = path.join(UPLOADS_DIR, s.anexo_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ erro: 'Arquivo não encontrado' });
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(s.anexo_nome_original || s.anexo_path)}`);
    return res.sendFile(path.resolve(filePath));
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/:id(\\d+)', requireUsuario, (req, res) => {
  try {
    const s = db.buscarSugestaoPorId(parseInt(req.params.id, 10));
    if (!s) return res.status(404).json({ erro: 'Sugestão não encontrada' });
    if (s.usuario_id !== req.usuario.sub) return res.status(403).json({ erro: 'Acesso negado' });
    return res.json(s);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/:id/historico', requireUsuario, (req, res) => {
  try {
    const s = db.buscarSugestaoPorId(parseInt(req.params.id, 10));
    if (!s) return res.status(404).json({ erro: 'Sugestão não encontrada' });
    if (s.usuario_id !== req.usuario.sub) return res.status(403).json({ erro: 'Acesso negado' });
    return res.json(db.listarHistoricoSugestao(s.id));
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/:id/mensagens', uploadMiddleware('chat_anexo'), requireUsuario, (req, res) => {
  try {
    const s = db.buscarSugestaoPorId(parseInt(req.params.id, 10));
    if (!s) { if (req.file) try { fs.unlinkSync(req.file.path); } catch {} return res.status(404).json({ erro: 'Sugestão não encontrada' }); }
    if (s.usuario_id !== req.usuario.sub) { if (req.file) try { fs.unlinkSync(req.file.path); } catch {} return res.status(403).json({ erro: 'Acesso negado' }); }

    const mensagem = sanitizar(req.body.mensagem || '');
    if (!mensagem && !req.file) return res.status(400).json({ erro: 'Envie uma mensagem ou um arquivo' });
    if (mensagem.length > 1000) { if (req.file) try { fs.unlinkSync(req.file.path); } catch {} return res.status(400).json({ erro: 'Mensagem muito longa (máx. 1000 caracteres)' }); }

    const usuario = db.buscarUsuarioPorId(req.usuario.sub);
    let chat_anexo_path = null, chat_anexo_nome_original = null;
    if (req.file) {
      const MIME_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'image/heic': '.heic', 'image/avif': '.avif' };
      let nomeOrig = req.file.originalname || '';
      let ext = path.extname(nomeOrig).toLowerCase();
      if (!ext && req.file.mimetype) ext = MIME_EXT[req.file.mimetype] || '';
      if (!nomeOrig || !path.extname(nomeOrig)) nomeOrig = `imagem${ext || ''}`;
      const base = path.basename(nomeOrig, ext).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 100) || 'arquivo';
      const tmpNome = `sugusr_${Date.now()}__${base}${ext}`;
      fs.renameSync(req.file.path, path.join(UPLOADS_DIR, tmpNome));
      const msgId = db.criarMensagemSugestao({ sugestao_id: s.id, autor_tipo: 'usuario', autor_id: usuario.id, autor_nome: usuario.nome, mensagem, chat_anexo_path: tmpNome, chat_anexo_nome_original: nomeOrig });
      const novoNome = `sugusr_${msgId}__${base}${ext}`;
      fs.renameSync(path.join(UPLOADS_DIR, tmpNome), path.join(UPLOADS_DIR, novoNome));
      db.getDb().prepare('UPDATE sugestao_mensagens SET chat_anexo_path = ? WHERE id = ?').run(novoNome, msgId);
    } else {
      db.criarMensagemSugestao({ sugestao_id: s.id, autor_tipo: 'usuario', autor_id: usuario.id, autor_nome: usuario.nome, mensagem });
    }
    const notifMsg = mensagem || `[Arquivo: ${req.file ? req.file.originalname : ''}]`;
    push.enviarParaTodos('💬 Mensagem em sugestão', `${usuario.nome}: ${notifMsg.slice(0, 80)}`).catch(() => {});
    return res.status(201).json({ mensagem: 'Mensagem enviada' });
  } catch (err) {
    console.error(err);
    if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/:id/mensagens/:msgId/chat-anexo', requireUsuario, (req, res) => {
  try {
    const s = db.buscarSugestaoPorId(parseInt(req.params.id, 10));
    if (!s || s.usuario_id !== req.usuario.sub) return res.status(403).json({ erro: 'Acesso negado' });
    const msg = db.getDb().prepare('SELECT * FROM sugestao_mensagens WHERE id = ? AND sugestao_id = ?').get(req.params.msgId, s.id);
    if (!msg || !msg.chat_anexo_path) return res.status(404).json({ erro: 'Sem anexo' });
    const filePath = path.join(UPLOADS_DIR, msg.chat_anexo_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ erro: 'Arquivo não encontrado' });
    const etag = `"sug-msg-${msg.id}"`;
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(msg.chat_anexo_nome_original)}"`);
    return res.sendFile(filePath);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── Rotas do admin ──────────────────────────────────────────

router.get('/admin', requireAdmin, (req, res) => {
  try {
    const filtros = {
      status: req.query.status || '',
      usuario_id: req.query.usuario_id ? parseInt(req.query.usuario_id, 10) : null,
      busca: (req.query.busca || '').trim(),
    };
    return res.json(db.listarSugestoesAdmin(filtros));
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/admin', requireAdmin, (req, res) => {
  try {
    const texto = sanitizar(req.body.texto || '');
    if (!texto || texto.length < 10) return res.status(400).json({ erro: 'Sugestão muito curta (mín. 10 caracteres)' });

    let usuario_id = null;
    let usuario_nome = req.admin.nome;

    if (req.body.usuario_id) {
      const u = db.buscarUsuarioPorId(parseInt(req.body.usuario_id, 10));
      if (u && u.ativo) { usuario_id = u.id; usuario_nome = u.nome; }
    }

    const statusInicial = req.body.status && STATUS_VALIDOS.includes(req.body.status) ? req.body.status : 'enviada';
    const id = db.criarSugestao({ usuario_id, usuario_nome, texto });

    if (statusInicial !== 'enviada') {
      db.atualizarStatusSugestao(id, statusInicial, null, req.admin.sub, req.admin.nome);
    } else {
      db.getDb().prepare(
        'INSERT INTO sugestao_status_historico (sugestao_id, admin_id, admin_nome, status_anterior, status_novo) VALUES (?, ?, ?, NULL, ?)'
      ).run(id, req.admin.sub, req.admin.nome, 'enviada');
    }

    return res.status(201).json({ id, mensagem: 'Sugestão criada' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/admin/contadores', requireAdmin, (req, res) => {
  try {
    return res.json({ nao_vistas: db.contarNaoVistaAdmin() });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/admin/contagens', requireAdmin, (req, res) => {
  try {
    const todos = db.listarSugestoesAdmin({ status: '', usuario_id: null, busca: '' });
    const c = { enviada: 0, em_analise: 0, em_producao: 0, feita: 0, negada: 0, abertas: 0 };
    for (const s of todos) {
      if (s.status in c) c[s.status]++;
      if (!['feita', 'negada'].includes(s.status)) c.abertas++;
    }
    return res.json(c);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/admin/:id', requireAdmin, (req, res) => {
  try {
    const s = db.buscarSugestaoPorId(parseInt(req.params.id, 10));
    if (!s) return res.status(404).json({ erro: 'Sugestão não encontrada' });
    db.marcarSugestaoVistaAdmin(s.id);
    const historico = db.listarHistoricoSugestao(s.id);
    return res.json({ ...s, historico });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.patch('/admin/:id/status', requireAdmin, (req, res) => {
  try {
    const s = db.buscarSugestaoPorId(parseInt(req.params.id, 10));
    if (!s) return res.status(404).json({ erro: 'Sugestão não encontrada' });

    const { status, campo_extra } = req.body;
    if (!STATUS_VALIDOS.includes(status)) return res.status(400).json({ erro: 'Status inválido' });

    if (STATUS_COM_CAMPO.includes(status) && !campo_extra?.trim()) {
      const label = status === 'feita' ? 'Como foi implementado' : 'Justificativa da negação';
      return res.status(400).json({ erro: `Campo obrigatório: "${label}"` });
    }

    db.atualizarStatusSugestao(s.id, status, campo_extra ? sanitizar(campo_extra) : null, req.admin.sub, req.admin.nome);

    if (s.usuario_id) {
      const STATUS_LABELS = { enviada: 'Enviada', em_analise: 'Em Análise', em_producao: 'Em Produção', feita: 'Feita', negada: 'Negada' };
      push.enviarParaTodos('📋 Sugestão atualizada', `Status alterado para: ${STATUS_LABELS[status] || status}`).catch(() => {});
    }

    return res.json({ mensagem: 'Status atualizado' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/admin/:id/mensagens', requireAdmin, (req, res) => {
  try {
    const s = db.buscarSugestaoPorId(parseInt(req.params.id, 10));
    if (!s) return res.status(404).json({ erro: 'Sugestão não encontrada' });
    return res.json(db.listarMensagensSugestao(s.id));
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/admin/:id/mensagens', uploadMiddleware('chat_anexo'), requireAdmin, (req, res) => {
  try {
    const s = db.buscarSugestaoPorId(parseInt(req.params.id, 10));
    if (!s) { if (req.file) try { fs.unlinkSync(req.file.path); } catch {} return res.status(404).json({ erro: 'Sugestão não encontrada' }); }

    const mensagem = sanitizar(req.body.mensagem || '');
    if (!mensagem && !req.file) return res.status(400).json({ erro: 'Envie uma mensagem ou um arquivo' });
    if (mensagem.length > 1000) { if (req.file) try { fs.unlinkSync(req.file.path); } catch {} return res.status(400).json({ erro: 'Mensagem muito longa' }); }

    if (req.file) {
      const MIME_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'image/heic': '.heic', 'image/avif': '.avif' };
      let nomeOrig = req.file.originalname || '';
      let ext = path.extname(nomeOrig).toLowerCase();
      if (!ext && req.file.mimetype) ext = MIME_EXT[req.file.mimetype] || '';
      if (!nomeOrig || !path.extname(nomeOrig)) nomeOrig = `imagem${ext || ''}`;
      const base = path.basename(nomeOrig, ext).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 100) || 'arquivo';
      const tmpNome = `sugadm_${Date.now()}__${base}${ext}`;
      fs.renameSync(req.file.path, path.join(UPLOADS_DIR, tmpNome));
      const msgId = db.criarMensagemSugestao({ sugestao_id: s.id, autor_tipo: 'admin', autor_id: req.admin.sub, autor_nome: req.admin.nome, mensagem, chat_anexo_path: tmpNome, chat_anexo_nome_original: nomeOrig });
      const novoNome = `sugadm_${msgId}__${base}${ext}`;
      fs.renameSync(path.join(UPLOADS_DIR, tmpNome), path.join(UPLOADS_DIR, novoNome));
      db.getDb().prepare('UPDATE sugestao_mensagens SET chat_anexo_path = ? WHERE id = ?').run(novoNome, msgId);
    } else {
      db.criarMensagemSugestao({ sugestao_id: s.id, autor_tipo: 'admin', autor_id: req.admin.sub, autor_nome: req.admin.nome, mensagem });
    }
    if (s.usuario_id) sse.notify(s.usuario_id, 'sugestao:updated', { sugestao_id: s.id });
    return res.status(201).json({ mensagem: 'Mensagem enviada' });
  } catch (err) {
    console.error(err);
    if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/admin/:id/mensagens/:msgId/chat-anexo', requireAdmin, (req, res) => {
  try {
    const s = db.buscarSugestaoPorId(parseInt(req.params.id, 10));
    if (!s) return res.status(404).json({ erro: 'Sugestão não encontrada' });
    const msg = db.getDb().prepare('SELECT * FROM sugestao_mensagens WHERE id = ? AND sugestao_id = ?').get(req.params.msgId, s.id);
    if (!msg || !msg.chat_anexo_path) return res.status(404).json({ erro: 'Sem anexo' });
    const filePath = path.join(UPLOADS_DIR, msg.chat_anexo_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ erro: 'Arquivo não encontrado' });
    const etag = `"sug-msg-${msg.id}"`;
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(msg.chat_anexo_nome_original)}"`);
    return res.sendFile(filePath);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
