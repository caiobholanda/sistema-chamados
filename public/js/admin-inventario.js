let adminInfo = null;
let _invCache = [];

function fmtDataHora(d) {
  if (!d) return '—';
  const iso = d.includes('T') ? d : d.replace(' ', 'T');
  const date = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' });
}

async function api(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (res.status === 401) { location.replace('/admin-login.html'); throw new Error('401'); }
  return res;
}

function mostrarToast(msg, tipo = 'ok') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast-notif';
  el.style.borderLeftColor = tipo === 'erro' ? 'var(--danger)' : 'var(--success)';
  el.innerHTML = `<button class="toast-close" onclick="this.parentElement.remove()">✕</button><strong>${msg}</strong>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Carregamento ──────────────────────────────────────────

async function carregarInventario() {
  document.getElementById('inv-lista').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  const setor = document.getElementById('f-setor').value.trim();
  const status = document.getElementById('f-status').value;
  const search = document.getElementById('f-search').value.trim();

  const params = new URLSearchParams();
  if (setor) params.set('setor', setor);
  if (status) params.set('status', status);
  if (search) params.set('search', search);

  try {
    const r = await api(`/api/admin/inventario?${params}`);
    _invCache = await r.json();
    renderInventario(_invCache);
  } catch (e) {
    if (e.message !== '401') document.getElementById('inv-lista').innerHTML = '<div style="padding:2rem;color:var(--danger)">Erro ao carregar dados.</div>';
  }
}

// ── Renderização ──────────────────────────────────────────

function renderInventario(lista) {
  const el = document.getElementById('inv-lista');
  const countEl = document.getElementById('inv-count');
  countEl.textContent = `${lista.length} equipamento${lista.length !== 1 ? 's' : ''}`;

  if (!lista.length) {
    el.innerHTML = `<div class="empty-state" style="padding:2rem;text-align:center;color:var(--text-muted)">Nenhum equipamento encontrado.</div>`;
    return;
  }

  const isMaster = adminInfo && adminInfo.is_master;

  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Setor</th>
            <th>Usuário</th>
            <th>Hostname</th>
            <th>Processador</th>
            <th>Memória</th>
            <th>HD/SSD</th>
            <th>S.O.</th>
            <th>Monitor</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${lista.map(item => `
            <tr>
              <td style="font-weight:500;white-space:nowrap">${esc(item.setor)}</td>
              <td style="color:var(--text-secondary)">${esc(item.usuario) || '—'}</td>
              <td style="font-family:monospace;font-size:.78rem;color:var(--text-secondary)">${esc(item.hostname) || '—'}</td>
              <td style="font-size:.82rem">${esc(item.processador) || '—'}</td>
              <td style="font-size:.82rem">${esc(item.memoria) || '—'}</td>
              <td style="font-size:.82rem">${esc(item.hd_ssd) || '—'}</td>
              <td style="font-size:.78rem;white-space:nowrap">${esc(item.sistema_operacional) || '—'}</td>
              <td style="font-size:.78rem;max-width:120px">
                ${item.modelo_monitor ? `<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(item.modelo_monitor)}">${esc(item.modelo_monitor)}</div>` : ''}
                ${item.entradas_monitor ? `<div style="color:var(--text-muted);font-size:.72rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(item.entradas_monitor)}">${esc(item.entradas_monitor)}</div>` : (!item.modelo_monitor ? '—' : '')}
              </td>
              <td style="white-space:nowrap">
                ${item.status === 'NOVO' ? '<span class="inv-status-tag inv-disponivel">NOVO</span>' : (item.status ? `<span class="inv-status-tag inv-em-uso" style="font-size:.72rem">${esc(item.status)}</span>` : '<span style="color:var(--text-muted)">—</span>')}
              </td>
              <td style="white-space:nowrap">
                <button class="btn btn-secondary btn-sm" onclick="abrirModal(${item.id})">Editar</button>
                ${isMaster ? `<button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="confirmarDeletar(${item.id}, '${esc(item.setor)} - ${esc(item.usuario)}')">Excluir</button>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Modal ─────────────────────────────────────────────────

function abrirModal(id) {
  document.getElementById('modal-overlay').style.display = 'flex';
  if (id) {
    // Edit
    const item = _invCache.find(i => i.id === id);
    if (item) renderFormModal(item, true);
    else {
      // Fallback: fetch if somehow not in cache
      document.getElementById('modal-body').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
      api(`/api/admin/inventario`).then(r => r.json()).then(lista => {
        const found = lista.find(i => i.id === id);
        if (found) renderFormModal(found, true);
      });
    }
  } else {
    renderFormModal({}, false);
  }
}

function fecharModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.getElementById('modal-body').innerHTML = '';
}

function renderFormModal(item, isEdit) {
  document.getElementById('modal-title').textContent = isEdit ? 'Editar Equipamento' : 'Adicionar Equipamento';

  document.getElementById('modal-body').innerHTML = `
    <form id="form-inv" style="display:flex;flex-direction:column;gap:.8rem">
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Setor <span style="color:var(--danger)">*</span></label>
          <input class="form-control" id="fi-setor" type="text" value="${esc(item.setor || '')}" placeholder="Ex: CONTROLADORIA">
        </div>
        <div class="form-group">
          <label class="form-label">Usuário</label>
          <input class="form-control" id="fi-usuario" type="text" value="${esc(item.usuario || '')}" placeholder="Nome do usuário">
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Hostname</label>
          <input class="form-control" id="fi-hostname" type="text" value="${esc(item.hostname || '')}" placeholder="Ex: CONTROL-01">
        </div>
        <div class="form-group">
          <label class="form-label">TAG</label>
          <input class="form-control" id="fi-tag" type="text" value="${esc(item.tag || '')}" placeholder="Código da tag">
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Processador</label>
          <input class="form-control" id="fi-processador" type="text" value="${esc(item.processador || '')}" placeholder="Ex: I5 12500">
        </div>
        <div class="form-group">
          <label class="form-label">Memória</label>
          <input class="form-control" id="fi-memoria" type="text" value="${esc(item.memoria || '')}" placeholder="Ex: 8GB">
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Sistema Operacional</label>
          <input class="form-control" id="fi-so" type="text" value="${esc(item.sistema_operacional || '')}" placeholder="Ex: WIN 11">
        </div>
        <div class="form-group">
          <label class="form-label">HD / SSD</label>
          <input class="form-control" id="fi-hd" type="text" value="${esc(item.hd_ssd || '')}" placeholder="Ex: SSD 256">
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Office</label>
          <input class="form-control" id="fi-office" type="text" value="${esc(item.office || '')}" placeholder="Ex: H & B 2021">
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <input class="form-control" id="fi-status" type="text" value="${esc(item.status || '')}" placeholder="Ex: NOVO, CONCLUIDO">
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Entradas do Monitor</label>
          <input class="form-control" id="fi-entradas" type="text" value="${esc(item.entradas_monitor || '')}" placeholder="Ex: VGA-D.P.">
        </div>
        <div class="form-group">
          <label class="form-label">Modelo do Monitor</label>
          <input class="form-control" id="fi-monitor" type="text" value="${esc(item.modelo_monitor || '')}" placeholder="Ex: DELL">
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Data de Troca</label>
          <input class="form-control" id="fi-troca" type="text" value="${esc(item.data_troca || '')}" placeholder="Ex: 2024">
        </div>
        <div class="form-group">
          <label class="form-label">Win 11 Atualização</label>
          <input class="form-control" id="fi-win11" type="text" value="${esc(item.atualizacao_win11 || '')}" placeholder="Ex: CONCLUIDO">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Observação</label>
        <input class="form-control" id="fi-obs" type="text" value="${esc(item.observacao || '')}" placeholder="Observações">
      </div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.25rem">
        <button type="button" class="btn btn-secondary" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-salvar-inv">${isEdit ? 'Salvar alterações' : 'Adicionar'}</button>
      </div>
    </form>
  `;

  document.getElementById('form-inv').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar-inv');
    btn.disabled = true;
    btn.textContent = 'Salvando…';

    const setor = document.getElementById('fi-setor').value.trim();
    if (!setor) { mostrarToast('Setor é obrigatório', 'erro'); btn.disabled = false; btn.textContent = isEdit ? 'Salvar alterações' : 'Adicionar'; return; }

    const body = {
      setor,
      usuario: document.getElementById('fi-usuario').value.trim(),
      hostname: document.getElementById('fi-hostname').value.trim(),
      tag: document.getElementById('fi-tag').value.trim(),
      processador: document.getElementById('fi-processador').value.trim(),
      memoria: document.getElementById('fi-memoria').value.trim(),
      sistema_operacional: document.getElementById('fi-so').value.trim(),
      hd_ssd: document.getElementById('fi-hd').value.trim(),
      office: document.getElementById('fi-office').value.trim(),
      status: document.getElementById('fi-status').value.trim(),
      entradas_monitor: document.getElementById('fi-entradas').value.trim(),
      modelo_monitor: document.getElementById('fi-monitor').value.trim(),
      data_troca: document.getElementById('fi-troca').value.trim(),
      atualizacao_win11: document.getElementById('fi-win11').value.trim(),
      observacao: document.getElementById('fi-obs').value.trim(),
    };

    try {
      const url = isEdit ? `/api/admin/inventario/${item.id}` : '/api/admin/inventario';
      const method = isEdit ? 'PATCH' : 'POST';
      const r = await api(url, { method, body: JSON.stringify(body) });
      if (!r.ok) {
        const d = await r.json();
        mostrarToast(d.erro || 'Erro ao salvar', 'erro');
        btn.disabled = false;
        btn.textContent = isEdit ? 'Salvar alterações' : 'Adicionar';
        return;
      }
      fecharModal();
      mostrarToast(isEdit ? 'Equipamento atualizado' : 'Equipamento adicionado');
      carregarInventario();
    } catch {
      btn.disabled = false;
      btn.textContent = isEdit ? 'Salvar alterações' : 'Adicionar';
    }
  });
}

async function confirmarDeletar(id, label) {
  if (!confirm(`Excluir "${label}"? Esta ação não pode ser desfeita.`)) return;
  try {
    const r = await api(`/api/admin/inventario/${id}`, { method: 'DELETE' });
    if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro ao excluir', 'erro'); return; }
    mostrarToast('Equipamento excluído');
    carregarInventario();
  } catch {}
}

// ── Debounce para filtros ─────────────────────────────────

let _debTimer = null;
function debouncedCarregar() {
  clearTimeout(_debTimer);
  _debTimer = setTimeout(carregarInventario, 350);
}

// ── Init ──────────────────────────────────────────────────

(async () => {
  try {
    const r = await api('/api/admin/me');
    if (!r.ok) { location.replace('/admin-login.html'); return; }
    adminInfo = await r.json();

    if (adminInfo.is_master) {
      document.getElementById('nav-usuarios-wrap').innerHTML = '<a href="/admin-usuarios.html">Usuários</a>';
    }

    document.getElementById('btn-logout').addEventListener('click', async () => {
      await api('/api/admin/logout', { method: 'POST' });
      location.replace('/admin-login.html');
    });

    document.getElementById('btn-novo-equip').addEventListener('click', () => abrirModal(null));
    document.getElementById('btn-fechar-modal').addEventListener('click', fecharModal);

    document.getElementById('f-setor').addEventListener('input', debouncedCarregar);
    document.getElementById('f-status').addEventListener('change', carregarInventario);
    document.getElementById('f-search').addEventListener('input', debouncedCarregar);

    await carregarInventario();
  } catch {}
})();
