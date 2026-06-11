function _esc(s) {
  return (s ?? '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const STATUS_LABELS = {
  enviada: 'Enviada',
  em_analise: 'Em Análise',
  em_producao: 'Em Produção',
  feita: 'Feita',
  negada: 'Negada',
};
const STATUS_COM_CAMPO = { feita: 'Como foi implementado', negada: 'Justificativa da negação' };

let _sugestaoAtiva = null;
let _chatInterval = null;
let _statusInterval = null;
let _listaInterval = null;
let _todosUsuarios = [];
let _statusFiltro = 'abertas';
let _listaHash = null;

function fmtData(d) {
  if (!d) return '—';
  const iso = d.includes('T') ? d : d.replace(' ', 'T');
  return new Date(iso.endsWith('Z') ? iso : iso + 'Z')
    .toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' });
}

function badge(status) {
  return `<span class="badge badge-${status}">${STATUS_LABELS[status] || status}</span>`;
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
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && _lbxEl) { _lbxEl.classList.remove('lbx-open'); _lbxResetZoom(); } });
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
document.addEventListener('click', e => { const img = e.target.closest('.lbx-img'); if (img) _abrirLightbox(img.src, img.alt); });

const _IMGS_EXT = ['jpg','jpeg','png','gif','webp','bmp','svg','heic','avif'];
function _chatAnexoHtmlSug(url, nome) {
  if (!nome) return '';
  const ext = nome.split('.').pop().toLowerCase();
  const vids = ['mp4','webm','mov','avi','mkv','wmv'];
  if (_IMGS_EXT.includes(ext))
    return `<img class="lbx-img chat-msg-img" src="${url}" alt="${nome}" loading="lazy">`;
  if (vids.includes(ext))
    return `<video class="chat-msg-video" src="${url}" controls preload="metadata"></video>`;
  return `<a class="chat-msg-anexo" href="${url}" target="_blank" rel="noopener"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>${nome}</a>`;
}

function showToast(msg, tipo = 'success') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast toast-${tipo}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

async function apiFetch(url, opts = {}) {
  return fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opts });
}

async function checarAuth() {
  const r = await apiFetch('/api/admin/me');
  if (!r.ok) { location.replace('https://hub-granmarquise.fly.dev/?next=' + encodeURIComponent(location.href)); return null; }
  return r.json();
}

async function carregarUsuarios() {
  try {
    const r = await apiFetch('/api/admin/portal-usuarios');
    if (r.ok) {
      _todosUsuarios = await r.json();
      const sel = document.getElementById('filtro-usuario');
      const nsSel = document.getElementById('ns-usuario');
      _todosUsuarios.filter(u => u.ativo).forEach(u => {
        if (sel) sel.insertAdjacentHTML('beforeend', `<option value="${u.id}">${u.nome}</option>`);
        if (nsSel) nsSel.insertAdjacentHTML('beforeend', `<option value="${u.id}">${u.nome} (${u.setor || '—'})</option>`);
      });
    }
  } catch {}
}

async function carregarSugestoes(silencioso = false) {
  const busca = (document.getElementById('filtro-busca')?.value || '').trim();
  const usuario_id = document.getElementById('filtro-usuario').value;
  const params = new URLSearchParams();
  if (_statusFiltro) params.set('status', _statusFiltro);
  if (usuario_id) params.set('usuario_id', usuario_id);
  if (busca) params.set('busca', busca);

  try {
    const r = await apiFetch('/api/sugestoes/admin?' + params.toString());
    if (!r.ok) { if (r.status === 401) location.replace('https://hub-granmarquise.fly.dev/?next=' + encodeURIComponent(location.href)); return; }
    const lista = await r.json();

    if (silencioso) {
      const novoHash = JSON.stringify(lista.map(s => [s.id, s.status, s.atualizado_em, s.campo_extra, s.msgs_nao_lidas, s.vista_admin]));
      if (novoHash === _listaHash) return;
      _listaHash = novoHash;
    } else {
      _listaHash = null;
    }

    _atualizarContadores(lista);
    renderLista(lista);

    // Atualiza badge do modal aberto se o status mudou
    if (_sugestaoAtiva) {
      const atualizado = lista.find(s => s.id === _sugestaoAtiva.id);
      if (atualizado && (atualizado.status !== _sugestaoAtiva.status || atualizado.campo_extra !== _sugestaoAtiva.campo_extra)) {
        _sugestaoAtiva = { ..._sugestaoAtiva, ...atualizado };
        document.getElementById('modal-detalhe-title').innerHTML = `Sugestão #${_sugestaoAtiva.id} ${badge(_sugestaoAtiva.status)}`;
        const selStatus = document.getElementById('sel-status');
        if (selStatus) selStatus.value = _sugestaoAtiva.status;
      }
    }
  } catch {}
}

function _atualizarContadores(lista) {
  const FECHADAS = ['feita','negada'];
  const tots = {
    abertas: lista.filter(x => !FECHADAS.includes(x.status)).length,
  };
  ['enviada','em_analise','em_producao','feita','negada'].forEach(s => { tots[s] = lista.filter(x => x.status === s).length; });
  Object.entries(tots).forEach(([s, n]) => {
    const el = document.getElementById(`cnt-${s}`);
    if (el) el.textContent = n || '';
  });
}

function renderLista(lista) {
  const el = document.getElementById('lista-sugestoes');
  if (!lista.length) {
    el.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">Nenhuma sugestão encontrada.</div>';
    return;
  }

  el.innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th style="width:50px">ID</th>
            <th>Usuário</th>
            <th>Prévia</th>
            <th style="width:130px">Status</th>
            <th style="width:130px">Criado em</th>
            <th style="width:130px">Atualizado</th>
          </tr>
        </thead>
        <tbody>
          ${lista.map(s => `
            <tr class="clickable" data-id="${s.id}" style="cursor:pointer">
              <td><strong>#${s.id}</strong>${!s.vista_admin ? ' <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#e53e3e;vertical-align:middle" title="Não visualizada"></span>' : ''}</td>
              <td>${s.usuario_nome ? _esc(s.usuario_nome) : '<em style="color:var(--text-muted)">Interno</em>'}</td>
              <td style="max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${_esc(s.texto)}">${_esc(s.texto.slice(0, 80))}${s.texto.length > 80 ? '…' : ''}</td>
              <td>${badge(s.status)}${s.msgs_nao_lidas > 0 ? ` <span style="display:inline-block;background:#e53e3e;color:#fff;border-radius:50%;font-size:.62rem;font-weight:700;padding:1px 5px;margin-left:.3rem;vertical-align:middle;line-height:1.5" title="${s.msgs_nao_lidas} mensagem(ns) não lida(s)">${s.msgs_nao_lidas}</span>` : ''}</td>
              <td>${fmtData(s.criado_em)}</td>
              <td>${fmtData(s.atualizado_em)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  el.querySelectorAll('tr.clickable').forEach(tr => {
    tr.addEventListener('click', () => abrirDetalhe(parseInt(tr.dataset.id, 10)));
  });
}

async function abrirDetalhe(id) {
  if (_chatInterval) { clearInterval(_chatInterval); _chatInterval = null; }
  if (_statusInterval) { clearInterval(_statusInterval); _statusInterval = null; }

  const r = await apiFetch(`/api/sugestoes/admin/${id}`);
  if (!r.ok) return;
  _sugestaoAtiva = await r.json();
  renderDetalhe(_sugestaoAtiva);
  document.getElementById('modal-detalhe-overlay').classList.add('open');
  _listaHash = null;
  setTimeout(() => { carregarSugestoes(true); window._navBadgeSugRefresh?.(); }, 300);
  _atualizarChat(id);
  _chatInterval = setInterval(() => _atualizarChat(id), 6000);
  _statusInterval = setInterval(async () => {
    const rr = await apiFetch(`/api/sugestoes/admin/${id}`);
    if (!rr.ok || !_sugestaoAtiva) return;
    const novo = await rr.json();
    if (novo.status !== _sugestaoAtiva.status || novo.campo_extra !== _sugestaoAtiva.campo_extra) {
      _sugestaoAtiva = novo;
      document.getElementById('modal-detalhe-title').innerHTML = `Sugestão #${novo.id} ${badge(novo.status)}`;
      const selStatus = document.getElementById('sel-status');
      if (selStatus) selStatus.value = novo.status;
    }
  }, 8000);
}

function renderDetalhe(s) {
  const el = document.getElementById('modal-detalhe-body');
  document.getElementById('modal-detalhe-title').innerHTML = `Sugestão #${s.id} ${badge(s.status)}`;

  const historico = (s.historico || []).map(h => `
    <div style="padding:.5rem 0;border-bottom:1px solid var(--border)">
      <span style="font-size:.72rem;color:var(--text-muted)">${fmtData(h.timestamp)}</span>
      ${h.admin_nome ? `<span style="font-size:.72rem;color:var(--text-secondary);margin-left:.4rem">por ${h.admin_nome}</span>` : ''}
      <div style="font-size:.82rem;margin-top:.15rem">
        ${h.status_anterior ? `<span style="color:var(--text-muted)">${STATUS_LABELS[h.status_anterior] || h.status_anterior}</span> → ` : ''}
        <strong>${STATUS_LABELS[h.status_novo] || h.status_novo}</strong>
      </div>
      ${h.campo_extra ? `<div style="font-size:.78rem;color:var(--text-secondary);margin-top:.15rem;font-style:italic">"${h.campo_extra}"</div>` : ''}
    </div>`).join('');

  const campoExtra = s.campo_extra ? `
    <div style="margin-top:.75rem;padding:.75rem;background:var(--bg);border-radius:6px;border:1px solid var(--border)">
      <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:.3rem">
        ${s.status === 'feita' ? 'Como foi implementado' : 'Justificativa da negação'}
      </div>
      <div style="font-size:.85rem">${s.campo_extra}</div>
    </div>` : '';

  el.innerHTML = `
    <div style="padding:1.25rem 1.4rem;display:flex;flex-direction:column;gap:1.25rem">

      <div style="display:flex;gap:1rem;flex-wrap:wrap">
        <div style="flex:1;min-width:120px">
          <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:.3rem">Usuário</div>
          <div style="font-size:.9rem">${s.usuario_nome ? _esc(s.usuario_nome) : '<em style="color:var(--text-muted)">Sugestão interna</em>'}</div>
        </div>
        <div style="flex:1;min-width:120px">
          <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:.3rem">Criado em</div>
          <div style="font-size:.85rem">${fmtData(s.criado_em)}</div>
        </div>
      </div>

      <div>
        <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:.4rem">Sugestão</div>
        <div style="font-size:.88rem;line-height:1.6;white-space:pre-wrap">${_esc(s.texto)}</div>
        ${campoExtra}
      </div>

      <div>
        <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:.5rem">Alterar status</div>
        <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
          <select class="form-control" id="sel-status" style="flex:1;min-width:160px">
            ${Object.entries(STATUS_LABELS).map(([v, l]) => `<option value="${v}"${s.status === v ? ' selected' : ''}>${l}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-primary btn-sm" id="btn-salvar-status">Salvar</button>
        </div>
        <div id="msg-status" style="min-height:1rem;font-size:.8rem;margin-top:.3rem"></div>
      </div>

      <div>
        <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:.5rem">Histórico de status</div>
        <div style="max-height:160px;overflow-y:auto">
          ${historico || '<div style="font-size:.82rem;color:var(--text-muted)">Sem histórico</div>'}
        </div>
      </div>

      <div>
        <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:.5rem">Chat com usuário</div>
        <div class="chat-wrap">
          <div class="chat-header">Conversa</div>
          <div class="chat-messages" id="chat-msgs-sug-${s.id}">
            <div class="chat-vazio">Carregando...</div>
          </div>
          ${s.usuario_id ? `
          <div id="file-chip-sug-${s.id}" style="display:none;font-size:.75rem;color:var(--text-secondary);padding:.2rem .5rem .1rem;align-items:center;gap:.35rem">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            <span id="file-chip-name-sug-${s.id}" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span>
            <button type="button" id="file-chip-clear-sug-${s.id}" style="background:none;border:none;cursor:pointer;padding:0;line-height:1;color:var(--text-muted);font-size:.85rem" title="Remover arquivo">✕</button>
          </div>
          <div class="chat-input-row" style="display:flex;gap:.4rem;padding:.5rem .75rem;background:var(--surface);border-top:1px solid var(--border)">
            <input type="file" id="file-input-sug-${s.id}" style="display:none" accept="image/*,video/*,.pdf,.txt,.docx">
            <button type="button" id="btn-file-sug-${s.id}" class="btn btn-secondary btn-sm" title="Anexar arquivo" style="padding:.32rem .55rem;flex-shrink:0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <input class="form-control" type="text" id="chat-input-sug-${s.id}" placeholder="Mensagem ao usuário..." maxlength="1000" style="flex:1;font-size:.85rem">
            <button type="button" class="btn btn-primary btn-sm" id="btn-chat-send-sug-${s.id}">Enviar</button>
          </div>
          <div id="chat-err-sug-${s.id}" style="font-size:.75rem;color:var(--danger);min-height:.9rem;padding:0 .75rem"></div>
          ` : '<div style="font-size:.8rem;color:var(--text-muted);padding:.5rem .75rem">Sugestão interna — sem chat disponível</div>'}
        </div>
      </div>

    </div>
  `;

  // ── Status: popup para feita/negada ────────────────────────
  const selStatus = document.getElementById('sel-status');

  document.getElementById('btn-salvar-status').addEventListener('click', () => {
    const novoStatus = selStatus.value;
    if (STATUS_COM_CAMPO[novoStatus]) {
      _abrirPopupCampoExtra(s.id, novoStatus, s.campo_extra || '');
    } else {
      _salvarStatus(s.id, novoStatus, null);
    }
  });

  // ── Chat ───────────────────────────────────────────────────
  if (s.usuario_id) {
    const chatInput = document.getElementById(`chat-input-sug-${s.id}`);
    const sendBtn = document.getElementById(`btn-chat-send-sug-${s.id}`);
    const errEl = document.getElementById(`chat-err-sug-${s.id}`);
    const fileInput = document.getElementById(`file-input-sug-${s.id}`);
    const fileChip = document.getElementById(`file-chip-sug-${s.id}`);
    const fileChipName = document.getElementById(`file-chip-name-sug-${s.id}`);
    const fileChipClear = document.getElementById(`file-chip-clear-sug-${s.id}`);
    const btnFile = document.getElementById(`btn-file-sug-${s.id}`);

    let selectedFile = null;
    function setFile(f) { selectedFile = f; fileChipName.textContent = f.name; fileChip.style.display = 'flex'; }
    function clearFile() { selectedFile = null; fileInput.value = ''; fileChip.style.display = 'none'; }

    btnFile.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => { if (fileInput.files.length) setFile(fileInput.files[0]); else clearFile(); });
    fileChipClear.addEventListener('click', clearFile);

    async function enviarMsg() {
      const texto = chatInput.value.trim();
      if (!texto && !selectedFile) return;
      sendBtn.disabled = true; errEl.textContent = '';
      try {
        let r;
        if (selectedFile) {
          const fd = new FormData();
          if (texto) fd.append('mensagem', texto);
          fd.append('chat_anexo', selectedFile, selectedFile.name || 'arquivo');
          r = await fetch(`/api/sugestoes/admin/${s.id}/mensagens`, { method: 'POST', credentials: 'same-origin', body: fd });
        } else {
          r = await apiFetch(`/api/sugestoes/admin/${s.id}/mensagens`, { method: 'POST', body: JSON.stringify({ mensagem: texto }) });
        }
        if (r.ok) { chatInput.value = ''; clearFile(); _atualizarChat(s.id); }
        else { const d = await r.json().catch(() => ({})); errEl.textContent = d.erro || 'Erro ao enviar.'; }
      } catch { errEl.textContent = 'Erro de conexão.'; }
      finally { sendBtn.disabled = false; chatInput.focus(); }
    }

    sendBtn.addEventListener('click', enviarMsg);
    chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); enviarMsg(); }
    });
  }
}

function _abrirPopupCampoExtra(sugId, status, valorAtual) {
  let overlay = document.getElementById('modal-campo-extra-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modal-campo-extra-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:420px">
        <div class="modal-header">
          <h2 id="modal-ce-title"></h2>
          <button class="modal-close" id="btn-fechar-ce">&#x2715;</button>
        </div>
        <div class="modal-body" style="padding:1.25rem 1.4rem">
          <textarea class="form-control" id="ce-input" rows="5" maxlength="1000" style="width:100%;resize:vertical"></textarea>
          <div id="ce-msg" style="min-height:1rem;font-size:.8rem;margin-top:.4rem"></div>
          <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.75rem">
            <button class="btn btn-secondary btn-sm" id="btn-ce-cancelar">Cancelar</button>
            <button class="btn btn-primary btn-sm" id="btn-ce-confirmar">Confirmar</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('btn-fechar-ce').addEventListener('click', () => overlay.classList.remove('open'));
    document.getElementById('btn-ce-cancelar').addEventListener('click', () => overlay.classList.remove('open'));
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
  }

  document.getElementById('modal-ce-title').textContent = STATUS_COM_CAMPO[status];
  const input = document.getElementById('ce-input');
  input.value = valorAtual || '';
  input.placeholder = status === 'feita' ? 'Descreva como foi implementado...' : 'Justifique a negação...';
  document.getElementById('ce-msg').textContent = '';
  overlay.classList.add('open');
  setTimeout(() => input.focus(), 80);

  const btnConf = document.getElementById('btn-ce-confirmar');
  const novoBtn = btnConf.cloneNode(true);
  btnConf.replaceWith(novoBtn);

  novoBtn.addEventListener('click', async () => {
    const valor = input.value.trim();
    if (!valor) { document.getElementById('ce-msg').innerHTML = '<span style="color:var(--danger)">Campo obrigatório.</span>'; return; }
    novoBtn.disabled = true;
    await _salvarStatus(sugId, status, valor);
    overlay.classList.remove('open');
    novoBtn.disabled = false;
  });
}

async function _salvarStatus(sugId, status, campo_extra) {
  const msgEl = document.getElementById('msg-status');
  const payload = { status };
  if (campo_extra) payload.campo_extra = campo_extra;
  try {
    const r = await apiFetch(`/api/sugestoes/admin/${sugId}/status`, { method: 'PATCH', body: JSON.stringify(payload) });
    const d = await r.json();
    if (r.ok) {
      showToast('Status atualizado');
      await carregarSugestoes();
      if (status === 'feita' || status === 'negada') {
        fecharDetalhe();
      } else {
        await abrirDetalhe(sugId);
      }
    } else {
      if (msgEl) msgEl.innerHTML = `<span style="color:var(--danger)">${_esc(d.erro)}</span>`;
    }
  } catch { if (msgEl) msgEl.innerHTML = '<span style="color:var(--danger)">Erro de conexão</span>'; }
}

function _renderMsgChat(m) {
  const mine = m.autor_tipo === 'admin';
  const texto = m.mensagem ? `<div class="chat-msg-bubble">${m.mensagem.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>` : '';
  const anexoHtml = m.chat_anexo_nome_original ? _chatAnexoHtmlSug(`/api/sugestoes/admin/${m.sugestao_id}/mensagens/${m.id}/chat-anexo`, m.chat_anexo_nome_original) : '';
  return `<div class="chat-msg ${mine ? 'mine' : 'theirs'}" data-msg-id="${m.id}">
    <div class="chat-msg-author">${_esc(m.autor_nome)}</div>
    ${texto}${anexoHtml}
    <div class="chat-msg-time">${fmtData(m.criado_em)}</div>
  </div>`;
}

async function _atualizarChat(sugestaoId) {
  const box = document.getElementById(`chat-msgs-sug-${sugestaoId}`);
  if (!box) return;
  try {
    const r = await apiFetch(`/api/sugestoes/admin/${sugestaoId}/mensagens?_t=${Date.now()}`);
    if (!r.ok) return;
    const msgs = await r.json();

    if (!msgs.length) {
      if (!box.querySelector('[data-msg-id]'))
        box.innerHTML = '<div class="chat-vazio">Nenhuma mensagem ainda.</div>';
      return;
    }

    const vazio = box.querySelector('.chat-vazio');
    if (vazio) vazio.remove();

    const rendered = new Set([...box.querySelectorAll('[data-msg-id]')].map(el => +el.dataset.msgId));
    const novas = msgs.filter(m => !rendered.has(m.id));
    if (!novas.length) return;

    const atFundo = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    const tmp = document.createElement('div');
    tmp.innerHTML = novas.map(_renderMsgChat).join('');
    while (tmp.firstChild) box.appendChild(tmp.firstChild);
    if (atFundo) box.scrollTop = box.scrollHeight;
  } catch {}
}

function fecharDetalhe() {
  if (_chatInterval) { clearInterval(_chatInterval); _chatInterval = null; }
  if (_statusInterval) { clearInterval(_statusInterval); _statusInterval = null; }
  _sugestaoAtiva = null;
  document.getElementById('modal-detalhe-overlay').classList.remove('open');
}

async function init() {
  const admin = await checarAuth();
  if (!admin) return;

  if (admin.is_master) {
    const wrap = document.getElementById('nav-usuarios-wrap');
    if (wrap) wrap.innerHTML = '<a href="/admin-usuarios.html">Usuários</a>';
  }

  await carregarUsuarios();
  await carregarSugestoes();

  // Status tabs
  document.getElementById('status-tabs').addEventListener('click', e => {
    const btn = e.target.closest('[data-status]');
    if (!btn) return;
    _statusFiltro = btn.dataset.status;
    document.querySelectorAll('#status-tabs .tab-btn').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    _listaHash = null;
    carregarSugestoes();
  });

  // Busca: filtrar ao digitar (debounce 350ms)
  let _buscaTimer = null;
  document.getElementById('filtro-busca').addEventListener('input', () => {
    clearTimeout(_buscaTimer);
    _buscaTimer = setTimeout(() => { _listaHash = null; carregarSugestoes(); }, 350);
  });
  document.getElementById('filtro-usuario').addEventListener('change', () => { _listaHash = null; carregarSugestoes(); });

  document.getElementById('btn-limpar').addEventListener('click', () => {
    document.getElementById('filtro-busca').value = '';
    document.getElementById('filtro-usuario').value = '';
    _statusFiltro = 'abertas';
    document.querySelectorAll('#status-tabs .tab-btn').forEach(b => b.classList.remove('ativo'));
    document.querySelector('#status-tabs [data-status="abertas"]').classList.add('ativo');
    _listaHash = null;
    carregarSugestoes();
  });

  // Polling lista em tempo real
  if (_listaInterval) clearInterval(_listaInterval);
  _listaInterval = setInterval(() => carregarSugestoes(true), 8000);
  window.addEventListener('beforeunload', () => {
    if (_listaInterval) clearInterval(_listaInterval);
    if (_chatInterval) clearInterval(_chatInterval);
    if (_statusInterval) clearInterval(_statusInterval);
  }, { once: true });

  document.getElementById('btn-fechar-detalhe').addEventListener('click', fecharDetalhe);
  document.getElementById('modal-detalhe-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-detalhe-overlay')) fecharDetalhe();
  });

  document.getElementById('btn-nova-sugestao').addEventListener('click', () => {
    document.getElementById('msg-nova-sugestao').innerHTML = '';
    document.getElementById('form-nova-sugestao').reset();
    document.getElementById('modal-nova-overlay').classList.add('open');
  });
  document.getElementById('btn-fechar-nova').addEventListener('click', () => {
    document.getElementById('modal-nova-overlay').classList.remove('open');
  });
  document.getElementById('modal-nova-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-nova-overlay'))
      document.getElementById('modal-nova-overlay').classList.remove('open');
  });

  document.getElementById('form-nova-sugestao').addEventListener('submit', async e => {
    e.preventDefault();
    const msgEl = document.getElementById('msg-nova-sugestao');
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    const payload = {
      texto: document.getElementById('ns-texto').value,
      usuario_id: document.getElementById('ns-usuario').value || null,
      status: document.getElementById('ns-status').value,
    };
    try {
      const r = await apiFetch('/api/sugestoes/admin', { method: 'POST', body: JSON.stringify(payload) });
      const d = await r.json();
      if (r.ok) {
        document.getElementById('modal-nova-overlay').classList.remove('open');
        showToast('Sugestão criada com sucesso');
        carregarSugestoes();
      } else {
        msgEl.innerHTML = `<div class="alert alert-danger">${_esc(d.erro)}</div>`;
      }
    } catch { msgEl.innerHTML = '<div class="alert alert-danger">Erro de conexão</div>'; }
    finally { btn.disabled = false; }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') fecharDetalhe();
  });

  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await apiFetch('/api/admin/logout', { method: 'POST' });
      location.replace('https://hub-granmarquise.fly.dev/?next=' + encodeURIComponent(location.href));
    });
  }
}

init();
