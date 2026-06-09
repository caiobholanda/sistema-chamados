require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const { initDb, initSugestoes, criarAdminMasterSeNecessario, recuperarSenhasPlain, getChamadosComPrazoPendente, registrarAlertaPrazo, buscarUsuarioPorEmail, buscarAdminPorEmail, listarAdmins, listarUsuarios } = require('./src/db');
const jwt = require('jsonwebtoken');
const push = require('./src/push');
const { executarChamadosProgramados } = require('./src/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;
const BUILD_TS = Date.now(); // deploy-test

// Prevent process crash on unhandled errors
process.on('uncaughtException', err => {
  console.error('[FATAL uncaughtException]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[WARN unhandledRejection]', reason);
});

app.use(compression());
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

app.get('/health', (req, res) => res.json({ ok: true }));

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

// Arquivos estáticos (JS, CSS, imagens) — html excluído porque as rotas acima já tratam
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders(res, filePath) {
    if (/\.(js|css)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  },
}));

// Rotas da API
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

app.get('/api/hub/usuarios', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || token !== process.env.SSO_SECRET) return res.status(403).json({ erro: 'Acesso negado' });
  const admins = listarAdmins().filter(a => a.ativo && !a.is_test).map(a => ({ email: a.email, nome: a.nome_completo, setor: 'TI', tipo: 'admin' }));
  const usuarios = listarUsuarios().filter(u => u.ativo).map(u => ({ email: u.email, nome: u.nome, setor: u.setor || '', tipo: 'usuario' }));
  return res.json({ ok: true, users: [...admins, ...usuarios] });
});

app.get('/sso', (req, res) => {
  const { sso_token } = req.query;
  if (!sso_token) return res.redirect('/?erro=sem_token');

  try {
    const payload = jwt.verify(sso_token, process.env.SSO_SECRET);
    const { email, tipo } = payload;

    if (tipo === 'admin') {
      const admin = buscarAdminPorEmail(email);
      if (!admin || admin.ativo === 0) return res.redirect('/admin-login.html?erro=usuario_nao_encontrado');
      const token = jwt.sign(
        { sub: admin.id, is_master: admin.is_master === 1, nome: admin.nome_completo },
        process.env.JWT_SECRET,
        { expiresIn: 30 * 24 * 60 * 60 }
      );
      res.cookie('token', token, { httpOnly: true, sameSite: 'Strict', maxAge: 30 * 24 * 60 * 60 * 1000 });
      return res.redirect('/admin-painel.html');
    }

    const usuario = buscarUsuarioPorEmail(email);
    if (!usuario || usuario.ativo === 0) return res.redirect('/?erro=usuario_inativo');
    const token = jwt.sign(
      { sub: usuario.id, nome: usuario.nome, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: 30 * 24 * 60 * 60 }
    );
    res.cookie('token_usuario', token, { httpOnly: true, sameSite: 'Strict', maxAge: 30 * 24 * 60 * 60 * 1000 });
    return res.redirect('/');
  } catch (err) {
    console.error('[SSO] Erro:', err.message);
    return res.redirect('/?erro=sso_invalido');
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
  await recuperarSenhasPlain();
  push.init();
  setInterval(checarPrazos, 2 * 60 * 1000); // a cada 2 minutos (necessário para capturar a janela de 10min)
  setInterval(executarChamadosProgramados, 60 * 1000); // a cada minuto
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
