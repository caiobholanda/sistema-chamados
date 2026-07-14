const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });


function sanitizarNome(nome) {
  return nome
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // remove acentos
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 100);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = sanitizarNome(path.basename(file.originalname, ext));
    // id ainda não existe no momento do upload — usamos timestamp
    const nome = `tmp_${Date.now()}__${base}${ext}`;
    cb(null, nome);
  },
});

// Extensões de conteúdo ativo bloqueadas (XSS/execução). SVG é permitido
// pois é servido como attachment em outro ponto do sistema.
const EXTENSOES_BLOQUEADAS = new Set([
  '.html', '.htm', '.xhtml', '.shtml', '.js', '.mjs',
  '.exe', '.bat', '.cmd', '.msi', '.scr', '.vbs', '.ps1', '.php', '.jar',
]);

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (EXTENSOES_BLOQUEADAS.has(ext)) {
    return cb(new Error('Tipo de arquivo não permitido'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter,
});

function renomearAnexoComId(chamadoId, tempPath, nomeOriginal) {
  if (!tempPath) return null;
  const ext = path.extname(nomeOriginal).toLowerCase();
  const base = sanitizarNome(path.basename(nomeOriginal, ext));
  const novoNome = `${chamadoId}__${base}${ext}`;
  const novoCaminho = path.join(UPLOADS_DIR, novoNome);
  fs.renameSync(tempPath, novoCaminho);
  return novoNome;
}

function uploadMiddleware(field) {
  return (req, res, next) => {
    upload.single(field)(req, res, err => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ erro: 'Arquivo muito grande (máx. 200 MB).' });
      if (err.code === 'LIMIT_UNEXPECTED_FILE')
        return res.status(400).json({ erro: `Campo de upload inválido: recebido "${err.field}", esperado "${field}".` });
      if (err.message === 'Tipo de arquivo não permitido')
        return res.status(400).json({ erro: 'Tipo de arquivo não permitido por motivos de segurança.' });
      return res.status(400).json({ erro: 'Erro no upload', detalhe: err.message });
    });
  };
}

// Aceita "anexos" (múltiplos, novo) e "anexo" (único, legado) na mesma request.
function uploadChamadoMiddleware() {
  const handler = upload.fields([
    { name: 'anexos', maxCount: 10 },
    { name: 'anexo',  maxCount: 1 },
  ]);
  return (req, res, next) => {
    handler(req, res, err => {
      if (!err) {
        req.arquivos = [
          ...((req.files && req.files['anexo']) || []),
          ...((req.files && req.files['anexos']) || []),
        ];
        return next();
      }
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ erro: 'Arquivo muito grande (máx. 200 MB por arquivo).' });
      if (err.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ erro: 'Máx. 10 anexos por chamado.' });
      if (err.code === 'LIMIT_UNEXPECTED_FILE')
        return res.status(400).json({ erro: `Campo de upload inválido: recebido "${err.field}", esperado "anexos" ou "anexo".` });
      if (err.message === 'Tipo de arquivo não permitido')
        return res.status(400).json({ erro: 'Tipo de arquivo não permitido por motivos de segurança.' });
      return res.status(400).json({ erro: 'Erro no upload', detalhe: err.message });
    });
  };
}

function renomearAnexoExtra(chamadoId, anexoExtraId, tempPath, nomeOriginal) {
  if (!tempPath) return null;
  const ext = path.extname(nomeOriginal).toLowerCase();
  const base = sanitizarNome(path.basename(nomeOriginal, ext));
  const novoNome = `${chamadoId}_x${anexoExtraId}__${base}${ext}`;
  const novoCaminho = path.join(UPLOADS_DIR, novoNome);
  fs.renameSync(tempPath, novoCaminho);
  return novoNome;
}

module.exports = {
  upload,
  uploadMiddleware,
  uploadChamadoMiddleware,
  renomearAnexoComId,
  renomearAnexoExtra,
  UPLOADS_DIR,
};
