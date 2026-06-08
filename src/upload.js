const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const TIPOS_PERMITIDOS = [
  'image/jpeg', 'image/png',
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/x-ms-wmv',
];
const EXTENSOES_PERMITIDAS = ['.jpg', '.jpeg', '.png', '.pdf', '.txt', '.log', '.docx', '.mp4', '.webm', '.mov', '.avi', '.mkv', '.wmv'];

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

function fileFilter(_req, file, cb) {
  const mimeOk = TIPOS_PERMITIDOS.includes(file.mimetype)
    || file.mimetype.startsWith('video/')
    || file.mimetype.startsWith('image/');
  if (!mimeOk) {
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Tipo de arquivo não permitido'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
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
      return res.status(400).json({ erro: 'Tipo de arquivo não permitido. São aceitos: imagens, vídeos, PDF, TXT e DOCX.' });
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
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE')
        return res.status(400).json({ erro: 'Limite ou tipo de arquivo inválido. Máx. 10 anexos por chamado.' });
      return res.status(400).json({ erro: 'Tipo de arquivo não permitido. São aceitos: imagens, vídeos, PDF, TXT e DOCX.' });
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

module.exports = { upload, uploadMiddleware, uploadChamadoMiddleware, renomearAnexoComId, renomearAnexoExtra, UPLOADS_DIR };
