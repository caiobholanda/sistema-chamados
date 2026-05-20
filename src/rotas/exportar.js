const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');
const { getDb } = require('../db');

const EXPORT_KEY = process.env.EXPORT_KEY || 'gM3f9xK7vQ2pL8nR4wE6';
const RAILWAY_URL = 'https://web-production-83b4ae.up.railway.app';

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

// Importa banco SQLite — streaming para disco, sem bufferar na RAM
router.post('/import-db', checkKey, (req, res) => {
  const dataPath = path.join(__dirname, '../../data');
  const dbPath = path.join(dataPath, 'chamados.db');
  const tmpPath = dbPath + '.tmp';
  const bakPath = dbPath + '.bak';
  if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });
  const writeStream = fs.createWriteStream(tmpPath);
  req.pipe(writeStream);
  writeStream.on('finish', () => {
    try {
      if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, bakPath);
      fs.renameSync(tmpPath, dbPath);
      const size = fs.statSync(dbPath).size;
      console.log(`[import-db] ${size} bytes gravados — reiniciando em 2s`);
      res.json({ ok: true, bytes: size });
      setTimeout(() => process.exit(0), 2000);
    } catch (err) {
      console.error('[import-db] erro:', err);
      res.status(500).json({ erro: err.message });
    }
  });
  writeStream.on('error', err => {
    console.error('[import-db] write error:', err);
    res.status(500).json({ erro: err.message });
  });
});

// Importa uploads — streaming para disco, sem bufferar na RAM
router.post('/import-uploads', checkKey, (req, res) => {
  const dataPath = path.join(__dirname, '../../data');
  const tarPath = path.join(dataPath, '_import.tar.gz');
  const writeStream = fs.createWriteStream(tarPath);
  req.pipe(writeStream);
  writeStream.on('finish', () => {
    res.json({ ok: true });
    const tar = spawn('tar', ['-xzf', tarPath, '-C', dataPath]);
    tar.on('close', code => {
      try { fs.unlinkSync(tarPath); } catch {}
      console.log(`[import-uploads] extração concluída code=${code}`);
    });
    tar.stderr.on('data', d => console.error('[import-uploads]', d.toString()));
  });
  writeStream.on('error', err => {
    console.error('[import-uploads] write error:', err);
    if (!res.headersSent) res.status(500).json({ erro: err.message });
  });
});

// Fly.io baixa uploads DIRETAMENTE do Railway (servidor a servidor)
router.post('/puxar-uploads', checkKey, (req, res) => {
  const dataPath = path.join(__dirname, '../../data');
  const tarPath = path.join(dataPath, '_import.tar.gz');
  const srcUrl = `${RAILWAY_URL}/api/export/uploads?key=${EXPORT_KEY}`;
  console.log('[puxar-uploads] Baixando do Railway...');
  res.json({ ok: true, msg: 'Download iniciado em background' });
  const file = fs.createWriteStream(tarPath);
  https.get(srcUrl, dlRes => {
    dlRes.pipe(file);
    let received = 0;
    dlRes.on('data', chunk => {
      received += chunk.length;
      if (received % (10 * 1024 * 1024) < chunk.length) {
        console.log(`[puxar-uploads] ${Math.round(received / 1048576)} MB`);
      }
    });
    file.on('finish', () => {
      file.close();
      console.log(`[puxar-uploads] Download concluído: ${Math.round(received / 1048576)} MB — extraindo...`);
      const tar = spawn('tar', ['-xzf', tarPath, '-C', dataPath]);
      tar.on('close', code => {
        try { fs.unlinkSync(tarPath); } catch {}
        console.log(`[puxar-uploads] Extração concluída code=${code}`);
      });
      tar.stderr.on('data', d => console.error('[puxar-uploads]', d.toString()));
    });
  }).on('error', err => {
    console.error('[puxar-uploads] erro:', err.message);
    try { fs.unlinkSync(tarPath); } catch {}
  });
});

module.exports = router;
