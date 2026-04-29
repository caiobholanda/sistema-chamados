const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../db');
const { upload, renomearAnexoComId, UPLOADS_DIR } = require('../upload');

const STATUS_VALIDOS = ['aberto', 'em_andamento', 'concluido', 'encerrado'];
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

// POST /api/chamados — abrir chamado
router.post('/', upload.single('anexo'), (req, res) => {
  try {
    let { nome, setor, ramal, descricao } = req.body;
    nome = sanitizarTexto(nome);
    setor = sanitizarTexto(setor);
    ramal = (ramal || '').trim();
    descricao = sanitizarTexto(descricao);

    const erros = [];
    if (!nome || nome.length < 2 || nome.length > 80) erros.push('Nome deve ter 2–80 caracteres');
    if (!setor || setor.length < 2 || setor.length > 60) erros.push('Setor deve ter 2–60 caracteres');
    if (!/^\d{4}$/.test(ramal)) erros.push('Ramal deve ter exatamente 4 dígitos');
    if (!descricao || descricao.length < 10 || descricao.length > 2000) erros.push('Descrição deve ter 10–2000 caracteres');

    if (erros.length > 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ erro: erros.join('; ') });
    }

    let anexo_path = null;
    let anexo_nome_original = null;

    const id = db.inserirChamado({ nome, setor, ramal, descricao, anexo_path: null, anexo_nome_original: null });

    if (req.file) {
      const novoNome = renomearAnexoComId(id, req.file.path, req.file.originalname);
      anexo_path = novoNome;
      anexo_nome_original = req.file.originalname;
      db.getDb().prepare('UPDATE chamados SET anexo_path = ?, anexo_nome_original = ? WHERE id = ?')
        .run(novoNome, anexo_nome_original, id);
    }

    return res.status(201).json({ id, mensagem: 'Chamado aberto com sucesso' });
  } catch (err) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno ao abrir chamado' });
  }
});

// GET /api/chamados/:id — consultar (público)
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

// POST /api/chamados/:id/avaliar
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

// GET /api/chamados/:id/anexo — download do anexo
router.get('/:id/anexo', (req, res) => {
  try {
    const chamado = db.buscarChamadoPorId(req.params.id);
    if (!chamado || !chamado.anexo_path) return res.status(404).json({ erro: 'Anexo não encontrado' });
    const filePath = path.join(UPLOADS_DIR, chamado.anexo_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ erro: 'Arquivo não encontrado no servidor' });
    res.download(filePath, chamado.anexo_nome_original || chamado.anexo_path);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
