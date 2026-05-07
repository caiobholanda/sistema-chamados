let adminInfo = null;
let abaAtiva = 'estoque';
let _itensCache = [];

const STATUS_LABELS = { aberto: 'Aberto', em_andamento: 'Em andamento', concluido: 'Concluído', encerrado: 'Encerrado' };
const PRIO_LABELS   = { urgente: 'Urgente', alta: 'Alta', media: 'Média', baixa: 'Baixa' };

const STATUS_INVENTARIO = {
  disponivel:     { label: 'Disponível',    cls: 'inv-disponivel' },
  em_uso:         { label: 'Em uso',        cls: 'inv-em-uso' },
  em_manutencao:  { label: 'Em manutenção', cls: 'inv-manutencao' },
  descartado:     { label: 'Descartado',    cls: 'inv-descartado' },
};

const CATS_ESTOQUE = [
  'Toner / Cartucho', 'Papel / Mídia', 'Cabos e Conectores',
  'Periféricos', 'Pilhas / Baterias', 'Material de Escritório', 'Outros',
];

function fmtData(d) {
  if (!d) return '—';
  const iso = d.includes('T') ? d : d.replace(' ', 'T');
  const date = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' });
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

// ── Renderização ──────────────────────────────────────────

function renderEstoque(itens) {
  const el = document.getElementById('itens-lista');
  document.getElementById('badge-estoque').textContent = itens.length || '';

  if (!itens.length) {
    el.innerHTML = `<div class="empty-state" style="padding:2rem;text-align:center;color:var(--text-muted)">Nenhum item em estoque. Clique em "+ Novo Item" para adicionar.</div>`;
    return;
  }

  const alertas = itens.filter(i => i.quantidade <= i.quantidade_minima).length;

  el.innerHTML = `
    ${alertas ? `<div class="itens-alerta-bar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> ${alertas} ${alertas === 1 ? 'item abaixo' : 'itens abaixo'} da quantidade mínima</div>` : ''}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Categoria</th>
            <th>Quantidade</th>
            <th>Mínimo</th>
            <th>Localização</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${itens.map(item => `
            <tr>
              <td>
                <strong>${item.nome}</strong>
                ${item.descricao ? `<div style="font-size:.78rem;color:var(--text-muted);margin-top:.1rem">${item.descricao}</div>` : ''}
              </td>
              <td>${item.categoria ? `<span class="itens-cat-tag">${item.categoria}</span>` : '<span style="color:var(--text-muted)">—</span>'}</td>
              <td>
                <span class="${item.quantidade <= item.quantidade_minima ? 'qtd-alerta' : 'qtd-ok'}">${item.quantidade}</span>
                ${item.quantidade <= item.quantidade_minima ? '<span class="qtd-alerta-icon" title="Abaixo do mínimo">⚠</span>' : ''}
              </td>
              <td style="color:var(--text-muted)">${item.quantidade_minima}</td>
              <td style="color:var(--text-secondary)">${item.localizacao || '—'}</td>
              <td style="white-space:nowrap">
                <button class="btn btn-secondary btn-sm" onclick="abrirModalEditar(${item.id})">Editar</button>
                <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="confirmarDeletar(${item.id}, '${item.nome.replace(/'/g, "\\'")}')">Excluir</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderInventario(itens) {
  const el = document.getElementById('itens-lista');
  document.getElementById('badge-inventario').textContent = itens.length || '';

  if (!itens.length) {
    el.innerHTML = `<div class="empty-state" style="padding:2rem;text-align:center;color:var(--text-muted)">Nenhum item no inventário. Clique em "+ Novo Item" para adicionar.</div>`;
    return;
  }

  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Fabricante / Modelo</th>
            <th>Nº de Série</th>
            <th>Localização</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${itens.map(item => {
            const st = STATUS_INVENTARIO[item.status] || STATUS_INVENTARIO.disponivel;
            return `
              <tr>
                <td>
                  <strong>${item.nome}</strong>
                  ${item.descricao ? `<div style="font-size:.78rem;color:var(--text-muted);margin-top:.1rem">${item.descricao}</div>` : ''}
                </td>
                <td style="color:var(--text-secondary)">
                  ${item.fabricante || ''}${item.fabricante && item.modelo ? ' · ' : ''}${item.modelo || ''}
                  ${!item.fabricante && !item.modelo ? '—' : ''}
                </td>
                <td style="font-family:monospace;font-size:.82rem;color:var(--text-secondary)">${item.numero_serie || '—'}</td>
                <td style="color:var(--text-secondary)">${item.localizacao || '—'}</td>
                <td><span class="inv-status-tag ${st.cls}">${st.label}</span></td>
                <td style="white-space:nowrap">
                  <button class="btn btn-secondary btn-sm" onclick="abrirModalEditar(${item.id})">Editar</button>
                  <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="confirmarDeletar(${item.id}, '${item.nome.replace(/'/g, "\\'")}')">Excluir</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderCompra(chamados) {
  const el = document.getElementById('itens-lista');
  const badge = document.getElementById('badge-compra');
  const abertos = chamados.filter(c => ['aberto', 'em_andamento'].includes(c.status)).length;
  badge.textContent = abertos || '';

  if (!chamados.length) {
    el.innerHTML = `<div class="empty-state" style="padding:2rem;text-align:center;color:var(--text-muted)">Nenhum chamado identificado como processo de compra pela IA.</div>`;
    return;
  }

  el.innerHTML = `
    <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:.75rem">
      Chamados classificados automaticamente pela IA como <strong>Processo de Compra</strong>.
      Clique em qualquer linha para abrir o chamado completo.
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Status</th>
            <th>Prioridade</th>
            <th>Solicitante</th>
            <th>Setor</th>
            <th>Descrição</th>
            <th>Data</th>
            <th>Responsável</th>
          </tr>
        </thead>
        <tbody>
          ${chamados.map(c => `
            <tr class="pc-row-clicavel" onclick="abrirChamado(${c.id})" title="Abrir chamado #${c.id}">
              <td style="font-weight:700;color:var(--text-muted)">#${c.id}</td>
              <td><span class="badge badge-${c.status}">${STATUS_LABELS[c.status] || c.status}</span></td>
              <td>${c.prioridade ? `<span class="badge badge-${c.prioridade}">${PRIO_LABELS[c.prioridade]}</span>` : '<span style="color:var(--text-muted);font-size:.8rem">—</span>'}</td>
              <td style="font-weight:500">${c.nome}</td>
              <td style="color:var(--text-secondary)">${c.setor}</td>
              <td style="max-width:280px">
                <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.82rem;color:var(--text-secondary)">
                  ${c.descricao.length > 90 ? c.descricao.slice(0, 90) + '…' : c.descricao}
                </div>
              </td>
              <td style="white-space:nowrap;color:var(--text-muted);font-size:.8rem">${fmtDataHora(c.criado_em)}</td>
              <td style="color:var(--text-secondary);font-size:.82rem">${c.admin_nome || '<span style="color:var(--text-muted)">—</span>'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function abrirChamado(id) {
  location.href = `/admin-painel.html?chamado=${id}`;
}

// ── Carregar conteúdo da aba ──────────────────────────────

async function carregarItens() {
  document.getElementById('itens-lista').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  document.getElementById('btn-novo-item').style.display = abaAtiva === 'compra' ? 'none' : '';
  try {
    if (abaAtiva === 'compra') {
      const r = await api('/api/admin/itens/chamados-compra');
      const chamados = await r.json();
      renderCompra(chamados);
    } else {
      const r = await api(`/api/admin/itens?tipo=${abaAtiva}`);
      _itensCache = await r.json();
      if (abaAtiva === 'estoque') renderEstoque(_itensCache);
      else renderInventario(_itensCache);
    }
  } catch (e) {
    if (e.message !== '401') document.getElementById('itens-lista').innerHTML = '<div style="padding:2rem;color:var(--danger)">Erro ao carregar dados.</div>';
  }
}

// ── Modal ─────────────────────────────────────────────────

function abrirModal() {
  document.getElementById('modal-overlay').style.display = 'flex';
}

function fecharModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.getElementById('modal-body').innerHTML = '';
}

function formEstoque(item = {}) {
  return `
    <div class="form-group">
      <label class="form-label">Nome <span style="color:var(--danger)">*</span></label>
      <input class="form-control" id="f-nome" type="text" placeholder="Ex: Toner HP 85A" value="${item.nome || ''}">
    </div>
    <div class="form-row-2">
      <div class="form-group">
        <label class="form-label">Categoria</label>
        <select class="form-control" id="f-categoria">
          <option value="">Selecione…</option>
          ${CATS_ESTOQUE.map(c => `<option value="${c}" ${item.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Localização</label>
        <input class="form-control" id="f-localizacao" type="text" placeholder="Ex: Almoxarifado, Prateleira A" value="${item.localizacao || ''}">
      </div>
    </div>
    <div class="form-row-2">
      <div class="form-group">
        <label class="form-label">Quantidade atual</label>
        <input class="form-control" id="f-quantidade" type="number" min="0" value="${item.quantidade ?? 0}">
      </div>
      <div class="form-group">
        <label class="form-label">Quantidade mínima <span style="font-size:.78rem;color:var(--text-muted)">(alerta)</span></label>
        <input class="form-control" id="f-quantidade-minima" type="number" min="0" value="${item.quantidade_minima ?? 0}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Descrição</label>
      <textarea class="form-control" id="f-descricao" rows="2" placeholder="Observações sobre o item…">${item.descricao || ''}</textarea>
    </div>
  `;
}

function formInventario(item = {}) {
  return `
    <div class="form-group">
      <label class="form-label">Nome <span style="color:var(--danger)">*</span></label>
      <input class="form-control" id="f-nome" type="text" placeholder="Ex: Impressora HP LaserJet M404n" value="${item.nome || ''}">
    </div>
    <div class="form-row-2">
      <div class="form-group">
        <label class="form-label">Fabricante</label>
        <input class="form-control" id="f-fabricante" type="text" placeholder="Ex: HP, Dell, Cisco" value="${item.fabricante || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Modelo</label>
        <input class="form-control" id="f-modelo" type="text" placeholder="Ex: M404n, Latitude 5420" value="${item.modelo || ''}">
      </div>
    </div>
    <div class="form-row-2">
      <div class="form-group">
        <label class="form-label">Número de série</label>
        <input class="form-control" id="f-numero-serie" type="text" placeholder="S/N do equipamento" value="${item.numero_serie || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Localização</label>
        <input class="form-control" id="f-localizacao" type="text" placeholder="Ex: Recepção, TI, Financeiro" value="${item.localizacao || ''}">
      </div>
    </div>
    <div class="form-row-2">
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-control" id="f-status">
          ${Object.entries(STATUS_INVENTARIO).map(([v, s]) => `<option value="${v}" ${item.status === v ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"></div>
    </div>
    <div class="form-group">
      <label class="form-label">Descrição</label>
      <textarea class="form-control" id="f-descricao" rows="2" placeholder="Observações sobre o equipamento…">${item.descricao || ''}</textarea>
    </div>
  `;
}

function renderFormModal(item = {}, isEdit = false) {
  const tipo = item.tipo || abaAtiva;
  const titulo = isEdit ? `Editar ${tipo === 'estoque' ? 'Item de Estoque' : 'Item de Inventário'}` : `Novo ${tipo === 'estoque' ? 'Item de Estoque' : 'Item de Inventário'}`;
  document.getElementById('modal-title').textContent = titulo;

  const formHtml = tipo === 'estoque' ? formEstoque(item) : formInventario(item);
  document.getElementById('modal-body').innerHTML = `
    <form id="form-item" style="display:flex;flex-direction:column;gap:.9rem">
      ${formHtml}
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.5rem">
        <button type="button" class="btn btn-secondary" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-salvar">${isEdit ? 'Salvar alterações' : 'Adicionar item'}</button>
      </div>
    </form>
  `;

  document.getElementById('form-item').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar');
    btn.disabled = true;
    btn.textContent = 'Salvando…';

    const nome = document.getElementById('f-nome').value.trim();
    if (!nome) { mostrarToast('Nome é obrigatório', 'erro'); btn.disabled = false; btn.textContent = isEdit ? 'Salvar alterações' : 'Adicionar item'; return; }

    const body = { nome, tipo };
    if (tipo === 'estoque') {
      body.categoria = document.getElementById('f-categoria').value || null;
      body.quantidade = +document.getElementById('f-quantidade').value;
      body.quantidade_minima = +document.getElementById('f-quantidade-minima').value;
    } else {
      body.fabricante = document.getElementById('f-fabricante').value.trim() || null;
      body.modelo = document.getElementById('f-modelo').value.trim() || null;
      body.numero_serie = document.getElementById('f-numero-serie').value.trim() || null;
      body.status = document.getElementById('f-status').value;
    }
    body.localizacao = document.getElementById('f-localizacao').value.trim() || null;
    body.descricao = document.getElementById('f-descricao').value.trim() || null;

    try {
      const url = isEdit ? `/api/admin/itens/${item.id}` : '/api/admin/itens';
      const method = isEdit ? 'PATCH' : 'POST';
      const r = await api(url, { method, body: JSON.stringify(body) });
      if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro ao salvar', 'erro'); btn.disabled = false; btn.textContent = isEdit ? 'Salvar alterações' : 'Adicionar item'; return; }
      fecharModal();
      mostrarToast(isEdit ? 'Item atualizado com sucesso' : 'Item adicionado com sucesso');
      carregarItens();
    } catch { btn.disabled = false; btn.textContent = isEdit ? 'Salvar alterações' : 'Adicionar item'; }
  });
}

function abrirModalNovo() {
  abrirModal();
  renderFormModal({}, false);
}

async function abrirModalEditar(id) {
  abrirModal();
  document.getElementById('modal-body').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const r = await api(`/api/admin/itens/${id}`);
    const item = await r.json();
    renderFormModal(item, true);
  } catch {}
}

async function confirmarDeletar(id, nome) {
  if (!confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return;
  try {
    const r = await api(`/api/admin/itens/${id}`, { method: 'DELETE' });
    if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro ao excluir', 'erro'); return; }
    mostrarToast('Item excluído');
    carregarItens();
  } catch {}
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

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('ativo'));
        btn.classList.add('ativo');
        abaAtiva = btn.dataset.tab;
        carregarItens();
      });
    });

    document.getElementById('btn-novo-item').addEventListener('click', abrirModalNovo);
    document.getElementById('btn-fechar-modal').addEventListener('click', fecharModal);
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) fecharModal();
    });

    await carregarItens();
  } catch {}
})();
