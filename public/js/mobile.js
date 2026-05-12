const app = document.getElementById('mob-app');
let adminInfo = null;
let _chatMobIv = null;

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
    if (r.ok) { adminInfo = await r.json(); renderLista(); iniciarPush(); }
    else renderLogin();
  } catch { renderLogin(); }
})();

// ── Login ─────────────────────────────────────────────────────
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
    </div>
  `;

  document.getElementById('mob-form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('mob-msg-login');
    const btn = document.getElementById('mob-btn-entrar');
    btn.disabled = true; btn.textContent = 'Entrando…';
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: document.getElementById('mob-email').value.trim(),
          senha: document.getElementById('mob-senha').value,
        }),
      });
      const d = await r.json();
      if (!r.ok) { msg.innerHTML = `<div class="mob-alert mob-alert-danger">${d.erro}</div>`; return; }
      adminInfo = await (await fetch('/api/admin/me')).json();
      renderLista();
      iniciarPush();
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
        <button class="mob-sair-btn" id="mob-sair">Sair</button>
      </div>
    </div>
    <div class="mob-filtro-bar">
      <button class="mob-filtro-btn ${filtroAtivo === 'meus' ? 'ativo' : ''}" data-filtro="meus">Meus chamados</button>
      <button class="mob-filtro-btn ${filtroAtivo === 'todos' ? 'ativo' : ''}" data-filtro="todos">Todos</button>
    </div>
    <div id="mob-lista" class="mob-lista"><div class="mob-loading">Carregando…</div></div>
  `;

  document.getElementById('mob-sair').addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    renderLogin();
  });

  atualizarBotaoPush();

  document.querySelectorAll('.mob-filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filtroAtivo = btn.dataset.filtro;
      document.querySelectorAll('.mob-filtro-btn').forEach(b => b.classList.toggle('ativo', b.dataset.filtro === filtroAtivo));
      carregarChamados();
    });
  });

  carregarChamados();
}

async function carregarChamados() {
  const lista = document.getElementById('mob-lista');
  lista.innerHTML = '<div class="mob-loading">Carregando…</div>';
  try {
    const params = new URLSearchParams({ status: 'aberto,em_andamento,aguardando_compra,aguardando_chegar' });
    if (filtroAtivo === 'meus' && adminInfo) params.set('admin_id', adminInfo.id);
    const r = await api('/api/admin/chamados?' + params);
    if (!r.ok) return;
    const chamados = await r.json();
    const lista = document.getElementById('mob-lista');

    if (!chamados.length) {
      lista.innerHTML = '<div class="mob-empty">Nenhum chamado em aberto no momento.</div>';
      return;
    }

    lista.innerHTML = chamados.map(c => `
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
  } catch {}
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

      ${podeChat ? `
      <div class="mob-chat-section" id="mob-chat-section">
        <div class="mob-chat-head">
          <span class="mob-chat-dot"></span>
          Chat com o solicitante
        </div>
        <div class="mob-chat-msgs" id="mob-chat-msgs">
          <div class="mob-chat-vazio">Carregando mensagens…</div>
        </div>
        <form class="mob-chat-form" id="mob-chat-form" autocomplete="off">
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

  // Chat em tempo real
  if (podeChat) {
    _atualizarChatMob(c.id);
    clearInterval(_chatMobIv);
    _chatMobIv = setInterval(() => _atualizarChatMob(c.id), 4000);

    document.getElementById('mob-chat-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('mob-chat-input');
      const texto = input.value.trim();
      if (!texto) return;
      input.value = '';
      input.disabled = true;
      try {
        await api(`/api/admin/chamados/${c.id}/mensagens`, {
          method: 'POST',
          body: JSON.stringify({ mensagem: texto }),
        });
        await _atualizarChatMob(c.id);
      } catch {} finally {
        input.disabled = false;
        input.focus();
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
            msg.innerHTML = `<div class="mob-alert mob-alert-danger">Erro no estoque: ${d.erro}</div>`;
            btn.disabled = false; btn.textContent = 'Concluir chamado';
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
      if (!r.ok) { msg.innerHTML = `<div class="mob-alert mob-alert-danger">${d.erro}</div>`; return; }
      renderSucesso(c);
    } catch { msg.innerHTML = '<div class="mob-alert mob-alert-danger">Erro de conexão.</div>'; }
    finally { if (btn.isConnected) { btn.disabled = false; btn.textContent = 'Concluir chamado'; } }
  });
}

// ── Chat mobile ───────────────────────────────────────────────
async function _atualizarChatMob(chamadoId) {
  const box = document.getElementById('mob-chat-msgs');
  if (!box) { clearInterval(_chatMobIv); _chatMobIv = null; return; }
  try {
    const r = await api(`/api/admin/chamados/${chamadoId}/mensagens`);
    if (!r.ok) return;
    const msgs = await r.json();
    if (!box.isConnected) return;
    if (!msgs.length) {
      box.innerHTML = '<div class="mob-chat-vazio">Nenhuma mensagem ainda. Seja o primeiro a escrever!</div>';
      return;
    }
    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
    box.innerHTML = msgs.map(m => {
      const isAdmin = m.autor_tipo === 'admin';
      const iso = m.criado_em.includes('T') ? m.criado_em : m.criado_em.replace(' ', 'T');
      const hora = new Date(iso.endsWith('Z') ? iso : iso + 'Z')
        .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' });
      return `
        <div class="mob-chat-msg ${isAdmin ? 'mob-chat-msg-admin' : 'mob-chat-msg-user'}">
          <div class="mob-chat-bubble">${(m.mensagem || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          <div class="mob-chat-meta">
            <span class="mob-chat-autor">${m.autor_nome || (isAdmin ? 'Admin' : 'Usuário')}</span>
            <span class="mob-chat-time">${hora}</span>
          </div>
        </div>`;
    }).join('');
    if (atBottom) box.scrollTop = box.scrollHeight;
  } catch {}
}

// ── Tela de sucesso ───────────────────────────────────────────
function renderSucesso(c) {
  app.innerHTML = `
    <div class="mob-sucesso">
      <div class="mob-sucesso-icone">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="mob-sucesso-titulo">Chamado concluído!</div>
      <div class="mob-sucesso-sub">${c.nome}</div>
      <button class="mob-btn mob-btn-primary" id="mob-btn-voltar-lista">Ver chamados em aberto</button>
    </div>
  `;
  document.getElementById('mob-btn-voltar-lista').addEventListener('click', renderLista);
}
