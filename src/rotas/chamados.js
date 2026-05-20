const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../db');
const { upload, uploadMiddleware, renomearAnexoComId, UPLOADS_DIR } = require('../upload');
const { classificarInteligente } = require('../categorizador');
const { extrairEquipamentos } = require('../analisador-equipamentos');
const push = require('../push');

function getUsuarioIdFromCookie(req) {
  try {
    const token = req.cookies && req.cookies.token_usuario;
    if (!token) return null;
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload.sub;
  } catch { return null; }
}

const STATUS_VALIDOS = ['aberto', 'em_andamento', 'aguardando_compra', 'aguardando_chegar', 'concluido', 'encerrado'];
const PRIORIDADES_VALIDAS = ['baixa', 'media', 'alta', 'urgente'];

function sanitizarTexto(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

router.post('/', upload.single('anexo'), async (req, res) => {
  try {
    let { nome, setor, ramal, descricao } = req.body;
    nome = sanitizarTexto(nome);
    setor = sanitizarTexto(setor);
    ramal = (ramal || '').trim();
    descricao = sanitizarTexto(descricao);

    const erros = [];
    if (!nome || nome.length < 2 || nome.length > 80) erros.push('Nome deve ter 2–80 caracteres');
    if (!setor || setor.length < 2 || setor.length > 60) erros.push('Setor deve ter 2–60 caracteres');
    if (ramal && !/^\d{4}$/.test(ramal)) erros.push('Ramal deve ter exatamente 4 dígitos');
    if (!descricao || descricao.length < 10 || descricao.length > 2000) erros.push('Descrição deve ter 10–2000 caracteres');

    if (erros.length > 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ erro: erros.join('; ') });
    }

    let anexo_path = null;
    let anexo_nome_original = null;

    const usuario_id = getUsuarioIdFromCookie(req);

    const CATEGORIAS_VALIDAS = ['software','hardware','impressora','ramal','nobreak','monitor','mouse','teclado','rede','acesso_senha','cameras','email','tv_projetor','processo_compra','outros'];
    const categoriaEnviada = (req.body.categoria || '').trim();
    let categoria;
    if (categoriaEnviada && CATEGORIAS_VALIDAS.includes(categoriaEnviada)) {
      categoria = categoriaEnviada;
    } else {
      const cat = await classificarInteligente(descricao);
      categoria = cat ? cat.id : null;
    }

    const id = db.inserirChamado({ usuario_id, nome, setor, ramal, descricao, anexo_path: null, anexo_nome_original: null, categoria });
    if (categoria === 'impressora') {
      db.atualizarPrazo(id, db.prazo2DiasUteis(), null);
    }

    if (req.file) {
      const novoNome = renomearAnexoComId(id, req.file.path, req.file.originalname);
      anexo_path = novoNome;
      anexo_nome_original = req.file.originalname;
      db.getDb().prepare('UPDATE chamados SET anexo_path = ?, anexo_nome_original = ? WHERE id = ?')
        .run(novoNome, anexo_nome_original, id);
    }

    extrairEquipamentos(descricao).then(equipamentos => {
      if (equipamentos.length > 0) {
        db.inserirMencoesEquipamentos(id, equipamentos);
      }
    }).catch(() => {});

    push.enviarParaTodos('🆕 Novo chamado aberto', `${nome} (${setor}): ${descricao.slice(0, 80)}${descricao.length > 80 ? '…' : ''}`).catch(() => {});
    return res.status(201).json({ id, mensagem: 'Chamado aberto com sucesso' });
  } catch (err) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno ao abrir chamado' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    const historicoPrazos = db.buscarHistoricoPrazos(chamado.id);
    return res.json({ ...chamado, historicoPrazos });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/:id/avaliar', (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    if (chamado.status !== 'concluido') return res.status(400).json({ erro: 'Só é possível avaliar chamados concluídos' });
    if (chamado.nota !== null) return res.status(400).json({ erro: 'Chamado já avaliado' });

    const nota = parseInt(req.body.nota, 10);
    if (!nota || nota < 1 || nota > 10) return res.status(400).json({ erro: 'Nota deve ser um inteiro entre 1 e 10' });

    const comentario = sanitizarTexto(req.body.comentario_avaliacao || '');
    db.avaliarChamado(chamado.id, nota, comentario || null);
    return res.json({ mensagem: 'Avaliação registrada com sucesso' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/:id/anexo', (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado || !chamado.anexo_path) return res.status(404).json({ erro: 'Anexo não encontrado' });
    const filePath = path.join(UPLOADS_DIR, chamado.anexo_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ erro: 'Arquivo não encontrado no servidor' });
    const nomeAnexo = chamado.anexo_nome_original || chamado.anexo_path;
    const isImg = /\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|avif)$/i.test(nomeAnexo);
    res.setHeader('Content-Disposition', `${isImg ? 'inline' : 'attachment'}; filename="${encodeURIComponent(nomeAnexo)}"`);
    return res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/:id/mensagens', (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const usuario_id = getUsuarioIdFromCookie(req);
    if (!usuario_id) return res.status(401).json({ erro: 'Não autenticado' });
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado' });
    if (Number(chamado.usuario_id) !== Number(usuario_id)) return res.status(403).json({ erro: 'Acesso negado' });
    return res.json(db.listarMensagensChamado(chamado.id));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/:id/mensagens', uploadMiddleware('chat_anexo'), (req, res) => {
  try {
    const usuario_id = getUsuarioIdFromCookie(req);
    if (!usuario_id) {
      if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(401).json({ erro: 'Não autenticado' });
    }
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado) {
      if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(404).json({ erro: 'Chamado não encontrado' });
    }
    if (Number(chamado.usuario_id) !== Number(usuario_id)) {
      if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(403).json({ erro: 'Acesso negado' });
    }
    if (!['aberto', 'em_andamento', 'aguardando_compra', 'aguardando_chegar'].includes(chamado.status)) {
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
    const usuario = db.buscarUsuarioPorId(usuario_id);
    const nomeAutor = usuario ? usuario.nome : 'Usuário';
    if (req.file) {
      const MIME_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'image/heic': '.heic', 'image/avif': '.avif' };
      let nomeOriginal = req.file.originalname || '';
      let ext = path.extname(nomeOriginal).toLowerCase();
      if (!ext && req.file.mimetype) ext = MIME_EXT[req.file.mimetype] || '';
      if (!nomeOriginal || !path.extname(nomeOriginal)) nomeOriginal = `imagem${ext || ''}`;
      const base = path.basename(nomeOriginal, ext)
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 100) || 'arquivo';
      const tmpNome = `chatusr_${Date.now()}__${base}${ext}`;
      const tmpPath = path.join(UPLOADS_DIR, tmpNome);
      fs.renameSync(req.file.path, tmpPath);
      const msgId = db.criarMensagem({
        chamado_id: chamado.id, autor_tipo: 'usuario',
        autor_id: usuario_id, autor_nome: nomeAutor,
        mensagem, chat_anexo_path: tmpNome, chat_anexo_nome_original: nomeOriginal,
      });
      const novoNome = `chatusr_${msgId}__${base}${ext}`;
      fs.renameSync(tmpPath, path.join(UPLOADS_DIR, novoNome));
      db.getDb().prepare('UPDATE mensagens_chamado SET chat_anexo_path = ? WHERE id = ?').run(novoNome, msgId);
    } else {
      db.criarMensagem({
        chamado_id: chamado.id, autor_tipo: 'usuario',
        autor_id: usuario_id, autor_nome: nomeAutor,
        mensagem,
      });
    }
    const notifMsg = mensagem || `[Arquivo: ${req.file ? req.file.originalname : ''}]`;
    if (chamado.admin_responsavel_id) {
      push.enviarParaAdmin(chamado.admin_responsavel_id, `💬 ${nomeAutor}`, notifMsg.slice(0, 100)).catch(() => {});
    } else {
      push.enviarParaTodos(`💬 ${nomeAutor}`, notifMsg.slice(0, 100)).catch(() => {});
    }
    return res.status(201).json({ mensagem: 'Mensagem enviada' });
  } catch (err) {
    console.error(err);
    if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/:id/mensagens/:msgId/chat-anexo', (req, res) => {
  try {
    const usuario_id = getUsuarioIdFromCookie(req);
    if (!usuario_id) return res.status(401).json({ erro: 'Não autenticado' });
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado || Number(chamado.usuario_id) !== Number(usuario_id)) return res.status(403).json({ erro: 'Acesso negado' });
    const msg = db.getDb().prepare('SELECT * FROM mensagens_chamado WHERE id = ? AND chamado_id = ?').get(req.params.msgId, req.params.id);
    if (!msg || !msg.chat_anexo_path) return res.status(404).json({ erro: 'Sem anexo' });
    const filePath = path.join(UPLOADS_DIR, msg.chat_anexo_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ erro: 'Arquivo não encontrado' });
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(msg.chat_anexo_nome_original)}"`);
    return res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
