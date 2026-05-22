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
let _todosUsuarios = [];

function fmtData(d) {
  if (!d) return '—';
  const iso = d.includes('T') ? d : d.replace(' ', 'T');
  return new Date(iso.endsWith('Z') ? iso : iso + 'Z')
    .toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' });
}

function badge(status) {
  return `<span class="badge badge-${status}">${STATUS_LABELS[status] || status}</span>`;
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
  if (!r.ok) { location.replace('/admin-login.html'); return null; }
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

async function carregarSugestoes() {
  const status = document.getElementById('filtro-status').value;
  const usuario_id = document.getElementById('filtro-usuario').value;
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (usuario_id) params.set('usuario_id', usuario_id);

  const r = await apiFetch('/api/sugestoes/admin?' + params.toString());
  if (!r.ok) { if (r.status === 401) location.replace('/admin-login.html'); return; }
  const lista = await r.json();
  renderLista(lista);
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
              <td><strong>#${s.id}</strong></td>
              <td>${s.usuario_nome || '<em style="color:var(--text-muted)">Interno</em>'}</td>
              <td style="max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${s.texto.replace(/"/g,'&quot;')}">${s.texto.slice(0, 80)}${s.texto.length > 80 ? '…' : ''}</td>
              <td>${badge(s.status)}</td>
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

  const r = await apiFetch(`/api/sugestoes/admin/${id}`);
  if (!r.ok) return;
  _sugestaoAtiva = await r.json();
  renderDetalhe(_sugestaoAtiva);
  document.getElementById('modal-detalhe-overlay').classList.add('open');
  _atualizarChat(id);
  _chatInterval = setInterval(() => _atualizarChat(id), 6000);
}

function renderDetalhe(s) {
  const el = document.getElementById('modal-detalhe-body');
  document.getElementById('modal-detalhe-title').innerHTML = `Sugestão #${s.id} ${badge(s.status)}`;

  const historico = (s.historico || []).map(h => `
    <div style="display:flex;gap:.5rem;align-items:flex-start;padding:.5rem 0;border-bottom:1px solid var(--border)">
      <div style="flex:1">
        <span style="font-size:.75rem;color:var(--text-muted)">${fmtData(h.timestamp)}</span>
        ${h.admin_nome ? `<span style="font-size:.75rem;color:var(--text-secondary);margin-left:.4rem">por ${h.admin_nome}</span>` : ''}
        <div style="font-size:.82rem;margin-top:.15rem">
          ${h.status_anterior ? `<span style="color:var(--text-muted)">${STATUS_LABELS[h.status_anterior] || h.status_anterior}</span> → ` : ''}
          <strong>${STATUS_LABELS[h.status_novo] || h.status_novo}</strong>
        </div>
        ${h.campo_extra ? `<div style="font-size:.78rem;color:var(--text-secondary);margin-top:.2rem;font-style:italic">"${h.campo_extra}"</div>` : ''}
      </div>
    </div>
  `).join('');

  const campoExtra = s.campo_extra ? `
    <div style="margin-top:.75rem;padding:.75rem;background:var(--bg);border-radius:6px;border:1px solid var(--border)">
      <div style="font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:.3rem">
        ${s.status === 'feita' ? 'Como foi implementado' : 'Justificativa da negação'}
      </div>
      <div style="font-size:.85rem">${s.campo_extra}</div>
    </div>
  ` : '';

  el.innerHTML = `
    <div style="padding:1.25rem 1.4rem;display:flex;flex-direction:column;gap:1.25rem">

      <div>
        <div style="font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:.4rem">Usuário</div>
        <div style="font-size:.9rem">${s.usuario_nome || '<em style="color:var(--text-muted)">Sugestão interna</em>'}</div>
      </div>

      <div>
        <div style="font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:.4rem">Sugestão</div>
        <div style="font-size:.88rem;line-height:1.6;white-space:pre-wrap">${s.texto}</div>
        ${campoExtra}
      </div>

      <div>
        <div style="font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:.5rem">Alterar status</div>
        <form id="form-status" style="display:flex;flex-direction:column;gap:.6rem">
          <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
            <select class="form-control" id="sel-status" style="flex:1;min-width:160px">
              ${Object.entries(STATUS_LABELS).map(([v, l]) => `<option value="${v}"${s.status === v ? ' selected' : ''}>${l}</option>`).join('')}
            </select>
            <button type="submit" class="btn btn-primary btn-sm">Salvar</button>
          </div>
          <div id="campo-extra-wrap" style="display:none">
            <label id="campo-extra-label" style="font-size:.8rem;font-weight:600;margin-bottom:.25rem;display:block"></label>
            <textarea class="form-control" id="campo-extra-input" rows="3" maxlength="1000"></textarea>
          </div>
          <div id="msg-status" style="min-height:1.2rem"></div>
        </form>
      </div>

      <div>
        <div style="font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:.5rem">Histórico de status</div>
        <div style="max-height:180px;overflow-y:auto">
          ${historico || '<div style="font-size:.82rem;color:var(--text-muted)">Sem histórico</div>'}
        </div>
      </div>

      <div>
        <div style="font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:.5rem">Chat com usuário</div>
        <div class="chat-wrap">
          <div class="chat-msgs" id="chat-msgs-sug-${s.id}" style="min-height:120px;max-height:260px;overflow-y:auto">
            <div class="chat-vazio" style="padding:1rem;text-align:center;color:var(--text-muted);font-size:.82rem">Carregando...</div>
          </div>
          ${s.usuario_id ? `
          <form class="chat-form" id="chat-form-sug-${s.id}">
            <div style="display:flex;gap:.4rem;margin-top:.5rem">
              <input class="form-control" type="text" id="chat-input-sug-${s.id}" placeholder="Mensagem ao usuário..." maxlength="1000" style="flex:1">
              <button type="submit" class="btn btn-primary btn-sm">Enviar</button>
            </div>
            <div id="chat-err-sug-${s.id}" style="font-size:.78rem;color:var(--danger);min-height:1rem"></div>
          </form>
          ` : '<div style="font-size:.8rem;color:var(--text-muted);margin-top:.4rem">Sugestão interna — sem chat disponível</div>'}
        </div>
      </div>

    </div>
  `;

  const selStatus = document.getElementById('sel-status');
  const campoWrap = document.getElementById('campo-extra-wrap');
  const campoLabel = document.getElementById('campo-extra-label');
  const campoInput = document.getElementById('campo-extra-input');

  function atualizarCampoExtra() {
    const v = selStatus.value;
    if (STATUS_COM_CAMPO[v]) {
      campoWrap.style.display = 'block';
      campoLabel.textContent = STATUS_COM_CAMPO[v];
      if (s.status === v && s.campo_extra) campoInput.value = s.campo_extra;
      else if (s.status !== v) campoInput.value = '';
    } else {
      campoWrap.style.display = 'none';
      campoInput.value = '';
    }
  }
  atualizarCampoExtra();
  selStatus.addEventListener('change', atualizarCampoExtra);

  document.getElementById('form-status').addEventListener('submit', async e => {
    e.preventDefault();
    const msgEl = document.getElementById('msg-status');
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    const payload = { status: selStatus.value };
    if (STATUS_COM_CAMPO[selStatus.value]) payload.campo_extra = campoInput.value.trim();
    try {
      const r = await apiFetch(`/api/sugestoes/admin/${s.id}/status`, { method: 'PATCH', body: JSON.stringify(payload) });
      const d = await r.json();
      if (r.ok) {
        showToast('Status atualizado');
        await carregarSugestoes();
        await abrirDetalhe(s.id);
      } else {
        msgEl.innerHTML = `<span style="color:var(--danger)">${d.erro}</span>`;
      }
    } catch { msgEl.innerHTML = '<span style="color:var(--danger)">Erro de conexão</span>'; }
    finally { btn.disabled = false; }
  });

  if (s.usuario_id) {
    const chatForm = document.getElementById(`chat-form-sug-${s.id}`);
    const chatInput = document.getElementById(`chat-input-sug-${s.id}`);
    chatForm.addEventListener('submit', async e => {
      e.preventDefault();
      const texto = chatInput.value.trim();
      if (!texto) return;
      const btn = chatForm.querySelector('[type=submit]');
      btn.disabled = true;
      try {
        const r = await apiFetch(`/api/sugestoes/admin/${s.id}/mensagens`, { method: 'POST', body: JSON.stringify({ mensagem: texto }) });
        if (r.ok) { chatInput.value = ''; _atualizarChat(s.id); }
        else { document.getElementById(`chat-err-sug-${s.id}`).textContent = 'Erro ao enviar.'; }
      } catch { document.getElementById(`chat-err-sug-${s.id}`).textContent = 'Erro de conexão.'; }
      finally { btn.disabled = false; chatInput.focus(); }
    });
  }
}

function _renderMsgChat(m) {
  const mine = m.autor_tipo === 'admin';
  const texto = m.mensagem ? `<div class="chat-msg-bubble">${m.mensagem.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>` : '';
  return `<div class="chat-msg ${mine ? 'mine' : 'theirs'}" data-msg-id="${m.id}">
    <div class="chat-msg-author">${m.autor_nome}</div>
    ${texto}
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
        box.innerHTML = '<div class="chat-vazio" style="padding:1rem;text-align:center;color:var(--text-muted);font-size:.82rem">Nenhuma mensagem ainda.</div>';
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
  _sugestaoAtiva = null;
  document.getElementById('modal-detalhe-overlay').classList.remove('open');
}

async function init() {
  const admin = await checarAuth();
  if (!admin) return;

  await carregarUsuarios();
  await carregarSugestoes();

  document.getElementById('btn-filtrar').addEventListener('click', carregarSugestoes);
  document.getElementById('btn-atualizar').addEventListener('click', carregarSugestoes);
  document.getElementById('btn-limpar').addEventListener('click', () => {
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-usuario').value = '';
    carregarSugestoes();
  });

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
        msgEl.innerHTML = `<div class="alert alert-danger">${d.erro}</div>`;
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
      location.replace('/admin-login.html');
    });
  }
}

init();
