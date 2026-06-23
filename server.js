require('dotenv').config();

// Boot guards: secrets obrigatórios — sem fallback, recusa subir se ausentes
for (const k of ['JWT_SECRET', 'EXPORT_KEY']) {
  if (!process.env[k] || process.env[k].length < 16) {
    console.error(`[FATAL] env ${k} ausente ou fraca. Defina via Fly secrets (mínimo 16 chars).`);
    process.exit(1);
  }
}
// ADMIN_MASTER_PASS é validada em criarAdminMasterSeNecessario (só obrigatória no primeiro boot).

const express = require('express');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const { initDb, initSugestoes, criarAdminMasterSeNecessario, getChamadosComPrazoPendente, registrarAlertaPrazo, buscarUsuarioPorEmail, buscarAdminPorEmail, listarAdmins, listarUsuarios } = require('./src/db');
const jwt = require('jsonwebtoken');
const push = require('./src/push');
const { executarChamadosProgramados } = require('./src/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;
const BUILD_TS = Date.now(); // deploy-test

// uncaughtException: estado possivelmente corrompido — log e reinicia (Fly reinicia).
// unhandledRejection: log apenas (não obrigatório derrubar).
process.on('uncaughtException', err => {
  console.error('[FATAL uncaughtException]', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[WARN unhandledRejection]', reason);
});

// CRÍTICO: NÃO comprimir streams SSE. Brotli/gzip bufferiza eventos até
// o buffer encher, fazendo o chat em tempo real travar (sintoma: SSE
// conecta mas eventos nunca chegam no navegador).
app.use(compression({
  filter: (req, res) => {
    if (req.path.endsWith('/stream') || req.path.startsWith('/api/admin/stream') || req.path.startsWith('/api/usuarios/stream')) {
      return false;
    }
    const ct = res.getHeader('Content-Type');
    if (ct && String(ct).includes('text/event-stream')) return false;
    return compression.filter(req, res);
  },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rotas HTML — devem vir ANTES do express.static para que servirHtmlComVersao
// seja chamada e injete o BUILD_TS nos links de JS/CSS
function servirHtmlComVersao(res, arquivo) {
  const raw = fs.readFileSync(path.join(__dirname, 'public', arquivo), 'utf8');
  const html = raw.replace(/(src|href)="(\/[^"]+\.(js|css))(\?[^"]*)?"([^>]*>)/g,
    (_, attr, url, _ext, _q, rest) => `${attr}="${url}?v=${BUILD_TS}"${rest}`);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(html);
}

app.get('/health',  (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
app.get('/healthz', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.get('/', (req, res) => servirHtmlComVersao(res, 'index.html'));
app.get('/index.html', (req, res) => servirHtmlComVersao(res, 'index.html'));
app.get('/admin-painel.html', (req, res) => servirHtmlComVersao(res, 'admin-painel.html'));
app.get('/admin-usuarios.html', (req, res) => servirHtmlComVersao(res, 'admin-usuarios.html'));
app.get('/admin-relatorios.html', (req, res) => servirHtmlComVersao(res, 'admin-relatorios.html'));
app.get('/admin-itens.html', (req, res) => servirHtmlComVersao(res, 'admin-itens.html'));
app.get('/admin-inventario.html', (req, res) => servirHtmlComVersao(res, 'admin-inventario.html'));
app.get('/admin-estoque.html', (req, res) => servirHtmlComVersao(res, 'admin-estoque.html'));
app.get('/admin-login.html', (req, res) => servirHtmlComVersao(res, 'admin-login.html'));
app.get('/admin-contatos.html', (req, res) => servirHtmlComVersao(res, 'admin-contatos.html'));
app.get('/admin-sugestoes.html', (req, res) => servirHtmlComVersao(res, 'admin-sugestoes.html'));
app.get('/admin-programados.html', (req, res) => servirHtmlComVersao(res, 'admin-programados.html'));
app.get('/admin-servicos.html', (req, res) => servirHtmlComVersao(res, 'admin-servicos.html'));
app.get('/admin-setores.html', (req, res) => servirHtmlComVersao(res, 'admin-setores.html'));
app.get('/sugestao-historico.html', (req, res) => servirHtmlComVersao(res, 'sugestao-historico.html'));
app.get('/redefinir-senha.html', (req, res) => servirHtmlComVersao(res, 'redefinir-senha.html'));
app.get('/mobile', (req, res) => servirHtmlComVersao(res, 'mobile.html'));
app.get('/mobile.html', (req, res) => servirHtmlComVersao(res, 'mobile.html'));

// Arquivos estáticos (JS, CSS, imagens) — html excluído porque as rotas acima já tratam.
// Estrategia de cache:
// - .js/.css: max-age=0, must-revalidate + ETag. Browser sempre revalida com
//   If-None-Match — servidor responde 304 (Not Modified) se o conteudo nao
//   mudou, ou 200 com novo arquivo se mudou. Sem 'immutable' aqui pois os
//   nomes nao tem hash de conteudo — usar immutable causa cache eterno e
//   usuarios ficam presos em versoes antigas mesmo apos deploy.
// - imagens/fonts: 1h.
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  lastModified: true,
  setHeaders(res, filePath) {
    if (/\.(js|css)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    } else if (/\.html$/.test(filePath)) {
      res.setHeader('Cache-Control', 'no-store');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  },
}));

// Rotas da API
app.get('/api/uploads/allowed-types', (_req, res) => {
  const { EXTENSOES_PERMITIDAS, TIPOS_PERMITIDOS } = require('./src/upload');
  res.json({
    extensoes: EXTENSOES_PERMITIDAS,
    mimes: TIPOS_PERMITIDOS,
    accept: ['image/*', 'video/*', ...EXTENSOES_PERMITIDAS].join(','),
    maxFileSizeMB: 200,
    maxFiles: 10,
  });
});
app.use('/api/export', require('./src/rotas/exportar'));
app.use('/api/chamados', require('./src/rotas/chamados'));
app.use('/api/usuarios', require('./src/rotas/usuarios'));
app.use('/api/admin/relatorios', require('./src/rotas/relatorios'));
app.use('/api/admin/itens', require('./src/rotas/itens'));
app.use('/api/admin/inventario', require('./src/rotas/inventario'));
app.use('/api/admin/estoque', require('./src/rotas/estoque'));
app.use('/api/admin/contatos', require('./src/rotas/contatos'));
app.use('/api/sugestoes', require('./src/rotas/sugestoes'));
app.use('/api/servicos', require('./src/rotas/servicos'));
app.use('/api/setores', require('./src/rotas/setores'));
app.use('/api/etiquetas', require('./src/rotas/etiquetas'));
app.use('/api/admin/programados', require('./src/rotas/programados'));
app.use('/api/admin', require('./src/rotas/admins'));
app.use('/api/hub', require('./src/rotas/hub'));

const HUB_URL = process.env.HUB_URL || 'https://hub-granmarquise.fly.dev';

// Retorna o `next` somente se for um path interno seguro (comeca com / e nao //).
// Evita open redirect.
function destinoSeguro(next, fallback) {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) return fallback;
  return next;
}

// Propaga ?theme=dark|light para o destino final do SSO/redirect.
// Sem isso, o tema escolhido no Hub e' descartado e o nav.js do destino
// caia no localStorage local (que pode estar desatualizado).
function _propagaTheme(target, theme) {
  if (theme !== 'dark' && theme !== 'light') return target;
  const sep = target.includes('?') ? '&' : '?';
  return `${target}${sep}theme=${theme}`;
}

app.get('/sso', (req, res) => {
  const { sso_token, next, theme } = req.query;
  if (!sso_token) return res.redirect(HUB_URL + '/?erro=sem_token');

  try {
    const payload = jwt.verify(sso_token, process.env.SSO_SECRET);
    const { email, tipo } = payload;

    if (tipo === 'admin') {
      const admin = buscarAdminPorEmail(email);
      if (!admin || admin.ativo === 0) return res.redirect(HUB_URL + '/?erro=usuario_nao_encontrado');
      const token = jwt.sign(
        { sub: admin.id, is_master: admin.is_master === 1, nome: admin.nome_completo },
        process.env.JWT_SECRET,
        { expiresIn: 30 * 24 * 60 * 60 }
      );
      res.cookie('token', token, { httpOnly: true, sameSite: 'Strict', secure: process.env.NODE_ENV === 'production', maxAge: 30 * 24 * 60 * 60 * 1000 });
      return res.redirect(_propagaTheme(destinoSeguro(next, '/admin-painel.html'), theme));
    }

    const usuario = buscarUsuarioPorEmail(email);
    if (!usuario || usuario.ativo === 0) return res.redirect(HUB_URL + '/?erro=usuario_inativo');
    const token = jwt.sign(
      { sub: usuario.id, nome: usuario.nome, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: 30 * 24 * 60 * 60 }
    );
    res.cookie('token_usuario', token, { httpOnly: true, sameSite: 'Strict', secure: process.env.NODE_ENV === 'production', maxAge: 30 * 24 * 60 * 60 * 1000 });
    return res.redirect(_propagaTheme(destinoSeguro(next, '/'), theme));
  } catch (err) {
    console.error('[SSO] Erro:', err.message);
    return res.redirect(HUB_URL + '/?erro=sso_invalido');
  }
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ erro: 'Rota não encontrada' });
  }
  servirHtmlComVersao(res, 'index.html');
});

// Error handler para erros do multer
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ erro: 'Arquivo muito grande. Máximo 200 MB.' });
  }
  if (err && err.code === 'TIPO_ARQUIVO_INVALIDO') {
    const { MSG_TIPO_INVALIDO } = require('./src/upload');
    return res.status(400).json({ erro: MSG_TIPO_INVALIDO });
  }
  if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ erro: `Campo de upload inválido: recebido "${err.field}".` });
  }
  console.error(err);
  return res.status(500).json({ erro: 'Erro interno no servidor' });
});

async function checarPrazos() {
  try {
    const agora = new Date();
    const chamados = getChamadosComPrazoPendente();
    if (chamados.length === 0) {
      console.log('[Prazo checker] nenhum chamado com prazo pendente');
      return;
    }
    console.log(`[Prazo checker] verificando ${chamados.length} chamado(s)`);
    for (const c of chamados) {
      const prazoIso = c.prazo.includes('T') ? c.prazo : c.prazo.replace(' ', 'T');
      const prazo = new Date(prazoIso.endsWith('Z') ? prazoIso : prazoIso + 'Z');
      const diffMin = (prazo - agora) / 60000;

      let alertou = false;
      if (diffMin > 0 && diffMin <= 10) {
        if (registrarAlertaPrazo(c.id, '10min')) {
          const msg = `Chamado #${c.id} de ${c.nome} (${c.setor}) vence em menos de 10 minutos!`;
          c.admin_responsavel_id
            ? push.enviarParaAdmin(c.admin_responsavel_id, '🚨 Prazo encerrando agora!', msg).catch(() => {})
            : push.enviarParaTodos('🚨 Prazo encerrando agora!', msg).catch(() => {});
          console.log(`[Prazo checker] #${c.id} ALERTA 10min disparado (${Math.round(diffMin)}min restantes)`);
          alertou = true;
        }
      }
      if (diffMin > 10 && diffMin <= 60) {
        if (registrarAlertaPrazo(c.id, '1h')) {
          const msg = `Chamado #${c.id} de ${c.nome} (${c.setor}) vence em menos de 1 hora.`;
          c.admin_responsavel_id
            ? push.enviarParaAdmin(c.admin_responsavel_id, '⏰ Prazo em menos de 1 hora!', msg).catch(() => {})
            : push.enviarParaTodos('⏰ Prazo em menos de 1 hora!', msg).catch(() => {});
          console.log(`[Prazo checker] #${c.id} ALERTA 1h disparado (${Math.round(diffMin)}min restantes)`);
          alertou = true;
        }
      }
      if (diffMin > 60 && diffMin <= 1440) {
        if (registrarAlertaPrazo(c.id, '24h')) {
          const msg = `Chamado #${c.id} de ${c.nome} (${c.setor}) vence em menos de 1 dia.`;
          c.admin_responsavel_id
            ? push.enviarParaAdmin(c.admin_responsavel_id, '⚠ Prazo em menos de 1 dia', msg).catch(() => {})
            : push.enviarParaTodos('⚠ Prazo em menos de 1 dia', msg).catch(() => {});
          console.log(`[Prazo checker] #${c.id} ALERTA 24h disparado (${Math.round(diffMin/60)}h restantes)`);
          alertou = true;
        }
      }
      if (!alertou && diffMin > 0 && diffMin <= 1440) {
        console.log(`[Prazo checker] #${c.id} dentro de janela (${Math.round(diffMin)}min) — alerta já disparado`);
      }
    }
  } catch (err) {
    console.error('[Prazo checker] erro:', err);
  }
}


async function main() {
  initDb();
  initSugestoes();
  await criarAdminMasterSeNecessario();
  push.init();
  setInterval(checarPrazos, 2 * 60 * 1000); // a cada 2 minutos (necessário para capturar a janela de 10min)
  setInterval(executarChamadosProgramados, 60 * 1000); // a cada minuto
  // Heartbeat: prova de vida do cron a cada 5 min nos logs. Se isto sumir,
  // o loop de programados parou e algum chamado deixou de ser gerado.
  setInterval(() => {
    console.log(`[heartbeat] ${new Date().toISOString()} — cron de programados vivo`);
  }, 5 * 60 * 1000);
  checarPrazos();
  executarChamadosProgramados();
  app.listen(PORT, () => {
    console.log(`Sistema de Chamados TI rodando em http://localhost:${PORT}`);
  });
}

main().catch(err => {
  console.error('Falha ao iniciar:', err);
  process.exit(1);
});
