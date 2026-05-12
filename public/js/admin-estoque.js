let adminInfo = null;
let abaAtiva = 'toner';
let _tonerCache = [];
let _impressorasCache = [];
let _patrimonioCache = [];

const TIPO_LABELS = {
  toner_mono: 'Toner Mono',
  toner_color: 'Toner Color',
  resma: 'Resma/Papel',
  outro: 'Outro',
};

const COR_LABELS = {
  preto: 'Preto',
  ciano: 'Ciano',
  magenta: 'Magenta',
  amarelo: 'Amarelo',
  geral: 'Geral',
};

const STATUS_PAT_LABELS = {
  disponivel: 'Disponível',
  em_uso: 'Em uso',
  manutencao: 'Manutenção',
  descartado: 'Descartado',
};

const STATUS_PAT_COLORS = {
  disponivel: { bg: 'var(--success)', color: '#fff' },
  em_uso:     { bg: 'var(--navy)',    color: '#fff' },
  manutencao: { bg: '#d97706',        color: '#fff' },
  descartado: { bg: 'var(--danger)',  color: '#fff' },
};

const TIPOS_MOV_PAT_LABELS = {
  entrada:    '+ Entrada',
  saida:      '→ Saída',
  retorno:    '← Retorno',
  manutencao: '⚙ Manutenção',
  descarte:   '✕ Descarte',
};

const TIPOS_MOV_PAT_COLORS = {
  entrada:    'var(--success)',
  saida:      'var(--navy)',
  retorno:    '#0ea5e9',
  manutencao: '#d97706',
  descarte:   'var(--danger)',
};

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

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

async function carregarDados() {
  document.getElementById('estoque-lista').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    if (abaAtiva === 'toner') {
      const r = await api('/api/admin/estoque/itens');
      _tonerCache = await r.json();
      renderToner(_tonerCache);
    } else if (abaAtiva === 'impressoras') {
      const r = await api('/api/admin/estoque/impressoras');
      _impressorasCache = await r.json();
      renderImpressoras(_impressorasCache);
    } else {
      const params = new URLSearchParams();
      const busca = document.getElementById('pat-busca')?.value.trim();
      const status = document.getElementById('pat-status')?.value;
      if (busca) params.set('busca', busca);
      if (status) params.set('status', status);
      const qs = params.toString();
      const r = await api('/api/admin/estoque/patrimonio' + (qs ? '?' + qs : ''));
      _patrimonioCache = await r.json();
      renderPatrimonio(_patrimonioCache);
    }
  } catch (e) {
    if (e.message !== '401') document.getElementById('estoque-lista').innerHTML = '<div style="padding:2rem;color:var(--danger)">Erro ao carregar dados.</div>';
  }
}

// ── Renderização Toner ────────────────────────────────────

function qtdCell(v, tipo) {
  if (v === 0) return `<span style="color:var(--danger);font-weight:600">0</span>`;
  if (v > 0) return `<span style="color:var(--success);font-weight:500">${v}</span>`;
  return '<span style="color:var(--text-muted)">—</span>';
}

function formatAlocacoes(alocacoes) {
  if (!alocacoes || !alocacoes.length) return '<span style="color:var(--text-muted)">—</span>';
  const map = {};
  for (const a of alocacoes) {
    if (!map[a.setor]) map[a.setor] = 0;
    map[a.setor] += a.total;
  }
  return Object.entries(map)
    .map(([setor, total]) => `<span class="itens-cat-tag" style="font-size:.72rem;background:var(--gold-pale);color:var(--navy)">${esc(setor)} (${total})</span>`)
    .join(' ');
}

function renderToner(lista) {
  const el = document.getElementById('estoque-lista');
  const urgentes = lista.filter(i => i.urgente).length;
  document.getElementById('badge-toner').textContent = lista.length || '';

  if (!lista.length) {
    el.innerHTML = `<div class="empty-state" style="padding:2rem;text-align:center;color:var(--text-muted)">Nenhum item cadastrado. Clique em "+ Novo Item".</div>`;
    return;
  }

  const isMaster = adminInfo && adminInfo.is_master;

  el.innerHTML = `
    ${urgentes ? `<div class="itens-alerta-bar" style="margin-bottom:.75rem">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      ${urgentes} ${urgentes === 1 ? 'item marcado' : 'itens marcados'} como urgente
    </div>` : ''}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Tipo</th>
            <th style="text-align:center">Preto</th>
            <th style="text-align:center">Ciano</th>
            <th style="text-align:center">Magenta</th>
            <th style="text-align:center">Amarelo</th>
            <th style="text-align:center">Geral</th>
            <th style="text-align:center">Urgente</th>
            <th>Com setores</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${lista.map(item => `
            <tr${item.urgente ? ' style="background:rgba(220,38,38,.04)"' : ''}>
              <td style="font-weight:500">${esc(item.nome)}</td>
              <td><span class="itens-cat-tag">${esc(TIPO_LABELS[item.tipo] || item.tipo)}</span></td>
              <td style="text-align:center">${item.tipo === 'resma' || item.tipo === 'outro' ? '<span style="color:var(--text-muted)">—</span>' : qtdCell(item.qtd_preto)}</td>
              <td style="text-align:center">${item.tipo === 'toner_color' ? qtdCell(item.qtd_ciano) : '<span style="color:var(--text-muted)">—</span>'}</td>
              <td style="text-align:center">${item.tipo === 'toner_color' ? qtdCell(item.qtd_magenta) : '<span style="color:var(--text-muted)">—</span>'}</td>
              <td style="text-align:center">${item.tipo === 'toner_color' ? qtdCell(item.qtd_amarelo) : '<span style="color:var(--text-muted)">—</span>'}</td>
              <td style="text-align:center">${(item.tipo === 'resma' || item.tipo === 'outro') ? qtdCell(item.qtd_geral) : '<span style="color:var(--text-muted)">—</span>'}</td>
              <td style="text-align:center">${item.urgente ? '<span style="color:var(--danger);font-weight:700">SIM</span>' : '<span style="color:var(--text-muted)">—</span>'}</td>
              <td style="font-size:.8rem">${formatAlocacoes(item.alocacoes)}</td>
              <td style="white-space:nowrap">
                <button class="btn btn-secondary btn-sm" onclick="abrirMovModal(${item.id},'entrada')" title="Registrar entrada">Entrada</button>
                <button class="btn btn-ghost btn-sm" onclick="abrirMovModal(${item.id},'saida')" title="Registrar saída">Saída</button>
                <button class="btn btn-secondary btn-sm" onclick="verHistorico(${item.id},'${esc(item.nome).replace(/'/g,"\\'")}')">Histórico</button>
                <button class="btn btn-ghost btn-sm" onclick="abrirEditarItem(${item.id})">Editar</button>
                ${isMaster ? `<button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="deletarItem(${item.id},'${esc(item.nome).replace(/'/g,"\\'")}')">Excluir</button>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ── Renderização Impressoras ──────────────────────────────

function renderImpressoras(lista) {
  const el = document.getElementById('estoque-lista');
  document.getElementById('badge-impressoras').textContent = lista.length || '';
  const isMaster = adminInfo && adminInfo.is_master;

  if (!lista.length) {
    el.innerHTML = `<div class="empty-state" style="padding:2rem;text-align:center;color:var(--text-muted)">Nenhuma impressora cadastrada. Clique em "+ Novo Item".</div>`;
    return;
  }

  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>IP</th>
            <th>SELB</th>
            <th>Localização</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${lista.map(item => `
            <tr>
              <td style="font-weight:500">${esc(item.nome)}</td>
              <td style="font-family:monospace;font-size:.82rem">${esc(item.ip) || '—'}</td>
              <td style="font-family:monospace;font-size:.82rem;color:var(--text-secondary)">${esc(item.selb) || '—'}</td>
              <td style="color:var(--text-secondary)">${esc(item.localizacao) || '—'}</td>
              <td style="white-space:nowrap">
                <button class="btn btn-secondary btn-sm" onclick="abrirEditarImpressora(${item.id})">Editar</button>
                ${isMaster ? `<button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="deletarImpressora(${item.id},'${esc(item.nome).replace(/'/g,"\\'")}')">Excluir</button>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ── Modal principal (criar/editar item/impressora) ────────

function abrirModal() { document.getElementById('modal-overlay').style.display = 'flex'; }
function fecharModal() { document.getElementById('modal-overlay').style.display = 'none'; document.getElementById('modal-body').innerHTML = ''; }

function btnNovoItem() {
  if (abaAtiva === 'toner') abrirNovoItem();
  else if (abaAtiva === 'impressoras') abrirNovaImpressora();
  else abrirNovoPatrimonio();
}

function abrirNovoItem() {
  document.getElementById('modal-title').textContent = 'Novo Item';
  abrirModal();
  document.getElementById('modal-body').innerHTML = `
    <form id="form-item" style="display:flex;flex-direction:column;gap:.8rem">
      <div class="form-group">
        <label class="form-label">Nome <span style="color:var(--danger)">*</span></label>
        <input class="form-control" id="fi-nome" type="text" placeholder="Ex: RICOH SP 3710SF">
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select class="form-control" id="fi-tipo">
            <option value="toner_mono">Toner Mono</option>
            <option value="toner_color">Toner Color</option>
            <option value="resma">Resma/Papel</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:.25rem">
          <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-size:.88rem">
            <input type="checkbox" id="fi-urgente" style="width:16px;height:16px"> Urgente (alerta)
          </label>
        </div>
      </div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.25rem">
        <button type="button" class="btn btn-secondary" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-salvar-item">Adicionar</button>
      </div>
    </form>
  `;
  document.getElementById('form-item').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar-item');
    btn.disabled = true; btn.textContent = 'Salvando…';
    const nome = document.getElementById('fi-nome').value.trim();
    if (!nome) { mostrarToast('Nome obrigatório', 'erro'); btn.disabled = false; btn.textContent = 'Adicionar'; return; }
    try {
      const r = await api('/api/admin/estoque/itens', { method: 'POST', body: JSON.stringify({
        nome, tipo: document.getElementById('fi-tipo').value, urgente: document.getElementById('fi-urgente').checked,
      })});
      if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro', 'erro'); btn.disabled = false; btn.textContent = 'Adicionar'; return; }
      fecharModal(); mostrarToast('Item criado'); carregarDados();
    } catch { btn.disabled = false; btn.textContent = 'Adicionar'; }
  });
}

function abrirEditarItem(id) {
  const item = _tonerCache.find(i => i.id === id);
  if (!item) return;
  document.getElementById('modal-title').textContent = 'Editar Item';
  abrirModal();
  document.getElementById('modal-body').innerHTML = `
    <form id="form-item" style="display:flex;flex-direction:column;gap:.8rem">
      <div class="form-group">
        <label class="form-label">Nome <span style="color:var(--danger)">*</span></label>
        <input class="form-control" id="fi-nome" type="text" value="${esc(item.nome)}">
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select class="form-control" id="fi-tipo">
            ${['toner_mono','toner_color','resma','outro'].map(t => `<option value="${t}" ${item.tipo === t ? 'selected' : ''}>${TIPO_LABELS[t]}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:.25rem">
          <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-size:.88rem">
            <input type="checkbox" id="fi-urgente" ${item.urgente ? 'checked' : ''} style="width:16px;height:16px"> Urgente (alerta)
          </label>
        </div>
      </div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.25rem">
        <button type="button" class="btn btn-secondary" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-salvar-item">Salvar</button>
      </div>
    </form>
  `;
  document.getElementById('form-item').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar-item');
    btn.disabled = true; btn.textContent = 'Salvando…';
    try {
      const r = await api(`/api/admin/estoque/itens/${id}`, { method: 'PATCH', body: JSON.stringify({
        nome: document.getElementById('fi-nome').value.trim(),
        tipo: document.getElementById('fi-tipo').value,
        urgente: document.getElementById('fi-urgente').checked,
      })});
      if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro', 'erro'); btn.disabled = false; btn.textContent = 'Salvar'; return; }
      fecharModal(); mostrarToast('Item atualizado'); carregarDados();
    } catch { btn.disabled = false; btn.textContent = 'Salvar'; }
  });
}

async function deletarItem(id, nome) {
  if (!confirm(`Excluir "${nome}"? Isso apagará também o histórico de movimentações.`)) return;
  try {
    const r = await api(`/api/admin/estoque/itens/${id}`, { method: 'DELETE' });
    if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro ao excluir', 'erro'); return; }
    mostrarToast('Item excluído'); carregarDados();
  } catch {}
}

// ── Modal Impressoras ─────────────────────────────────────

function abrirNovaImpressora() {
  document.getElementById('modal-title').textContent = 'Nova Impressora';
  abrirModal();
  renderFormImpressora({}, false);
}

function abrirEditarImpressora(id) {
  const item = _impressorasCache.find(i => i.id === id);
  if (!item) return;
  document.getElementById('modal-title').textContent = 'Editar Impressora';
  abrirModal();
  renderFormImpressora(item, true);
}

function renderFormImpressora(item, isEdit) {
  document.getElementById('modal-body').innerHTML = `
    <form id="form-imp" style="display:flex;flex-direction:column;gap:.8rem">
      <div class="form-group">
        <label class="form-label">Nome <span style="color:var(--danger)">*</span></label>
        <input class="form-control" id="imp-nome" type="text" value="${esc(item.nome || '')}" placeholder="Ex: RICOH SP 3710SF">
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">IP</label>
          <input class="form-control" id="imp-ip" type="text" value="${esc(item.ip || '')}" placeholder="Ex: 10.1.7.17">
        </div>
        <div class="form-group">
          <label class="form-label">SELB</label>
          <input class="form-control" id="imp-selb" type="text" value="${esc(item.selb || '')}" placeholder="Ex: 2IY9">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Localização</label>
        <input class="form-control" id="imp-loc" type="text" value="${esc(item.localizacao || '')}" placeholder="Ex: RECEPCAO">
      </div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.25rem">
        <button type="button" class="btn btn-secondary" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-salvar-imp">${isEdit ? 'Salvar' : 'Adicionar'}</button>
      </div>
    </form>
  `;
  document.getElementById('form-imp').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar-imp');
    btn.disabled = true; btn.textContent = 'Salvando…';
    const nome = document.getElementById('imp-nome').value.trim();
    if (!nome) { mostrarToast('Nome obrigatório', 'erro'); btn.disabled = false; btn.textContent = isEdit ? 'Salvar' : 'Adicionar'; return; }
    const body = { nome, ip: document.getElementById('imp-ip').value.trim(), selb: document.getElementById('imp-selb').value.trim(), localizacao: document.getElementById('imp-loc').value.trim() };
    try {
      const url = isEdit ? `/api/admin/estoque/impressoras/${item.id}` : '/api/admin/estoque/impressoras';
      const method = isEdit ? 'PATCH' : 'POST';
      const r = await api(url, { method, body: JSON.stringify(body) });
      if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro', 'erro'); btn.disabled = false; btn.textContent = isEdit ? 'Salvar' : 'Adicionar'; return; }
      fecharModal(); mostrarToast(isEdit ? 'Impressora atualizada' : 'Impressora adicionada'); carregarDados();
    } catch { btn.disabled = false; btn.textContent = isEdit ? 'Salvar' : 'Adicionar'; }
  });
}

async function deletarImpressora(id, nome) {
  if (!confirm(`Excluir "${nome}"?`)) return;
  try {
    const r = await api(`/api/admin/estoque/impressoras/${id}`, { method: 'DELETE' });
    if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro', 'erro'); return; }
    mostrarToast('Impressora excluída'); carregarDados();
  } catch {}
}

// ── Modal Movimentação ────────────────────────────────────

function abrirMovModal(itemId, tipoMov) {
  const item = _tonerCache.find(i => i.id === itemId);
  if (!item) return;

  document.getElementById('mov-modal-title').textContent = tipoMov === 'entrada' ? `Entrada — ${item.nome}` : `Saída — ${item.nome}`;
  document.getElementById('mov-modal-overlay').style.display = 'flex';

  // Determine which color fields make sense
  const cores = [];
  if (item.tipo === 'toner_mono' || item.tipo === 'toner_color') cores.push({ val: 'preto', label: 'Preto' });
  if (item.tipo === 'toner_color') {
    cores.push({ val: 'ciano', label: 'Ciano' });
    cores.push({ val: 'magenta', label: 'Magenta' });
    cores.push({ val: 'amarelo', label: 'Amarelo' });
  }
  if (item.tipo === 'resma' || item.tipo === 'outro') cores.push({ val: 'geral', label: 'Geral' });

  const showCor = cores.length > 1;

  // Setores que atualmente têm este item alocado (para entradas)
  const setoresComItem = (item.alocacoes || []).map(a => a.setor).filter(Boolean);

  document.getElementById('mov-modal-body').innerHTML = `
    <form id="form-mov" style="display:flex;flex-direction:column;gap:.8rem">
      ${showCor ? `
        <div class="form-group">
          <label class="form-label">Cor / Tipo</label>
          <select class="form-control" id="mov-cor">
            ${cores.map(c => `<option value="${c.val}">${c.label}</option>`).join('')}
          </select>
        </div>
      ` : `<input type="hidden" id="mov-cor" value="${cores[0] ? cores[0].val : 'geral'}">`}
      <div class="form-group">
        <label class="form-label">Quantidade</label>
        <input class="form-control" id="mov-qtd" type="number" min="1" value="1">
      </div>
      ${tipoMov === 'entrada' ? `
      <div class="form-group">
        <label class="form-label">Veio de algum setor? <span style="color:var(--text-muted);font-size:.78rem">(opcional)</span></label>
        ${setoresComItem.length > 0 ? `
          <datalist id="setores-lista">
            ${[...new Set(setoresComItem)].map(s => `<option value="${esc(s)}">`).join('')}
          </datalist>
        ` : ''}
        <input class="form-control" id="mov-setor-origem" type="text"
          list="setores-lista"
          placeholder="${setoresComItem.length > 0 ? 'Selecione ou digite o setor…' : 'Ex: Recepção, RH, Governança…'}">
        <div style="font-size:.72rem;color:var(--text-muted);margin-top:.25rem">Se preenchido, a etiqueta desse setor será removida da coluna "Com setores"</div>
      </div>
      ` : ''}
      ${tipoMov === 'saida' ? `
      <div class="form-group">
        <label class="form-label">Setor de destino <span style="color:var(--text-muted);font-size:.78rem">(opcional)</span></label>
        <input class="form-control" id="mov-setor" type="text" placeholder="Ex: Recepção, RH, Governança…">
        <div style="font-size:.72rem;color:var(--text-muted);margin-top:.25rem">Preencha se o toner está indo para um setor (não para uso imediato)</div>
      </div>
      ` : ''}
      <div class="form-group">
        <label class="form-label">Observação <span style="color:var(--text-muted);font-size:.78rem">(opcional)</span></label>
        <input class="form-control" id="mov-obs" type="text" placeholder="${tipoMov === 'saida' ? 'Ex: instalado na impressora da Recepção…' : 'Ex: compra de reposição…'}">
      </div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.25rem">
        <button type="button" class="btn btn-secondary" onclick="fecharMovModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-salvar-mov">${tipoMov === 'entrada' ? 'Registrar Entrada' : 'Registrar Saída'}</button>
      </div>
    </form>
  `;

  document.getElementById('form-mov').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar-mov');
    btn.disabled = true; btn.textContent = 'Salvando…';
    const cor = document.getElementById('mov-cor').value;
    const qtd = parseInt(document.getElementById('mov-qtd').value, 10);
    const obs = document.getElementById('mov-obs').value.trim();
    const setor_destino = tipoMov === 'saida' ? (document.getElementById('mov-setor')?.value.trim() || '') : '';
    const setor_origem = tipoMov === 'entrada' ? (document.getElementById('mov-setor-origem')?.value.trim() || '') : '';
    if (!qtd || qtd < 1) { mostrarToast('Quantidade inválida', 'erro'); btn.disabled = false; btn.textContent = tipoMov === 'entrada' ? 'Registrar Entrada' : 'Registrar Saída'; return; }
    try {
      const r = await api(`/api/admin/estoque/itens/${itemId}/movimentacao`, {
        method: 'POST',
        body: JSON.stringify({ tipo: tipoMov, cor, quantidade: qtd, observacao: obs, setor_destino, setor_origem }),
      });
      if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro', 'erro'); btn.disabled = false; btn.textContent = tipoMov === 'entrada' ? 'Registrar Entrada' : 'Registrar Saída'; return; }
      fecharMovModal();
      mostrarToast(tipoMov === 'entrada' ? 'Entrada registrada' : 'Saída registrada');
      carregarDados();
    } catch { btn.disabled = false; btn.textContent = tipoMov === 'entrada' ? 'Registrar Entrada' : 'Registrar Saída'; }
  });
}

function fecharMovModal() {
  document.getElementById('mov-modal-overlay').style.display = 'none';
  document.getElementById('mov-modal-body').innerHTML = '';
}

// ── Modal Histórico ───────────────────────────────────────

async function verHistorico(itemId, nomeItem) {
  document.getElementById('hist-modal-title').textContent = `Histórico — ${nomeItem}`;
  document.getElementById('hist-modal-overlay').style.display = 'flex';
  document.getElementById('hist-modal-body').innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  try {
    const r = await api(`/api/admin/estoque/itens/${itemId}/movimentacoes`);
    const movs = await r.json();

    if (!movs.length) {
      document.getElementById('hist-modal-body').innerHTML = '<div style="padding:1rem;text-align:center;color:var(--text-muted)">Nenhuma movimentação registrada.</div>';
      return;
    }

    document.getElementById('hist-modal-body').innerHTML = `
      <div class="table-wrap" style="max-height:400px;overflow-y:auto">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Cor</th>
              <th style="text-align:center">Qtd</th>
              <th>Setor</th>
              <th>Admin</th>
              <th>Observação</th>
            </tr>
          </thead>
          <tbody>
            ${movs.map(m => `
              <tr>
                <td style="white-space:nowrap;font-size:.78rem;color:var(--text-muted)">${fmtDataHora(m.criado_em)}</td>
                <td>
                  <span style="font-size:.78rem;font-weight:600;color:${m.tipo === 'entrada' ? 'var(--success)' : 'var(--danger)'}">
                    ${m.tipo === 'entrada' ? '+ Entrada' : '- Saída'}
                  </span>
                </td>
                <td style="font-size:.82rem;color:var(--text-secondary)">${esc(COR_LABELS[m.cor] || m.cor) || '—'}</td>
                <td style="text-align:center;font-weight:600">${m.quantidade}</td>
                <td style="font-size:.82rem">${
                  m.setor_destino ? `<span class="itens-cat-tag" style="font-size:.72rem">${esc(m.setor_destino)}</span>`
                  : m.setor_origem ? `<span class="itens-cat-tag" style="font-size:.72rem;background:var(--gold-pale);color:var(--navy)">← ${esc(m.setor_origem)}</span>`
                  : '<span style="color:var(--text-muted)">—</span>'
                }</td>
                <td style="font-size:.82rem;color:var(--text-secondary)">${esc(m.admin_nome) || '—'}</td>
                <td style="font-size:.78rem;color:var(--text-muted);max-width:150px">
                  <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(m.observacao)}">${esc(m.observacao) || '—'}</div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch {
    document.getElementById('hist-modal-body').innerHTML = '<div style="padding:1rem;color:var(--danger)">Erro ao carregar histórico.</div>';
  }
}

function fecharHistModal() {
  document.getElementById('hist-modal-overlay').style.display = 'none';
  document.getElementById('hist-modal-body').innerHTML = '';
}

// ── Patrimônio ────────────────────────────────────────────

function statusPatBadge(status) {
  const c = STATUS_PAT_COLORS[status] || { bg: 'var(--border)', color: 'var(--text)' };
  const label = STATUS_PAT_LABELS[status] || status;
  return `<span style="display:inline-block;padding:.18rem .55rem;border-radius:20px;font-size:.72rem;font-weight:700;background:${c.bg};color:${c.color}">${esc(label)}</span>`;
}

function renderPatrimonio(lista) {
  const el = document.getElementById('estoque-lista');
  document.getElementById('badge-patrimonio').textContent = lista.length || '';
  const isMaster = adminInfo && adminInfo.is_master;

  if (!lista.length) {
    el.innerHTML = `<div class="empty-state" style="padding:2rem;text-align:center;color:var(--text-muted)">Nenhum item de patrimônio cadastrado. Clique em "+ Novo Patrimônio".</div>`;
    return;
  }

  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Status</th>
            <th>Setor atual</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${lista.map(item => `
            <tr>
              <td style="font-family:monospace;font-size:.82rem;font-weight:700;color:var(--navy)">${esc(item.codigo)}</td>
              <td style="font-weight:500">${esc(item.descricao)}</td>
              <td style="color:var(--text-secondary);font-size:.82rem">${esc(item.categoria) || '—'}</td>
              <td>${statusPatBadge(item.status)}</td>
              <td style="font-size:.82rem;color:var(--text-secondary)">${esc(item.setor_atual) || '—'}</td>
              <td style="white-space:nowrap">
                <button class="btn btn-secondary btn-sm" onclick="patMovimentar(${item.id})">Movimentar</button>
                <button class="btn btn-ghost btn-sm" onclick="verHistoricoPatrimonio(${item.id},'${esc(item.codigo).replace(/'/g,"\\'")}')">Histórico</button>
                <button class="btn btn-ghost btn-sm" onclick="abrirEditarPatrimonio(${item.id})">Editar</button>
                ${isMaster ? `<button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="deletarPatrimonio(${item.id},'${esc(item.codigo).replace(/'/g,"\\'")}')">Excluir</button>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderFormPatrimonio(item, isEdit) {
  const isMaster = adminInfo && adminInfo.is_master;
  document.getElementById('modal-body').innerHTML = `
    <form id="form-pat" style="display:flex;flex-direction:column;gap:.8rem">
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Código (CPF do item)</label>
          <input class="form-control" id="pat-codigo" type="text"
            value="${esc(item.codigo || '')}"
            placeholder="Auto (PAT-0001)"
            ${isEdit && !isMaster ? 'readonly style="background:var(--bg-subtle);color:var(--text-muted)"' : ''}>
          ${isEdit && !isMaster ? '<div style="font-size:.72rem;color:var(--text-muted);margin-top:.2rem">Apenas master pode alterar o código</div>' : ''}
        </div>
        <div class="form-group">
          <label class="form-label">Categoria</label>
          <input class="form-control" id="pat-categoria" type="text" value="${esc(item.categoria || '')}" placeholder="Ex: Notebook, Monitor, Teclado…">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Descrição <span style="color:var(--danger)">*</span></label>
        <input class="form-control" id="pat-descricao" type="text" value="${esc(item.descricao || '')}" placeholder="Ex: Notebook Dell Latitude 5420 — SN: ABC123">
      </div>
      ${isEdit ? `
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-control" id="pat-status-sel">
            ${Object.entries(STATUS_PAT_LABELS).map(([v, l]) => `<option value="${v}" ${item.status === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Setor atual</label>
          <input class="form-control" id="pat-setor" type="text" value="${esc(item.setor_atual || '')}" placeholder="Ex: Recepção, RH…">
        </div>
      </div>
      ` : ''}
      <div class="form-group">
        <label class="form-label">Observação <span style="color:var(--text-muted);font-size:.78rem">(opcional)</span></label>
        <input class="form-control" id="pat-obs" type="text" value="${esc(item.observacao || '')}" placeholder="Ex: comprado em 2024, garantia até 2027…">
      </div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.25rem">
        <button type="button" class="btn btn-secondary" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-salvar-pat">${isEdit ? 'Salvar' : 'Adicionar'}</button>
      </div>
    </form>
  `;

  document.getElementById('form-pat').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar-pat');
    btn.disabled = true; btn.textContent = 'Salvando…';
    const descricao = document.getElementById('pat-descricao').value.trim();
    if (!descricao) { mostrarToast('Descrição obrigatória', 'erro'); btn.disabled = false; btn.textContent = isEdit ? 'Salvar' : 'Adicionar'; return; }
    const body = {
      descricao,
      codigo: document.getElementById('pat-codigo').value.trim(),
      categoria: document.getElementById('pat-categoria').value.trim(),
      observacao: document.getElementById('pat-obs').value.trim(),
    };
    if (isEdit) {
      body.status = document.getElementById('pat-status-sel').value;
      body.setor_atual = document.getElementById('pat-setor').value.trim();
    }
    try {
      const url = isEdit ? `/api/admin/estoque/patrimonio/${item.id}` : '/api/admin/estoque/patrimonio';
      const method = isEdit ? 'PATCH' : 'POST';
      const r = await api(url, { method, body: JSON.stringify(body) });
      if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro', 'erro'); btn.disabled = false; btn.textContent = isEdit ? 'Salvar' : 'Adicionar'; return; }
      fecharModal();
      mostrarToast(isEdit ? 'Item atualizado' : 'Item criado');
      carregarDados();
    } catch { btn.disabled = false; btn.textContent = isEdit ? 'Salvar' : 'Adicionar'; }
  });
}

function abrirNovoPatrimonio() {
  document.getElementById('modal-title').textContent = 'Novo Item de Patrimônio';
  abrirModal();
  renderFormPatrimonio({}, false);
}

function abrirEditarPatrimonio(id) {
  const item = _patrimonioCache.find(i => i.id === id);
  if (!item) return;
  document.getElementById('modal-title').textContent = `Editar — ${item.codigo}`;
  abrirModal();
  renderFormPatrimonio(item, true);
}

async function deletarPatrimonio(id, codigo) {
  if (!confirm(`Excluir patrimônio "${codigo}"? Isso apagará também o histórico de movimentações.`)) return;
  try {
    const r = await api(`/api/admin/estoque/patrimonio/${id}`, { method: 'DELETE' });
    if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro ao excluir', 'erro'); return; }
    mostrarToast('Item excluído'); carregarDados();
  } catch {}
}

// ── Modal Movimentação Patrimônio ─────────────────────────

function patMovimentar(id) {
  const item = _patrimonioCache.find(i => i.id === id);
  if (!item) return;

  document.getElementById('pat-mov-title').textContent = `Movimentar — ${item.codigo}`;
  document.getElementById('pat-mov-overlay').style.display = 'flex';

  document.getElementById('pat-mov-body').innerHTML = `
    <form id="form-pat-mov" style="display:flex;flex-direction:column;gap:.8rem">
      <div class="form-group">
        <label class="form-label">Tipo de movimentação</label>
        <select class="form-control" id="pm-tipo" onchange="atualizarCamposMovPat(${item.id})">
          <option value="entrada">Entrada (disponível)</option>
          <option value="saida">Saída para setor</option>
          <option value="retorno">Retorno ao almoxarifado</option>
          <option value="manutencao">Envio para manutenção</option>
          <option value="descarte">Descarte</option>
        </select>
        <div style="font-size:.72rem;color:var(--text-muted);margin-top:.25rem" id="pm-tipo-desc"></div>
      </div>
      <div id="pm-campos-extras"></div>
      <div class="form-group">
        <label class="form-label">Observação <span style="color:var(--text-muted);font-size:.78rem">(opcional)</span></label>
        <input class="form-control" id="pm-obs" type="text" placeholder="Ex: instalado no notebook do gerente…">
      </div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.25rem">
        <button type="button" class="btn btn-secondary" onclick="fecharPatMov()">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-salvar-pm">Registrar</button>
      </div>
    </form>
  `;

  atualizarCamposMovPat(id);

  document.getElementById('form-pat-mov').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar-pm');
    btn.disabled = true; btn.textContent = 'Salvando…';
    const tipo = document.getElementById('pm-tipo').value;
    const body = {
      tipo,
      observacao: document.getElementById('pm-obs').value.trim(),
      setor_destino: document.getElementById('pm-setor-destino')?.value.trim() || '',
      setor_origem: document.getElementById('pm-setor-origem')?.value.trim() || '',
    };
    if (tipo === 'saida' && !body.setor_destino) {
      mostrarToast('Informe o setor de destino', 'erro');
      btn.disabled = false; btn.textContent = 'Registrar'; return;
    }
    try {
      const r = await api(`/api/admin/estoque/patrimonio/${id}/movimentacao`, { method: 'POST', body: JSON.stringify(body) });
      if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro', 'erro'); btn.disabled = false; btn.textContent = 'Registrar'; return; }
      fecharPatMov();
      mostrarToast('Movimentação registrada');
      carregarDados();
    } catch { btn.disabled = false; btn.textContent = 'Registrar'; }
  });
}

function atualizarCamposMovPat(itemId) {
  const tipo = document.getElementById('pm-tipo')?.value;
  const desc = {
    entrada:    'O item volta a ficar disponível no almoxarifado.',
    saida:      'O item será marcado como "Em uso" no setor de destino.',
    retorno:    'O item retorna ao almoxarifado e fica disponível.',
    manutencao: 'O item vai para manutenção.',
    descarte:   'O item será marcado como descartado definitivamente.',
  };
  const el = document.getElementById('pm-tipo-desc');
  if (el) el.textContent = desc[tipo] || '';

  const extras = document.getElementById('pm-campos-extras');
  if (!extras) return;

  if (tipo === 'saida') {
    extras.innerHTML = `
      <div class="form-group">
        <label class="form-label">Setor de destino <span style="color:var(--danger)">*</span></label>
        <input class="form-control" id="pm-setor-destino" type="text" placeholder="Ex: Recepção, RH, Governança…">
      </div>
    `;
  } else if (tipo === 'retorno') {
    extras.innerHTML = `
      <div class="form-group">
        <label class="form-label">Retornando de qual setor? <span style="color:var(--text-muted);font-size:.78rem">(opcional)</span></label>
        <input class="form-control" id="pm-setor-origem" type="text" placeholder="Ex: Recepção…">
      </div>
    `;
  } else {
    extras.innerHTML = '';
  }
}

function fecharPatMov() {
  document.getElementById('pat-mov-overlay').style.display = 'none';
  document.getElementById('pat-mov-body').innerHTML = '';
}

// ── Modal Histórico Patrimônio ────────────────────────────

async function verHistoricoPatrimonio(id, codigo) {
  document.getElementById('pat-hist-title').textContent = `Histórico — ${codigo}`;
  document.getElementById('pat-hist-overlay').style.display = 'flex';
  document.getElementById('pat-hist-body').innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  try {
    const r = await api(`/api/admin/estoque/patrimonio/${id}/historico`);
    const movs = await r.json();

    if (!movs.length) {
      document.getElementById('pat-hist-body').innerHTML = '<div style="padding:1rem;text-align:center;color:var(--text-muted)">Nenhuma movimentação registrada.</div>';
      return;
    }

    document.getElementById('pat-hist-body').innerHTML = `
      <div class="table-wrap" style="max-height:420px;overflow-y:auto">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Setor</th>
              <th>Admin</th>
              <th>Observação</th>
            </tr>
          </thead>
          <tbody>
            ${movs.map(m => `
              <tr>
                <td style="white-space:nowrap;font-size:.78rem;color:var(--text-muted)">${fmtDataHora(m.criado_em)}</td>
                <td>
                  <span style="font-size:.78rem;font-weight:600;color:${TIPOS_MOV_PAT_COLORS[m.tipo] || 'inherit'}">
                    ${esc(TIPOS_MOV_PAT_LABELS[m.tipo] || m.tipo)}
                  </span>
                </td>
                <td style="font-size:.82rem">${
                  m.setor_destino ? `<span class="itens-cat-tag" style="font-size:.72rem">→ ${esc(m.setor_destino)}</span>`
                  : m.setor_origem ? `<span class="itens-cat-tag" style="font-size:.72rem;background:var(--gold-pale);color:var(--navy)">← ${esc(m.setor_origem)}</span>`
                  : '<span style="color:var(--text-muted)">—</span>'
                }</td>
                <td style="font-size:.82rem;color:var(--text-secondary)">${esc(m.admin_nome) || '—'}</td>
                <td style="font-size:.78rem;color:var(--text-muted);max-width:160px">
                  <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(m.observacao)}">${esc(m.observacao) || '—'}</div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch {
    document.getElementById('pat-hist-body').innerHTML = '<div style="padding:1rem;color:var(--danger)">Erro ao carregar histórico.</div>';
  }
}

function fecharPatHist() {
  document.getElementById('pat-hist-overlay').style.display = 'none';
  document.getElementById('pat-hist-body').innerHTML = '';
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

    document.getElementById('btn-novo').addEventListener('click', btnNovoItem);
    document.getElementById('btn-fechar-modal').addEventListener('click', fecharModal);
    document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) fecharModal(); });

    document.getElementById('mov-btn-fechar').addEventListener('click', fecharMovModal);
    document.getElementById('mov-modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) fecharMovModal(); });

    document.getElementById('hist-btn-fechar').addEventListener('click', fecharHistModal);
    document.getElementById('hist-modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) fecharHistModal(); });

    document.getElementById('pat-mov-fechar').addEventListener('click', fecharPatMov);
    document.getElementById('pat-mov-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) fecharPatMov(); });

    document.getElementById('pat-hist-fechar').addEventListener('click', fecharPatHist);
    document.getElementById('pat-hist-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) fecharPatHist(); });

    document.getElementById('btn-filtrar-pat').addEventListener('click', () => carregarDados());
    document.getElementById('btn-limpar-pat').addEventListener('click', () => {
      document.getElementById('pat-busca').value = '';
      document.getElementById('pat-status').value = '';
      carregarDados();
    });
    document.getElementById('pat-busca').addEventListener('keydown', e => { if (e.key === 'Enter') carregarDados(); });

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('ativo'));
        btn.classList.add('ativo');
        abaAtiva = btn.dataset.tab;
        const novoLabels = { toner: '+ Novo Item', impressoras: '+ Nova Impressora', patrimonio: '+ Novo Patrimônio' };
        document.getElementById('btn-novo').textContent = novoLabels[abaAtiva] || '+ Novo Item';
        document.getElementById('filtros-patrimonio').style.display = abaAtiva === 'patrimonio' ? '' : 'none';
        carregarDados();
      });
    });

    await carregarDados();
  } catch {}
})();
