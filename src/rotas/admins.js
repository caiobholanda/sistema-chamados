const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../db');
const { requireAdmin, requireMaster } = require('../auth');
const push = require('../push');

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

router.get('/chamados', requireAdmin, (req, res) => {
  try {
    const filtros = {
      status: req.query.status,
      setor: req.query.setor,
      admin_id: req.query.admin_id,
      periodo_inicio: req.query.periodo_inicio,
      periodo_fim: req.query.periodo_fim,
      prioridade: req.query.prioridade,
    };
    const chamados = db.listarChamadosAdmin(filtros);
    return res.json(chamados);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.patch('/chamados/:id/transferir', requireAdmin, async (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    if (!['aberto', 'em_andamento'].includes(chamado.status)) {
      return res.status(400).json({ erro: 'Só é possível transferir chamados abertos ou em andamento' });
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

router.get('/chamados/:id/mensagens', requireAdmin, (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    return res.json(db.listarMensagensChamado(chamado.id));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

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

router.get('/chamados/:id', requireAdmin, (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    const historico = db.buscarHistoricoCompleto(chamado.id);
    const assinaturasHistorico = db.listarAssinaturasHistorico(chamado.id);
    return res.json({ ...chamado, historico, assinaturasHistorico });
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
    if (!['aberto', 'em_andamento'].includes(chamado.status)) {
      return res.status(400).json({ erro: `Não é possível assumir um chamado com status "${chamado.status}"` });
    }
    db.assumirChamado(chamado.id, req.admin.sub);
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
    if (!['aberto', 'em_andamento'].includes(chamado.status)) {
      return res.status(400).json({ erro: 'Só é possível concluir chamados abertos ou em andamento' });
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

const CATEGORIAS_VALIDAS = [
  'software','hardware','impressora','ramal','nobreak','monitor',
  'mouse','teclado','rede','acesso_senha','cameras','email','tv_projetor',
  'processo_compra','outros',
];

router.patch('/chamados/:id/categoria', requireAdmin, (req, res) => {
  try {
    const { categoria } = req.body;
    if (!categoria || !CATEGORIAS_VALIDAS.includes(categoria)) {
      return res.status(400).json({ erro: 'Categoria inválida' });
    }
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    db.atualizarCategoria(chamado.id, categoria, req.admin.sub);
    if (categoria === 'impressora') {
      db.atualizarPrazo(chamado.id, db.prazo2DiasUteis(), req.admin.sub);
    }
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
    db.salvarPushSubscription(req.admin.sub, { endpoint, p256dh: keys.p256dh, auth: keys.auth, is_mobile: !!is_mobile });
    return res.json({ mensagem: 'Inscrito' });
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


router.get('/usuarios', requireMaster, (req, res) => {
  try {
    return res.json(db.listarAdmins());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/usuarios', requireMaster, async (req, res) => {
  try {
    let { nome_completo, email, senha, is_master } = req.body;
    nome_completo = sanitizarTexto(nome_completo || '');
    email = (email || '').trim().toLowerCase();
    senha = (senha || '').trim();

    if (!nome_completo || nome_completo.length < 2) return res.status(400).json({ erro: 'Nome completo obrigatório' });
    if (!email || !email.endsWith(DOMINIO_EMAIL)) return res.status(400).json({ erro: `E-mail deve terminar com ${DOMINIO_EMAIL}` });
    const usuario = email.split('@')[0];
    if (!senha || !senhaForte(senha)) return res.status(400).json({ erro: 'Senha fraca. Use ao menos 8 caracteres com maiúscula, minúscula, número e caractere especial.' });

    if (db.buscarAdminPorEmail(email) || db.buscarUsuarioPorEmail(email))
      return res.status(409).json({ erro: 'E-mail já cadastrado no sistema' });

    const senha_hash = await bcrypt.hash(senha, 12);
    const id = db.criarAdmin({
      usuario,
      nome_completo,
      email,
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
    if (req.body.email !== undefined) {
      const email = (req.body.email || '').trim().toLowerCase();
      if (email && !email.endsWith(DOMINIO_EMAIL)) return res.status(400).json({ erro: `E-mail deve terminar com ${DOMINIO_EMAIL}` });
      if (email) {
        const adminComEmail = db.buscarAdminPorEmail(email);
        if ((adminComEmail && adminComEmail.id !== alvo.id) || db.buscarUsuarioPorEmail(email))
          return res.status(409).json({ erro: 'E-mail já cadastrado no sistema' });
      }
      dados.email = email || null;
    }
    if (req.body.ativo !== undefined) dados.ativo = req.body.ativo ? 1 : 0;
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
    return res.json({ mensagem: 'Admin atualizado' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
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

    if (db.buscarUsuarioPorEmail(email) || db.buscarAdminPorEmail(email))
      return res.status(409).json({ erro: 'E-mail já cadastrado no sistema' });

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
      if (existente && existente.id !== u.id) return res.status(409).json({ erro: 'E-mail já cadastrado' });
      const adminComEmail = db.buscarAdminPorEmail(email);
      if (adminComEmail) return res.status(409).json({ erro: 'E-mail já cadastrado' });
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

module.exports = router;
