const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin, requireUsuario } = require('../auth');
const push = require('../push');

const STATUS_VALIDOS = ['enviada', 'em_analise', 'em_producao', 'feita', 'negada'];
const STATUS_COM_CAMPO = ['feita', 'negada'];

function sanitizar(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;').trim();
}

// ── Rotas do usuário ────────────────────────────────────────

router.post('/', requireUsuario, (req, res) => {
  try {
    const texto = sanitizar(req.body.texto || '');
    if (!texto || texto.length < 10) return res.status(400).json({ erro: 'Sugestão muito curta (mín. 10 caracteres)' });
    if (texto.length > 2000) return res.status(400).json({ erro: 'Sugestão muito longa (máx. 2000 caracteres)' });

    const usuario = db.buscarUsuarioPorId(req.usuario.sub);
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });

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
    return res.json(db.listarMensagensSugestao(s.id));
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

router.post('/:id/mensagens', requireUsuario, (req, res) => {
  try {
    const s = db.buscarSugestaoPorId(parseInt(req.params.id, 10));
    if (!s) return res.status(404).json({ erro: 'Sugestão não encontrada' });
    if (s.usuario_id !== req.usuario.sub) return res.status(403).json({ erro: 'Acesso negado' });

    const mensagem = sanitizar(req.body.mensagem || '');
    if (!mensagem) return res.status(400).json({ erro: 'Mensagem vazia' });
    if (mensagem.length > 1000) return res.status(400).json({ erro: 'Mensagem muito longa (máx. 1000 caracteres)' });

    const usuario = db.buscarUsuarioPorId(req.usuario.sub);
    db.criarMensagemSugestao({
      sugestao_id: s.id,
      autor_tipo: 'usuario',
      autor_id: usuario.id,
      autor_nome: usuario.nome,
      mensagem,
    });
    push.enviarParaTodos('💬 Mensagem em sugestão', `${usuario.nome}: ${mensagem.slice(0, 80)}`).catch(() => {});
    return res.status(201).json({ mensagem: 'Mensagem enviada' });
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

router.get('/admin/:id', requireAdmin, (req, res) => {
  try {
    const s = db.buscarSugestaoPorId(parseInt(req.params.id, 10));
    if (!s) return res.status(404).json({ erro: 'Sugestão não encontrada' });
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

router.post('/admin/:id/mensagens', requireAdmin, (req, res) => {
  try {
    const s = db.buscarSugestaoPorId(parseInt(req.params.id, 10));
    if (!s) return res.status(404).json({ erro: 'Sugestão não encontrada' });

    const mensagem = sanitizar(req.body.mensagem || '');
    if (!mensagem) return res.status(400).json({ erro: 'Mensagem vazia' });
    if (mensagem.length > 1000) return res.status(400).json({ erro: 'Mensagem muito longa' });

    db.criarMensagemSugestao({
      sugestao_id: s.id,
      autor_tipo: 'admin',
      autor_id: req.admin.sub,
      autor_nome: req.admin.nome,
      mensagem,
    });
    return res.status(201).json({ mensagem: 'Mensagem enviada' });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
