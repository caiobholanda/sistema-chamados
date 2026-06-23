const app = document.getElementById('mob-app');
let adminInfo = null;
let _chatMobIv = null;

// ── Busca/filtro client-side da lista ─────────────────────────
let buscaTexto = '';
let _chamadosCache = [];
let _carregando = false;
const _etiquetaNome = {};        // slug → nome (para busca por etiqueta)
let _etiquetasPromise = null;

// ── Push Notifications ────────────────────────────────────────
let _swReg = null;
let _lastSubscribeTs = 0;

function urlBase64ToUint8Array(b64) {
  const padding = '='.repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function iniciarPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    await navigator.serviceWorker.register('/sw.js');
    _swReg = await navigator.serviceWorker.ready;
    if (Notification.permission === 'granted') await _subscribePush();
    atualizarBotaoPush();
    setInterval(() => {
      if (Notification.permission === 'granted') _subscribePush();
    }, 5 * 60 * 1000);
  } catch (err) {
    console.warn('[Push] SW registro falhou:', err);
  }
}

async function _subscribePush(force = false) {
  if (!_swReg) return false;
  const now = Date.now();
  if (!force && now - _lastSubscribeTs < 30000) return false;
  _lastSubscribeTs = now;
  try {
    const r = await fetch('/api/admin/push/vapid-public-key');
    if (!r.ok) return false;
    const { publicKey } = await r.json();
    const appKey = urlBase64ToUint8Array(publicKey);
    let sub = await _swReg.pushManager.getSubscription();
    if (sub) {
      try {
        const subKey = new Uint8Array(sub.options.applicationServerKey);
        const keysMismatch = appKey.some((b, i) => b !== subKey[i]);
        if (keysMismatch || force) { await sub.unsubscribe(); sub = null; }
      } catch { await sub.unsubscribe(); sub = null; }
    }
    if (!sub) sub = await _swReg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey });
    const saveResp = await fetch('/api/admin/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...sub.toJSON(), is_mobile: true }),
    });
    return saveResp.ok;
  } catch (err) {
    console.warn('[Push] _subscribePush falhou:', err.message || err);
    return false;
  }
}

const _isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const _isStandalone = window.navigator.standalone === true;

function atualizarBotaoPush() {
  const btn = document.getElementById('mob-btn-push');
  const icon = document.getElementById('mob-btn-push-icon');
  if (!btn || !icon) return;

  // Remove listeners antigos (clonando o elemento)
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  const newIcon = newBtn.querySelector('#mob-btn-push-icon');

  // iOS Safari em modo navegador (não PWA instalado): sino apagado, abre instruções
  if (_isIOS && !_isStandalone) {
    newIcon.setAttribute('stroke', 'rgba(255,255,255,.4)');
    newBtn.title = 'Como ativar notificações';
    newBtn.addEventListener('click', mostrarBannerIOS);
    return;
  }

  // Sem suporte a push: esconde
  if (!('PushManager' in window)) { newBtn.style.display = 'none'; return; }

  // Notificações ativas: sino verde, toque revalida
  if (Notification.permission === 'granted') {
    newIcon.setAttribute('stroke', '#22c55e');
    newIcon.setAttribute('fill', 'rgba(34,197,94,.15)');
    newBtn.title = 'Notificações ativas (toque para revalidar)';
    newBtn.addEventListener('click', async () => {
      const ok = await _subscribePush(true);
      if (ok) mostrarToastMob('✅ Inscrição revalidada', 'Subscription atualizada no servidor.');
      else mostrarToastMob('⚠ Falha ao revalidar', 'Tente novamente ou desinstale e reinstale o app.');
    });
    return;
  }

  // Suporta push mas não ativou: sino apagado, toque ativa
  newIcon.setAttribute('stroke', 'rgba(255,255,255,.5)');
  newBtn.title = 'Ativar notificações';
  newBtn.addEventListener('click', async () => {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      await _subscribePush(true);
      mostrarToastMob('✅ Notificações ativadas!', 'Você receberá alertas de novos chamados e prazos.');
    }
    atualizarBotaoPush();
  });
}

function mostrarToastMob(titulo, corpo) {
  let container = document.getElementById('mob-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'mob-toast-container';
    container.style.cssText = 'position:fixed;top:1rem;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:.5rem;width:calc(100% - 2rem);max-width:400px;pointer-events:none';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.style.cssText = 'background:var(--navy,#1a2340);color:#fff;padding:.8rem 1rem;border-radius:10px;font-size:.85rem;box-shadow:0 4px 16px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:.15rem;pointer-events:auto';
  el.innerHTML = `<strong style="font-size:.9rem">${titulo}</strong><span style="opacity:.85;line-height:1.4">${corpo}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 5500);
}

function mostrarBannerIOS() {
  if (document.getElementById('ios-install-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'ios-install-banner';
  banner.style.cssText = `
    position:fixed;bottom:0;left:0;right:0;z-index:9999;
    background:#1a2340;color:#fff;padding:1.2rem 1rem 1.4rem;
    border-radius:16px 16px 0 0;box-shadow:0 -4px 24px rgba(0,0,0,.4);
    font-size:.88rem;line-height:1.5;
  `;
  banner.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.8rem">
      <strong style="font-size:1rem">🔔 Ativar notificações no iPhone</strong>
      <button onclick="this.closest('#ios-install-banner').remove()"
        style="background:none;border:none;color:#fff;font-size:1.3rem;cursor:pointer;padding:.1rem .3rem;opacity:.7">✕</button>
    </div>
    <p style="margin:0 0 .9rem;opacity:.9">No Safari, notificações só funcionam quando o app está instalado na tela inicial. Siga os passos:</p>
    <div style="display:flex;flex-direction:column;gap:.55rem">
      <div style="display:flex;align-items:center;gap:.7rem">
        <span style="background:rgba(255,255,255,.15);border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">1</span>
        <span>Toque no botão <strong>Compartilhar</strong> <span style="font-size:1.1rem">⬆</span> na barra inferior do Safari</span>
      </div>
      <div style="display:flex;align-items:center;gap:.7rem">
        <span style="background:rgba(255,255,255,.15);border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">2</span>
        <span>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></span>
      </div>
      <div style="display:flex;align-items:center;gap:.7rem">
        <span style="background:rgba(255,255,255,.15);border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">3</span>
        <span>Toque em <strong>"Adicionar"</strong> e abra o app pelo ícone na tela inicial</span>
      </div>
      <div style="display:flex;align-items:center;gap:.7rem">
        <span style="background:rgba(255,255,255,.15);border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">4</span>
        <span>Dentro do app instalado, toque em 🔔 e permita as notificações</span>
      </div>
    </div>
  `;
  document.body.appendChild(banner);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'notif') {
      mostrarToastMob(event.data.title || 'Chamados TI', event.data.body || '');
    }
  });
}

// Re-valida subscription quando o admin foca/volta para o app
// (cobre cenário de Chrome Memory Saver suspender a aba e voltar)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && Notification.permission === 'granted') _subscribePush();
});
window.addEventListener('focus', () => {
  if (Notification.permission === 'granted') _subscribePush();
});
window.addEventListener('online', () => {
  if (Notification.permission === 'granted') _subscribePush();
});

const STATUS_LABELS = { aberto: 'Aberto', em_andamento: 'Em andamento', aguardando_compra: 'Ag. compra', aguardando_chegar: 'Ag. chegar', concluido: 'Concluído', encerrado: 'Encerrado' };
const PRIO_LABELS   = { urgente: 'Urgente', alta: 'Alta', media: 'Média', baixa: 'Baixa' };

function fmtData(d) {
  if (!d) return '—';
  const iso = d.includes('T') ? d : d.replace(' ', 'T');
  return new Date(iso.endsWith('Z') ? iso : iso + 'Z')
    .toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' });
}

function fmtPrazo(prazo) {
  if (!prazo) return '';
  const iso = prazo.includes('T') ? prazo : prazo.replace(' ', 'T');
  const dt = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  const agora = new Date();
  const diffMin = (dt - agora) / 60000;

  const dataFmt = dt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' });

  let cor, icone, label;
  if (diffMin < 0) {
    cor = '#dc2626'; icone = '⚠'; label = 'Vencido';
  } else if (diffMin <= 10) {
    cor = '#dc2626'; icone = '🚨'; label = 'Vence em ' + Math.ceil(diffMin) + 'min';
  } else if (diffMin <= 60) {
    cor = '#ea580c'; icone = '⏰'; label = 'Vence em ' + Math.ceil(diffMin) + 'min';
  } else if (diffMin <= 1440) {
    const h = Math.ceil(diffMin / 60);
    cor = '#d97706'; icone = '⚠'; label = 'Vence em ' + h + 'h';
  } else {
    cor = '#16a34a'; icone = '📅'; label = dataFmt;
  }

  return `<div style="display:flex;align-items:center;gap:.3rem;margin-top:.35rem;font-size:.75rem;color:${cor};font-weight:600">
    <span>${icone}</span><span>Prazo: ${label}</span>
  </div>`;
}

async function api(url, opts = {}) {
  const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (r.status === 401) { renderLogin(); throw new Error('401'); }
  return r;
}

// ── Init ──────────────────────────────────────────────────────
(async () => {
  try {
    const r = await fetch('/api/admin/me');
    if (r.ok) { adminInfo = await r.json(); _carregarEtiquetasMapa(); renderLista(); iniciarPush(); }
    else renderLogin();
  } catch { renderLogin(); }
})();

// ── Login ─────────────────────────────────────────────────────
// Mobile do admin tem login proprio (email + senha do banco local de admins).
// Nao redireciona pro Hub: este e' o entry point standalone do PWA mobile do
// TI. Aceita qualquer admin ativo no banco (master ou nao); 401 redesenha
// esta tela quando o cookie expira ou e' invalido.
function renderLogin() {
  adminInfo = null;
  app.innerHTML = `
    <div class="mob-login">
      <img src="https://letsimage.s3.amazonaws.com/editor/granmarquise/imgs/1760033174793-hotelgranmarquise_pos_footer.png"
           alt="Gran Marquise" class="mob-login-logo">
      <div class="mob-login-title">Suporte de TI</div>
      <div class="mob-login-sub">Conclusão de chamados</div>
      <div id="mob-msg-login"></div>
      <form id="mob-form-login" novalidate>
        <div class="mob-field">
          <label class="mob-label">E-mail</label>
          <input class="mob-input" type="email" id="mob-email"
                 placeholder="seu@granmarquise.com.br" autocomplete="email" required>
        </div>
        <div class="mob-field">
          <label class="mob-label">Senha</label>
          <input class="mob-input" type="password" id="mob-senha"
                 autocomplete="current-password" required placeholder="••••••••">
        </div>
        <button class="mob-btn mob-btn-primary" type="submit" id="mob-btn-entrar">Entrar</button>
      </form>
      <div style="text-align:center;margin-top:.75rem">
        <button type="button" id="mob-btn-esqueci"
          style="background:none;border:none;padding:0;font-size:.82rem;color:var(--text-muted);cursor:pointer;text-decoration:underline">
          Esqueci minha senha
        </button>
      </div>
      <div id="mob-esqueci-wrap" style="display:none;margin-top:1rem">
        <div id="mob-msg-esqueci"></div>
        <form id="mob-form-esqueci" novalidate>
          <div class="mob-field">
            <label class="mob-label">Seu e-mail</label>
            <input class="mob-input" type="email" id="mob-email-esqueci"
                   placeholder="seu@granmarquise.com.br" autocomplete="email">
          </div>
          <button class="mob-btn mob-btn-primary" type="submit" id="mob-btn-enviar-esqueci">Enviar instruções</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById('mob-btn-esqueci').addEventListener('click', () => {
    const wrap = document.getElementById('mob-esqueci-wrap');
    wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
    if (wrap.style.display === 'block') {
      const emailPrincipal = document.getElementById('mob-email');
      const emailEsqueci = document.getElementById('mob-email-esqueci');
      if (emailPrincipal && emailEsqueci && emailPrincipal.value) {
        emailEsqueci.value = emailPrincipal.value;
      }
    }
  });

  document.getElementById('mob-form-esqueci').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('mob-msg-esqueci');
    const btn = document.getElementById('mob-btn-enviar-esqueci');
    const email = document.getElementById('mob-email-esqueci').value.trim();
    btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      const r = await fetch('/api/usuarios/esqueci-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      if (r.ok) {
        msg.innerHTML = '<div class="mob-alert mob-alert-success">' + d.mensagem + '</div>'
          + '<button type="button" id="mob-btn-reenviar"'
          + ' style="background:none;border:none;cursor:pointer;font-size:.82rem;color:var(--text-muted);text-decoration:underline;padding:0;margin-top:.4rem;display:block">'
          + 'Não recebeu? Reenviar link</button>';
        document.getElementById('mob-form-esqueci').style.display = 'none';
        document.getElementById('mob-btn-reenviar').addEventListener('click', () => {
          msg.innerHTML = '';
          document.getElementById('mob-email-esqueci').value = '';
          btn.disabled = false; btn.textContent = 'Enviar instruções';
          document.getElementById('mob-form-esqueci').style.display = '';
        });
      } else {
        msg.innerHTML = '<div class="mob-alert mob-alert-danger">' + (d.erro || 'Erro ao processar.') + '</div>';
      }
    } catch {
      msg.innerHTML = '<div class="mob-alert mob-alert-danger">Erro de conexão.</div>';
    }
    btn.disabled = false; btn.textContent = 'Enviar instruções';
  });

  document.getElementById('mob-form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('mob-msg-login');
    const btn = document.getElementById('mob-btn-entrar');
    const email = document.getElementById('mob-email').value.trim();
    const senha = document.getElementById('mob-senha').value;
    btn.disabled = true; btn.textContent = 'Entrando…';
    try {
      // Tenta login como admin
      const rA = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
      if (rA.ok) {
        adminInfo = await (await fetch('/api/admin/me')).json();
        _carregarEtiquetasMapa();
        renderLista();
        iniciarPush();
        return;
      }

      // Se não for admin, tenta login como usuário comum e redireciona para o portal
      const rU = await fetch('/api/usuarios/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
      if (rU.ok) {
        msg.innerHTML = '<div class="mob-alert mob-alert-success">Login realizado! Redirecionando…</div>';
        setTimeout(() => { window.location.href = '/'; }, 700);
        return;
      }

      const dU = await rU.json().catch(() => ({}));
      msg.innerHTML = `<div class="mob-alert mob-alert-danger">${dU.erro || 'E-mail ou senha inválidos.'}</div>`;
    } catch { msg.innerHTML = '<div class="mob-alert mob-alert-danger">Erro de conexão.</div>'; }
    finally { btn.disabled = false; btn.textContent = 'Entrar'; }
  });
}

// ── Lista de chamados ─────────────────────────────────────────
let filtroAtivo = 'meus';

async function renderLista() {
  app.innerHTML = `
    <div class="mob-header">
      <div class="mob-header-info">
        <div class="mob-header-title">Chamados em aberto</div>
        ${adminInfo ? `<div class="mob-header-sub">${adminInfo.nome_completo}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:.5rem;flex-shrink:0">
        <button id="mob-btn-push" title="Notificações" aria-label="Notificações"
          style="background:none;border:none;padding:.25rem;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1">
          <svg id="mob-btn-push-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
        <button id="mob-btn-novo-chamado"
          style="background:var(--gold);color:var(--navy);border:none;border-radius:4px;padding:.35rem .65rem;font-size:.78rem;font-weight:700;cursor:pointer;white-space:nowrap">
          + Abrir
        </button>
      </div>
    </div>
    <div class="mob-busca-wrap">
      <svg class="mob-busca-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input id="mob-busca-input" class="mob-busca-input" type="text" inputmode="search"
             placeholder="Buscar nº, usuário, responsável, etiqueta…" autocomplete="off" enterkeyhint="search">
      <button type="button" id="mob-busca-clear" class="mob-busca-clear" aria-label="Limpar busca" style="display:none">✕</button>
    </div>
    <div class="mob-filtro-bar">
      <button class="mob-filtro-btn ${filtroAtivo === 'meus' ? 'ativo' : ''}" data-filtro="meus">Meus chamados</button>
      <button class="mob-filtro-btn ${filtroAtivo === 'todos' ? 'ativo' : ''}" data-filtro="todos">Todos</button>
    </div>
    <div id="mob-lista" class="mob-lista"><div class="mob-loading">Carregando…</div></div>
  `;

  atualizarBotaoPush();

  document.querySelectorAll('.mob-filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filtroAtivo = btn.dataset.filtro;
      document.querySelectorAll('.mob-filtro-btn').forEach(b => b.classList.toggle('ativo', b.dataset.filtro === filtroAtivo));
      carregarChamados();
    });
  });

  document.getElementById('mob-btn-novo-chamado').addEventListener('click', abrirFormNovoChamado);

  // Busca client-side (instantânea, sem nova requisição)
  const buscaInput = document.getElementById('mob-busca-input');
  const buscaClear = document.getElementById('mob-busca-clear');
  buscaInput.value = buscaTexto;
  buscaClear.style.display = buscaTexto ? 'block' : 'none';
  buscaInput.addEventListener('input', () => {
    buscaTexto = buscaInput.value;
    buscaClear.style.display = buscaTexto ? 'block' : 'none';
    renderCards();
  });
  buscaClear.addEventListener('click', () => {
    buscaTexto = '';
    buscaInput.value = '';
    buscaClear.style.display = 'none';
    renderCards();
    buscaInput.focus();
  });
  // Carrega nomes das etiquetas para busca; re-filtra ao concluir se houver busca ativa
  _carregarEtiquetasMapa().then(() => { if (buscaTexto.trim()) renderCards(); });

  carregarChamados();
}

async function abrirFormNovoChamado() {
  const overlay = document.createElement('div');
  overlay.id = 'mob-novo-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.5);display:flex;align-items:flex-end';

  overlay.innerHTML = `
    <div style="background:var(--card,#fff);width:100%;border-radius:16px 16px 0 0;max-height:92vh;overflow-y:auto;padding:1.25rem 1rem 2rem">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
        <div style="font-size:1rem;font-weight:700;color:var(--navy)">Abrir chamado</div>
        <button id="mob-novo-fechar" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:var(--text-muted);padding:.1rem .3rem;line-height:1">&#x2715;</button>
      </div>
      <div id="mob-novo-msg"></div>
      <form id="mob-novo-form" novalidate>

        ${adminInfo && adminInfo.is_master ? `
        <div class="mob-field">
          <label class="mob-label">Direcionar para usu&aacute;rio <span style="color:var(--text-muted);font-size:.78rem">(opcional)</span></label>
          <div style="position:relative">
            <input class="mob-input" type="text" id="mob-nc-usuario-busca" placeholder="Buscar por nome ou setor&hellip;" autocomplete="off">
            <div id="mob-nc-usuario-resultados" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:200;background:var(--card,#fff);border:1px solid var(--border);border-radius:var(--radius);max-height:180px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,.12)"></div>
          </div>
          <div id="mob-nc-usuario-selecionado" style="display:none;font-size:.8rem;margin-top:.3rem;padding:.3rem .6rem;background:var(--surface-2);border-radius:var(--radius)"></div>
          <input type="hidden" id="mob-nc-usuario-id">
        </div>` : '<input type="hidden" id="mob-nc-usuario-id">'}

        <div class="mob-field">
          <label class="mob-label">Servi&ccedil;o <span style="color:var(--text-muted);font-size:.78rem">(opcional &mdash; IA escolhe se vazio)</span></label>
          <select class="mob-input" id="mob-nc-categoria">
            <option value="">Classificar automaticamente</option>
          </select>
        </div>

        <div class="mob-field">
          <label class="mob-label">Atribuir para admin <span style="color:var(--text-muted);font-size:.78rem">(opcional)</span></label>
          <select class="mob-input" id="mob-nc-admin">
            <option value="">Assumir eu mesmo</option>
          </select>
        </div>

        <div class="mob-field">
          <label class="mob-label">Descri&ccedil;&atilde;o do problema <span style="color:#dc2626">*</span></label>
          <textarea class="mob-input mob-textarea" id="mob-nc-descricao" placeholder="Descreva o problema&hellip;" maxlength="2000" rows="5"></textarea>
        </div>

        <div class="mob-field">
          <label class="mob-label">Anexos <span style="color:var(--text-muted);font-size:.78rem">(opcional)</span></label>
          <input type="file" id="mob-nc-anexos" accept="image/*,video/*,.pdf,.txt,.log,.docx,.doc,.xlsx,.xls,.csv,.pptx,.ppt,.zip,.rar,.7z" style="display:none" multiple>
          <button type="button" id="mob-nc-btn-anexo" style="display:flex;align-items:center;gap:.5rem;background:var(--bg,#F7F3ED);border:1.5px dashed var(--border,#E5DDD0);border-radius:8px;padding:.65rem .9rem;width:100%;cursor:pointer;font-size:.83rem;color:var(--text-muted)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Selecionar arquivos&hellip;
          </button>
          <div id="mob-nc-tiles" style="display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.4rem"></div>
        </div>

        <button class="mob-btn mob-btn-primary" type="submit" id="mob-novo-submit" style="margin-top:.5rem">Abrir chamado</button>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('mob-novo-fechar').addEventListener('click', () => overlay.remove());

  // Carregar serviços/etiquetas dinamicamente
  try {
    const etiquetas = await fetch('/api/etiquetas', { credentials: 'include' }).then(r => r.ok ? r.json() : []);
    const sel = document.getElementById('mob-nc-categoria');
    const pais = etiquetas.filter(e => !e.parent_slug);
    const filhos = etiquetas.filter(e => e.parent_slug);
    for (const p of pais) {
      sel.appendChild(new Option(p.nome, p.slug));
      filhos.filter(f => f.parent_slug === p.slug).forEach(f => sel.appendChild(new Option('  └ ' + f.nome, f.slug)));
    }
    filhos.filter(f => !pais.find(p => p.slug === f.parent_slug)).forEach(f => sel.appendChild(new Option(f.nome, f.slug)));
  } catch {}

  // Carregar admins
  try {
    const r = await api('/api/admin/colegas');
    if (r.ok) {
      const admins = await r.json();
      const sel = document.getElementById('mob-nc-admin');
      admins.filter(a => !adminInfo || String(a.id) !== String(adminInfo.id))
            .forEach(a => sel.appendChild(new Option(a.nome_completo, a.id)));
    }
  } catch {}

  // Busca de usuários (só master)
  const buscaEl = document.getElementById('mob-nc-usuario-busca');
  if (buscaEl) {
    let _usuarios = null;
    try {
      const r = await api('/api/admin/portal-usuarios');
      if (r.ok) _usuarios = (await r.json()).filter(u => u.ativo);
    } catch {}

    buscaEl.addEventListener('input', () => {
      const f = buscaEl.value.toLowerCase();
      const res = document.getElementById('mob-nc-usuario-resultados');
      const sel = document.getElementById('mob-nc-usuario-selecionado');
      document.getElementById('mob-nc-usuario-id').value = '';
      sel.style.display = 'none';
      if (!f || !_usuarios) { res.style.display = 'none'; return; }
      const filtrados = _usuarios.filter(u =>
        u.nome.toLowerCase().includes(f) ||
        (u.setor && u.setor.toLowerCase().includes(f)) ||
        (u.email && u.email.toLowerCase().includes(f)));
      res.innerHTML = filtrados.length
        ? filtrados.map(u => `<div class="mob-nc-user-item" data-id="${u.id}" data-nome="${u.nome.replace(/"/g,'&quot;')}" data-setor="${(u.setor||'').replace(/"/g,'&quot;')}" style="padding:.4rem .7rem;cursor:pointer;font-size:.82rem;border-bottom:1px solid var(--border)">${u.nome}${u.setor ? ' · <span style="color:var(--text-muted)">' + u.setor + '</span>' : ''}</div>`).join('')
        : '<div style="padding:.4rem .7rem;font-size:.8rem;color:var(--text-muted)">Nenhum resultado</div>';
      res.style.display = 'block';
      res.querySelectorAll('.mob-nc-user-item').forEach(el => {
        el.addEventListener('click', () => {
          document.getElementById('mob-nc-usuario-id').value = el.dataset.id;
          buscaEl.value = el.dataset.nome;
          sel.textContent = '✓ ' + el.dataset.nome + (el.dataset.setor ? ' · ' + el.dataset.setor : '');
          sel.style.display = 'block';
          res.style.display = 'none';
        });
      });
    });
  }

  // Gerenciar anexos múltiplos
  let _arquivos = [];
  const inputAnexos = document.getElementById('mob-nc-anexos');
  document.getElementById('mob-nc-btn-anexo').addEventListener('click', () => inputAnexos.click());
  inputAnexos.addEventListener('change', () => {
    for (const f of inputAnexos.files) {
      if (_arquivos.length < 10 && !_arquivos.find(x => x.name === f.name && x.size === f.size)) _arquivos.push(f);
    }
    inputAnexos.value = '';
    _renderTilesNc();
  });
  function _renderTilesNc() {
    const box = document.getElementById('mob-nc-tiles');
    box.innerHTML = _arquivos.map((f, i) =>
      `<div style="display:inline-flex;align-items:center;gap:.3rem;background:var(--surface-2);border:1px solid var(--border);border-radius:4px;padding:.2rem .5rem;font-size:.75rem;max-width:200px">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.name}</span>
        <button type="button" data-idx="${i}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:.85rem;padding:0;flex-shrink:0;line-height:1">✕</button>
      </div>`).join('');
    box.querySelectorAll('button[data-idx]').forEach(btn => {
      btn.addEventListener('click', () => { _arquivos.splice(+btn.dataset.idx, 1); _renderTilesNc(); });
    });
  }

  // Submit
  document.getElementById('mob-novo-form').addEventListener('submit', async e => {
    e.preventDefault();
    const msg = document.getElementById('mob-novo-msg');
    const btn = document.getElementById('mob-novo-submit');
    const descricao = document.getElementById('mob-nc-descricao').value.trim();
    const categoria = document.getElementById('mob-nc-categoria').value;
    const adminId = document.getElementById('mob-nc-admin').value;
    const usuarioId = document.getElementById('mob-nc-usuario-id').value;

    msg.innerHTML = '';
    if (!descricao || descricao.length < 5) {
      msg.innerHTML = '<div class="mob-alert mob-alert-danger">Descrição obrigatória (mín. 5 caracteres).</div>';
      document.getElementById('mob-nc-descricao').focus();
      return;
    }
    btn.disabled = true; btn.textContent = 'Abrindo…';
    try {
      const fd = new FormData();
      fd.append('descricao', descricao);
      if (categoria) fd.append('categoria', categoria);
      if (adminId) fd.append('admin_responsavel_id', adminId);
      if (usuarioId) fd.append('usuario_id', usuarioId);
      _arquivos.forEach(f => fd.append('anexos', f, f.name));
      const r = await fetch('/api/admin/chamados', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) { msg.innerHTML = `<div class="mob-alert mob-alert-danger">${d.erro}</div>`; return; }
      overlay.remove();
      mostrarToastMob('✅ Chamado aberto!', d.mensagem || `#${d.id}`);
      carregarChamados();
    } catch {
      msg.innerHTML = '<div class="mob-alert mob-alert-danger">Erro de conexão. Tente novamente.</div>';
    } finally {
      if (btn.isConnected) { btn.disabled = false; btn.textContent = 'Abrir chamado'; }
    }
  });
}

async function carregarChamados() {
  const lista = document.getElementById('mob-lista');
  if (lista) lista.innerHTML = '<div class="mob-loading">Carregando…</div>';
  _carregando = true;
  try {
    const params = new URLSearchParams({ status: 'aberto,em_andamento,aguardando_compra,aguardando_chegar' });
    if (filtroAtivo === 'meus' && adminInfo) params.set('admin_id', adminInfo.id);
    const r = await api('/api/admin/chamados?' + params);
    if (!r.ok) { _carregando = false; return; }
    _chamadosCache = await r.json();
    _carregando = false;
    renderCards();
  } catch { _carregando = false; }
}

// Mapa slug→nome das etiquetas, carregado uma vez (para permitir busca por etiqueta)
function _carregarEtiquetasMapa() {
  if (!_etiquetasPromise) {
    _etiquetasPromise = fetch('/api/etiquetas', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(ets => { (ets || []).forEach(e => { if (e && e.slug) _etiquetaNome[e.slug] = e.nome; }); })
      .catch(() => {});
  }
  return _etiquetasPromise;
}

// Normaliza para busca: minúsculas + remove acentos
function _normBusca(s) {
  return (s == null ? '' : String(s)).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Texto pesquisável de um chamado (todos os campos relevantes da lista)
function _haystackChamado(c) {
  return _normBusca([
    c.id, '#' + c.id,                          // número do chamado (com e sem #)
    c.nome,                                     // usuário (criador / transferido para)
    c.admin_nome,                               // admin responsável
    c.aberto_por_admin_nome,                    // admin que abriu
    c.setor, c.usuario_setor,
    c.ramal, c.usuario_ramal,
    c.descricao,                                // características do problema
    c.servico_nome,
    _etiquetaNome[c.categoria] || c.categoria,  // etiqueta (nome ou slug)
    STATUS_LABELS[c.status],
    PRIO_LABELS[c.prioridade],
  ].filter(v => v != null && v !== '').join(' '));
}

// Aplica a busca textual (todos os termos precisam casar — AND)
function _filtrarChamados(lista) {
  const q = _normBusca(buscaTexto).trim();
  if (!q) return lista;
  const termos = q.split(/\s+/).filter(Boolean);
  return lista.filter(c => {
    const hay = _haystackChamado(c);
    return termos.every(t => hay.includes(t));
  });
}

function renderCards() {
  const lista = document.getElementById('mob-lista');
  if (!lista) return;
  const filtrados = _filtrarChamados(_chamadosCache);

  if (!filtrados.length) {
    if (_carregando && !_chamadosCache.length) {
      lista.innerHTML = '<div class="mob-loading">Carregando…</div>';
      return;
    }
    lista.innerHTML = _chamadosCache.length
      ? '<div class="mob-empty">Nenhum chamado corresponde à busca.</div>'
      : '<div class="mob-empty">Nenhum chamado em aberto no momento.</div>';
    return;
  }

  lista.innerHTML = filtrados.map(c => `
    <div class="mob-card" data-id="${c.id}">
      <div class="mob-card-head">
        <span style="font-family:monospace;font-size:.72rem;font-weight:700;color:var(--text-muted);background:rgba(0,0,0,.06);padding:.12rem .35rem;border-radius:4px">#${c.id}</span>
        <span class="badge badge-${c.status}">${STATUS_LABELS[c.status]}</span>
        ${c.prioridade ? `<span class="badge badge-${c.prioridade}">${PRIO_LABELS[c.prioridade]}</span>` : ''}
        <span class="mob-card-data">${fmtData(c.criado_em)}</span>
      </div>
      <div class="mob-card-nome">${c.nome}</div>
      <div class="mob-card-setor">${c.usuario_setor || c.setor}</div>
      <div class="mob-card-desc">${c.descricao.length > 120 ? c.descricao.slice(0, 120) + '…' : c.descricao}</div>
      ${c.admin_nome ? `<div class="mob-card-resp">Responsável: ${c.admin_nome}</div>` : ''}
      ${fmtPrazo(c.prazo)}
    </div>
  `).join('');

  lista.querySelectorAll('.mob-card').forEach(el => {
    el.addEventListener('click', async () => {
      try {
        const r = await api(`/api/admin/chamados/${el.dataset.id}`);
        if (r.ok) renderDetalhe(await r.json());
      } catch {}
    });
  });
}


// ── Wizard de estoque (mobile) ────────────────────────────────
const MOB_WIZ_CATS = ['mouse','teclado','monitor','nobreak'];

function mobWizHtml(cat, itens) {
  const state = {};

  function filtrar(termos) {
    if (!termos.length) return itens;
    const ts = termos.map(t => t.toLowerCase());
    return itens.filter(i => ts.some(t => (i.nome || '').toLowerCase().includes(t)));
  }

  function opts(termos) {
    const lista = filtrar(termos);
    if (!lista.length) return '<option value="">Sem itens no estoque</option>';
    return '<option value="">— selecione —</option>' +
      lista.map(i => {
        const q = i.qtd_geral ?? 0;
        return `<option value="${i.id}">${i.nome} (${q}${q === 0 ? ' ⚠' : ''})`;
      }).join('');
  }

  function sel(key, label, termos = []) {
    return `<div class="mob-wiz-sel-wrap">
      <div class="mob-wiz-sel-label">${label}</div>
      <select class="mob-input" id="mwiz-sel-${key}" style="margin-bottom:.4rem">${opts(termos)}</select>
      <div style="display:flex;align-items:center;gap:.5rem">
        <span style="font-size:.8rem;color:var(--text-muted)">Quantidade:</span>
        <input class="mob-input" id="mwiz-qtd-${key}" type="number" min="1" value="1" style="width:72px">
      </div>
    </div>`;
  }

  function bloco(id, texto, sub = '') {
    return `<div class="mob-wiz-bloco" id="mwiz-bloco-${id}">
      <div class="mob-wiz-pergunta">${texto}</div>
      <div class="mob-wiz-btns">
        <button type="button" class="mob-wiz-sim" data-q="${id}">Sim</button>
        <button type="button" class="mob-wiz-nao" data-q="${id}">Não</button>
      </div>
      ${sub ? `<div id="mwiz-sub-${id}" style="display:none;margin-top:.6rem">${sub}</div>` : ''}
    </div>`;
  }

  const configs = {
    mouse: `
      ${bloco('troca_mouse', 'Um mouse novo foi instalado?', `
        ${bloco('saida_mouse', 'Esse mouse saiu do estoque?', sel('saida_mouse', 'Mouse instalado:', ['mouse']))}
        ${bloco('entrada_mouse', 'O mouse retirado vai entrar no estoque?', sel('entrada_mouse', 'Mouse devolvido:', ['mouse']))}
      `)}
    `,
    teclado: `
      ${bloco('troca_teclado', 'Um teclado novo foi instalado?', `
        ${bloco('saida_teclado', 'Esse teclado saiu do estoque?', sel('saida_teclado', 'Teclado instalado:', ['teclado']))}
        ${bloco('entrada_teclado', 'O teclado retirado vai entrar no estoque?', sel('entrada_teclado', 'Teclado devolvido:', ['teclado']))}
      `)}
    `,
    monitor: `
      ${bloco('troca_monitor', 'Um monitor novo foi instalado?', `
        ${bloco('saida_monitor', 'Esse monitor saiu do estoque?', sel('saida_monitor', 'Monitor instalado:', ['monitor']))}
        ${bloco('entrada_monitor', 'O monitor retirado vai entrar no estoque?', sel('entrada_monitor', 'Monitor devolvido:', ['monitor']))}
      `)}
      ${bloco('troca_cabo', 'Um cabo ou adaptador de vídeo foi utilizado?', `
        ${bloco('saida_cabo', 'Esse cabo/adaptador saiu do estoque?', sel('saida_cabo', 'Item utilizado:', ['cabo','adaptador','hdmi','displayport']))}
      `)}
    `,
    nobreak: `
      ${bloco('troca_nobreak', 'Um nobreak novo foi instalado?', `
        ${bloco('saida_nobreak', 'Esse nobreak saiu do estoque?', sel('saida_nobreak', 'Nobreak instalado:', ['nobreak']))}
        ${bloco('entrada_nobreak', 'O nobreak retirado vai entrar no estoque como usado?',
          `<div style="font-size:.8rem;color:var(--text-muted);margin-top:.3rem">O nobreak antigo será registrado automaticamente como <strong>usado</strong> no estoque.</div>`)}
      `)}
    `,
  };

  return configs[cat] || '';
}

function mobWizColetarMovs(chamadoId) {
  const SAIDAS   = ['saida_mouse','saida_teclado','saida_monitor','saida_cabo','saida_nobreak','saida_bateria'];
  const ENTRADAS = ['entrada_mouse','entrada_teclado','entrada_monitor'];
  const movs = [];
  [...SAIDAS.map(k => [k,'saida']), ...ENTRADAS.map(k => [k,'entrada'])].forEach(([key, tipo]) => {
    const sim = document.querySelector(`.mob-wiz-sim[data-q="${key}"]`);
    if (!sim || !sim.classList.contains('ativo')) return;
    const sel = document.getElementById('mwiz-sel-' + key);
    const qtd = document.getElementById('mwiz-qtd-' + key);
    if (!sel || !sel.value) return;
    movs.push({ itemId: +sel.value, tipo, cor: 'geral', qtd: Math.max(1, +(qtd?.value || 1)), chamadoId });
  });
  // nobreak antigo retornando: mesmo item da saída, registra como usado
  const entNb = document.querySelector('.mob-wiz-sim[data-q="entrada_nobreak"]');
  if (entNb && entNb.classList.contains('ativo')) {
    const saidaSel = document.getElementById('mwiz-sel-saida_nobreak');
    if (saidaSel && saidaSel.value) {
      movs.push({ itemId: +saidaSel.value, tipo: 'entrada', cor: 'usado', qtd: 1, chamadoId });
    }
  }
  return movs;
}

// ── Detalhe + Conclusão ───────────────────────────────────────
async function renderDetalhe(c) {
  const temWiz = MOB_WIZ_CATS.includes(c.categoria);
  let todosItens = [];
  if (temWiz) {
    try {
      const r = await api('/api/admin/estoque/itens');
      if (r.ok) todosItens = await r.json();
    } catch {}
  }

  const podeChat = ['aberto','em_andamento','aguardando_compra','aguardando_chegar'].includes(c.status);

  app.innerHTML = `
    <div class="mob-header">
      <button class="mob-voltar-btn" id="mob-voltar">← Voltar</button>
    </div>

    <div class="mob-detalhe">
      <div style="font-family:monospace;font-size:.78rem;font-weight:700;color:var(--text-muted);margin-bottom:.3rem">Chamado #${c.id}</div>
      <div class="mob-detalhe-nome">${c.nome}</div>
      <div class="mob-detalhe-setor">${c.usuario_setor || c.setor} · Ramal ${c.usuario_ramal || c.ramal}</div>
      <div class="mob-detalhe-desc">${c.descricao}</div>
      <div id="mob-infos-adicionais-lista">
        ${(c.infos_adicionais || []).map(info => `
          <div class="mob-info-adicional">
            <div class="mob-info-adicional-meta"><strong>${info.autor_nome}</strong> &mdash; ${fmtData(info.criado_em)}</div>
            <div class="mob-info-adicional-texto">${info.texto}</div>
          </div>
        `).join('')}
      </div>
      <div id="mob-info-form" style="display:none;margin-top:.5rem">
        <textarea class="mob-input mob-textarea" id="mob-info-nova" rows="4" maxlength="2000" placeholder="Nova informação…" style="margin-bottom:.4rem"></textarea>
        <div style="display:flex;gap:.5rem">
          <button type="button" class="mob-btn mob-btn-primary mob-btn-sm" id="mob-info-salvar">Salvar</button>
          <button type="button" class="mob-btn mob-btn-ghost mob-btn-sm" id="mob-info-cancelar">Cancelar</button>
        </div>
      </div>
      <button type="button" class="mob-btn mob-btn-ghost mob-btn-sm" id="mob-info-editar-btn" style="margin-top:.4rem;font-size:.78rem">+ Nova informação</button>

      <div class="mob-fotos-section">
        <div class="mob-fotos-head">Fotos e Anexos</div>
        ${c.anexo_nome_original ? `<div class="mob-fotos-grid" style="margin-bottom:.4rem">${_isImgAnexo(c.anexo_nome_original) ? `<div class="mob-foto-thumb-wrap"><img src="/api/chamados/${c.id}/anexo" class="mob-foto-thumb lbx-img" loading="lazy" alt="${c.anexo_nome_original}"><a href="/api/chamados/${c.id}/anexo" download class="mob-foto-dl" title="Baixar">⬇</a></div>` : `<a href="/api/chamados/${c.id}/anexo" download class="mob-btn mob-btn-ghost mob-btn-sm" style="font-size:.75rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%">⬇ ${c.anexo_nome_original}</a>`}</div>` : ''}
        <div id="mob-fotos-grid" class="mob-fotos-grid"><span style="font-size:.78rem;color:var(--text-muted)">Carregando…</span></div>
        <div style="display:flex;align-items:center;gap:.5rem;margin-top:.6rem">
          <label class="mob-btn mob-btn-ghost mob-btn-sm" style="cursor:pointer;flex-shrink:0;margin:0">
            + Anexar
            <input type="file" id="mob-input-foto" accept="image/*,video/*,.pdf,.txt,.log,.docx,.doc,.xlsx,.xls,.csv,.pptx,.ppt,.zip,.rar,.7z" style="display:none" multiple>
          </label>
          <div id="mob-fotos-msg" style="font-size:.78rem;color:var(--text-muted)"></div>
        </div>
      </div>

      ${podeChat ? `
      <div class="mob-chat-section" id="mob-chat-section">
        <div class="mob-chat-head">
          <span class="mob-chat-dot"></span>
          Chat com o solicitante
        </div>
        <div class="mob-chat-msgs" id="mob-chat-msgs">
          <div class="mob-chat-vazio">Carregando mensagens…</div>
        </div>
        <div id="mob-chat-file-chip" style="display:none;font-size:.75rem;color:var(--text-secondary);padding:.2rem .6rem .1rem;align-items:center;gap:.35rem">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          <span id="mob-chat-file-name" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span>
          <button type="button" id="mob-btn-chat-file-clear" style="background:none;border:none;cursor:pointer;padding:0;font-size:.9rem;color:var(--text-muted)" title="Remover">✕</button>
        </div>
        <form class="mob-chat-form" id="mob-chat-form" autocomplete="off">
          <input type="file" id="mob-chat-file" style="display:none" accept="image/*,video/*,.pdf,.txt,.log,.docx,.doc,.xlsx,.xls,.csv,.pptx,.ppt,.zip,.rar,.7z">
          <button type="button" id="mob-btn-chat-anexo" class="mob-chat-send-btn" aria-label="Anexar arquivo" style="background:var(--surface-2);color:var(--text-secondary)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <input class="mob-chat-input" id="mob-chat-input" type="text" placeholder="Digite uma mensagem…" maxlength="1000" autocomplete="off">
          <button class="mob-chat-send-btn" type="submit" aria-label="Enviar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </div>
      ` : `<div class="mob-chat-encerrado">Chat indisponível — chamado encerrado.</div>`}

      <div id="mob-msg-concluir"></div>

      <div class="mob-field" style="margin-top:1.5rem">
        <label class="mob-label">Solução aplicada <span class="req">*</span></label>
        <textarea class="mob-input mob-textarea" id="mob-solucao"
                  placeholder="Descreva o que foi feito…" maxlength="2000" rows="5"></textarea>
        <button type="button" class="mob-ok-btn" id="mob-ok-solucao">Ok</button>
      </div>

      ${temWiz ? `
      <div class="mob-wiz-section">
        <div class="mob-wiz-titulo">Movimentação de Estoque</div>
        <div class="mob-wiz-sub">Responda para registrar entradas e saídas de itens.</div>
        ${mobWizHtml(c.categoria, todosItens)}
      </div>` : ''}

      <div class="mob-assin-section">
        <div class="mob-assin-titulo">
          Assinatura do solicitante
          <span class="mob-assin-opcional">(opcional)</span>
        </div>
        <div class="mob-assin-instrucao">O solicitante pode assinar abaixo para confirmar que o problema foi resolvido.</div>
        <div class="mob-canvas-wrap" id="mob-canvas-wrap">
          <canvas id="mob-canvas" class="mob-canvas"></canvas>
        </div>
        <button class="mob-btn mob-btn-ghost mob-btn-sm" id="mob-limpar">Limpar assinatura</button>
      </div>

      <div class="mob-admin-anexo-section">
        <div class="mob-assin-titulo">Anexo do suporte <span class="mob-assin-opcional">(opcional)</span></div>
        ${c.admin_anexo_nome_original ? `
        <div style="display:flex;align-items:flex-start;gap:.5rem;margin-bottom:.5rem;flex-wrap:wrap">
          ${_isImgAnexo(c.admin_anexo_nome_original)
            ? `<div class="anexo-preview-wrap" style="flex:1"><img class="lbx-img anexo-preview-img" src="/api/admin/chamados/${c.id}/admin-anexo" alt="${c.admin_anexo_nome_original}"><a href="/api/admin/chamados/${c.id}/admin-anexo" download class="anexo-preview-dl">⬇ baixar</a></div>`
            : `<a href="/api/admin/chamados/${c.id}/admin-anexo" class="mob-btn mob-btn-ghost mob-btn-sm" download style="flex:1;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">⬇ ${c.admin_anexo_nome_original}</a>`
          }
          <button class="mob-btn mob-btn-ghost mob-btn-sm" id="mob-btn-remover-admin-anexo" style="flex-shrink:0">✕</button>
        </div>` : ''}
        <div style="display:flex;align-items:center;gap:.5rem">
          <input type="file" id="mob-input-admin-anexo" accept="image/*,video/*,.pdf,.txt,.log,.docx,.doc,.xlsx,.xls,.csv,.pptx,.ppt,.zip,.rar,.7z" style="flex:1;font-size:.8rem">
          <button class="mob-btn mob-btn-ghost mob-btn-sm" id="mob-btn-enviar-admin-anexo" style="flex-shrink:0">Enviar</button>
        </div>
        <div id="mob-msg-admin-anexo" style="font-size:.78rem;margin-top:.25rem"></div>
      </div>

      <button class="mob-btn mob-btn-success" id="mob-btn-concluir">Concluir chamado</button>
    </div>
  `;

  document.getElementById('mob-voltar').addEventListener('click', () => {
    clearInterval(_chatMobIv);
    _chatMobIv = null;
    renderLista();
  });
  document.getElementById('mob-ok-solucao').addEventListener('click', () => {
    document.getElementById('mob-solucao').blur();
  });

  document.getElementById('mob-info-editar-btn').addEventListener('click', () => {
    document.getElementById('mob-info-form').style.display = 'block';
    document.getElementById('mob-info-editar-btn').style.display = 'none';
    const ta = document.getElementById('mob-info-nova');
    ta.value = '';
    ta.focus();
  });
  document.getElementById('mob-info-cancelar').addEventListener('click', () => {
    document.getElementById('mob-info-form').style.display = 'none';
    document.getElementById('mob-info-editar-btn').style.display = '';
  });
  document.getElementById('mob-info-salvar').addEventListener('click', async () => {
    const texto = document.getElementById('mob-info-nova').value.trim();
    if (texto.length < 3) { alert('Texto muito curto (mín. 3 caracteres)'); return; }
    const btn = document.getElementById('mob-info-salvar');
    btn.disabled = true;
    btn.textContent = '…';
    try {
      const r = await fetch(`/api/admin/chamados/${c.id}/info-adicional`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto })
      });
      const d = await r.json();
      if (r.ok) {
        const resp = await api(`/api/admin/chamados/${c.id}`);
        if (resp.ok) { renderDetalhe(await resp.json()); return; }
      } else {
        alert(d.erro || 'Erro ao salvar');
      }
    } catch { alert('Erro de rede'); }
    btn.disabled = false;
    btn.textContent = 'Salvar';
  });

  _carregarFotosMob(c.id);
  document.getElementById('mob-input-foto').addEventListener('change', async function() {
    if (!this.files.length) return;
    const msgEl = document.getElementById('mob-fotos-msg');
    const grid = document.getElementById('mob-fotos-grid');
    msgEl.textContent = 'Enviando…';
    const fd = new FormData();
    for (const f of this.files) fd.append('anexos', f);
    try {
      const r = await fetch(`/api/admin/chamados/${c.id}/anexos`, { method: 'POST', body: fd });
      const d = await r.json();
      if (r.ok) {
        msgEl.textContent = 'Enviado!';
        await _carregarFotosMob(c.id);
        setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 2000);
      } else {
        msgEl.textContent = d.erro || 'Erro ao enviar.';
      }
    } catch { msgEl.textContent = 'Erro de conexão.'; }
    this.value = '';
  });

  document.getElementById('mob-btn-enviar-admin-anexo').addEventListener('click', async () => {
    const input = document.getElementById('mob-input-admin-anexo');
    const msgEl = document.getElementById('mob-msg-admin-anexo');
    if (!input.files.length) { msgEl.textContent = 'Selecione um arquivo.'; return; }
    const btn = document.getElementById('mob-btn-enviar-admin-anexo');
    btn.disabled = true;
    btn.textContent = '…';
    const fd = new FormData();
    fd.append('admin_anexo', input.files[0]);
    try {
      const r = await fetch(`/api/admin/chamados/${c.id}/admin-anexo`, { method: 'POST', body: fd });
      const d = await r.json();
      if (r.ok) {
        const resp = await api(`/api/admin/chamados/${c.id}`);
        if (resp.ok) renderDetalhe(await resp.json());
      } else {
        msgEl.textContent = d.erro || 'Erro ao enviar.';
        btn.disabled = false;
        btn.textContent = 'Enviar';
      }
    } catch {
      msgEl.textContent = 'Erro de conexão.';
      btn.disabled = false;
      btn.textContent = 'Enviar';
    }
  });

  const btnRemoverMobAnexo = document.getElementById('mob-btn-remover-admin-anexo');
  if (btnRemoverMobAnexo) {
    btnRemoverMobAnexo.addEventListener('click', async () => {
      if (!confirm('Remover o anexo?')) return;
      const r = await api(`/api/admin/chamados/${c.id}/admin-anexo`, { method: 'DELETE' });
      if (r.ok) {
        const resp = await api(`/api/admin/chamados/${c.id}`);
        if (resp.ok) renderDetalhe(await resp.json());
      }
    });
  }

  // Chat em tempo real
  if (podeChat) {
    _atualizarChatMob(c.id);
    clearInterval(_chatMobIv);
    _chatMobIv = setInterval(() => _atualizarChatMob(c.id), 8000);

    const mobChatFile = document.getElementById('mob-chat-file');
    const mobChatChip = document.getElementById('mob-chat-file-chip');
    const mobChatFileName = document.getElementById('mob-chat-file-name');
    const mobChatInput = document.getElementById('mob-chat-input');
    let selectedFile = null;

    function setFile(file) { selectedFile = file; mobChatFileName.textContent = file.name; mobChatChip.style.display = 'flex'; }
    function clearFile() { selectedFile = null; mobChatFile.value = ''; mobChatChip.style.display = 'none'; }

    document.getElementById('mob-btn-chat-anexo').addEventListener('click', () => mobChatFile.click());
    mobChatFile.addEventListener('change', () => { if (mobChatFile.files.length) setFile(mobChatFile.files[0]); else clearFile(); });
    document.getElementById('mob-btn-chat-file-clear').addEventListener('click', clearFile);

    // Colar do clipboard
    mobChatInput.addEventListener('paste', (e) => {
      const item = Array.from(e.clipboardData?.items || []).find(i => i.kind === 'file');
      if (item) { e.preventDefault(); const f = item.getAsFile(); if (f) setFile(f); }
    });

    // Arrastar e soltar
    const dropZone = document.getElementById('mob-chat-section');
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('chat-drop-active'); });
    dropZone.addEventListener('dragleave', (e) => { if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('chat-drop-active'); });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('chat-drop-active');
      const f = e.dataTransfer.files[0];
      if (f) { setFile(f); mobChatInput.focus(); }
    });

    let _chatSending = false;
    const mobChatSendBtn = document.querySelector('#mob-chat-form [type="submit"]');
    document.getElementById('mob-chat-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (_chatSending) return;
      const texto = mobChatInput.value.trim();
      if (!texto && !selectedFile) return;
      _chatSending = true;
      mobChatInput.disabled = true;
      if (mobChatSendBtn) mobChatSendBtn.disabled = true;
      const btnHtml = mobChatSendBtn ? mobChatSendBtn.innerHTML : '';
      try {
        let ok = false, erroMsg = '';
        if (selectedFile) {
          const fd = new FormData();
          if (texto) fd.append('mensagem', texto);
          fd.append('chat_anexo', selectedFile, selectedFile.name || 'imagem.png');
          if (mobChatSendBtn) mobChatSendBtn.textContent = '0%';
          await new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `/api/admin/chamados/${c.id}/mensagens`);
            xhr.withCredentials = true;
            xhr.upload.onprogress = ev => {
              if (ev.lengthComputable && mobChatSendBtn)
                mobChatSendBtn.textContent = Math.round(ev.loaded / ev.total * 100) + '%';
            };
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) { ok = true; }
              else { try { erroMsg = JSON.parse(xhr.responseText).erro || 'Erro ao enviar.'; } catch { erroMsg = 'Erro ao enviar.'; } }
              resolve();
            };
            xhr.onerror = () => { erroMsg = 'Erro de conexão.'; resolve(); };
            xhr.send(fd);
          });
        } else {
          const r = await api(`/api/admin/chamados/${c.id}/mensagens`, { method: 'POST', body: JSON.stringify({ mensagem: texto }) });
          ok = r.ok;
          if (!ok) { const d = await r.json().catch(() => ({})); erroMsg = d.erro || 'Erro ao enviar.'; }
        }
        if (ok) {
          mobChatInput.value = '';
          clearFile();
          await _atualizarChatMob(c.id);
        } else {
          alert(erroMsg || 'Erro ao enviar. Verifique o tipo e tamanho (máx. 200 MB).');
        }
      } catch (err) { console.error(err); alert('Erro de conexão. Tente novamente.'); }
      finally {
        _chatSending = false;
        mobChatInput.disabled = false;
        if (mobChatSendBtn) { mobChatSendBtn.disabled = false; mobChatSendBtn.innerHTML = btnHtml; }
        mobChatInput.focus();
      }
    });
  }

  // Wizard Sim/Não
  if (temWiz) {
    app.querySelectorAll('.mob-wiz-sim').forEach(btn => {
      btn.addEventListener('click', () => {
        const q = btn.dataset.q;
        btn.classList.add('ativo');
        const nao = app.querySelector(`.mob-wiz-nao[data-q="${q}"]`);
        if (nao) nao.classList.remove('ativo');
        const sub = document.getElementById('mwiz-sub-' + q);
        if (sub) sub.style.display = '';
      });
    });
    app.querySelectorAll('.mob-wiz-nao').forEach(btn => {
      btn.addEventListener('click', () => {
        const q = btn.dataset.q;
        btn.classList.add('ativo');
        const sim = app.querySelector(`.mob-wiz-sim[data-q="${q}"]`);
        if (sim) sim.classList.remove('ativo');
        const sub = document.getElementById('mwiz-sub-' + q);
        if (sub) sub.style.display = 'none';
      });
    });
  }

  // Canvas
  const canvas = document.getElementById('mob-canvas');
  const ctx = canvas.getContext('2d');
  const wrap = document.getElementById('mob-canvas-wrap');
  canvas.width = wrap.clientWidth || 340;
  canvas.height = 200;
  ctx.strokeStyle = '#1C1C1C';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let desenhando = false;
  let temTraco = false;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (canvas.width / rect.width),
      y: (src.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    desenhando = true; temTraco = true;
    canvas.setPointerCapture(e.pointerId);
    const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
  });
  canvas.addEventListener('pointermove', (e) => {
    e.preventDefault();
    if (!desenhando) return;
    const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke();
  });
  canvas.addEventListener('pointerup', () => { desenhando = false; ctx.beginPath(); });
  canvas.addEventListener('pointercancel', () => { desenhando = false; ctx.beginPath(); });

  document.getElementById('mob-limpar').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    temTraco = false;
  });

  document.getElementById('mob-btn-concluir').addEventListener('click', async () => {
    const solucao = document.getElementById('mob-solucao').value.trim();
    const msg = document.getElementById('mob-msg-concluir');
    if (!solucao || solucao.length < 5) {
      msg.innerHTML = '<div class="mob-alert mob-alert-danger">Informe a solução aplicada (mínimo 5 caracteres).</div>';
      document.getElementById('mob-solucao').focus();
      return;
    }
    const btn = document.getElementById('mob-btn-concluir');
    btn.disabled = true; btn.textContent = 'Registrando…';
    try {
      // Registrar movimentações de estoque
      if (temWiz) {
        const movs = mobWizColetarMovs(c.id);
        for (const m of movs) {
          const r = await api(`/api/admin/estoque/itens/${m.itemId}/movimentacao`, {
            method: 'POST',
            body: JSON.stringify({ tipo: m.tipo, cor: m.cor || 'geral', quantidade: m.qtd, observacao: `${c.nome} — Chamado #${c.id}`, chamado_id: m.chamadoId }),
          });
          if (!r.ok) {
            const d = await r.json();
            if (btn.isConnected) {
              msg.innerHTML = `<div class="mob-alert mob-alert-danger">Erro no estoque: ${d.erro}</div>`;
              btn.disabled = false; btn.textContent = 'Concluir chamado';
            } else {
              mostrarToastMob('⚠ Erro no estoque', d.erro || 'Não foi possível registrar a movimentação.');
            }
            return;
          }
        }
      }
      const r = await api(`/api/admin/chamados/${c.id}/concluir`, {
        method: 'PATCH',
        body: JSON.stringify({
          solucao,
          assinatura: temTraco ? canvas.toDataURL('image/png') : null,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        if (btn.isConnected) msg.innerHTML = `<div class="mob-alert mob-alert-danger">${d.erro}</div>`;
        else mostrarToastMob('⚠ Chamado não concluído', d.erro || 'Tente novamente.');
        return;
      }
      renderSucesso(c);
    } catch {
      if (btn.isConnected) {
        msg.innerHTML = '<div class="mob-alert mob-alert-danger">Erro de conexão. Tente novamente.</div>';
      } else {
        // Sessão expirou durante a operação — renderLogin() já substituiu a tela
        mostrarToastMob('⚠ Conclusão NÃO registrada', 'Sua sessão expirou. Refaça o login e conclua o chamado novamente.');
      }
    }
    finally { if (btn.isConnected) { btn.disabled = false; btn.textContent = 'Concluir chamado'; } }
  });
}

// ── Lightbox ──────────────────────────────────────────────────
let _lbxEl = null;
function _abrirLightbox(src, nome) {
  if (!_lbxEl) {
    _lbxEl = document.createElement('div');
    _lbxEl.id = 'lbx';
    _lbxEl.innerHTML = '<button id="lbx-close" aria-label="Fechar">✕</button><img id="lbx-img" alt=""><div id="lbx-nome"></div>';
    document.body.appendChild(_lbxEl);
    _lbxEl.addEventListener('click', e => {
      if (e.target === _lbxEl || e.target.id === 'lbx-close' || e.target.id === 'lbx-img') _lbxEl.classList.remove('lbx-open');
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && _lbxEl) _lbxEl.classList.remove('lbx-open');
    });
  }
  _lbxEl.querySelector('#lbx-img').src = src;
  _lbxEl.querySelector('#lbx-nome').textContent = nome || '';
  _lbxEl.classList.add('lbx-open');
}
document.addEventListener('click', e => {
  const img = e.target.closest('.lbx-img');
  if (img) { e.preventDefault(); _abrirLightbox(img.src, img.alt); }
});

const _IMGS_EXT = ['jpg','jpeg','png','gif','webp','bmp','svg','heic','avif'];
function _isImgAnexo(nome) { return _IMGS_EXT.includes((nome || '').split('.').pop().toLowerCase()); }

async function _carregarFotosMob(chamadoId) {
  const grid = document.getElementById('mob-fotos-grid');
  if (!grid) return;
  try {
    const r = await fetch(`/api/chamados/${chamadoId}/anexos`);
    const lista = r.ok ? await r.json() : [];
    if (!lista.length) { grid.innerHTML = '<span style="font-size:.78rem;color:var(--text-muted)">Nenhum anexo ainda.</span>'; return; }
    grid.innerHTML = lista.map(a => {
      const url = `/api/chamados/${chamadoId}/anexos/${a.id}`;
      if (_isImgAnexo(a.nome_original)) {
        return `<div class="mob-foto-thumb-wrap"><img src="${url}" class="mob-foto-thumb lbx-img" alt="${a.nome_original}" loading="lazy"><a href="${url}" download class="mob-foto-dl" title="Baixar">⬇</a></div>`;
      }
      return `<a href="${url}" download class="mob-btn mob-btn-ghost mob-btn-sm" style="font-size:.75rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%">⬇ ${a.nome_original}</a>`;
    }).join('');
  } catch { grid.innerHTML = '<span style="font-size:.78rem;color:var(--text-muted)">Erro ao carregar.</span>'; }
}

// ── Chat mobile ───────────────────────────────────────────────
function _renderMsgMob(m, chamadoId) {
  const isAdmin = m.autor_tipo === 'admin';
  const iso = m.criado_em.includes('T') ? m.criado_em : m.criado_em.replace(' ', 'T');
  const hora = new Date(iso.endsWith('Z') ? iso : iso + 'Z')
    .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' });
  const textoHtml = m.mensagem ? `<div class="mob-chat-bubble">${m.mensagem.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>` : '';
  const anexoHtml = _mobChatAnexoHtml(`/api/admin/chamados/${chamadoId}/mensagens/${m.id}/chat-anexo`, m.chat_anexo_nome_original);
  return `<div class="mob-chat-msg ${isAdmin ? 'mob-chat-msg-admin' : 'mob-chat-msg-user'}" data-msg-id="${m.id}">
    ${textoHtml}${anexoHtml}
    <div class="mob-chat-meta">
      <span class="mob-chat-autor">${m.autor_nome || (isAdmin ? 'Admin' : 'Usuário')}</span>
      <span class="mob-chat-time">${hora}</span>
    </div>
  </div>`;
}

function _mobChatAnexoHtml(url, nome) {
  if (!nome) return '';
  const ext = nome.split('.').pop().toLowerCase();
  const vids = ['mp4','webm','mov','avi','mkv','wmv'];
  if (_IMGS_EXT.includes(ext))
    return `<img class="lbx-img chat-msg-img" src="${url}" alt="${nome}" loading="lazy">`;
  if (vids.includes(ext))
    return `<video class="chat-msg-video" src="${url}" controls preload="metadata"></video>`;
  return `<a class="mob-chat-anexo" href="${url}" target="_blank" rel="noopener"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>${nome}</a>`;
}

async function _atualizarChatMob(chamadoId) {
  const box = document.getElementById('mob-chat-msgs');
  if (!box) { clearInterval(_chatMobIv); _chatMobIv = null; return; }
  try {
    const r = await api(`/api/admin/chamados/${chamadoId}/mensagens`);
    if (!r.ok) return;
    const msgs = await r.json();
    if (!box.isConnected) return;

    if (!msgs.length) {
      if (!box.querySelector('[data-msg-id]'))
        box.innerHTML = '<div class="mob-chat-vazio">Nenhuma mensagem ainda. Seja o primeiro a escrever!</div>';
      return;
    }

    // Remove placeholder
    const vazio = box.querySelector('.mob-chat-vazio');
    if (vazio) vazio.remove();

    // Detect already-rendered messages by ID — never re-render existing ones
    const rendered = new Set([...box.querySelectorAll('[data-msg-id]')].map(el => +el.dataset.msgId));
    const novas = msgs.filter(m => !rendered.has(m.id));
    if (!novas.length) return;

    // Capture scroll state before touching the DOM
    const atFundo = box.scrollHeight - box.scrollTop - box.clientHeight < 60;

    // Append-only: insert new messages at the bottom
    const tmp = document.createElement('div');
    tmp.innerHTML = novas.map(m => _renderMsgMob(m, chamadoId)).join('');
    while (tmp.firstChild) box.appendChild(tmp.firstChild);

    if (atFundo) {
      box.scrollTop = box.scrollHeight;
      // Re-anchor after images/videos expand the container
      novas.forEach(m => {
        const ext = (m.chat_anexo_nome_original || '').split('.').pop().toLowerCase();
        if (_IMGS_EXT.includes(ext)) {
          const img = box.querySelector(`[data-msg-id="${m.id}"] img`);
          if (img && !img.complete) img.addEventListener('load', () => { box.scrollTop = box.scrollHeight; }, { once: true });
        } else if (['mp4','webm','mov','avi','mkv','wmv'].includes(ext)) {
          const vid = box.querySelector(`[data-msg-id="${m.id}"] video`);
          if (vid) vid.addEventListener('loadedmetadata', () => { box.scrollTop = box.scrollHeight; }, { once: true });
        }
      });
    }
  } catch {}
}

// ── Tela de sucesso ───────────────────────────────────────────
function renderSucesso(c) {
  const termoAviso = ['hardware', 'processo_compra'].includes(c.categoria)
    ? `<div style="margin:.75rem 0;padding:.65rem .9rem;background:#fefce8;border:1px solid #fde68a;border-radius:8px;font-size:.8rem;color:#92400e;text-align:left;line-height:1.5">
        <strong>Termo de Responsabilidade</strong><br>
        O solicitante deverá acessar o portal de chamados e assinar o Termo de Responsabilidade para formalizar o recebimento.
      </div>`
    : '';
  app.innerHTML = `
    <div class="mob-sucesso">
      <div class="mob-sucesso-icone">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="mob-sucesso-titulo">Chamado concluído!</div>
      <div class="mob-sucesso-sub">${c.nome}</div>
      ${termoAviso}
      <button class="mob-btn mob-btn-primary" id="mob-btn-voltar-lista">Ver chamados em aberto</button>
    </div>
  `;
  document.getElementById('mob-btn-voltar-lista').addEventListener('click', renderLista);
}
