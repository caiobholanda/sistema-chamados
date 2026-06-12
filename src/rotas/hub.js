// Rotas server-to-server: chamadas pelo HubSistemas com Bearer SSO_SECRET.
// Nao expor para o cliente final. O Hub e que valida o admin (via JWT proprio)
// antes de proxiar para ca.
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../db');

const DOMINIO_EMAIL = '@granmarquise.com.br';
function senhaForte(s) {
  return s && s.length >= 8 && /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s) && /[^A-Za-z0-9]/.test(s);
}
function sanit(s) { return typeof s === 'string' ? s.trim() : s; }

function requireHubBearer(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || token !== process.env.SSO_SECRET) return res.status(403).json({ ok: false, erro: 'Acesso negado' });
  next();
}

router.use(requireHubBearer);

// ─── Resumo de usuarios (lista combinada admin+usuario) ──────────────────────
router.get('/usuarios', (_req, res) => {
  const admins = db.listarAdmins().filter(a => a.ativo && !a.is_test).map(a => ({
    email: a.email, nome: a.nome_completo, usuario: a.usuario,
    setor: 'TI', ramal: a.ramal || '', tipo: 'admin',
    is_master: a.is_master === 1, ativo: a.ativo === 1,
  }));
  const usuarios = db.listarUsuarios().filter(u => u.ativo).map(u => ({
    email: u.email, nome: u.nome, setor: u.setor || '',
    ramal: u.ramal || '', tipo: 'usuario', is_master: false, ativo: u.ativo === 1,
  }));
  res.json({ ok: true, users: [...admins, ...usuarios] });
});

// ─── ADMINS (CRUD) ────────────────────────────────────────────────────────────
router.get('/admins', (_req, res) => {
  res.json({ ok: true, admins: db.listarAdmins() });
});

router.post('/admins', async (req, res) => {
  try {
    const nome_completo = sanit(req.body.nome_completo || '');
    const email = (req.body.email || '').trim().toLowerCase();
    const senha = (req.body.senha || '').trim();
    const ramal = sanit(req.body.ramal || '');
    const is_master = req.body.is_master ? 1 : 0;

    if (!nome_completo || nome_completo.length < 2) return res.status(400).json({ ok: false, erro: 'Nome completo obrigatório' });
    if (!email || !email.endsWith(DOMINIO_EMAIL)) return res.status(400).json({ ok: false, erro: `E-mail deve terminar com ${DOMINIO_EMAIL}` });
    if (!senhaForte(senha)) return res.status(400).json({ ok: false, erro: 'Senha fraca. Use ao menos 8 caracteres com maiúscula, minúscula, número e caractere especial.' });
    const usuario = email.split('@')[0];

    if (db.buscarAdminPorEmail(email)) return res.status(409).json({ ok: false, erro: 'Já existe um admin ativo com este e-mail' });
    if (db.buscarAdminPorUsuario(usuario)) return res.status(409).json({ ok: false, erro: 'Já existe um admin ativo com este usuário' });
    if (db.buscarUsuarioPorEmail(email)) return res.status(409).json({ ok: false, erro: 'Já existe um usuário ativo com este e-mail' });

    const senha_hash = await bcrypt.hash(senha, 12);
    const id = db.criarAdmin({
      usuario, nome_completo, email, ramal: ramal || null,
      senha_hash, senha_plain: senha, is_master,
    });
    db.atualizarAdmin(id, { precisa_trocar_senha: 1 });
    res.status(201).json({ ok: true, id });
  } catch (err) {
    console.error('[hub admins POST]', err);
    res.status(500).json({ ok: false, erro: 'Erro interno' });
  }
});

router.patch('/admins/:id', async (req, res) => {
  try {
    const alvo = db.buscarAdminPorId(req.params.id);
    if (!alvo) return res.status(404).json({ ok: false, erro: 'Admin não encontrado' });

    const dados = {};
    if (req.body.nome_completo !== undefined) dados.nome_completo = sanit(req.body.nome_completo);
    if (req.body.ramal !== undefined) dados.ramal = sanit(req.body.ramal || '') || null;
    if (req.body.email !== undefined) {
      const email = (req.body.email || '').trim().toLowerCase();
      if (email && !email.endsWith(DOMINIO_EMAIL)) return res.status(400).json({ ok: false, erro: `E-mail deve terminar com ${DOMINIO_EMAIL}` });
      if (email) {
        const adminComEmail = db.buscarAdminPorEmail(email);
        if (adminComEmail && adminComEmail.id !== alvo.id) return res.status(409).json({ ok: false, erro: 'Já existe um admin ativo com este e-mail' });
        if (db.buscarUsuarioPorEmail(email)) return res.status(409).json({ ok: false, erro: 'Já existe um usuário ativo com este e-mail' });
      }
      dados.email = email || null;
    }
    if (req.body.ativo !== undefined) {
      const reativando = req.body.ativo && !alvo.ativo;
      if (reativando) {
        if (alvo.email && db.buscarAdminPorEmail(alvo.email)) return res.status(409).json({ ok: false, erro: 'Já existe um admin ativo com este e-mail.' });
        if (db.buscarAdminPorUsuario(alvo.usuario)) return res.status(409).json({ ok: false, erro: 'Já existe um admin ativo com este usuário.' });
        if (alvo.email && db.buscarUsuarioPorEmail(alvo.email)) return res.status(409).json({ ok: false, erro: 'Já existe um usuário ativo com este e-mail.' });
      }
      dados.ativo = req.body.ativo ? 1 : 0;
    }
    if (req.body.is_master !== undefined) dados.is_master = req.body.is_master ? 1 : 0;
    if (req.body.senha) {
      const mesma = await bcrypt.compare(req.body.senha, alvo.senha_hash);
      if (mesma) {
        dados.senha_plain = req.body.senha;
      } else {
        if (!senhaForte(req.body.senha)) return res.status(400).json({ ok: false, erro: 'Senha fraca. Use ao menos 8 caracteres com maiúscula, minúscula, número e caractere especial.' });
        dados.senha_hash = await bcrypt.hash(req.body.senha, 12);
        dados.senha_plain = req.body.senha;
        // Senha redefinida pelo admin para OUTRA conta vira temporaria (target deve trocar no proximo login).
        // Se for auto-edicao (_self_edit), nao marcar - ele acabou de escolher essa senha.
        if (!req.body._self_edit) dados.precisa_trocar_senha = 1;
        else dados.precisa_trocar_senha = 0;
      }
    }

    db.atualizarAdmin(alvo.id, dados);
    res.json({ ok: true });
  } catch (err) {
    console.error('[hub admins PATCH]', err);
    res.status(500).json({ ok: false, erro: 'Erro interno' });
  }
});

router.delete('/admins/:id', (req, res) => {
  try {
    const alvo = db.buscarAdminPorId(req.params.id);
    if (!alvo) return res.status(404).json({ ok: false, erro: 'Admin não encontrado' });
    db.deletarAdmin(alvo.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[hub admins DELETE]', err);
    res.status(500).json({ ok: false, erro: 'Erro interno' });
  }
});

// ─── PORTAL-USUARIOS (CRUD) ──────────────────────────────────────────────────
router.get('/portal-usuarios', (_req, res) => {
  res.json({ ok: true, usuarios: db.listarUsuarios() });
});

router.post('/portal-usuarios', async (req, res) => {
  try {
    const nome = sanit(req.body.nome || '');
    const email = (req.body.email || '').trim().toLowerCase();
    const senha = (req.body.senha || '').trim();
    const ramal = (req.body.ramal || '').trim();
    const setor = sanit(req.body.setor || '');

    if (!nome || nome.length < 2) return res.status(400).json({ ok: false, erro: 'Nome deve ter ao menos 2 caracteres' });
    if (!email || !email.endsWith(DOMINIO_EMAIL)) return res.status(400).json({ ok: false, erro: `E-mail deve terminar com ${DOMINIO_EMAIL}` });
    if (!senhaForte(senha)) return res.status(400).json({ ok: false, erro: 'Senha fraca. Use ao menos 8 caracteres com maiúscula, minúscula, número e caractere especial.' });
    if (ramal && !/^\d{4}$/.test(ramal)) return res.status(400).json({ ok: false, erro: 'Ramal deve ter exatamente 4 dígitos' });

    if (db.buscarUsuarioPorEmail(email)) return res.status(409).json({ ok: false, erro: 'Já existe um usuário ativo com este e-mail' });
    if (db.buscarAdminPorEmail(email)) return res.status(409).json({ ok: false, erro: 'Já existe um admin ativo com este e-mail' });

    const senha_hash = await bcrypt.hash(senha, 12);
    const id = db.registrarUsuario({ nome, email, senha_hash, senha_plain: senha, ramal: ramal || null, setor: setor || null });
    db.atualizarUsuario(id, { precisa_trocar_senha: 1 });
    res.status(201).json({ ok: true, id });
  } catch (err) {
    console.error('[hub portal-usuarios POST]', err);
    res.status(500).json({ ok: false, erro: 'Erro interno' });
  }
});

router.patch('/portal-usuarios/:id', async (req, res) => {
  try {
    const u = db.buscarUsuarioPorId(req.params.id);
    if (!u) return res.status(404).json({ ok: false, erro: 'Usuário não encontrado' });

    if (req.body.ativo !== undefined && Object.keys(req.body).length === 1) {
      if (req.body.ativo && !u.ativo) {
        if (db.buscarUsuarioPorEmail(u.email)) return res.status(409).json({ ok: false, erro: 'Já existe um usuário ativo com este e-mail.' });
        if (db.buscarAdminPorEmail(u.email)) return res.status(409).json({ ok: false, erro: 'Já existe um admin ativo com este e-mail.' });
      }
      db.atualizarUsuario(u.id, { ativo: req.body.ativo ? 1 : 0 });
      return res.json({ ok: true });
    }

    const dados = {};
    if (req.body.nome !== undefined) {
      const nome = sanit(req.body.nome || '');
      if (nome.length < 2) return res.status(400).json({ ok: false, erro: 'Nome deve ter ao menos 2 caracteres' });
      dados.nome = nome;
    }
    if (req.body.email !== undefined) {
      const email = (req.body.email || '').trim().toLowerCase();
      if (!email.endsWith(DOMINIO_EMAIL)) return res.status(400).json({ ok: false, erro: `E-mail deve terminar com ${DOMINIO_EMAIL}` });
      const existente = db.buscarUsuarioPorEmail(email);
      if (existente && existente.id !== u.id) return res.status(409).json({ ok: false, erro: 'Já existe um usuário ativo com este e-mail' });
      if (db.buscarAdminPorEmail(email)) return res.status(409).json({ ok: false, erro: 'Já existe um admin ativo com este e-mail' });
      dados.email = email;
    }
    if (req.body.senha) {
      const senha = req.body.senha;
      const mesma = await bcrypt.compare(senha, u.senha_hash);
      if (mesma) {
        dados.senha_plain = senha;
      } else {
        if (!senhaForte(senha)) return res.status(400).json({ ok: false, erro: 'Senha fraca. Use ao menos 8 caracteres com maiúscula, minúscula, número e caractere especial.' });
        dados.senha_hash = await bcrypt.hash(senha, 12);
        dados.senha_plain = senha;
        if (!req.body._self_edit) dados.precisa_trocar_senha = 1;
        else dados.precisa_trocar_senha = 0;
      }
    }
    if (req.body.ramal !== undefined) {
      const ramal = (req.body.ramal || '').trim();
      if (ramal && !/^\d{4}$/.test(ramal)) return res.status(400).json({ ok: false, erro: 'Ramal deve ter exatamente 4 dígitos' });
      dados.ramal = ramal || null;
    }
    if (req.body.setor !== undefined) dados.setor = sanit(req.body.setor || '') || null;

    db.atualizarUsuario(u.id, dados);
    res.json({ ok: true });
  } catch (err) {
    console.error('[hub portal-usuarios PATCH]', err);
    res.status(500).json({ ok: false, erro: 'Erro interno' });
  }
});

router.delete('/portal-usuarios/:id', (req, res) => {
  try {
    const u = db.buscarUsuarioPorId(req.params.id);
    if (!u) return res.status(404).json({ ok: false, erro: 'Usuário não encontrado' });
    db.deletarUsuario(u.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[hub portal-usuarios DELETE]', err);
    res.status(500).json({ ok: false, erro: 'Erro interno' });
  }
});

// ─── Etiquetas de admin ──────────────────────────────────────────────────────
router.get('/etiquetas', (_req, res) => {
  res.json({ ok: true, etiquetas: db.listarEtiquetas() });
});
router.get('/admins/:id/etiquetas', (req, res) => {
  const alvo = db.buscarAdminPorId(req.params.id);
  if (!alvo) return res.status(404).json({ ok: false, erro: 'Admin não encontrado' });
  res.json({ ok: true, slugs: db.listarEtiquetasDeAdmin(alvo.id) });
});
router.put('/admins/:id/etiquetas', (req, res) => {
  try {
    const alvo = db.buscarAdminPorId(req.params.id);
    if (!alvo) return res.status(404).json({ ok: false, erro: 'Admin não encontrado' });
    const slugs = Array.isArray(req.body.slugs) ? req.body.slugs.filter(s => typeof s === 'string' && s.trim()) : [];
    db.sincronizarEtiquetasAdmin(alvo.id, slugs);
    res.json({ ok: true });
  } catch (err) {
    console.error('[hub admins/etiquetas PUT]', err);
    res.status(500).json({ ok: false, erro: 'Erro interno' });
  }
});

// ─── Setores (CRUD) ──────────────────────────────────────────────────────────
router.get('/setores', (_req, res) => {
  res.json({ ok: true, setores: db.listarSetores() });
});
router.post('/setores', (req, res) => {
  const nome = sanit(req.body.nome || '');
  if (!nome) return res.status(400).json({ ok: false, erro: 'Nome obrigatório' });
  try {
    const id = db.criarSetor(nome);
    res.status(201).json({ ok: true, id, nome });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) return res.status(409).json({ ok: false, erro: 'Setor já existe' });
    console.error('[hub setores POST]', e);
    res.status(500).json({ ok: false, erro: 'Erro interno' });
  }
});
router.put('/setores/:id', (req, res) => {
  const nome = sanit(req.body.nome || '');
  if (!nome) return res.status(400).json({ ok: false, erro: 'Nome obrigatório' });
  try {
    db.editarSetor(+req.params.id, nome);
    res.json({ ok: true });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) return res.status(409).json({ ok: false, erro: 'Setor já existe' });
    console.error('[hub setores PUT]', e);
    res.status(500).json({ ok: false, erro: 'Erro interno' });
  }
});
router.delete('/setores/:id', (req, res) => {
  try {
    db.excluirSetor(+req.params.id);
    res.json({ ok: true });
  } catch (e) {
    console.error('[hub setores DELETE]', e);
    res.status(500).json({ ok: false, erro: 'Erro interno' });
  }
});
router.get('/portal-usuarios/:id/logs', (req, res) => {
  const u = db.buscarUsuarioPorId(req.params.id);
  if (!u) return res.status(404).json({ ok: false, erro: 'Usuário não encontrado' });
  res.json({ ok: true, logs: db.listarLogsUsuario(u.id) });
});
router.get('/portal-usuarios/:id/chamados', (req, res) => {
  const u = db.buscarUsuarioPorId(req.params.id);
  if (!u) return res.status(404).json({ ok: false, erro: 'Usuário não encontrado' });
  res.json({ ok: true, chamados: db.listarChamadosPorUsuario(u.id) });
});

// ─── Troca obrigatoria no primeiro login ─────────────────────────────────────
// Hub chama isso quando login retornou precisa_trocar_senha: true.
// Valida senha_atual, grava nova (hash + plain), zera flag.
router.post('/trocar-primeira-senha', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const senha_atual = (req.body.senha_atual || '').trim();
    const senha_nova = (req.body.senha_nova || '').trim();
    if (!email || !senha_atual || !senha_nova) return res.status(400).json({ ok: false, erro: 'Dados incompletos' });
    if (!senhaForte(senha_nova)) return res.status(400).json({ ok: false, erro: 'Senha fraca. Use ao menos 8 caracteres com maiúscula, minúscula, número e caractere especial.' });

    const admin = db.buscarAdminPorEmail(email);
    const usuario = !admin ? db.buscarUsuarioPorEmail(email) : null;
    if (!admin && !usuario) return res.status(404).json({ ok: false, erro: 'Conta não encontrada' });

    const alvo = admin || usuario;
    const tipo = admin ? 'admin' : 'usuario';
    if (admin && !admin.ativo) return res.status(403).json({ ok: false, erro: 'Conta desativada' });
    if (usuario && usuario.ativo === 0) return res.status(403).json({ ok: false, erro: 'Conta desativada' });

    const ok = await bcrypt.compare(senha_atual, alvo.senha_hash);
    if (!ok) return res.status(401).json({ ok: false, erro: 'Senha atual incorreta' });

    // Hash novo SEMPRE (mesmo se senha_nova == senha_atual): garante consistencia
    // hash/plain e for�a o bcrypt a regenerar o salt. UPDATE atomico (SQL direto)
    // grava senha_hash, senha_plain E zera precisa_trocar_senha de uma vez.
    const senha_hash = await bcrypt.hash(senha_nova, 12);
    const sql = tipo === 'admin'
      ? 'UPDATE admins   SET senha_hash = ?, senha_plain = ?, precisa_trocar_senha = 0 WHERE id = ?'
      : 'UPDATE usuarios SET senha_hash = ?, senha_plain = ?, precisa_trocar_senha = 0 WHERE id = ?';
    const result = db.getDb().prepare(sql).run(senha_hash, senha_nova, alvo.id);
    console.log('[trocar-primeira-senha]', { email, tipo, id: alvo.id, changes: result.changes });

    if (result.changes !== 1) {
      return res.status(500).json({ ok: false, erro: 'Falha ao persistir a nova senha. Tente novamente.' });
    }
    return res.json({ ok: true, tipo });
  } catch (err) {
    console.error('[hub trocar-primeira-senha]', err);
    return res.status(500).json({ ok: false, erro: 'Erro interno' });
  }
});

module.exports = router;
