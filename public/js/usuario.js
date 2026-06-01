const app = document.getElementById('app');

const STATUS_LABELS = { aberto: 'Aberto', em_andamento: 'Em andamento', aguardando_compra: 'Aguardando compra', aguardando_chegar: 'Aguardando chegar', concluido: 'Concluído', encerrado: 'Encerrado' };

let _refreshInterval = null;
let _visibilityController = null;
let _sseSource = null;
function _pararRefresh() {
  if (_refreshInterval) { clearInterval(_refreshInterval); _refreshInterval = null; }
}

const RAMAIS_VALIDOS = new Set([
  '5001','5002','5003','5004','5005','5010','5012','5015',
  '5050','5051','5055','5056','5058','5061','5062','5066','5067',
  '5093','5094',
  '5207','5208','5216','5221','5222','5223','5224','5225','5226',
  '5227','5228','5230','5231','5237','5238','5239','5240','5241',
  '5242','5243','5244','5245','5246','5248','5250','5252','5253',
  '5255','5256','5257','5258','5259','5261','5262','5265','5267',
  '5269','5271','5273','5285','5286','5288',
  '5305','5310','5311','5332','5334','5340','5363','5364','5369',
  '8406','8415','8421','8424','8425','8426','8464','8471','8494'
]);

// ── Chat (usuário) ─────────────────────────────────────────────

const _chatIntervals = new Map();

function _limparChats() {
  _chatIntervals.forEach(iv => clearInterval(iv));
  _chatIntervals.clear();
}

// ── Lightbox ──────────────────────────────────────────────────
let _lbxEl = null;
let _lbxZoom = 1, _lbxPanX = 0, _lbxPanY = 0;
let _lbxDragging = false, _lbxDragged = false;
let _lbxDragSX = 0, _lbxDragSY = 0, _lbxDragSPX = 0, _lbxDragSPY = 0;
function _lbxApply() {
  if (!_lbxEl) return;
  _lbxEl.querySelector('#lbx-img').style.transform =
    (_lbxZoom === 1 && !_lbxPanX && !_lbxPanY) ? '' : `translate(${_lbxPanX}px,${_lbxPanY}px) scale(${_lbxZoom})`;
}
function _lbxResetZoom() {
  _lbxZoom = 1; _lbxPanX = 0; _lbxPanY = 0;
  if (_lbxEl) { _lbxEl.querySelector('#lbx-img').style.transform = ''; _lbxEl.querySelector('#lbx-img').style.cursor = 'default'; }
}
function _abrirLightbox(src, nome) {
  if (!_lbxEl) {
    _lbxEl = document.createElement('div');
    _lbxEl.id = 'lbx';
    _lbxEl.innerHTML = '<button id="lbx-close" aria-label="Fechar">✕</button><img id="lbx-img" alt=""><div id="lbx-nome"></div>';
    document.body.appendChild(_lbxEl);
    const img = _lbxEl.querySelector('#lbx-img');
    _lbxEl.addEventListener('click', e => {
      if (_lbxDragged) { _lbxDragged = false; return; }
      if (e.target === _lbxEl || e.target.id === 'lbx-close') { _lbxEl.classList.remove('lbx-open'); _lbxResetZoom(); }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && _lbxEl) { _lbxEl.classList.remove('lbx-open'); _lbxResetZoom(); }
    });
    _lbxEl.addEventListener('wheel', e => {
      if (!_lbxEl.classList.contains('lbx-open')) return;
      e.preventDefault();
      _lbxZoom = Math.min(5, Math.max(0.3, _lbxZoom + (e.deltaY > 0 ? -0.15 : 0.15)));
      if (_lbxZoom <= 1) { _lbxPanX = 0; _lbxPanY = 0; }
      img.style.cursor = _lbxZoom > 1 ? 'grab' : 'default';
      _lbxApply();
    }, { passive: false });
    img.addEventListener('mousedown', e => {
      if (_lbxZoom <= 1) return;
      _lbxDragging = true; _lbxDragged = false;
      _lbxDragSX = e.clientX; _lbxDragSY = e.clientY;
      _lbxDragSPX = _lbxPanX; _lbxDragSPY = _lbxPanY;
      img.style.cursor = 'grabbing';
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!_lbxDragging) return;
      const dx = e.clientX - _lbxDragSX, dy = e.clientY - _lbxDragSY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) _lbxDragged = true;
      _lbxPanX = _lbxDragSPX + dx; _lbxPanY = _lbxDragSPY + dy;
      _lbxApply();
    });
    document.addEventListener('mouseup', () => {
      if (!_lbxDragging) return;
      _lbxDragging = false;
      if (_lbxEl?.classList.contains('lbx-open')) img.style.cursor = _lbxZoom > 1 ? 'grab' : 'default';
    });
  }
  _lbxResetZoom();
  _lbxEl.querySelector('#lbx-img').src = src;
  _lbxEl.querySelector('#lbx-nome').textContent = nome || '';
  _lbxEl.classList.add('lbx-open');
}
document.addEventListener('click', e => {
  const img = e.target.closest('.lbx-img');
  if (img) _abrirLightbox(img.src, img.alt);
});

const _IMGS_EXT = ['jpg','jpeg','png','gif','webp','bmp','svg','heic','avif'];

function _chatAnexoHtmlUsr(url, nome) {
  if (!nome) return '';
  const ext = nome.split('.').pop().toLowerCase();
  const vids = ['mp4','webm','mov','avi','mkv','wmv'];
  if (_IMGS_EXT.includes(ext))
    return `<img class="lbx-img chat-msg-img" src="${url}" alt="${nome}" loading="lazy">`;
  if (vids.includes(ext))
    return `<video class="chat-msg-video" src="${url}" controls preload="metadata"></video>`;
  return `<a class="chat-msg-anexo" href="${url}" target="_blank" rel="noopener"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>${nome}</a>`;
}

function _renderMsgChat(m) {
  const mine = m.autor_tipo === 'usuario';
  const textoHtml = m.mensagem ? `<div class="chat-msg-bubble">${m.mensagem.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>` : '';
  const anexoHtml = _chatAnexoHtmlUsr(`/api/chamados/${m.chamado_id}/mensagens/${m.id}/chat-anexo`, m.chat_anexo_nome_original);
  return `<div class="chat-msg ${mine ? 'mine' : 'theirs'}" data-msg-id="${m.id}">
    <div class="chat-msg-author">${m.autor_nome}</div>
    ${textoHtml}${anexoHtml}
    <div class="chat-msg-time">${fmtData(m.criado_em)}</div>
  </div>`;
}

async function _atualizarChat(chamadoId) {
  const box = document.getElementById('chat-msgs-' + chamadoId);
  if (!box) return;
  try {
    const r = await apiFetch('/api/chamados/' + chamadoId + '/mensagens');
    if (r.status === 401) { _pararRefresh(); _limparChats(); renderAuth(); return; }
    if (!r.ok) return;
    const msgs = await r.json();

    if (!msgs.length) {
      if (!box.querySelector('[data-msg-id]'))
        box.innerHTML = '<div class="chat-vazio">Nenhuma mensagem ainda. Escreva para o suporte!</div>';
      return;
    }

    // Remove placeholder
    const vazio = box.querySelector('.chat-vazio');
    if (vazio) vazio.remove();

    // Detect already-rendered messages by ID — never re-render existing ones
    const rendered = new Set([...box.querySelectorAll('[data-msg-id]')].map(el => +el.dataset.msgId));
    const novas = msgs.filter(m => !rendered.has(m.id));
    if (!novas.length) return;

    // Capture scroll state before touching the DOM
    const atFundo = box.scrollHeight - box.scrollTop - box.clientHeight < 80;

    // Append-only: insert new messages at the bottom
    const tmp = document.createElement('div');
    tmp.innerHTML = novas.map(_renderMsgChat).join('');
    while (tmp.firstChild) box.appendChild(tmp.firstChild);

    if (atFundo) {
      box.scrollTop = box.scrollHeight;
      // After images/videos expand the container, re-anchor to bottom
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

function _iniciarChat(chamadoId) {
  _atualizarChat(chamadoId);
  if (!_chatIntervals.has(chamadoId))
    _chatIntervals.set(chamadoId, setInterval(() => _atualizarChat(chamadoId), 5000));

  const form = document.getElementById('chat-form-' + chamadoId);
  if (!form) return;

  const fileInput = document.getElementById('chat-file-' + chamadoId);
  const fileChip = document.getElementById('chat-file-chip-' + chamadoId);
  const fileNameEl = document.getElementById('chat-file-name-' + chamadoId);
  const chatInput = document.getElementById('chat-input-' + chamadoId);
  let selectedFile = null;

  function setFile(file) { selectedFile = file; fileNameEl.textContent = file.name; fileChip.style.display = 'flex'; }
  function clearFile() { selectedFile = null; fileInput.value = ''; fileChip.style.display = 'none'; }

  form.querySelector('.btn-chat-anexo').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => { if (fileInput.files.length) setFile(fileInput.files[0]); else clearFile(); });
  fileChip.querySelector('.btn-chat-file-clear').addEventListener('click', clearFile);

  // Colar imagem do clipboard
  chatInput.addEventListener('paste', (e) => {
    const item = Array.from(e.clipboardData?.items || []).find(i => i.kind === 'file');
    if (item) { e.preventDefault(); const f = item.getAsFile(); if (f) setFile(f); }
  });

  // Arrastar e soltar na caixa de chat
  const dropZone = form.closest('.chat-wrap') || form.parentElement;
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('chat-drop-active'); });
  dropZone.addEventListener('dragleave', (e) => { if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('chat-drop-active'); });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('chat-drop-active');
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); chatInput.focus(); }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('chat-err-' + chamadoId);
    const texto = chatInput.value.trim();
    if (!texto && !selectedFile) return;
    const btn = form.querySelector('[type="submit"]');
    const btnTxt = btn.textContent;
    btn.disabled = true;
    chatInput.disabled = true;
    if (errEl) errEl.textContent = '';
    try {
      let ok = false, erroMsg = '';
      if (selectedFile) {
        const fd = new FormData();
        if (texto) fd.append('mensagem', texto);
        fd.append('chat_anexo', selectedFile, selectedFile.name || 'imagem.png');
        btn.textContent = '0%';
        await new Promise((resolve) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/chamados/' + chamadoId + '/mensagens');
          xhr.withCredentials = true;
          xhr.upload.onprogress = ev => {
            if (ev.lengthComputable) btn.textContent = Math.round(ev.loaded / ev.total * 100) + '%';
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
        const r = await apiFetch('/api/chamados/' + chamadoId + '/mensagens', { method: 'POST', body: JSON.stringify({ mensagem: texto }) });
        ok = r.ok;
        if (!ok) { const d = await r.json().catch(() => ({})); erroMsg = d.erro || 'Erro ao enviar mensagem.'; }
      }
      if (ok) { chatInput.value = ''; clearFile(); await _atualizarChat(chamadoId); }
      else if (errEl) errEl.textContent = erroMsg;
    } catch {
      if (errEl) errEl.textContent = 'Erro de conexão.';
    } finally {
      btn.disabled = false;
      btn.textContent = btnTxt;
      chatInput.disabled = false;
      chatInput.focus();
    }
  });
}

function fmtData(d) {
  if (!d) return '—';
  const iso = d.includes('T') ? d : d.replace(' ', 'T');
  const date = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' });
}

function badgeStatus(s) {
  return `<span class="badge badge-${s}">${STATUS_LABELS[s] || s}</span>`;
}

async function apiFetch(url, opts = {}) {
  return fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opts });
}

(async () => {
  const r = await apiFetch('/api/usuarios/me');
  if (r.ok) {
    const usuario = await r.json();
    renderPainel(usuario);
  } else {
    renderAuth();
  }
})();

function renderAuth() {
  _limparChats();
  if (_visibilityController) { _visibilityController.abort(); _visibilityController = null; }
  if (_sseSource) { _sseSource.close(); _sseSource = null; }
  const header = document.querySelector('header');
  if (header) header.style.display = 'none';
  document.body.classList.add('auth-mode');

  app.innerHTML = `
    <div class="login-page">

      <div class="login-left">
        <img src="https://letsimage.s3.amazonaws.com/editor/granmarquise/imgs/1760033174793-hotelgranmarquise_pos_footer.png"
             alt="Gran Marquise"
             style="width:220px;margin-bottom:2.5rem;position:relative;z-index:1;filter:brightness(0) invert(1)">
        <div class="login-badge">Portal de Chamados</div>
        <h2>Suporte de TI<br>Gran Marquise</h2>
        <p>Registre e acompanhe suas solicitações ao setor de Tecnologia da Informação do Hotel Gran Marquise.</p>
      </div>

      <div class="login-right">
        <div class="login-card">
          <div class="login-card-title">Entrar no portal</div>
          <div class="login-card-sub">Utilize seu e-mail e senha para acessar</div>

          <div id="msg-auth"></div>

          <form id="form-login" novalidate>
            <div class="form-group">
              <label for="login-email">E-mail</label>
              <input class="form-control" type="email" id="login-email" placeholder="seu@granmarquise.com.br" autocomplete="email" required>
            </div>
            <div class="form-group">
              <label for="login-senha">Senha</label>
              <div class="input-senha-wrap">
                <input class="form-control" type="password" id="login-senha" autocomplete="current-password" required placeholder="••••••••">
                <button type="button" class="btn-eye" id="btn-eye-login-senha" title="Mostrar/ocultar senha">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-full" style="margin-top:.5rem">Entrar</button>
            <div style="text-align:center;margin-top:.75rem">
              <button type="button" id="btn-esqueci-senha" style="background:none;border:none;cursor:pointer;font-size:.8rem;color:var(--text-muted);text-decoration:underline;padding:0">Esqueci minha senha</button>
            </div>
          </form>

          <!-- Painel esqueci senha (oculto inicialmente) -->
          <div id="painel-esqueci" style="display:none;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--border)">
            <p style="font-size:.85rem;color:var(--text-secondary);margin:0 0 .75rem">Digite seu e-mail e abriremos um chamado para a equipe de TI. Um administrador entrará em contato com sua nova senha o quanto antes.</p>
            <div id="msg-esqueci"></div>
            <form id="form-esqueci" novalidate>
              <div class="form-group">
                <label for="esqueci-email">E-mail</label>
                <input class="form-control" type="email" id="esqueci-email" placeholder="seu@granmarquise.com.br" autocomplete="email">
              </div>
              <button type="submit" class="btn btn-primary btn-full">Solicitar redefinição de senha</button>
            </form>
          </div>

        </div>
      </div>

    </div>
  `;

  document.getElementById('btn-eye-login-senha').addEventListener('click', () => {
    const inp = document.getElementById('login-senha');
    const btn = document.getElementById('btn-eye-login-senha');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    btn.style.color = inp.type === 'text' ? 'var(--gold)' : '';
  });

  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('msg-auth');
    const btn = e.target.querySelector('button[type=submit]');
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const senha = document.getElementById('login-senha').value;
    btn.disabled = true; btn.textContent = 'Entrando...';
    try {
      // Tenta login como usuário do portal
      const rU = await apiFetch('/api/usuarios/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha }),
      });
      if (rU.ok) {
        const u = await (await apiFetch('/api/usuarios/me')).json();
        renderPainel(u);
        return;
      }

      // Se não for usuário, tenta como admin/master
      const rA = await apiFetch('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha }),
      });
      if (rA.ok) {
        location.replace('/admin-painel.html');
        return;
      }

      const d = await rA.json();
      msg.innerHTML = `<div class="alert alert-danger">${d.erro || 'E-mail ou senha incorretos.'}</div>`;
    } catch { msg.innerHTML = '<div class="alert alert-danger">Erro de conexão.</div>'; }
    finally { btn.disabled = false; btn.textContent = 'Entrar'; }
  });

  /* Esqueci a senha */
  document.getElementById('btn-esqueci-senha').addEventListener('click', () => {
    const painel = document.getElementById('painel-esqueci');
    painel.style.display = painel.style.display === 'none' ? 'block' : 'none';
    if (painel.style.display === 'block') {
      const emailLogin = document.getElementById('login-email').value;
      if (emailLogin) document.getElementById('esqueci-email').value = emailLogin;
      document.getElementById('esqueci-email').focus();
    }
  });

  document.getElementById('form-esqueci').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById('msg-esqueci');
    const btn = e.target.querySelector('button[type=submit]');
    const email = document.getElementById('esqueci-email').value.trim().toLowerCase();
    if (!email) { msgEl.innerHTML = '<div class="alert alert-danger">Informe o e-mail.</div>'; return; }
    btn.disabled = true; btn.textContent = 'Abrindo chamado...';
    const ctrl = new AbortController();
    const tOut = setTimeout(() => ctrl.abort(), 25000);
    try {
      const r = await fetch('/api/usuarios/esqueci-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: ctrl.signal,
      });
      clearTimeout(tOut);
      const d = await r.json();
      if (r.ok) {
        msgEl.innerHTML = `<div class="alert alert-success">✅ Chamado aberto! A equipe de TI foi notificada e entrará em contato com sua nova senha o quanto antes.</div>
          <button type="button" id="btn-reenviar-esqueci"
            style="background:none;border:none;cursor:pointer;font-size:.8rem;color:var(--text-muted);text-decoration:underline;padding:0;margin-top:.4rem;display:block">
            Fazer nova solicitação
          </button>`;
        e.target.style.display = 'none';
        document.getElementById('btn-reenviar-esqueci').addEventListener('click', () => {
          msgEl.innerHTML = '';
          document.getElementById('esqueci-email').value = '';
          btn.disabled = false; btn.textContent = 'Solicitar redefinição de senha';
          e.target.style.display = '';
          document.getElementById('esqueci-email').focus();
        });
      } else {
        msgEl.innerHTML = `<div class="alert alert-danger">${d.erro}</div>`;
        btn.disabled = false; btn.textContent = 'Solicitar redefinição de senha';
      }
    } catch {
      msgEl.innerHTML = '<div class="alert alert-danger">Erro de conexão.</div>';
      btn.disabled = false; btn.textContent = 'Solicitar redefinição de senha';
    }
  });
}

function _mostrarToastU(titulo, corpo) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast-notif';
  t.style.borderLeftColor = '#22c55e';
  t.innerHTML = `
    <button class="toast-close" onclick="this.closest('.toast-notif').remove()">✕</button>
    <strong>${titulo}</strong>
    ${corpo ? `<span>${corpo}</span>` : ''}
  `;
  container.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, 5000);
}

function renderPainel(usuario) {
  const header = document.querySelector('header');
  if (header) {
    header.style.display = '';
    const nav = header.querySelector('nav');
    if (nav) nav.innerHTML = `
      <span style="font-size:.82rem;color:var(--text-muted);margin-right:.25rem">${usuario.nome}</span>
      <button id="btn-logout-usuario" class="btn btn-ghost btn-sm" style="margin-left:.25rem">Sair</button>
    `;
  }
  document.body.classList.remove('auth-mode');
  app.innerHTML = `
    <div id="msg-global"></div>

    <div class="page-header">
      <div>
        <div class="page-title">Meus Chamados</div>
        <div class="page-subtitle">Acompanhe suas solicitações de TI — ${usuario.email}</div>
        <div style="margin-top:.4rem;display:flex;gap:1rem;flex-wrap:wrap;font-size:.78rem;color:var(--text-muted)">
          <span><strong style="color:var(--text-secondary)">Setor:</strong> ${usuario.setor || '—'}</span>
          <span><strong style="color:var(--text-secondary)">Ramal:</strong> ${usuario.ramal || '—'}</span>
        </div>
      </div>
      <div style="display:flex;gap:.6rem;flex-wrap:wrap">
        <button class="btn btn-primary" id="btn-novo-chamado" style="font-size:.95rem;padding:.55rem 1.3rem;font-weight:700;box-shadow:0 2px 8px rgba(180,140,60,.25)">+ Abrir chamado</button>
        <button class="btn btn-secondary" id="btn-nova-sugestao-u" style="font-size:.95rem;padding:.55rem 1.3rem">💡 Mandar uma Sugestão</button>
      </div>
    </div>

    <div class="stats-strip" id="stats-strip-u">
      <div class="stat-pill">
        <div class="stat-dot dot-aberto">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-num" id="cnt-u-aberto">—</div>
          <div class="stat-label">Abertos</div>
        </div>
      </div>
      <div class="stat-pill">
        <div class="stat-dot dot-andamento">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-num" id="cnt-u-andamento">—</div>
          <div class="stat-label">Em andamento</div>
        </div>
      </div>
      <div class="stat-pill">
        <div class="stat-dot dot-concluido">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-num" id="cnt-u-concluido">—</div>
          <div class="stat-label">Concluídos</div>
        </div>
      </div>
      <div class="stat-pill" id="pill-cancelados-u" style="cursor:pointer" title="Ver cancelados">
        <div class="stat-dot dot-cancelado">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-num" id="cnt-u-cancelado">0</div>
          <div class="stat-label">Cancelados</div>
        </div>
      </div>
    </div>

    <div id="area-form-chamado" style="display:none"></div>

    <div class="tabs-bar">
      <button class="tab-btn ativo" id="tab-abertos">Em Aberto <span class="tab-badge" id="badge-abertos-u"></span></button>
      <button class="tab-btn" id="tab-encerrados">Concluídos <span class="tab-badge" id="badge-encerrados-u"></span></button>
      <button class="tab-btn" id="tab-cancelados-u">Cancelados <span class="tab-badge" id="badge-cancelados-u"></span></button>
      <button class="tab-btn" id="tab-sugestoes-u">Minhas Sugestões <span class="tab-badge" id="badge-sugestoes-u"></span></button>
    </div>

    <div id="lista-usuario"><div class="loading"><div class="spinner"></div></div></div>

    <!-- Modal enviar sugestão -->
    <div class="modal-overlay" id="modal-sugestao-overlay" role="dialog" aria-modal="true">
      <div class="modal" style="max-width:480px">
        <div class="modal-header">
          <h2>Enviar Sugestão</h2>
          <button class="modal-close" id="btn-fechar-sugestao">&#x2715;</button>
        </div>
        <div class="modal-body" style="padding:1.5rem">
          <div id="msg-sugestao"></div>
          <form id="form-sugestao">
            <div class="form-group">
              <label for="sug-texto">Sua sugestão <span class="req">*</span></label>
              <textarea class="form-control" id="sug-texto" rows="5" maxlength="2000"
                placeholder="Descreva sua sugestão de melhoria ou modificação para o sistema..."></textarea>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;margin-top:.5rem" id="btn-enviar-sugestao">Enviar</button>
            <button type="button" class="btn btn-secondary" style="width:100%;margin-top:.4rem" id="btn-cancelar-sugestao">Cancelar</button>
          </form>
        </div>
      </div>
    </div>
  `;

  let abaAtiva = 'abertos';
  let todosChamados = [];
  let _chamadosHash = null;

  document.getElementById('btn-logout-usuario').addEventListener('click', async () => {
    _pararRefresh();
    _limparChats();
    if (_sseSource) { _sseSource.close(); _sseSource = null; }
    await apiFetch('/api/usuarios/logout', { method: 'POST' });
    renderAuth();
  });

  document.getElementById('btn-novo-chamado').addEventListener('click', () => {
    const area = document.getElementById('area-form-chamado');
    if (area.style.display === 'none') {
      renderFormChamado(
        usuario, area,
        () => { area.style.display = 'none'; document.getElementById('tab-abertos')?.click(); carregarChamados(); _mostrarToastU('Chamado aberto com sucesso!', 'Nossa equipe de TI irá atender em breve.'); },
        () => { area.style.display = 'none'; }
      );
      area.style.display = 'block';
    } else {
      area.style.display = 'none';
    }
  });

  // ── Modal Sugestão ──────────────────────────────────────────
  document.getElementById('btn-nova-sugestao-u').addEventListener('click', () => {
    document.getElementById('msg-sugestao').innerHTML = '';
    document.getElementById('form-sugestao').reset();
    document.getElementById('modal-sugestao-overlay').classList.add('open');
  });
  const _fecharModalSug = () => document.getElementById('modal-sugestao-overlay').classList.remove('open');
  document.getElementById('btn-fechar-sugestao').addEventListener('click', _fecharModalSug);
  document.getElementById('btn-cancelar-sugestao').addEventListener('click', _fecharModalSug);
  document.getElementById('modal-sugestao-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-sugestao-overlay')) _fecharModalSug();
  });

  document.getElementById('form-sugestao').addEventListener('submit', async e => {
    e.preventDefault();
    const msgEl = document.getElementById('msg-sugestao');
    const btn = document.getElementById('btn-enviar-sugestao');
    const texto = document.getElementById('sug-texto').value.trim();
    if (!texto) return;
    btn.disabled = true; btn.textContent = 'Enviando...';
    try {
      const r = await apiFetch('/api/sugestoes', { method: 'POST', body: JSON.stringify({ texto }) });
      const d = await r.json();
      if (r.ok) {
        document.getElementById('form-sugestao').reset();
        _fecharModalSug();
        _carregarSugestoesUsuario();
        setTimeout(() => _mostrarToastU('Sugestão enviada com sucesso!', 'Acompanhe o andamento na aba Sugestões.'), 150);
      } else {
        msgEl.innerHTML = `<div class="alert alert-danger">${d.erro}</div>`;
      }
    } catch { msgEl.innerHTML = '<div class="alert alert-danger">Erro de conexão.</div>'; }
    finally { btn.disabled = false; btn.textContent = 'Enviar'; }
  });

  // ── Aba Sugestões ──────────────────────────────────────────
  let _sugestoesUsuario = [];
  let _sugHash = null;
  let _sugRefreshInterval = null;

  const SUGH_LABELS = { enviada: 'Enviada', em_analise: 'Em Análise', em_producao: 'Em Produção', feita: 'Feita', negada: 'Negada' };

  async function _carregarSugestoesUsuario(silencioso = false) {
    try {
      const r = await apiFetch('/api/sugestoes/minhas');
      if (!r.ok) return;
      const lista = await r.json();
      lista.forEach(s => { s.mensagens = JSON.parse(s.mensagens_json || '[]'); });

      if (silencioso) {
        const novoHash = JSON.stringify(lista.map(s => [s.id, s.status, s.campo_extra, s.atualizado_em, s.mensagens.at?.(-1)?.id]));
        if (novoHash === _sugHash) return;
        _sugHash = novoHash;
        _sugestoesUsuario = lista;
        const badgeEl = document.getElementById('badge-sugestoes-u');
        if (badgeEl) { const a = lista.filter(s => !['feita','negada'].includes(s.status)).length; badgeEl.textContent = a || ''; }
        if (abaAtiva === 'sugestoes') _atualizarSilencioso(lista);
        return;
      }

      _sugHash = null;
      _sugestoesUsuario = lista;
      const badgeEl = document.getElementById('badge-sugestoes-u');
      if (badgeEl) { const a = lista.filter(s => !['feita','negada'].includes(s.status)).length; badgeEl.textContent = a || ''; }
      if (abaAtiva === 'sugestoes') _renderSugestoesUsuario(lista);
    } catch {}
  }

  function _renderChatEmBox(box, mensagens) {
    if (!mensagens.length) {
      if (!box.querySelector('[data-msg-id]'))
        box.innerHTML = '<div class="chat-vazio">Nenhuma mensagem ainda. Escreva para o suporte!</div>';
      return;
    }
    const vazio = box.querySelector('.chat-vazio');
    if (vazio) vazio.remove();
    const rendered = new Set([...box.querySelectorAll('[data-msg-id]')].map(el => +el.dataset.msgId));
    const novas = mensagens.filter(m => !rendered.has(m.id));
    if (!novas.length) return;
    const atFundo = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    const tmp = document.createElement('div');
    tmp.innerHTML = novas.map(_renderMsgSugUsr).join('');
    while (tmp.firstChild) box.appendChild(tmp.firstChild);
    if (atFundo) box.scrollTop = box.scrollHeight;
  }

  function _atualizarSilencioso(lista) {
    lista.forEach(s => {
      const box = document.getElementById(`chat-msgs-sug-u-${s.id}`);
      if (box) _renderChatEmBox(box, s.mensagens);
      const card = document.querySelector(`[data-sug-id="${s.id}"]`);
      if (card) {
        const b = card.querySelector('.badge');
        if (b) { b.className = `badge badge-${s.status}`; b.textContent = SUGH_LABELS[s.status] || s.status; }
      }
    });
  }

  function _renderSugestoesUsuario(lista) {
    const el = document.getElementById('lista-usuario');

    if (!lista.length) {
      el.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--text-muted);font-size:.88rem">
        Você ainda não enviou nenhuma sugestão.<br>
        <button class="btn btn-secondary btn-sm" style="margin-top:.75rem" onclick="document.getElementById('btn-nova-sugestao-u').click()">💡 Enviar primeira sugestão</button>
      </div>`;
      return;
    }
    el.innerHTML = lista.map(s => {
      const statusLabel = SUGH_LABELS[s.status] || s.status;
      const fechado = s.status === 'feita' || s.status === 'negada';
      const campoExtraLabel = s.status === 'feita' ? 'Como foi implementado' : s.status === 'negada' ? 'Justificativa' : '';
      const campoExtra = s.campo_extra ? `
        <div style="margin-top:.6rem;padding:.55rem .75rem;background:var(--bg);border-radius:6px;border:1px solid var(--border)">
          <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:.25rem">${campoExtraLabel}</div>
          <div style="font-size:.82rem;color:var(--text-secondary);font-style:italic">${s.campo_extra}</div>
        </div>` : '';
      return `
        <div class="card" style="margin-bottom:1rem;padding:1.25rem 1.4rem${fechado ? ';opacity:.8' : ''}" data-sug-id="${s.id}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.75rem;flex-wrap:wrap">
            <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
              <span style="font-size:.72rem;color:var(--text-muted)">#${s.id}</span>
              <span class="badge badge-${s.status}">${statusLabel}</span>
              <span style="font-size:.72rem;color:var(--text-muted)">${fmtData(s.criado_em)}</span>
            </div>
          </div>
          <div style="margin-top:.75rem;font-size:.88rem;line-height:1.6;white-space:pre-wrap">${s.texto}</div>
          ${campoExtra}
          <div class="chat-wrap" style="margin-top:.85rem">
            <div class="chat-header">Chat com suporte</div>
            <div class="chat-messages" id="chat-msgs-sug-u-${s.id}"></div>
            <div id="file-chip-sug-u-${s.id}" style="display:none;font-size:.75rem;color:var(--text-secondary);padding:.2rem .5rem .1rem;align-items:center;gap:.35rem">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              <span id="file-chip-name-sug-u-${s.id}" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span>
              <button type="button" class="file-chip-clear-sug" data-sug-id="${s.id}" style="background:none;border:none;cursor:pointer;padding:0;line-height:1;color:var(--text-muted);font-size:.85rem" title="Remover arquivo">✕</button>
            </div>
            <div class="chat-input-row" style="display:flex;gap:.4rem;padding:.5rem .75rem;background:#fff;border-top:1px solid var(--border)">
              <input type="file" id="file-input-sug-u-${s.id}" style="display:none" accept="image/*,video/*,.pdf,.txt,.docx">
              <button type="button" class="btn btn-secondary btn-sm btn-file-sug" data-sug-id="${s.id}" title="Anexar arquivo" style="padding:.32rem .55rem;flex-shrink:0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </button>
              <input class="form-control" type="text" id="chat-input-sug-u-${s.id}" placeholder="Escreva uma mensagem..." maxlength="1000" style="flex:1;font-size:.85rem">
              <button type="button" class="btn btn-primary btn-sm btn-chat-send-sug" data-sug-id="${s.id}">Enviar</button>
            </div>
            <div id="chat-err-sug-u-${s.id}" style="font-size:.75rem;color:var(--danger);min-height:.9rem;padding:0 .75rem"></div>
          </div>
        </div>
      `;
    }).join('');

    lista.forEach(s => {
      const box = document.getElementById(`chat-msgs-sug-u-${s.id}`);
      _renderChatEmBox(box, s.mensagens);

      const chatInput = document.getElementById(`chat-input-sug-u-${s.id}`);
      const sendBtn = el.querySelector(`.btn-chat-send-sug[data-sug-id="${s.id}"]`);
      const errEl = document.getElementById(`chat-err-sug-u-${s.id}`);
      const fileInput = document.getElementById(`file-input-sug-u-${s.id}`);
      const fileChip = document.getElementById(`file-chip-sug-u-${s.id}`);
      const fileChipName = document.getElementById(`file-chip-name-sug-u-${s.id}`);
      const btnFile = el.querySelector(`.btn-file-sug[data-sug-id="${s.id}"]`);
      const btnClear = el.querySelector(`.file-chip-clear-sug[data-sug-id="${s.id}"]`);

      let selectedFile = null;
      function setFile(f) { selectedFile = f; fileChipName.textContent = f.name; fileChip.style.display = 'flex'; }
      function clearFile() { selectedFile = null; fileInput.value = ''; fileChip.style.display = 'none'; }

      btnFile.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => { if (fileInput.files.length) setFile(fileInput.files[0]); else clearFile(); });
      btnClear.addEventListener('click', clearFile);

      async function enviarMsgSug() {
        const texto = chatInput.value.trim();
        if (!texto && !selectedFile) return;
        sendBtn.disabled = true;
        errEl.textContent = '';
        try {
          let r;
          if (selectedFile) {
            const fd = new FormData();
            if (texto) fd.append('mensagem', texto);
            fd.append('chat_anexo', selectedFile, selectedFile.name || 'arquivo');
            r = await fetch(`/api/sugestoes/${s.id}/mensagens`, { method: 'POST', credentials: 'same-origin', body: fd });
          } else {
            r = await apiFetch(`/api/sugestoes/${s.id}/mensagens`, { method: 'POST', body: JSON.stringify({ mensagem: texto }) });
          }
          if (r.ok) { chatInput.value = ''; clearFile(); _sugHash = null; _carregarSugestoesUsuario(true); }
          else { const d = await r.json().catch(() => ({})); errEl.textContent = d.erro || 'Erro ao enviar.'; }
        } catch { errEl.textContent = 'Erro de conexão.'; }
        finally { sendBtn.disabled = false; chatInput.focus(); }
      }

      sendBtn.addEventListener('click', enviarMsgSug);
      chatInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMsgSug(); }
      });
    });
  }

  function _renderMsgSugUsr(m) {
    const mine = m.autor_tipo === 'usuario';
    const texto = m.mensagem ? `<div class="chat-msg-bubble">${m.mensagem.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>` : '';
    const anexoHtml = m.chat_anexo_nome_original ? _chatAnexoHtmlUsr(`/api/sugestoes/${m.sugestao_id}/mensagens/${m.id}/chat-anexo`, m.chat_anexo_nome_original) : '';
    return `<div class="chat-msg ${mine ? 'mine' : 'theirs'}" data-msg-id="${m.id}">
      <div class="chat-msg-author">${m.autor_nome}</div>
      ${texto}${anexoHtml}
      <div class="chat-msg-time">${fmtData(m.criado_em)}</div>
    </div>`;
  }

  function _pararSugRefresh() {
    if (_sugRefreshInterval) { clearInterval(_sugRefreshInterval); _sugRefreshInterval = null; }
  }
  function _iniciarSugRefresh() {
    _pararSugRefresh();
    _sugRefreshInterval = setInterval(() => _carregarSugestoesUsuario(true), 5000);
  }

  document.getElementById('tab-abertos').addEventListener('click', () => {
    abaAtiva = 'abertos';
    document.getElementById('tab-abertos').classList.add('ativo');
    document.getElementById('tab-encerrados').classList.remove('ativo');
    document.getElementById('tab-cancelados-u').classList.remove('ativo');
    document.getElementById('tab-sugestoes-u').classList.remove('ativo');
    _pararSugRefresh();
    renderListaChamados(todosChamados, abaAtiva);
  });

  document.getElementById('tab-encerrados').addEventListener('click', () => {
    abaAtiva = 'encerrados';
    document.getElementById('tab-encerrados').classList.add('ativo');
    document.getElementById('tab-abertos').classList.remove('ativo');
    document.getElementById('tab-cancelados-u').classList.remove('ativo');
    document.getElementById('tab-sugestoes-u').classList.remove('ativo');
    _pararSugRefresh();
    renderListaChamados(todosChamados, abaAtiva);
  });

  document.getElementById('tab-sugestoes-u').addEventListener('click', () => {
    abaAtiva = 'sugestoes';
    document.getElementById('tab-sugestoes-u').classList.add('ativo');
    document.getElementById('tab-abertos').classList.remove('ativo');
    document.getElementById('tab-encerrados').classList.remove('ativo');
    document.getElementById('tab-cancelados-u').classList.remove('ativo');
    _carregarSugestoesUsuario();
    _iniciarSugRefresh();
  });

  const _ativarCancelados = () => {
    abaAtiva = 'cancelados';
    document.getElementById('tab-cancelados-u').classList.add('ativo');
    document.getElementById('tab-abertos').classList.remove('ativo');
    document.getElementById('tab-encerrados').classList.remove('ativo');
    document.getElementById('tab-sugestoes-u').classList.remove('ativo');
    _pararSugRefresh();
    renderListaChamados(todosChamados, abaAtiva);
  };
  document.getElementById('tab-cancelados-u').addEventListener('click', _ativarCancelados);
  document.getElementById('pill-cancelados-u').addEventListener('click', _ativarCancelados);

  async function carregarChamados(silencioso = false) {
    const lista = document.getElementById('lista-usuario');
    if (!lista) return;
    if (!silencioso) lista.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    let novos;
    try {
      const r = await apiFetch('/api/usuarios/meus-chamados');
      if (r.status === 401) { _pararRefresh(); _limparChats(); renderAuth(); return; }
      if (!r.ok) throw new Error('network');
      novos = await r.json();
      if (!Array.isArray(novos)) throw new Error('invalid');
    } catch {
      if (!silencioso) {
        if (todosChamados.length > 0) renderListaChamados(todosChamados, abaAtiva);
        else lista.innerHTML = '<div class="alert alert-danger">Erro ao carregar chamados.</div>';
      }
      return;
    }

    // Silencioso: só atualiza se os dados mudaram (hash sem termo, o termo muda só por ação do usuário)
    if (silencioso) {
      const novoHash = JSON.stringify(novos.map(c =>
        [c.id, c.status, c.admin_nome, c.nota, c.prazo, c.solucao, c.prioridade, c.atualizado_em, c.assinado_em, c.requer_acordo, c.novidades_usuario]
      ));
      if (novoHash === _chamadosHash) return;
      _chamadosHash = novoHash;
    } else {
      _chamadosHash = null;
    }

    // Buscar estado do termo para chamados de hardware/processo_compra concluídos e chamados com requer_acordo ativos
    const termoRelevantes = novos.filter(c =>
      (['hardware', 'processo_compra'].includes(c.categoria) && ['concluido', 'encerrado'].includes(c.status)) ||
      (c.requer_acordo && ['aberto', 'em_andamento', 'aguardando_compra', 'aguardando_chegar'].includes(c.status))
    );
    await Promise.all(termoRelevantes.map(async c => {
      try {
        const rt = await apiFetch(`/api/usuarios/chamados/${c.id}/termo-aceite`);
        if (rt.ok) {
          const t = await rt.json();
          if (t) { c._termoAceito = true; c._termoAceitoEm = t.aceito_em; }
          else { c._termoAceito = false; }
        }
      } catch {}
    }));

    todosChamados = novos;

    const qtd = { aberto: 0, em_andamento: 0, aguardando_compra: 0, aguardando_chegar: 0, concluido: 0, encerrado: 0, cancelado: 0 };
    todosChamados.forEach(c => { if (qtd[c.status] !== undefined) qtd[c.status]++; });

    const el = id => document.getElementById(id);
    if (el('cnt-u-aberto'))    el('cnt-u-aberto').textContent    = qtd.aberto;
    if (el('cnt-u-andamento')) el('cnt-u-andamento').textContent = qtd.em_andamento + qtd.aguardando_compra + qtd.aguardando_chegar;
    if (el('cnt-u-concluido')) el('cnt-u-concluido').textContent = qtd.concluido + qtd.encerrado;

    const abertos = qtd.aberto + qtd.em_andamento + qtd.aguardando_compra + qtd.aguardando_chegar;
    const encerrados = qtd.concluido + qtd.encerrado;
    el('badge-abertos-u').textContent = abertos || '';
    el('badge-encerrados-u').textContent = encerrados || '';
    if (el('badge-cancelados-u')) el('badge-cancelados-u').textContent = qtd.cancelado || '';
    if (el('cnt-u-cancelado')) el('cnt-u-cancelado').textContent = qtd.cancelado;

    if (abaAtiva !== 'sugestoes') renderListaChamados(todosChamados, abaAtiva);
  }

  carregarChamados();
  _carregarSugestoesUsuario();
  _pararRefresh();
  _refreshInterval = setInterval(() => carregarChamados(true), 5000);

  // SSE — notificações instantâneas do servidor
  if (_sseSource) { _sseSource.close(); _sseSource = null; }
  _sseSource = new EventSource('/api/usuarios/stream');
  _sseSource.addEventListener('mensagem:new', e => {
    const { chamado_id } = JSON.parse(e.data);
    _atualizarChat(chamado_id);
  });
  _sseSource.addEventListener('chamado:atualizado', () => {
    carregarChamados(true);
  });
  _sseSource.addEventListener('sugestao:updated', () => {
    _carregarSugestoesUsuario(true);
  });

  if (_visibilityController) _visibilityController.abort();
  _visibilityController = new AbortController();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      _pararRefresh();
      _pararSugRefresh();
      _limparChats();
    } else {
      _pararRefresh();
      _limparChats();
      carregarChamados(true);
      _refreshInterval = setInterval(() => carregarChamados(true), 5000);
      if (abaAtiva === 'sugestoes') _iniciarSugRefresh();
    }
  }, { signal: _visibilityController.signal });

  function _estaAtrasado(c) {
    if (!c.prazo) return false;
    if (['concluido', 'encerrado', 'cancelado'].includes(c.status)) return false;
    const iso = c.prazo.includes('T') ? c.prazo : c.prazo.replace(' ', 'T');
    return new Date(iso.endsWith('Z') ? iso : iso + 'Z') < new Date();
  }

  function _scorePrio(c) {
    if (c.prioridade === 'urgente') return 0;
    if (_estaAtrasado(c))           return 1;
    if (c.prioridade === 'alta')    return 2;
    if (c.prioridade === 'media')   return 3;
    if (c.prioridade === 'baixa')   return 4;
    return 5;
  }

  function renderListaChamados(todos, aba) {
    const lista = document.getElementById('lista-usuario');

    if (aba === 'cancelados') {
      _limparChats();
      const cancelados = todos.filter(c => c.status === 'cancelado')
        .sort((a, b) => new Date(b.cancelado_em || b.atualizado_em || b.criado_em) - new Date(a.cancelado_em || a.atualizado_em || a.criado_em));
      if (!cancelados.length) {
        lista.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div><p>Nenhum chamado cancelado.</p></div>`;
        return;
      }
      lista.innerHTML = cancelados.map(c => `
        <div class="chamado-card-usuario encerrado" style="border-left:3px solid #fca5a5">
          <div class="chamado-card-header">
            <div class="flex gap-1 flex-wrap" style="align-items:center">
              <span style="font-family:monospace;font-size:.78rem;font-weight:700;color:var(--text-muted);background:rgba(0,0,0,.05);padding:.18rem .45rem;border-radius:4px">#${c.id}</span>
              ${badgeStatus(c.status)}
            </div>
            <span class="text-muted" style="font-size:.76rem">${fmtData(c.criado_em)}</span>
          </div>
          <div class="chamado-card-setor">${c.setor}${c.ramal ? ` <span style="color:var(--text-muted);font-size:.8rem;font-weight:400">· Ramal ${c.ramal}</span>` : ''}</div>
          <div class="chamado-card-desc">${c.descricao}</div>
          <div class="solucao-box" style="border-left-color:#fca5a5;background:#fef2f2">
            <strong style="color:#b91c1c">Motivo do cancelamento:</strong>
            <span style="color:#7f1d1d">${c.cancelamento_motivo || '<em style="opacity:.7">Não informado.</em>'}</span>
          </div>
        </div>
      `).join('');
      return;
    }

    const filtrados = (aba === 'abertos'
      ? todos.filter(c => ['aberto', 'em_andamento', 'aguardando_compra', 'aguardando_chegar'].includes(c.status))
      : todos.filter(c => ['concluido', 'encerrado'].includes(c.status)))
      .sort((a, b) => {
        const prioDiff = _scorePrio(a) - _scorePrio(b);
        if (prioDiff !== 0) return prioDiff;
        if (!a.prazo && !b.prazo) return new Date(b.criado_em) - new Date(a.criado_em);
        if (!a.prazo) return 1;
        if (!b.prazo) return -1;
        const prazoDiff = new Date(a.prazo) - new Date(b.prazo);
        if (prazoDiff !== 0) return prazoDiff;
        return new Date(b.criado_em) - new Date(a.criado_em);
      });

    if (!filtrados.length) {
      _limparChats();
      const msg = aba === 'abertos' ? 'Nenhum chamado em aberto.' : 'Nenhum chamado encerrado ainda.';
      lista.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>
            </svg>
          </div>
          <p>${msg}</p>
        </div>`;
      return;
    }

    // Limpeza seletiva: só encerra intervalos de chamados que saíram do set ativo
    const ativosIds = new Set(
      filtrados.filter(c => ['aberto', 'em_andamento', 'aguardando_compra', 'aguardando_chegar'].includes(c.status)).map(c => c.id)
    );
    _chatIntervals.forEach((iv, id) => { if (!ativosIds.has(id)) { clearInterval(iv); _chatIntervals.delete(id); } });

    // Preservar texto digitado nos chats antes de re-renderizar
    const chatState = {};
    filtrados.forEach(c => {
      const inp = document.getElementById('chat-input-' + c.id);
      if (inp) chatState[c.id] = { value: inp.value, focused: document.activeElement === inp };
    });

    lista.innerHTML = filtrados.map(c => renderCardChamado(c)).join('');

    // Restaurar texto e foco depois de re-renderizar
    Object.entries(chatState).forEach(([id, s]) => {
      const inp = document.getElementById('chat-input-' + id);
      if (!inp) return;
      if (s.value) inp.value = s.value;
      if (s.focused) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    });

    filtrados.filter(c => c.status === 'concluido' && c.nota === null).forEach(c => {
      const form = document.getElementById(`form-avaliacao-${c.id}`);
      if (!form) return;
      const stars = form.querySelectorAll('.star-btn');
      const notaInput = form.querySelector('.nota-valor');
      stars.forEach(btn => {
        btn.addEventListener('click', () => {
          notaInput.value = btn.dataset.nota;
          stars.forEach(b => b.classList.toggle('ativo', parseInt(b.dataset.nota) <= parseInt(btn.dataset.nota)));
        });
      });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById(`msg-av-${c.id}`);
        const nota = notaInput.value;
        if (!nota) { msg.innerHTML = '<div class="alert alert-danger">Selecione uma nota.</div>'; return; }
        const btn = form.querySelector('button[type=submit]');
        btn.disabled = true; btn.textContent = 'Enviando...';
        try {
          const r = await apiFetch(`/api/chamados/${c.id}/avaliar`, {
            method: 'POST',
            body: JSON.stringify({ nota: parseInt(nota), comentario_avaliacao: form.querySelector('.comentario-av').value }),
          });
          const d = await r.json();
          if (!r.ok) { msg.innerHTML = `<div class="alert alert-danger">${d.erro}</div>`; return; }
          await carregarChamados();
        } catch { msg.innerHTML = '<div class="alert alert-danger">Erro ao enviar.</div>'; }
        finally { btn.disabled = false; btn.textContent = 'Enviar avaliação'; }
      });
    });

    filtrados.filter(c => ['concluido', 'encerrado'].includes(c.status)).forEach(c => {
      const btn = document.getElementById(`btn-reabrir-${c.id}`);
      if (btn) btn.addEventListener('click', () => abrirModalReabertura(c.id));
    });

    filtrados.filter(c =>
      (['hardware', 'processo_compra'].includes(c.categoria) &&
       ['concluido', 'encerrado'].includes(c.status) &&
       !c._termoAceito) ||
      (c.requer_acordo &&
       ['aberto', 'em_andamento', 'aguardando_compra', 'aguardando_chegar'].includes(c.status) &&
       !c._termoAceito)
    ).forEach(c => {
      const btn = document.getElementById(`btn-termo-${c.id}`);
      if (btn) btn.addEventListener('click', () => abrirModalTermo(c.id, c));
    });

    filtrados.filter(c => ativosIds.has(c.id)).forEach(c => _iniciarChat(c.id));

    filtrados.filter(c => c.novidades_usuario > 0).forEach(c => {
      const card = document.querySelector(`.chamado-card-usuario[data-cid="${c.id}"]`);
      if (!card) return;
      let _timer = null;
      const obs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          _timer = setTimeout(() => {
            apiFetch(`/api/usuarios/chamados/${c.id}/lido`, { method: 'POST' }).catch(() => {});
            card.querySelector('.badge-novidades-usuario')?.remove();
            c.novidades_usuario = 0;
            obs.disconnect();
          }, 1500);
        } else {
          clearTimeout(_timer);
        }
      }, { threshold: 0.3 });
      obs.observe(card);
    });
  }

  async function abrirModalReabertura(chamadoId) {
    const existing = document.getElementById('reabrir-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'reabrir-overlay';
    overlay.className = 'assinatura-overlay';
    overlay.innerHTML = `
      <div class="assinatura-modal">
        <div class="assinatura-modal-header">
          <div class="assinatura-modal-title">Reabrir chamado</div>
          <button class="modal-close" id="btn-fechar-reabrir" aria-label="Fechar">&#x2715;</button>
        </div>
        <div class="assinatura-modal-body">
          <p class="assinatura-instrucao">Descreva o problema atual. A descrição anterior e a nova ficam salvas no histórico.</p>
          <div class="form-group" style="margin-bottom:.75rem">
            <label style="font-size:.8rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:.35rem">Nova descrição do problema <span style="color:#dc2626">*</span></label>
            <textarea id="reabrir-descricao" class="form-control" rows="5" maxlength="2000" placeholder="Descreva o problema com detalhes (mínimo 10 caracteres)..." style="resize:vertical"></textarea>
            <div style="text-align:right;font-size:.7rem;color:var(--text-muted);margin-top:.2rem"><span id="reabrir-cnt">0</span>/2000</div>
          </div>
          <div id="msg-reabrir"></div>
          <div class="assinatura-btns">
            <button class="btn btn-secondary btn-sm" id="btn-cancelar-reabrir">Cancelar</button>
            <button class="btn btn-primary" id="btn-confirmar-reabrir">Reabrir chamado</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const textarea = document.getElementById('reabrir-descricao');
    const cnt = document.getElementById('reabrir-cnt');
    textarea.addEventListener('input', () => { cnt.textContent = textarea.value.length; });

    document.getElementById('btn-fechar-reabrir').addEventListener('click', () => overlay.remove());
    document.getElementById('btn-cancelar-reabrir').addEventListener('click', () => overlay.remove());

    document.getElementById('btn-confirmar-reabrir').addEventListener('click', async () => {
      const msgEl = document.getElementById('msg-reabrir');
      const btn = document.getElementById('btn-confirmar-reabrir');
      const texto = textarea.value.trim();
      if (texto.length < 10) {
        msgEl.innerHTML = '<div class="alert alert-danger">A descrição deve ter pelo menos 10 caracteres.</div>';
        textarea.focus();
        return;
      }
      btn.disabled = true; btn.textContent = 'Reabrindo...';
      try {
        const r = await apiFetch(`/api/usuarios/chamados/${chamadoId}/reabrir`, {
          method: 'POST',
          body: JSON.stringify({ nova_descricao: texto }),
        });
        const d = await r.json();
        if (!r.ok) { msgEl.innerHTML = `<div class="alert alert-danger">${d.erro}</div>`; return; }
        overlay.remove();
        await carregarChamados();
      } catch { msgEl.innerHTML = '<div class="alert alert-danger">Erro de conexão.</div>'; }
      finally { if (btn.isConnected) { btn.disabled = false; btn.textContent = 'Reabrir chamado'; } }
    });

    textarea.focus();
  }

  async function abrirModalTermo(chamadoId, chamado) {
    const existing = document.getElementById('termo-overlay');
    if (existing) existing.remove();

    const hoje = new Date().toLocaleDateString('pt-BR', {
      timeZone: 'America/Fortaleza', day: '2-digit', month: '2-digit', year: 'numeric',
    });
    const nomeUsuario = (chamado && chamado.nome) || '';
    const adminNome   = (chamado && chamado.admin_nome) || '';
    const setoratual  = (chamado && (chamado.usuario_setor || chamado.setor)) || '';
    const equipamentosAdmin = (() => {
      try {
        const raw = chamado && chamado.acordo_equipamentos ? JSON.parse(chamado.acordo_equipamentos) : null;
        return Array.isArray(raw) ? raw.filter(r => r.tipo || r.marca || r.modelo) : null;
      } catch { return null; }
    })();
    const temEquipamentosAdmin = Array.isArray(equipamentosAdmin) && equipamentosAdmin.length > 0;

    const setorGrupos = [
      ['Hospedagem', ['Recepção','Concierge','Governança','Reservas','Mensageria / Portaria']],
      ['Alimentos & Bebidas', ['Restaurante Mucuripe','Restaurante Mangostin','Bar Rooftop','Lobby Bar','Room Service','Cozinha','Confeitaria / Padaria','Nutrição','Banquetes']],
      ['Eventos', ['Eventos e Convenções']],
      ['Bem-estar & Lazer', ['Spa by L\'Occitane','Fitness Center','Piscina','Play Gran']],
      ['Administrativo', ['Gerência Geral','Recursos Humanos','Financeiro','Controladoria','Compras / Almoxarifado','Comercial / Vendas','Marketing','Revenue Management','Tecnologia da Informação','Jurídico']],
      ['Operacional', ['Manutenção','Segurança','Lavanderia','Rouparia','Estacionamento','Transportes']],
    ];
    const setorOptions = setorGrupos.map(([grupo, itens]) =>
      `<optgroup label="${grupo}">${itens.map(s => `<option${s === setoratual ? ' selected' : ''}>${s}</option>`).join('')}</optgroup>`
    ).join('');

    const overlay = document.createElement('div');
    overlay.id = 'termo-overlay';
    overlay.className = 'assinatura-overlay';
    overlay.innerHTML = `
      <div class="assinatura-modal termo-doc-modal">
        <div class="assinatura-modal-header">
          <div class="assinatura-modal-title">Termo de Responsabilidade</div>
          <button class="modal-close" id="btn-fechar-termo" aria-label="Fechar">&#x2715;</button>
        </div>
        <div class="assinatura-modal-body termo-doc-body">

          <div class="termo-doc">
            <div class="termo-doc-header">
              <img src="https://letsimage.s3.amazonaws.com/editor/granmarquise/imgs/1760033174793-hotelgranmarquise_pos_footer.png"
                   alt="Gran Marquise" class="termo-logo">
              <div class="termo-empresa">Hotel Gran Marquise</div>
              <div class="termo-titulo">Termo de Responsabilidade de Equipamentos</div>
            </div>

            <div class="termo-field-row">
              <span class="termo-label">Eu</span>
              <span class="termo-value-fixed">${nomeUsuario}</span>
              <span class="termo-label">Empresa:</span>
              <span class="termo-value-fixed">Hotel Gran Marquise</span>
            </div>
            <div class="termo-field-row">
              <span class="termo-label">Setor:</span>
              <select id="termo-setor" class="termo-input termo-select">${setorOptions}</select>
              <span class="termo-label">Cargo:</span>
              <input id="termo-cargo" type="text" class="termo-input" placeholder="Informe o cargo" maxlength="100">
            </div>

            <div class="termo-texto">
              estou recebendo emprestado o equipamento abaixo discriminado pelo setor de
              TI – Tecnologia da Informação. Estou ciente que o mesmo se encontra em perfeito
              estado de funcionamento. Em caso de quebra, roubo ou avaria estarei me
              responsabilizando pelo equipamento abaixo.
            </div>

            ${temEquipamentosAdmin ? `<div class="termo-texto" style="margin-top:.5rem">
              <strong>Equipamento: ${equipamentosAdmin.map(r => [r.quantidade, r.tipo, r.marca, r.modelo].filter(Boolean).join(' ')).join(', ')}</strong>
            </div>` : ''}

            <table class="termo-table">
              <thead>
                <tr>
                  <th style="width:90px">Quantidade</th>
                  <th>Tipo</th>
                  <th>Marca</th>
                  <th>Modelo</th>
                </tr>
              </thead>
              <tbody id="termo-table-body">
                ${temEquipamentosAdmin
                  ? equipamentosAdmin.map(r => `<tr>
                      <td style="text-align:center;font-weight:600">${r.quantidade || 1}</td>
                      <td>${r.tipo || ''}</td>
                      <td>${r.marca || ''}</td>
                      <td>${r.modelo || ''}</td>
                    </tr>`).join('')
                  : `<tr><td></td><td></td><td></td><td></td></tr>
                     <tr><td></td><td></td><td></td><td></td></tr>`}
              </tbody>
            </table>

            <div class="termo-footer">
              <div class="termo-date">Fortaleza, ${hoje}</div>
              <div style="display:flex;justify-content:center">
                <div class="termo-sig" style="text-align:center;min-width:220px">
                  <div style="font-weight:600;font-size:.85rem;margin-bottom:.4rem">${nomeUsuario.split(' ')[0]}</div>
                  <div class="termo-sig-line"></div>
                  <div class="termo-sig-label" style="color:#94a3b8">Assinatura do Funcionário</div>
                </div>
              </div>
            </div>
          </div>

          <div id="msg-termo"></div>
          <div class="assinatura-btns" style="margin-top:1rem">
            <button class="btn btn-secondary btn-sm" id="btn-cancelar-termo">Cancelar</button>
            <button class="btn btn-primary" id="btn-aceitar-termo">Li e Aceito o Termo</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('btn-fechar-termo').addEventListener('click', () => overlay.remove());
    document.getElementById('btn-cancelar-termo').addEventListener('click', () => overlay.remove());

    document.getElementById('btn-aceitar-termo').addEventListener('click', async () => {
      const msgEl = document.getElementById('msg-termo');
      const cargo = document.getElementById('termo-cargo').value.trim();
      if (!cargo) {
        msgEl.innerHTML = '<div class="alert alert-danger">Informe o cargo antes de aceitar.</div>';
        document.getElementById('termo-cargo').focus();
        return;
      }
      const setor = document.getElementById('termo-setor').value;
      const rows = temEquipamentosAdmin ? equipamentosAdmin : [];

      const btn = document.getElementById('btn-aceitar-termo');
      btn.disabled = true; btn.textContent = 'Registrando...';
      try {
        const r = await apiFetch(`/api/usuarios/chamados/${chamadoId}/aceitar-termo`, {
          method: 'POST',
          body: JSON.stringify({ cargo, setor, equipamentos: JSON.stringify(rows) }),
        });
        const d = await r.json();
        if (!r.ok) { msgEl.innerHTML = `<div class="alert alert-danger">${d.erro}</div>`; return; }
        overlay.remove();
        await carregarChamados();
      } catch { msgEl.innerHTML = '<div class="alert alert-danger">Erro de conexão.</div>'; }
      finally { if (btn.isConnected) { btn.disabled = false; btn.textContent = 'Li e Aceito o Termo'; } }
    });
  }

}

function renderCardChamado(c) {
  const encerrado = ['concluido', 'encerrado'].includes(c.status);

  const avaliacaoHtml = () => {
    if (c.status !== 'concluido') return '';
    if (c.nota !== null) {
      return `<div class="alert alert-success" style="margin-top:.75rem;margin-bottom:0;font-size:.85rem">
        <strong>Sua avaliação:</strong> ${c.nota}/10${c.comentario_avaliacao ? ` — <em>${c.comentario_avaliacao}</em>` : ''}
      </div>`;
    }
    return `
      <div class="avaliacao-box">
        <p style="font-size:.82rem;font-weight:600;margin-bottom:.5rem;color:var(--text)">Avalie o atendimento:</p>
        <div id="msg-av-${c.id}"></div>
        <form id="form-avaliacao-${c.id}">
          <div class="stars" style="margin-bottom:.5rem">
            ${Array.from({length:10},(_,i)=>`<button type="button" class="star-btn" data-nota="${i+1}">${i+1}</button>`).join('')}
          </div>
          <input type="hidden" class="nota-valor" value="">
          <textarea class="form-control comentario-av" maxlength="500" placeholder="Comentário (opcional)" style="margin-bottom:.5rem;min-height:60px"></textarea>
          <button type="submit" class="btn btn-primary btn-sm">Enviar avaliação</button>
        </form>
      </div>
    `;
  };

  const termoHtml = () => {
    const STATUS_ATIVOS = ['aberto', 'em_andamento', 'aguardando_compra', 'aguardando_chegar'];
    if (c.requer_acordo && STATUS_ATIVOS.includes(c.status)) {
      if (c._termoAceito) {
        return `<div class="termo-aceito-badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Acordo assinado em ${fmtData(c._termoAceitoEm)}
        </div>`;
      }
      return `<div style="display:flex;align-items:center;gap:.6rem;padding:.55rem .75rem;background:#fffbeb;border:1px solid #fcd34d;border-radius:4px;margin-top:.25rem">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span style="font-size:.8rem;color:#92400e;flex:1">Este chamado requer sua assinatura de acordo</span>
        <button class="btn btn-primary btn-sm" id="btn-termo-${c.id}">Assinar</button>
      </div>`;
    }
    if (!['hardware', 'processo_compra'].includes(c.categoria)) return '';
    if (!['concluido', 'encerrado'].includes(c.status)) return '';
    if (c._termoAceito) {
      return `<div class="termo-aceito-badge">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        Termo de Responsabilidade aceito em ${fmtData(c._termoAceitoEm)}
      </div>`;
    }
    return `<button class="btn-termo-responsabilidade" id="btn-termo-${c.id}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      Termo de Responsabilidade
    </button>`;
  };

  const reabrirHtml = () => {
    if (!encerrado) return '';
    const dataRef = c.concluido_em || c.atualizado_em;
    const diasFechado = (() => {
      if (!dataRef) return 0;
      const iso = dataRef.includes('T') ? dataRef : dataRef.replace(' ', 'T');
      const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
      return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    })();
    const expirado = diasFechado >= 7;
    const restantes = 7 - diasFechado;
    const svg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>`;
    if (expirado) {
      return `<button class="btn-reabrir-chamado" disabled title="Prazo expirado — o chamado foi fechado há mais de 7 dias. Abra um novo chamado se o problema persistir.">
        ${svg} Reabrir chamado · prazo expirado
      </button>`;
    }
    const aviso = restantes <= 2 ? ` · ${restantes}d restante${restantes === 1 ? '' : 's'}` : '';
    return `<button class="btn-reabrir-chamado" id="btn-reabrir-${c.id}" title="Você pode reabrir este chamado por mais ${restantes} dia${restantes === 1 ? '' : 's'}">
      ${svg} Reabrir chamado${aviso}
    </button>`;
  };

  const chatHtml = !encerrado ? `
    <div class="chat-wrap">
      <div class="chat-header">Conversa com o Suporte</div>
      <div class="chat-messages" id="chat-msgs-${c.id}" data-cnt="0">
        <div class="chat-vazio">Carregando...</div>
      </div>
      <div class="chat-send-error" id="chat-err-${c.id}"></div>
      <div id="chat-file-chip-${c.id}" style="display:none;font-size:.75rem;color:var(--text-secondary);padding:.2rem .5rem .1rem;align-items:center;gap:.35rem">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        <span id="chat-file-name-${c.id}" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span>
        <button type="button" data-cid="${c.id}" class="btn-chat-file-clear" style="background:none;border:none;cursor:pointer;padding:0;font-size:.85rem;color:var(--text-muted)" title="Remover">✕</button>
      </div>
      <form class="chat-input-row" id="chat-form-${c.id}">
        <input type="file" id="chat-file-${c.id}" style="display:none" accept="image/*,video/*,.pdf,.txt,.docx">
        <button type="button" data-cid="${c.id}" class="btn-chat-anexo btn btn-secondary btn-sm" title="Anexar arquivo" style="padding:.32rem .55rem;flex-shrink:0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        </button>
        <input type="text" class="chat-input" id="chat-input-${c.id}" placeholder="Escreva uma mensagem para o suporte..." maxlength="1000" autocomplete="off">
        <button type="submit" class="btn btn-primary btn-sm">Enviar</button>
      </form>
    </div>
  ` : '';

  return `
    <div class="chamado-card-usuario${encerrado ? ' encerrado' : ''}" data-cid="${c.id}">
      <div class="chamado-card-header">
        <div class="flex gap-1 flex-wrap" style="align-items:center">
          <span title="Informe este ID ao suporte para identificar seu chamado" style="font-family:monospace;font-size:.78rem;font-weight:700;color:var(--text-muted);background:rgba(0,0,0,.05);padding:.18rem .45rem;border-radius:4px;cursor:help">#${c.id}</span>
          ${badgeStatus(c.status)}
          ${c.novidades_usuario > 0 ? `<span class="badge-novidades-usuario" data-cid="${c.id}" title="${c.novidades_usuario} atualização${c.novidades_usuario > 1 ? 'ões' : ''} nova${c.novidades_usuario > 1 ? 's' : ''}">${c.novidades_usuario} novo${c.novidades_usuario > 1 ? 's' : ''}</span>` : ''}
        </div>
        <span class="text-muted" style="font-size:.76rem">${fmtData(c.criado_em)}</span>
      </div>
      ${c.aberto_por_admin_id ? `<div class="badge-criado-por-admin">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        ${c.aberto_por_admin_is_master ? 'Admin Master' : 'Administrador'} <strong>${c.aberto_por_admin_nome}</strong> criou esse chamado por você
      </div>` : ''}
      <div class="chamado-card-setor">${c.setor} <span style="color:var(--text-muted);font-family:Inter,sans-serif;font-size:.8rem;font-weight:400">· Ramal ${c.ramal}</span></div>
      <div class="chamado-card-desc">${c.descricao}</div>
      ${c.admin_nome ? `<div style="font-size:.75rem;color:var(--gold-dark);font-weight:600;margin-top:.4rem;letter-spacing:.02em">Responsável: <span style="color:var(--text-secondary);font-weight:400">${c.admin_nome}</span>${c.admin_ramal ? `<span style="color:var(--text-muted);font-weight:400"> · Ramal <strong style="color:var(--text-secondary);font-weight:600">${c.admin_ramal}</strong></span>` : ''}</div>` : ''}
      ${c.prazo ? `<div style="font-size:.74rem;color:var(--text-muted);margin-top:.2rem">Prazo: ${fmtData(c.prazo)}</div>` : ''}
      ${c.solucao ? `<div class="solucao-box"><strong>Solução:</strong> ${c.solucao}</div>` : ''}
      ${termoHtml()}
      ${avaliacaoHtml()}
      ${reabrirHtml()}
      ${chatHtml}
    </div>
  `;
}

function renderFormChamado(usuario, container, onSuccess, onCancel = onSuccess) {
  container.innerHTML = `
    <div class="card" style="margin-top:1rem;border-top:2px solid var(--gold);border-left:none">
      <div class="card-header" style="border-bottom-color:rgba(197,165,90,.18)">
        <div class="card-title" style="font-family:'Cormorant Garamond',Georgia,serif;font-size:1.05rem;letter-spacing:.01em">Novo Chamado</div>
      </div>
      <div id="msg-form-chamado"></div>
      <form id="form-chamado-usuario" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label for="ch-setor">Setor <span class="req">*</span></label>
            <select class="form-control" id="ch-setor" required>
              <option value="">Selecione seu setor...</option>
              <optgroup label="Hospedagem">
                <option>Recepção</option>
                <option>Concierge</option>
                <option>Governança</option>
                <option>Reservas</option>
                <option>Mensageria / Portaria</option>
              </optgroup>
              <optgroup label="Alimentos &amp; Bebidas">
                <option>Restaurante Mucuripe</option>
                <option>Restaurante Mangostin</option>
                <option>Bar Rooftop</option>
                <option>Lobby Bar</option>
                <option>Room Service</option>
                <option>Cozinha</option>
                <option>Confeitaria / Padaria</option>
                <option>Nutrição</option>
                <option>Banquetes</option>
              </optgroup>
              <optgroup label="Eventos">
                <option>Eventos e Convenções</option>
              </optgroup>
              <optgroup label="Bem-estar &amp; Lazer">
                <option>Spa by L'Occitane</option>
                <option>Fitness Center</option>
                <option>Piscina</option>
                <option>Play Gran</option>
              </optgroup>
              <optgroup label="Administrativo">
                <option>Gerência Geral</option>
                <option>Recursos Humanos</option>
                <option>Financeiro</option>
                <option>Controladoria</option>
                <option>Compras / Almoxarifado</option>
                <option>Comercial / Vendas</option>
                <option>Marketing</option>
                <option>Revenue Management</option>
                <option>Tecnologia da Informação</option>
                <option>Jurídico</option>
              </optgroup>
              <optgroup label="Operacional">
                <option>Manutenção</option>
                <option>Segurança</option>
                <option>Lavanderia</option>
                <option>Rouparia</option>
                <option>Estacionamento</option>
                <option>Transportes</option>
              </optgroup>
            </select>
          </div>
          <div class="form-group">
            <label for="ch-categoria">Serviço <span style="font-weight:400;color:var(--text-muted)">(opcional)</span></label>
            <select class="form-control" id="ch-categoria">
              <option value="">Classificar automaticamente</option>
              <option value="acesso_senha">Acesso / Senha</option>
              <option value="cameras">Câmeras / CFTV</option>
              <option value="celular">Celular</option>
              <option value="email">E-mail</option>
              <option value="hardware">Hardware</option>
              <option value="impressora">Impressora</option>
              <option value="monitor">Monitor</option>
              <option value="mouse">Mouse</option>
              <option value="nobreak">Nobreak</option>
              <option value="outros">Outros</option>
              <option value="processo_compra">Processo de Compra</option>
              <option value="projetor">Projetor</option>
              <option value="ramal">Ramal / Telefone</option>
              <option value="rede">Rede / Internet</option>
              <option value="software">Software</option>
              <option value="tablet">Tablet</option>
              <option value="teclado">Teclado</option>
              <option value="tv_projetor">TV</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="ch-descricao">Descrição do problema <span class="req">*</span></label>
          <textarea class="form-control" id="ch-descricao" required minlength="10" maxlength="2000" placeholder="Descreva o problema com detalhes..."></textarea>
        </div>
        <div class="form-group">
          <label>Anexos (opcional)</label>
          <button type="button" class="anexo-uploader-add" id="btn-add-anexo-ch">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Adicionar arquivos
          </button>
          <input type="file" id="ch-anexo" multiple accept="image/*,video/*,.pdf,.txt,.docx" style="display:none">
          <div class="anexo-tiles" id="ch-anexo-tiles"></div>
          <p class="form-hint" id="ch-anexo-hint">Você pode clicar várias vezes para adicionar mais arquivos. Até 10, máx. 200 MB cada.</p>
        </div>
        <div style="display:flex;gap:.5rem">
          <button type="submit" class="btn btn-primary" id="btn-enviar-chamado">Enviar Chamado</button>
          <button type="button" class="btn btn-secondary" id="btn-cancelar-chamado">Cancelar</button>
        </div>
      </form>
    </div>
  `;

  if (usuario.setor) {
    const sel = document.getElementById('ch-setor');
    sel.value = usuario.setor;
    if (!sel.value) {
      // Setor do cadastro não existe na lista — adiciona dinamicamente
      const og = sel.querySelector('optgroup[label="Outros"]') || (() => {
        const g = document.createElement('optgroup');
        g.label = 'Outros';
        sel.appendChild(g);
        return g;
      })();
      const opt = document.createElement('option');
      opt.value = usuario.setor;
      opt.textContent = usuario.setor;
      og.appendChild(opt);
      sel.value = usuario.setor;
    }
  }

  document.getElementById('btn-cancelar-chamado').addEventListener('click', onCancel);

  const _CH_HINT_DEFAULT = 'Você pode clicar várias vezes para adicionar mais arquivos. Até 10, máx. 200 MB cada.';
  const _CH_IMG_RE = /\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|avif)$/i;
  const _CH_VID_RE = /\.(mp4|webm|mov|avi|mkv|wmv)$/i;
  let _chArquivos = [];

  const _fmtTam = b => b < 1024 ? b + ' B' : b < 1048576 ? (b/1024).toFixed(0) + ' KB' : (b/1048576).toFixed(1) + ' MB';

  function _renderChTiles() {
    const box = document.getElementById('ch-anexo-tiles');
    const hint = document.getElementById('ch-anexo-hint');
    if (!box) return;
    if (!_chArquivos.length) {
      box.innerHTML = '';
      if (hint) { hint.textContent = _CH_HINT_DEFAULT; hint.style.color = ''; }
      return;
    }
    box.innerHTML = _chArquivos.map((f, i) => {
      const nome = f.name.replace(/"/g, '&quot;');
      let media;
      if (_CH_IMG_RE.test(f.name)) media = `<img src="${URL.createObjectURL(f)}" alt="${nome}" loading="lazy">`;
      else if (_CH_VID_RE.test(f.name)) media = `<svg class="anexo-tile-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`;
      else media = `<svg class="anexo-tile-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
      return `<div class="anexo-tile">
        <button type="button" class="anexo-tile-remove" data-idx="${i}" aria-label="Remover" title="Remover">×</button>
        <div class="anexo-tile-media">${media}</div>
        <div class="anexo-tile-info">
          <span class="anexo-tile-name" title="${nome}">${nome}</span>
          <span class="anexo-tile-size">${_fmtTam(f.size)}</span>
        </div>
      </div>`;
    }).join('');
    if (hint) {
      hint.style.color = 'var(--gold-dark)';
      hint.textContent = `✓ ${_chArquivos.length} ${_chArquivos.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'} · clique em "Adicionar arquivos" para incluir mais`;
    }
  }

  document.getElementById('btn-add-anexo-ch').addEventListener('click', () => {
    document.getElementById('ch-anexo').click();
  });

  document.getElementById('ch-anexo').addEventListener('change', function () {
    Array.from(this.files || []).forEach(f => {
      const dup = _chArquivos.some(x => x.name === f.name && x.size === f.size);
      if (!dup && _chArquivos.length < 10) _chArquivos.push(f);
    });
    this.value = '';
    _renderChTiles();
  });

  document.getElementById('ch-anexo-tiles').addEventListener('click', (e) => {
    const btn = e.target.closest('.anexo-tile-remove');
    if (!btn) return;
    _chArquivos.splice(+btn.dataset.idx, 1);
    _renderChTiles();
  });

  document.getElementById('form-chamado-usuario').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('msg-form-chamado');
    const btn = document.getElementById('btn-enviar-chamado');
    const setor = document.getElementById('ch-setor').value;
    if (!setor) {
      msg.innerHTML = '<div class="alert alert-danger">Selecione o seu setor.</div>';
      document.getElementById('ch-setor').focus();
      return;
    }
    const descricao = document.getElementById('ch-descricao').value.trim();
    if (descricao.length < 10) {
      msg.innerHTML = '<div class="alert alert-danger">Por favor, descreva melhor o problema. A descrição precisa ter ao menos 10 caracteres para que o suporte entenda o que está acontecendo.</div>';
      document.getElementById('ch-descricao').focus();
      return;
    }
    btn.disabled = true; btn.textContent = 'Enviando...';
    try {
      const fd = new FormData();
      fd.append('nome', usuario.nome);
      fd.append('setor', document.getElementById('ch-setor').value);
      fd.append('ramal', usuario.ramal || '');
      fd.append('descricao', document.getElementById('ch-descricao').value);
      const categoria = document.getElementById('ch-categoria').value;
      if (categoria) fd.append('categoria', categoria);
      if (_chArquivos.length > 10) { msg.innerHTML = '<div class="alert alert-danger">Máximo 10 anexos por chamado.</div>'; return; }
      _chArquivos.forEach(f => fd.append('anexos', f, f.name));

      const r = await fetch('/api/chamados', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) { msg.innerHTML = `<div class="alert alert-danger">${d.erro}</div>`; return; }
      onSuccess();
    } catch { msg.innerHTML = '<div class="alert alert-danger">Erro de conexão.</div>'; }
    finally { btn.disabled = false; btn.textContent = 'Enviar Chamado'; }
  });
}
