const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { getDb } = require('../db');

const EXPORT_KEY = process.env.EXPORT_KEY || 'gM3f9xK7vQ2pL8nR4wE6';

function checkKey(req, res, next) {
  if (req.query.key !== EXPORT_KEY) return res.status(403).json({ erro: 'Chave inválida' });
  next();
}

// Exporta o banco SQLite com WAL checkpoint
router.get('/db', checkKey, (req, res) => {
  const db = getDb();
  db.pragma('wal_checkpoint(FULL)');
  const dbPath = path.join(__dirname, '../../data/chamados.db');
  const stat = fs.statSync(dbPath);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="chamados.db"');
  res.setHeader('Content-Length', stat.size);
  fs.createReadStream(dbPath).pipe(res);
});

// Exporta uploads como tar.gz
router.get('/uploads', checkKey, (req, res) => {
  const dataPath = path.join(__dirname, '../../data');
  const uploadsPath = path.join(dataPath, 'uploads');
  if (!fs.existsSync(uploadsPath) || fs.readdirSync(uploadsPath).length === 0) {
    res.setHeader('Content-Length', '0');
    return res.status(204).end();
  }
  res.setHeader('Content-Type', 'application/gzip');
  res.setHeader('Content-Disposition', 'attachment; filename="uploads.tar.gz"');
  const tar = spawn('tar', ['-czf', '-', '-C', dataPath, 'uploads']);
  tar.stdout.pipe(res);
  tar.stderr.on('data', d => console.error('[export-uploads]', d.toString()));
  tar.on('error', err => { console.error('[export-uploads] erro:', err); res.destroy(); });
});

// Importa banco SQLite (roda no Fly.io)
router.post('/import-db', checkKey, express.raw({ type: '*/*', limit: '500mb' }), (req, res) => {
  const dataPath = path.join(__dirname, '../../data');
  const dbPath = path.join(dataPath, 'chamados.db');
  const bakPath = path.join(dataPath, 'chamados.db.bak');
  try {
    if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });
    if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, bakPath);
    fs.writeFileSync(dbPath, req.body);
    console.log(`[import-db] ${req.body.length} bytes gravados — reiniciando em 2s`);
    res.json({ ok: true, bytes: req.body.length });
    setTimeout(() => process.exit(0), 2000);
  } catch (err) {
    console.error('[import-db] erro:', err);
    res.status(500).json({ erro: err.message });
  }
});

// Importa uploads tar.gz (roda no Fly.io)
router.post('/import-uploads', checkKey, express.raw({ type: '*/*', limit: '2gb' }), (req, res) => {
  const dataPath = path.join(__dirname, '../../data');
  const tarPath = path.join(dataPath, '_import.tar.gz');
  try {
    fs.writeFileSync(tarPath, req.body);
    res.json({ ok: true, bytes: req.body.length });
    const tar = spawn('tar', ['-xzf', tarPath, '-C', dataPath]);
    tar.on('close', code => {
      fs.unlinkSync(tarPath);
      console.log(`[import-uploads] extração concluída code=${code}`);
    });
    tar.stderr.on('data', d => console.error('[import-uploads]', d.toString()));
  } catch (err) {
    console.error('[import-uploads] erro:', err);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
