const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../db');
const { requireAdmin, requireMaster } = require('../auth');

const STATUS_VALIDOS = ['aberto', 'em_andamento', 'concluido', 'encerrado'];
const PRIORIDADES_VALIDAS = ['baixa', 'media', 'alta', 'urgente'];
const TRANSICOES_VALIDAS = {
  aberto: ['em_andamento'],
  em_andamento: ['concluido', 'encerrado'],
};

const DOMINIO_EMAIL = '@granmarquise.com.br';
function senhaForte(s) {
  return s.length >= 8 && /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s) && /[^A-Za-z0-9]/.test(s);
}

function sanitizarTexto(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;').trim();
}

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { usuario, senha } = req.body;
    if (!usuario || !senha) return res.status(400).json({ erro: 'Usuário e senha obrigatórios' });

    const admin = db.buscarAdminPorUsuario(usuario.trim());
    if (!admin) return res.status(401).json({ erro: 'Usuário ou senha inválidos' });

    const ok = await bcrypt.compare(senha, admin.senha_hash);
    if (!ok) return res.status(401).json({ erro: 'Usuário ou senha inválidos' });

    const token = jwt.sign(
      { sub: admin.id, is_master: admin.is_master === 1, nome: admin.nome_completo },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'Strict',
      maxAge: 8 * 60 * 60 * 1000,
    });

    return res.json({ mensagem: 'Login realizado', is_master: admin.is_master === 1, nome: admin.nome_completo });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ mensagem: 'Logout realizado' });
});

// GET /api/admin/me
router.get('/me', requireAdmin, (req, res) => {
  const admin = db.buscarAdminPorId(req.admin.sub);
  if (!admin) return res.status(404).json({ erro: 'Admin não encontrado' });
  const { senha_hash, ...dados } = admin;
  return res.json(dados);
});

// GET /api/admin/chamados
router.get('/chamados', requireAdmin, (req, res) => {
  try {
    const filtros = {
      status: req.query.status,
      setor: req.query.setor,
      admin_id: req.query.admin_id,
      periodo_inicio: req.query.periodo_inicio,
      periodo_fim: req.query.periodo_fim,
    };
    const chamados = db.listarChamadosAdmin(filtros);
    return res.json(chamados);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// PATCH /api/admin/chamados/:id/reabrir
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

// DELETE /api/admin/chamados/:id — somente master
router.delete('/chamados/:id', requireMaster, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });

    const deletado = db.deletarChamado(req.params.id);

    if (deletado && deletado.anexo_path) {
      const { UPLOADS_DIR } = require('../upload');
      const path = require('path');
      const fs = require('fs');
      const filePath = path.join(UPLOADS_DIR, deletado.anexo_path);
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
    }

    return res.json({ mensagem: 'Chamado excluído com sucesso' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/admin/chamados/:id/mensagens
router.get('/chamados/:id/mensagens', requireAdmin, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    return res.json(db.listarMensagensChamado(chamado.id));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/admin/chamados/:id/mensagens
router.post('/chamados/:id/mensagens', requireAdmin, async (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    if (!['aberto', 'em_andamento'].includes(chamado.status)) {
      return res.status(400).json({ erro: 'Chamado encerrado — não é possível enviar mensagens' });
    }
    const mensagem = sanitizarTexto(req.body.mensagem || '');
    if (!mensagem || mensagem.length < 1 || mensagem.length > 1000) {
      return res.status(400).json({ erro: 'Mensagem deve ter entre 1 e 1000 caracteres' });
    }
    const admin = db.buscarAdminPorId(req.admin.sub);
    db.criarMensagem({
      chamado_id: chamado.id,
      autor_tipo: 'admin',
      autor_id: req.admin.sub,
      autor_nome: admin ? admin.nome_completo : 'Suporte',
      mensagem,
    });
    return res.status(201).json({ mensagem: 'Mensagem enviada' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/admin/chamados/:id
router.get('/chamados/:id', requireAdmin, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    const historico = db.buscarHistoricoCompleto(chamado.id);
    return res.json({ ...chamado, historico });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// PATCH /api/admin/chamados/:id/prioridade
router.patch('/chamados/:id/prioridade', requireAdmin, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });

    const prioridade = req.body.prioridade === '' || req.body.prioridade === null ? null : req.body.prioridade;
    if (prioridade !== null && !PRIORIDADES_VALIDAS.includes(prioridade)) {
      return res.status(400).json({ erro: 'Prioridade inválida' });
    }

    db.atualizarPrioridade(chamado.id, prioridade, req.admin.sub);
    return res.json({ mensagem: 'Prioridade atualizada' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// PATCH /api/admin/chamados/:id/prazo
router.patch('/chamados/:id/prazo', requireAdmin, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });

    const prazo = req.body.prazo || null;
    db.atualizarPrazo(chamado.id, prazo, req.admin.sub);
    return res.json({ mensagem: 'Prazo atualizado' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// PATCH /api/admin/chamados/:id/assumir
router.patch('/chamados/:id/assumir', requireAdmin, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    if (chamado.status !== 'aberto') {
      return res.status(400).json({ erro: `Não é possível assumir um chamado com status "${chamado.status}"` });
    }
    db.assumirChamado(chamado.id, req.admin.sub);
    return res.json({ mensagem: 'Chamado assumido' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// PATCH /api/admin/chamados/:id/concluir
router.patch('/chamados/:id/concluir', requireAdmin, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    if (chamado.status !== 'em_andamento') {
      return res.status(400).json({ erro: 'Só é possível concluir chamados em andamento' });
    }

    const solucao = sanitizarTexto(req.body.solucao || '');
    if (!solucao || solucao.length < 5) {
      return res.status(400).json({ erro: 'Informe a solução aplicada (mínimo 5 caracteres)' });
    }

    db.concluirChamado(chamado.id, solucao, req.admin.sub);
    return res.json({ mensagem: 'Chamado concluído' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// PATCH /api/admin/chamados/:id/encerrar
router.patch('/chamados/:id/encerrar', requireAdmin, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    if (!['aberto', 'em_andamento'].includes(chamado.status)) {
      return res.status(400).json({ erro: `Não é possível encerrar um chamado com status "${chamado.status}"` });
    }

    const motivo = sanitizarTexto(req.body.motivo || '');
    if (!motivo || motivo.length < 3) {
      return res.status(400).json({ erro: 'Informe o motivo do encerramento (mínimo 3 caracteres)' });
    }

    db.encerrarChamado(chamado.id, motivo, req.admin.sub);
    return res.json({ mensagem: 'Chamado encerrado' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── Gerenciamento de usuários admin (master) ──────────────────

// GET /api/admin/usuarios
router.get('/usuarios', requireMaster, (req, res) => {
  try {
    return res.json(db.listarAdmins());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/admin/usuarios
router.post('/usuarios', requireMaster, async (req, res) => {
  try {
    let { usuario, nome_completo, email, senha, is_master } = req.body;
    usuario = (usuario || '').trim();
    nome_completo = sanitizarTexto(nome_completo || '');
    email = (email || '').trim().toLowerCase();
    senha = (senha || '').trim();

    if (!usuario || usuario.length < 3) return res.status(400).json({ erro: 'Usuário deve ter ao menos 3 caracteres' });
    if (!nome_completo || nome_completo.length < 2) return res.status(400).json({ erro: 'Nome completo obrigatório' });
    if (!email || !email.endsWith(DOMINIO_EMAIL)) return res.status(400).json({ erro: `E-mail deve terminar com ${DOMINIO_EMAIL}` });
    if (!senha || !senhaForte(senha)) return res.status(400).json({ erro: 'Senha fraca. Use ao menos 8 caracteres com maiúscula, minúscula, número e caractere especial.' });

    const senha_hash = await bcrypt.hash(senha, 12);
    const id = db.criarAdmin({
      usuario,
      nome_completo,
      email,
      senha_hash,
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

// PATCH /api/admin/usuarios/:id
router.patch('/usuarios/:id', requireMaster, async (req, res) => {
  try {
    const alvo = db.buscarAdminPorId(req.params.id);
    if (!alvo) return res.status(404).json({ erro: 'Admin não encontrado' });

    const dados = {};
    if (req.body.nome_completo !== undefined) dados.nome_completo = sanitizarTexto(req.body.nome_completo);
    if (req.body.email !== undefined) {
      const email = (req.body.email || '').trim().toLowerCase();
      if (email && !email.endsWith(DOMINIO_EMAIL)) return res.status(400).json({ erro: `E-mail deve terminar com ${DOMINIO_EMAIL}` });
      dados.email = email || null;
    }
    if (req.body.ativo !== undefined) dados.ativo = req.body.ativo ? 1 : 0;
    if (req.body.senha) {
      if (!senhaForte(req.body.senha)) return res.status(400).json({ erro: 'Senha fraca. Use ao menos 8 caracteres com maiúscula, minúscula, número e caractere especial.' });
      dados.senha_hash = await bcrypt.hash(req.body.senha, 12);
    }

    db.atualizarAdmin(alvo.id, dados);
    return res.json({ mensagem: 'Admin atualizado' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// DELETE /api/admin/usuarios/:id
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

// ── Gerenciamento de usuários do portal (master) ─────────────

// GET /api/admin/portal-usuarios
router.get('/portal-usuarios', requireMaster, (req, res) => {
  try {
    return res.json(db.listarUsuarios());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/admin/portal-usuarios
router.post('/portal-usuarios', requireMaster, async (req, res) => {
  try {
    let { nome, email, senha } = req.body;
    nome = sanitizarTexto(nome || '');
    email = (email || '').trim().toLowerCase();
    senha = (senha || '').trim();

    if (!nome || nome.length < 2) return res.status(400).json({ erro: 'Nome deve ter ao menos 2 caracteres' });
    if (!email || !email.endsWith(DOMINIO_EMAIL)) return res.status(400).json({ erro: `E-mail deve terminar com ${DOMINIO_EMAIL}` });
    if (!senha || !senhaForte(senha)) return res.status(400).json({ erro: 'Senha fraca. Use ao menos 8 caracteres com maiúscula, minúscula, número e caractere especial.' });

    const existente = db.buscarUsuarioPorEmail(email);
    if (existente) return res.status(409).json({ erro: 'E-mail já cadastrado' });

    const senha_hash = await bcrypt.hash(senha, 12);
    const id = db.registrarUsuario({ nome, email, senha_hash });
    return res.status(201).json({ id, mensagem: 'Usuário criado com sucesso' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// PATCH /api/admin/portal-usuarios/:id
router.patch('/portal-usuarios/:id', requireMaster, (req, res) => {
  try {
    const u = db.buscarUsuarioPorId(req.params.id);
    if (!u) return res.status(404).json({ erro: 'Usuário não encontrado' });
    db.atualizarUsuario(u.id, { ativo: req.body.ativo ? 1 : 0 });
    return res.json({ mensagem: req.body.ativo ? 'Usuário reativado' : 'Usuário desativado' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// DELETE /api/admin/portal-usuarios/:id
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

module.exports = router;
