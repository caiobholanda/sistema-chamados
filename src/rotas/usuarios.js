const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../db');
const { requireUsuario } = require('../auth');
const push = require('../push');

function sanitizar(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;').trim();
}

router.post('/registro', (req, res) => {
  return res.status(403).json({ erro: 'Cadastro público desativado. Solicite acesso ao administrador.' });
});

// POST /api/usuarios/login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'E-mail e senha obrigatórios' });

    const usuario = db.buscarUsuarioPorEmail(email.trim().toLowerCase());
    if (!usuario) return res.status(401).json({ erro: 'E-mail ou senha inválidos' });

    const ok = await bcrypt.compare(senha, usuario.senha_hash);
    if (!ok) return res.status(401).json({ erro: 'E-mail ou senha inválidos' });
    if (usuario.ativo === 0) return res.status(403).json({ erro: 'Conta desativada. Entre em contato com o suporte.' });

    if (!usuario.senha_plain || usuario.senha_plain !== senha) {
      db.atualizarUsuario(usuario.id, { senha_plain: senha });
    }

    const token = jwt.sign({ sub: usuario.id, nome: usuario.nome, email: usuario.email }, process.env.JWT_SECRET, { expiresIn: 30 * 24 * 60 * 60 });
    res.cookie('token_usuario', token, { httpOnly: true, sameSite: 'Strict', maxAge: 30 * 24 * 60 * 60 * 1000 });

    return res.json({ mensagem: 'Login realizado', nome: usuario.nome });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/usuarios/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token_usuario');
  return res.json({ mensagem: 'Logout realizado' });
});

// GET /api/usuarios/me
router.get('/me', requireUsuario, (req, res) => {
  const u = db.buscarUsuarioPorId(req.usuario.sub);
  if (!u) return res.status(404).json({ erro: 'Usuário não encontrado' });
  const { senha_hash, senha_plain, ...dados } = u;
  return res.json(dados);
});

// GET /api/usuarios/meus-chamados
router.get('/meus-chamados', requireUsuario, (req, res) => {
  try {
    const chamados = db.listarChamadosPorUsuario(req.usuario.sub);
    return res.json(chamados);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/usuarios/chamados/:id/reabrir
router.post('/chamados/:id/reabrir', requireUsuario, (req, res) => {
  try {
    const chamadoId = parseInt(req.params.id, 10);
    const novaDescricao = sanitizar(req.body.nova_descricao || '');

    if (!novaDescricao || novaDescricao.length < 10 || novaDescricao.length > 2000) {
      return res.status(400).json({ erro: 'A nova descrição deve ter entre 10 e 2000 caracteres' });
    }

    const chamado = db.buscarChamadoPorId(chamadoId);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    if (Number(chamado.usuario_id) !== Number(req.usuario.sub)) return res.status(403).json({ erro: 'Sem permissão' });
    if (!['concluido', 'encerrado'].includes(chamado.status)) {
      return res.status(400).json({ erro: 'Só é possível reabrir chamados concluídos ou encerrados' });
    }

    const dataRef = chamado.concluido_em || chamado.atualizado_em;
    if (dataRef) {
      const iso = dataRef.includes('T') ? dataRef : dataRef.replace(' ', 'T');
      const fechadoEm = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
      const dias = (Date.now() - fechadoEm.getTime()) / (1000 * 60 * 60 * 24);
      if (dias > 7) {
        return res.status(400).json({ erro: 'O prazo para reabrir este chamado expirou. Se o problema persistir, abra um novo chamado.' });
      }
    }

    db.reabrirChamadoUsuario(chamadoId, novaDescricao);

    const destino = chamado.admin_responsavel_id
      ? push.enviarParaAdmin(chamado.admin_responsavel_id, '🔄 Chamado reaberto pelo solicitante', `${chamado.nome} (${chamado.setor}): ${novaDescricao.slice(0, 80)}${novaDescricao.length > 80 ? '…' : ''}`)
      : push.enviarParaTodos('🔄 Chamado reaberto pelo solicitante', `${chamado.nome} (${chamado.setor}): ${novaDescricao.slice(0, 80)}${novaDescricao.length > 80 ? '…' : ''}`);
    destino.catch(() => {});

    return res.json({ mensagem: 'Chamado reaberto com sucesso' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/usuarios/chamados/:id/aceitar-termo
router.post('/chamados/:id/aceitar-termo', requireUsuario, (req, res) => {
  try {
    const chamadoId = parseInt(req.params.id, 10);
    const chamado = db.buscarChamadoPorId(chamadoId);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    if (Number(chamado.usuario_id) !== Number(req.usuario.sub))
      return res.status(403).json({ erro: 'Sem permissão' });
    const STATUS_ATIVOS = ['aberto', 'em_andamento', 'aguardando_compra', 'aguardando_chegar'];
    if (chamado.requer_acordo) {
      if (!STATUS_ATIVOS.includes(chamado.status))
        return res.status(400).json({ erro: 'O chamado já foi concluído' });
    } else {
      if (!['hardware', 'processo_compra'].includes(chamado.categoria))
        return res.status(400).json({ erro: 'Termo não aplicável a este chamado' });
      if (!['concluido', 'encerrado'].includes(chamado.status))
        return res.status(400).json({ erro: 'O chamado precisa estar concluído' });
    }

    const usuario = db.buscarUsuarioPorId(req.usuario.sub);
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });

    const { cargo, setor, equipamentos } = req.body || {};
    const setorFinal = typeof setor === 'string' ? setor.trim() : '';
    db.registrarTermoAceite({
      chamado_id: chamadoId,
      usuario_id: usuario.id,
      usuario_nome: usuario.nome,
      usuario_email: usuario.email,
      cargo: typeof cargo === 'string' ? cargo.trim() : '',
      setor: setorFinal,
      equipamentos: typeof equipamentos === 'string' ? equipamentos : '',
    });
    db.vincularEquipamentosDoAcordo(chamadoId, usuario.nome, setorFinal);

    return res.json({ mensagem: 'Termo aceito com sucesso' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/usuarios/chamados/:id/termo-aceite
router.get('/chamados/:id/termo-aceite', requireUsuario, (req, res) => {
  try {
    const chamadoId = parseInt(req.params.id, 10);
    const chamado = db.buscarChamadoPorId(chamadoId);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    if (Number(chamado.usuario_id) !== Number(req.usuario.sub))
      return res.status(403).json({ erro: 'Sem permissão' });
    const termo = db.buscarTermoAceite(chamadoId);
    return res.json(termo || null);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
