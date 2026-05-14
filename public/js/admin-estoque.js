let adminInfo = null;
let abaAtiva = 'toner';
let _tonerCache = [];
let _impressorasCache = [];
let _equipamentosCache = [];

const STATUS_EQ = {
  disponivel: { label: 'Disponível', cor: 'var(--success)' },
  em_uso:     { label: 'Em uso',     cor: 'var(--navy)'    },
  manutencao: { label: 'Manutenção', cor: '#d97706'        },
  descartado: { label: 'Descartado', cor: 'var(--danger)'  },
};

const MOV_EQ = {
  entrada:    { label: '+ Entrada',    cor: 'var(--success)' },
  saida:      { label: '→ Saída',      cor: 'var(--navy)'    },
  retorno:    { label: '← Retorno',    cor: '#0ea5e9'        },
  manutencao: { label: '⚙ Manutenção', cor: '#d97706'        },
  descarte:   { label: '✕ Descarte',   cor: 'var(--danger)'  },
};

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
      const busca = document.getElementById('eq-busca')?.value.trim() || '';
      const status = document.getElementById('eq-status')?.value || '';
      const params = new URLSearchParams();
      if (busca) params.set('busca', busca);
      if (status) params.set('status', status);
      const qs = params.toString();
      const r = await api('/api/admin/estoque/equipamentos' + (qs ? '?' + qs : ''));
      _equipamentosCache = await r.json();
      renderEquipamentos(_equipamentosCache);
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
  else abrirNovoEquipamento();
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

// ── Equipamentos ──────────────────────────────────────────

function badgeStatus(status) {
  const s = STATUS_EQ[status] || { label: status, cor: 'var(--border)' };
  return `<span style="display:inline-block;padding:.18rem .55rem;border-radius:20px;font-size:.72rem;font-weight:700;background:${s.cor};color:#fff">${s.label}</span>`;
}

function renderEquipamentos(lista) {
  const el = document.getElementById('estoque-lista');
  document.getElementById('badge-equipamentos').textContent = lista.length || '';

  if (!lista.length) {
    el.innerHTML = `<div class="empty-state" style="padding:2rem;text-align:center;color:var(--text-muted)">Nenhum equipamento encontrado. Clique em "+ Novo Equipamento" para cadastrar.</div>`;
    return;
  }

  // Agrupar por nome
  const grupos = {};
  for (const eq of lista) {
    if (!grupos[eq.nome]) grupos[eq.nome] = { categoria: eq.categoria, itens: [] };
    grupos[eq.nome].itens.push(eq);
  }

  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Equipamento</th>
            <th>Categoria</th>
            <th style="text-align:center">Total</th>
            <th>Status geral</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(grupos).map(([nome, g]) => {
            const contagem = {};
            for (const eq of g.itens) contagem[eq.status] = (contagem[eq.status] || 0) + 1;
            const resumo = Object.entries(contagem).map(([st, n]) => {
              const s = STATUS_EQ[st] || { label: st, cor: 'var(--border)' };
              return `<span style="display:inline-flex;align-items:center;gap:.25rem;padding:.15rem .45rem;border-radius:20px;font-size:.7rem;font-weight:700;background:${s.cor};color:#fff">${n} ${s.label}</span>`;
            }).join(' ');
            return `
              <tr style="cursor:pointer" onclick="verUnidades('${esc(nome).replace(/'/g,"\\'")}')">
                <td>
                  <button class="btn btn-ghost btn-sm" style="font-weight:600;font-size:.92rem;padding:.2rem .4rem;text-align:left" onclick="verUnidades('${esc(nome).replace(/'/g,"\\'")}');event.stopPropagation()">
                    ${esc(nome)}
                  </button>
                </td>
                <td style="color:var(--text-secondary);font-size:.82rem">${esc(g.categoria) || '—'}</td>
                <td style="text-align:center;font-weight:700;color:var(--navy)">${g.itens.length}</td>
                <td style="display:flex;flex-wrap:wrap;gap:.3rem;padding:.6rem .75rem">${resumo}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div style="font-size:.78rem;color:var(--text-muted);margin-top:.5rem;padding:0 .25rem">Clique no nome do equipamento para ver as unidades individuais com seus IDs.</div>
  `;
}

function verUnidades(nome) {
  const unidades = _equipamentosCache.filter(e => e.nome === nome);
  if (!unidades.length) return;
  const isMaster = adminInfo && adminInfo.is_master;

  document.getElementById('eq-hist-title').textContent = `${nome} — ${unidades.length} unidade${unidades.length > 1 ? 's' : ''}`;
  document.getElementById('eq-hist-overlay').style.display = 'flex';
  document.getElementById('eq-hist-body').innerHTML = `
    <div class="table-wrap" style="max-height:480px;overflow-y:auto">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Setor atual</th>
            <th>Observação</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${unidades.map(eq => `
            <tr>
              <td style="font-family:monospace;font-weight:700;color:var(--navy);font-size:.85rem">${esc(eq.codigo)}</td>
              <td>${badgeStatus(eq.status)}</td>
              <td style="font-size:.82rem;color:var(--text-secondary)">${esc(eq.setor_atual) || '—'}</td>
              <td style="font-size:.78rem;color:var(--text-muted);max-width:140px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(eq.observacao)}">${esc(eq.observacao) || '—'}</div></td>
              <td style="white-space:nowrap">
                <button class="btn btn-secondary btn-sm" onclick="fecharEqHist();eqMovimentar(${eq.id})">Movimentar</button>
                <button class="btn btn-ghost btn-sm" onclick="fecharEqHist();eqHistorico(${eq.id},'${esc(eq.codigo).replace(/'/g,"\\'")}')">Histórico</button>
                <button class="btn btn-ghost btn-sm" onclick="fecharEqHist();eqEditar(${eq.id})">Editar</button>
                ${isMaster ? `<button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="fecharEqHist();eqDeletar(${eq.id},'${esc(eq.codigo).replace(/'/g,"\\'")}')">Excluir</button>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function abrirNovoEquipamento() {
  document.getElementById('modal-title').textContent = 'Novo Equipamento';
  abrirModal();
  document.getElementById('modal-body').innerHTML = `
    <form id="form-eq" style="display:flex;flex-direction:column;gap:.8rem">
      <div class="form-group">
        <label class="form-label">Nome <span style="color:var(--danger)">*</span></label>
        <input class="form-control" id="eq-nome" type="text" placeholder="Ex: Toner RICOH SP 3710, Nobreak APC 600VA…">
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Categoria</label>
          <input class="form-control" id="eq-cat" type="text" placeholder="Ex: Toner, Nobreak, Monitor…">
        </div>
        <div class="form-group">
          <label class="form-label">Quantidade</label>
          <input class="form-control" id="eq-qtd" type="number" min="1" max="500" value="1" style="text-align:center" oninput="eqPreviewQtd()">
          <div id="eq-qtd-hint" style="font-size:.72rem;color:var(--text-muted);margin-top:.25rem">1 item — ID gerado automaticamente</div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Observação <span style="color:var(--text-muted);font-size:.78rem">(opcional)</span></label>
        <input class="form-control" id="eq-obs" type="text" placeholder="Ex: comprado em 2024, garantia até 2027…">
      </div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.25rem">
        <button type="button" class="btn btn-secondary" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-salvar-eq">Adicionar</button>
      </div>
    </form>
  `;
  document.getElementById('form-eq').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar-eq');
    btn.disabled = true;
    const nome = document.getElementById('eq-nome').value.trim();
    if (!nome) { mostrarToast('Nome obrigatório', 'erro'); btn.disabled = false; return; }
    const quantidade = Math.max(1, parseInt(document.getElementById('eq-qtd').value, 10) || 1);
    const base = { nome, categoria: document.getElementById('eq-cat').value.trim(), observacao: document.getElementById('eq-obs').value.trim() };
    let criados = 0;
    try {
      for (let i = 0; i < quantidade; i++) {
        btn.textContent = quantidade > 1 ? `Criando ${criados + 1}/${quantidade}…` : 'Salvando…';
        const r = await api('/api/admin/estoque/equipamentos', { method: 'POST', body: JSON.stringify(base) });
        if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro', 'erro'); btn.disabled = false; btn.textContent = 'Adicionar'; return; }
        criados++;
      }
      fecharModal();
      mostrarToast(quantidade > 1 ? `${quantidade} equipamentos criados` : 'Equipamento criado');
      carregarDados();
    } catch { btn.disabled = false; btn.textContent = 'Adicionar'; }
  });
}

function eqPreviewQtd() {
  const n = parseInt(document.getElementById('eq-qtd')?.value, 10) || 1;
  const el = document.getElementById('eq-qtd-hint');
  if (el) el.textContent = n === 1 ? '1 item — ID gerado automaticamente' : `${n} itens criados, cada um com ID próprio (EQ-XXXX)`;
}

function eqEditar(id) {
  const eq = _equipamentosCache.find(e => e.id === id);
  if (!eq) return;
  const isMaster = adminInfo && adminInfo.is_master;
  document.getElementById('modal-title').textContent = `Editar — ${eq.codigo}`;
  abrirModal();
  document.getElementById('modal-body').innerHTML = `
    <form id="form-eq-edit" style="display:flex;flex-direction:column;gap:.8rem">
      <div class="form-group">
        <label class="form-label">Nome <span style="color:var(--danger)">*</span></label>
        <input class="form-control" id="eqe-nome" type="text" value="${esc(eq.nome)}">
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Categoria</label>
          <input class="form-control" id="eqe-cat" type="text" value="${esc(eq.categoria || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">ID único</label>
          <input class="form-control" id="eqe-codigo" type="text" value="${esc(eq.codigo)}"
            ${!isMaster ? 'readonly style="background:var(--bg-subtle);color:var(--text-muted)"' : ''}>
          ${!isMaster ? '<div style="font-size:.72rem;color:var(--text-muted);margin-top:.2rem">Apenas master pode alterar</div>' : ''}
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-control" id="eqe-status">
            ${Object.entries(STATUS_EQ).map(([v, s]) => `<option value="${v}" ${eq.status === v ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Setor atual</label>
          <input class="form-control" id="eqe-setor" type="text" value="${esc(eq.setor_atual || '')}" placeholder="Ex: Recepção…">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Observação</label>
        <input class="form-control" id="eqe-obs" type="text" value="${esc(eq.observacao || '')}">
      </div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.25rem">
        <button type="button" class="btn btn-secondary" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-salvar-eqe">Salvar</button>
      </div>
    </form>
  `;
  document.getElementById('form-eq-edit').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const btn = document.getElementById('btn-salvar-eqe');
    btn.disabled = true; btn.textContent = 'Salvando…';
    const nome = document.getElementById('eqe-nome').value.trim();
    if (!nome) { mostrarToast('Nome obrigatório', 'erro'); btn.disabled = false; btn.textContent = 'Salvar'; return; }
    const body = {
      nome,
      codigo: document.getElementById('eqe-codigo').value.trim(),
      categoria: document.getElementById('eqe-cat').value.trim(),
      status: document.getElementById('eqe-status').value,
      setor_atual: document.getElementById('eqe-setor').value.trim(),
      observacao: document.getElementById('eqe-obs').value.trim(),
    };
    try {
      const r = await api(`/api/admin/estoque/equipamentos/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro', 'erro'); btn.disabled = false; btn.textContent = 'Salvar'; return; }
      fecharModal(); mostrarToast('Equipamento atualizado'); carregarDados();
    } catch { btn.disabled = false; btn.textContent = 'Salvar'; }
  });
}

async function eqDeletar(id, codigo) {
  if (!confirm(`Excluir equipamento "${codigo}"? O histórico será apagado também.`)) return;
  try {
    const r = await api(`/api/admin/estoque/equipamentos/${id}`, { method: 'DELETE' });
    if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro', 'erro'); return; }
    mostrarToast('Excluído'); carregarDados();
  } catch {}
}

function eqMovimentar(id) {
  const eq = _equipamentosCache.find(e => e.id === id);
  if (!eq) return;
  document.getElementById('eq-mov-title').textContent = `Movimentar — ${eq.codigo}`;
  document.getElementById('eq-mov-overlay').style.display = 'flex';
  document.getElementById('eq-mov-body').innerHTML = `
    <form id="form-eq-mov" style="display:flex;flex-direction:column;gap:.8rem">
      <div class="form-group">
        <label class="form-label">Tipo de movimentação</label>
        <select class="form-control" id="eqm-tipo" onchange="eqMovCampos()">
          <option value="entrada">Entrada (disponível)</option>
          <option value="saida">Saída para setor</option>
          <option value="retorno">Retorno ao almoxarifado</option>
          <option value="manutencao">Envio para manutenção</option>
          <option value="descarte">Descarte</option>
        </select>
        <div id="eqm-desc" style="font-size:.72rem;color:var(--text-muted);margin-top:.25rem">O item volta a ficar disponível.</div>
      </div>
      <div id="eqm-extras"></div>
      <div class="form-group">
        <label class="form-label">Observação <span style="color:var(--text-muted);font-size:.78rem">(opcional)</span></label>
        <input class="form-control" id="eqm-obs" type="text" placeholder="Ex: instalado na recepção…">
      </div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.25rem">
        <button type="button" class="btn btn-secondary" onclick="fecharEqMov()">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-salvar-eqm">Registrar</button>
      </div>
    </form>
  `;
  eqMovCampos();
  document.getElementById('form-eq-mov').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const btn = document.getElementById('btn-salvar-eqm');
    btn.disabled = true; btn.textContent = 'Salvando…';
    const tipo = document.getElementById('eqm-tipo').value;
    const setor_destino = document.getElementById('eqm-destino')?.value.trim() || '';
    const setor_origem = document.getElementById('eqm-origem')?.value.trim() || '';
    if (tipo === 'saida' && !setor_destino) { mostrarToast('Informe o setor de destino', 'erro'); btn.disabled = false; btn.textContent = 'Registrar'; return; }
    try {
      const r = await api(`/api/admin/estoque/equipamentos/${id}/movimentacao`, {
        method: 'POST', body: JSON.stringify({ tipo, setor_destino, setor_origem, observacao: document.getElementById('eqm-obs').value.trim() }),
      });
      if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro', 'erro'); btn.disabled = false; btn.textContent = 'Registrar'; return; }
      fecharEqMov(); mostrarToast('Movimentação registrada'); carregarDados();
    } catch { btn.disabled = false; btn.textContent = 'Registrar'; }
  });
}

function eqMovCampos() {
  const tipo = document.getElementById('eqm-tipo')?.value;
  const descs = { entrada: 'O item fica disponível no almoxarifado.', saida: 'O item vai para um setor e fica "Em uso".', retorno: 'O item retorna ao almoxarifado.', manutencao: 'O item vai para manutenção.', descarte: 'O item será marcado como descartado.' };
  const d = document.getElementById('eqm-desc');
  if (d) d.textContent = descs[tipo] || '';
  const extras = document.getElementById('eqm-extras');
  if (!extras) return;
  if (tipo === 'saida') {
    extras.innerHTML = `<div class="form-group"><label class="form-label">Setor de destino <span style="color:var(--danger)">*</span></label><input class="form-control" id="eqm-destino" type="text" placeholder="Ex: Recepção, RH, Governança…"></div>`;
  } else if (tipo === 'retorno') {
    extras.innerHTML = `<div class="form-group"><label class="form-label">Retornando de qual setor? <span style="color:var(--text-muted);font-size:.78rem">(opcional)</span></label><input class="form-control" id="eqm-origem" type="text" placeholder="Ex: Recepção…"></div>`;
  } else { extras.innerHTML = ''; }
}

function fecharEqMov() {
  document.getElementById('eq-mov-overlay').style.display = 'none';
  document.getElementById('eq-mov-body').innerHTML = '';
}

async function eqHistorico(id, codigo) {
  document.getElementById('eq-hist-title').textContent = `Histórico — ${codigo}`;
  document.getElementById('eq-hist-overlay').style.display = 'flex';
  document.getElementById('eq-hist-body').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const r = await api(`/api/admin/estoque/equipamentos/${id}/historico`);
    const hist = await r.json();
    if (!hist.length) { document.getElementById('eq-hist-body').innerHTML = '<div style="padding:1rem;text-align:center;color:var(--text-muted)">Nenhuma movimentação registrada.</div>'; return; }
    document.getElementById('eq-hist-body').innerHTML = `
      <div class="table-wrap" style="max-height:420px;overflow-y:auto">
        <table>
          <thead><tr><th>Data</th><th>Tipo</th><th>Setor</th><th>Responsável</th><th>Chamado</th></tr></thead>
          <tbody>
            ${hist.map(h => `
              <tr>
                <td style="white-space:nowrap;font-size:.78rem;color:var(--text-muted)">${fmtDataHora(h.criado_em)}</td>
                <td><span style="font-size:.78rem;font-weight:600;color:${MOV_EQ[h.tipo]?.cor || 'inherit'}">${esc(MOV_EQ[h.tipo]?.label || h.tipo)}</span></td>
                <td style="font-size:.82rem">${
                  h.setor_destino ? `<span class="itens-cat-tag" style="font-size:.72rem">→ ${esc(h.setor_destino)}</span>`
                  : h.setor_origem ? `<span class="itens-cat-tag" style="font-size:.72rem;background:var(--gold-pale);color:var(--navy)">← ${esc(h.setor_origem)}</span>`
                  : '<span style="color:var(--text-muted)">—</span>'
                }</td>
                <td style="font-size:.82rem;color:var(--text-secondary)">${esc(h.admin_nome) || '—'}</td>
                <td style="font-size:.78rem">
                  ${h.chamado_id ? `
                    <div style="display:flex;align-items:center;gap:.35rem;flex-wrap:wrap">
                      <span style="font-weight:600;color:var(--navy)">#${h.chamado_id}</span>
                      <button class="btn-ver-acordo-hist" data-cid="${h.chamado_id}"
                        style="background:none;border:1px solid var(--navy);border-radius:3px;padding:.1rem .35rem;font-size:.68rem;cursor:pointer;color:var(--navy);white-space:nowrap">
                        Ver acordo
                      </button>
                    </div>` : '<span style="color:var(--text-muted)">—</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    document.getElementById('eq-hist-body').querySelectorAll('.btn-ver-acordo-hist').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cid = btn.dataset.cid;
        btn.textContent = '…'; btn.disabled = true;
        try {
          const [rc, rt] = await Promise.all([
            api(`/api/admin/chamados/${cid}`),
            api(`/api/admin/chamados/${cid}/termo-aceite`),
          ]);
          const chamado = rc.ok ? await rc.json() : null;
          const termo   = rt.ok ? await rt.json() : null;
          if (!chamado) { alert('Chamado não encontrado.'); return; }
          abrirModalDocumentoAcordoEstoque(chamado, termo);
        } catch { alert('Erro ao carregar acordo.'); }
        finally { btn.textContent = 'Ver acordo'; btn.disabled = false; }
      });
    });
  } catch { document.getElementById('eq-hist-body').innerHTML = '<div style="padding:1rem;color:var(--danger)">Erro ao carregar histórico.</div>'; }
}

function abrirModalDocumentoAcordoEstoque(c, termo) {
  const existing = document.getElementById('acordo-doc-estoque-overlay');
  if (existing) existing.remove();

  const equipamentosAdmin = (() => { try { return c.acordo_equipamentos ? JSON.parse(c.acordo_equipamentos) : []; } catch { return []; } })();
  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza', day: '2-digit', month: '2-digit', year: 'numeric' });

  let statusBadge, infoGrid, equipRows, dataFmt;

  if (termo) {
    const usuarioNome = termo.usuario_nome || '';
    const setor = termo.setor || '—';
    const cargo = termo.cargo || '—';
    const linhas = (() => { try { return JSON.parse(termo.equipamentos || '[]'); } catch { return equipamentosAdmin; } })();
    const hora = termo.aceito_em ? (termo.aceito_em.includes('T') ? termo.aceito_em : termo.aceito_em.replace(' ', 'T') + 'Z') : null;
    const dtObj = hora ? new Date(hora.endsWith('Z') ? hora : hora + 'Z') : null;
    dataFmt = dtObj ? dtObj.toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza', day: '2-digit', month: '2-digit', year: 'numeric' }) : hoje;
    const equipSummary = linhas.filter(r => r.tipo || r.marca || r.modelo).map(r => [r.quantidade, r.tipo, r.marca, r.modelo].filter(Boolean).join(' ')).join(', ');
    equipRows = linhas.filter(r => r.tipo || r.marca || r.modelo).map(r =>
      `<tr><td style="padding:.3rem .5rem;border:1px solid #c8a951;text-align:center;font-weight:600">${r.quantidade||1}</td><td style="padding:.3rem .5rem;border:1px solid #c8a951">${r.tipo||''}</td><td style="padding:.3rem .5rem;border:1px solid #c8a951">${r.marca||''}</td><td style="padding:.3rem .5rem;border:1px solid #c8a951">${r.modelo||''}</td></tr>`
    ).join('');
    statusBadge = `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:.4rem .8rem;margin-bottom:.9rem;font-size:.73rem;font-weight:700;color:#15803d">✓ Acordo assinado em ${dataFmt} · Chamado #${c.id}</div>`;
    infoGrid = `<div style="display:grid;grid-template-columns:auto 1fr auto 1fr;gap:.25rem .6rem;font-size:.78rem;margin-bottom:.6rem;align-items:baseline">
      <span style="color:#64748b">Funcionário:</span><strong>${usuarioNome}</strong>
      <span style="color:#64748b">Empresa:</span><span>Hotel Gran Marquise</span>
      <span style="color:#64748b">Setor:</span><span>${setor}</span>
      <span style="color:#64748b">Cargo:</span><span>${cargo}</span>
    </div>
    ${equipSummary ? `<p style="font-size:.78rem;font-weight:700;margin:.3rem 0"><strong>Equipamento: ${equipSummary}</strong></p>` : ''}`;
  } else {
    dataFmt = hoje;
    equipRows = equipamentosAdmin.filter(r => r.tipo || r.marca || r.modelo).map(r =>
      `<tr><td style="padding:.3rem .5rem;border:1px solid #c8a951;text-align:center;font-weight:600">${r.quantidade||1}</td><td style="padding:.3rem .5rem;border:1px solid #c8a951">${r.tipo||''}</td><td style="padding:.3rem .5rem;border:1px solid #c8a951">${r.marca||''}</td><td style="padding:.3rem .5rem;border:1px solid #c8a951">${r.modelo||''}</td></tr>`
    ).join('');
    statusBadge = `<div style="background:rgba(234,179,8,.08);border:1px solid rgba(234,179,8,.28);border-radius:4px;padding:.4rem .8rem;margin-bottom:.9rem;font-size:.73rem;color:#92400e">Aguardando assinatura — Chamado #${c.id}</div>`;
    infoGrid = `<div style="font-size:.78rem;margin-bottom:.6rem;color:#64748b">Funcionário: ${c.nome || '—'}</div>`;
  }

  const nomeAssinatura = termo ? termo.usuario_nome : (c.nome || '');

  const overlay = document.createElement('div');
  overlay.id = 'acordo-doc-estoque-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `
    <div style="background:#fff;max-width:600px;width:94%;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.3);border:1px solid #e5ddd0;border-radius:4px">
      <div style="padding:.9rem 1.25rem;border-bottom:1px solid #e5ddd0;display:flex;align-items:center;justify-content:space-between;background:#fff;position:sticky;top:0">
        <div style="font-weight:700;font-size:.88rem;color:#1e3a5f">📋 Termo de Responsabilidade — Chamado #${c.id}</div>
        <button id="btn-fechar-acordo-doc-est" style="background:none;border:none;cursor:pointer;color:#666;font-size:1.1rem;line-height:1">✕</button>
      </div>
      <div style="padding:1.1rem 1.4rem">
        ${statusBadge}
        <div style="text-align:center;margin-bottom:.8rem">
          <div style="font-weight:700;font-size:.92rem">Hotel Gran Marquise</div>
          <div style="font-size:.75rem;color:#64748b">Termo de Responsabilidade de Equipamentos</div>
        </div>
        ${infoGrid}
        <p style="font-size:.78rem;color:#475569;margin:.4rem 0;border-left:2px solid #e5ddd0;padding-left:.6rem">
          estou recebendo emprestado o equipamento abaixo discriminado pelo setor de TI – Tecnologia da Informação.
          Estou ciente que o mesmo se encontra em perfeito estado de funcionamento. Em caso de quebra, roubo ou avaria
          estarei me responsabilizando pelo equipamento abaixo.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:.78rem;margin:.5rem 0;border:1px solid #c8a951">
          <thead><tr style="background:#f8f5f0">
            <th style="padding:.3rem .5rem;border:1px solid #c8a951;text-align:left;width:80px">Quantidade</th>
            <th style="padding:.3rem .5rem;border:1px solid #c8a951;text-align:left">Tipo</th>
            <th style="padding:.3rem .5rem;border:1px solid #c8a951;text-align:left">Marca</th>
            <th style="padding:.3rem .5rem;border:1px solid #c8a951;text-align:left">Modelo</th>
          </tr></thead>
          <tbody>${equipRows || '<tr><td colspan="4" style="padding:.4rem;text-align:center;color:#94a3b8">—</td></tr>'}</tbody>
        </table>
        <div style="margin-top:.75rem;font-size:.78rem;color:#64748b;text-align:right">Fortaleza, ${dataFmt}</div>
        <div style="margin-top:.6rem;display:flex;justify-content:center;border-top:1px solid #e2e8f0;padding-top:.6rem">
          <div style="text-align:center;min-width:200px">
            <div style="font-weight:600;font-size:.85rem;margin-bottom:.4rem">${nomeAssinatura.split(' ')[0] || '—'}</div>
            <div style="border-top:1px solid #94a3b8;padding-top:.25rem;font-size:.72rem;color:#94a3b8">Assinatura do Funcionário</div>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('btn-fechar-acordo-doc-est').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function fecharEqHist() {
  document.getElementById('eq-hist-overlay').style.display = 'none';
  document.getElementById('eq-hist-body').innerHTML = '';
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

    document.getElementById('eq-mov-fechar')?.addEventListener('click', fecharEqMov);
    document.getElementById('eq-mov-overlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) fecharEqMov(); });

    document.getElementById('eq-hist-fechar')?.addEventListener('click', fecharEqHist);
    document.getElementById('eq-hist-overlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) fecharEqHist(); });

    document.getElementById('btn-buscar-eq')?.addEventListener('click', () => carregarDados());
    document.getElementById('btn-limpar-eq')?.addEventListener('click', () => {
      const busca = document.getElementById('eq-busca');
      const status = document.getElementById('eq-status');
      if (busca) busca.value = '';
      if (status) status.value = '';
      carregarDados();
    });
    document.getElementById('eq-busca')?.addEventListener('keydown', e => { if (e.key === 'Enter') carregarDados(); });

    const NOVO_LABELS = { toner: '+ Novo Item', impressoras: '+ Nova Impressora', equipamentos: '+ Novo Equipamento' };
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('ativo'));
        btn.classList.add('ativo');
        abaAtiva = btn.dataset.tab;
        document.getElementById('btn-novo').textContent = NOVO_LABELS[abaAtiva] || '+ Novo Item';
        const filtrosEq = document.getElementById('filtros-equipamentos');
        if (filtrosEq) filtrosEq.style.display = abaAtiva === 'equipamentos' ? '' : 'none';
        carregarDados();
      });
    });

    await carregarDados();
  } catch {}
})();
