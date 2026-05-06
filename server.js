require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');
const { initDb, criarAdminMasterSeNecessario, recuperarSenhasPlain, getChamadosComPrazoPendente, registrarAlertaPrazo } = require('./src/db');
const push = require('./src/push');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    if (/\.(js|css|html)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  },
}));

// Rotas da API
app.use('/api/chamados', require('./src/rotas/chamados'));
app.use('/api/usuarios', require('./src/rotas/usuarios'));
app.use('/api/admin/relatorios', require('./src/rotas/relatorios'));
app.use('/api/admin', require('./src/rotas/admins'));

// SPA fallback — serve index.html para rotas não reconhecidas
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ erro: 'Rota não encontrada' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler para erros do multer
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ erro: 'Arquivo muito grande. Máximo 200 MB.' });
  }
  if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ erro: 'Tipo de arquivo não permitido. Use jpg, png, pdf, txt, docx, mp4, mov, webm, avi ou mkv.' });
  }
  console.error(err);
  return res.status(500).json({ erro: 'Erro interno no servidor' });
});

async function checarPrazos() {
  try {
    const agora = new Date();
    const chamados = getChamadosComPrazoPendente();
    for (const c of chamados) {
      const prazo = new Date(c.prazo.replace(' ', 'T') + (c.prazo.includes('T') ? '' : 'Z'));
      const diffH = (prazo - agora) / 3600000;
      if (diffH > 0 && diffH <= 1) {
        if (registrarAlertaPrazo(c.id, '1h')) {
          const msg = `Chamado de ${c.nome} (${c.setor}) vence em menos de 1 hora.`;
          c.admin_responsavel_id
            ? push.enviarParaAdmin(c.admin_responsavel_id, '⏰ Prazo em menos de 1 hora!', msg).catch(() => {})
            : push.enviarParaTodos('⏰ Prazo em menos de 1 hora!', msg).catch(() => {});
        }
      } else if (diffH > 0 && diffH <= 24) {
        if (registrarAlertaPrazo(c.id, '24h')) {
          const msg = `Chamado de ${c.nome} (${c.setor}) vence em menos de 1 dia.`;
          c.admin_responsavel_id
            ? push.enviarParaAdmin(c.admin_responsavel_id, '⚠ Prazo em menos de 1 dia', msg).catch(() => {})
            : push.enviarParaTodos('⚠ Prazo em menos de 1 dia', msg).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error('[Prazo checker]', err);
  }
}

async function main() {
  initDb();
  await criarAdminMasterSeNecessario();
  await recuperarSenhasPlain();
  push.init();
  setInterval(checarPrazos, 10 * 60 * 1000); // a cada 10 minutos
  checarPrazos();
  app.listen(PORT, () => {
    console.log(`Sistema de Chamados TI rodando em http://localhost:${PORT}`);
  });
}

main().catch(err => {
  console.error('Falha ao iniciar:', err);
  process.exit(1);
});
