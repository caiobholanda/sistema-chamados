let adminInfo = null;
let abaAtiva = 'micros';
let _itensCache = [];

// ── Caches para as novas abas ─────────────────────────────
let _microsCache = [];
let _microsFiltered = [];
let _tonerCache = [];
let _tonerFiltered = [];
let _impressorasCache = [];
let _impressorasFiltered = [];

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
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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

// ── Toolbar: btn-novo-item label e visibilidade ───────────

function atualizarToolbar() {
  const btnNovo = document.getElementById('btn-novo-item');
  if (abaAtiva === 'micros') {
    btnNovo.style.display = '';
    btnNovo.textContent = '+ Novo Equipamento';
  } else if (abaAtiva === 'impressoras') {
    btnNovo.style.display = '';
    btnNovo.textContent = '+ Nova Impressora';
  } else if (abaAtiva === 'toner') {
    btnNovo.style.display = '';
    btnNovo.textContent = '+ Novo Item Toner';
  } else {
    btnNovo.style.display = 'none';
  }
}

// ── Renderização — abas existentes ────────────────────────

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
            <tr class="pc-row-clicavel" onclick="abrirChamado(${c.id})">
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
  window._cmApi = api;
  window._cmOnClose = () => { if (abaAtiva === 'compra') carregarItens(); };
  window.abrirChamadoModal(id);
}

// ── Renderização — Inventário de Micros ───────────────────

function renderMicros(lista) {
  const el = document.getElementById('itens-lista');
  document.getElementById('badge-micros').textContent = lista.length || '';

  const sos         = [...new Set(lista.map(i => i.sistema_operacional).filter(Boolean))].sort();
  const memorias    = [...new Set(lista.map(i => i.memoria).filter(Boolean))].sort();
  const processadores = [...new Set(lista.map(i => i.processador).filter(Boolean))].sort();

  el.innerHTML = `
    <div class="filter-bar" style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;margin-bottom:1rem">
      <input class="form-control" id="micros-search" type="text" placeholder="Buscar setor, usuário, hostname…" style="max-width:260px">
      <select class="form-control" id="micros-processador" style="max-width:180px">
        <option value="">Todos os processadores</option>
        ${processadores.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('')}
      </select>
      <select class="form-control" id="micros-memoria" style="max-width:150px">
        <option value="">Toda memória</option>
        ${memorias.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('')}
      </select>
      <select class="form-control" id="micros-so" style="max-width:150px">
        <option value="">Todos os S.O.</option>
        ${sos.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
      </select>
      <span id="micros-count" style="color:var(--text-muted);font-size:.82rem;margin-left:.25rem">${lista.length} equipamento${lista.length !== 1 ? 's' : ''}</span>
    </div>
    <div id="micros-tabela"></div>
  `;

  document.getElementById('micros-search').addEventListener('input', filtrarMicros);
  document.getElementById('micros-processador').addEventListener('change', filtrarMicros);
  document.getElementById('micros-memoria').addEventListener('change', filtrarMicros);
  document.getElementById('micros-so').addEventListener('change', filtrarMicros);

  _microsFiltered = lista;
  renderTabelaMicros(lista);
}

function filtrarMicros() {
  const search      = (document.getElementById('micros-search').value || '').toLowerCase();
  const processador = document.getElementById('micros-processador').value;
  const memoria     = document.getElementById('micros-memoria').value;
  const so          = document.getElementById('micros-so').value;
  const filtered = _microsCache.filter(item => {
    const matchSearch = !search ||
      (item.setor    || '').toLowerCase().includes(search) ||
      (item.usuario  || '').toLowerCase().includes(search) ||
      (item.hostname || '').toLowerCase().includes(search);
    const matchProc   = !processador || (item.processador || '') === processador;
    const matchMem    = !memoria     || (item.memoria     || '') === memoria;
    const matchSo     = !so          || (item.sistema_operacional || '') === so;
    return matchSearch && matchProc && matchMem && matchSo;
  });
  document.getElementById('micros-count').textContent = `${filtered.length} equipamento${filtered.length !== 1 ? 's' : ''}`;
  renderTabelaMicros(filtered);
}

function renderTabelaMicros(lista) {
  const el = document.getElementById('micros-tabela');
  if (!el) return;
  const isMaster = adminInfo && adminInfo.is_master;

  if (!lista.length) {
    el.innerHTML = `<div class="empty-state" style="padding:2rem;text-align:center;color:var(--text-muted)">Nenhum equipamento encontrado.</div>`;
    return;
  }

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
            <th>S.O.</th>
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
              <td style="font-size:.78rem;white-space:nowrap">${esc(item.sistema_operacional) || '—'}</td>
              <td style="white-space:nowrap">
                <button class="btn btn-secondary btn-sm" onclick="abrirModalMicros(${item.id})">Editar</button>
                ${isMaster ? `<button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="confirmarDeletarMicro(${item.id}, '${esc(item.setor).replace(/'/g, "\\'")} - ${esc(item.usuario).replace(/'/g, "\\'")}')">Excluir</button>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ── Renderização — Toner/Cartucho ────────────────────────

function qtdCell(v) {
  if (v === 0) return `<span style="color:var(--danger);font-weight:600">0</span>`;
  if (v > 0) return `<span style="color:var(--success);font-weight:500">${v}</span>`;
  return '<span style="color:var(--text-muted)">—</span>';
}

function autoUrgente(item) {
  if (item.tipo === 'toner_mono')  return (item.qtd_preto   || 0) === 0;
  if (item.tipo === 'toner_color') return (item.qtd_preto   || 0) === 0
                                       && (item.qtd_ciano   || 0) === 0
                                       && (item.qtd_magenta || 0) === 0
                                       && (item.qtd_amarelo || 0) === 0;
  return (item.qtd_geral || 0) === 0; // resma / outro
}

function renderToner(itens) {
  const el = document.getElementById('itens-lista');
  document.getElementById('badge-toner').textContent = itens.length || '';
  _tonerFiltered = itens;

  const isMaster = adminInfo && adminInfo.is_master;
  const urgentes = itens.filter(i => autoUrgente(i)).length;

  el.innerHTML = `
    <div class="filter-bar" style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;margin-bottom:1rem">
      <input class="form-control" id="toner-search" type="text" placeholder="Buscar nome…" style="max-width:220px">
      <select class="form-control" id="toner-tipo" style="max-width:180px">
        <option value="">Todos os tipos</option>
        <option value="toner_mono">Toner Mono</option>
        <option value="toner_color">Toner Color</option>
        <option value="resma">Resma/Papel</option>
        <option value="outro">Outro</option>
      </select>
      <select class="form-control" id="toner-urgente" style="max-width:150px">
        <option value="">Todos</option>
        <option value="1">Urgente</option>
        <option value="0">Normal</option>
      </select>
      <span id="toner-count" style="color:var(--text-muted);font-size:.82rem;margin-left:.25rem">${itens.length} item${itens.length !== 1 ? 's' : ''}</span>
    </div>
    <div id="toner-tabela"></div>
  `;

  document.getElementById('toner-search').addEventListener('input', filtrarToner);
  document.getElementById('toner-tipo').addEventListener('change', filtrarToner);
  document.getElementById('toner-urgente').addEventListener('change', filtrarToner);

  renderTabelaToner(itens);
}

function filtrarToner() {
  const search   = (document.getElementById('toner-search').value || '').toLowerCase();
  const tipo     = document.getElementById('toner-tipo').value;
  const urgente  = document.getElementById('toner-urgente').value;
  const filtered = _tonerCache.filter(item => {
    const matchSearch  = !search  || (item.nome || '').toLowerCase().includes(search);
    const matchTipo    = !tipo    || item.tipo === tipo;
    const matchUrgente = urgente === '' ? true : urgente === '1' ? autoUrgente(item) : !autoUrgente(item);
    return matchSearch && matchTipo && matchUrgente;
  });
  document.getElementById('toner-count').textContent = `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`;
  renderTabelaToner(filtered);
}

function renderTabelaToner(itens) {
  const el = document.getElementById('toner-tabela');
  if (!el) return;
  const isMaster = adminInfo && adminInfo.is_master;
  const urgentes = itens.filter(i => autoUrgente(i)).length;

  el.innerHTML = `
    ${urgentes ? `<div class="itens-alerta-bar" style="margin-bottom:.75rem">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      ${urgentes} ${urgentes === 1 ? 'item sem estoque' : 'itens sem estoque'}
    </div>` : ''}
    ${itens.length ? `
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${itens.map(item => `
              <tr${autoUrgente(item) ? ' style="background:rgba(220,38,38,.04)"' : ''}>
                <td style="font-weight:500">${esc(item.nome)}</td>
                <td><span class="itens-cat-tag">${esc(TIPO_LABELS[item.tipo] || item.tipo)}</span></td>
                <td style="text-align:center">${item.tipo === 'resma' || item.tipo === 'outro' ? '<span style="color:var(--text-muted)">—</span>' : qtdCell(item.qtd_preto)}</td>
                <td style="text-align:center">${item.tipo === 'toner_color' ? qtdCell(item.qtd_ciano) : '<span style="color:var(--text-muted)">—</span>'}</td>
                <td style="text-align:center">${item.tipo === 'toner_color' ? qtdCell(item.qtd_magenta) : '<span style="color:var(--text-muted)">—</span>'}</td>
                <td style="text-align:center">${item.tipo === 'toner_color' ? qtdCell(item.qtd_amarelo) : '<span style="color:var(--text-muted)">—</span>'}</td>
                <td style="text-align:center">${(item.tipo === 'resma' || item.tipo === 'outro') ? qtdCell(item.qtd_geral) : '<span style="color:var(--text-muted)">—</span>'}</td>
                <td style="text-align:center">${autoUrgente(item) ? '<span style="color:var(--danger);font-weight:700">SIM</span>' : '<span style="color:var(--text-muted)">—</span>'}</td>
                <td style="white-space:nowrap">
                  <button class="btn btn-primary btn-sm" onclick="abrirMovimentacao(${item.id})">Editar</button>
                  <button class="btn btn-secondary btn-sm" onclick="abrirHistoricoMovimentacoes(${item.id},'${esc(item.nome).replace(/'/g, "\\'")}')">Histórico</button>
                  ${isMaster ? `<button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="confirmarDeletarToner(${item.id},'${esc(item.nome).replace(/'/g, "\\'")}')">Excluir</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : `<div class="empty-state" style="padding:2rem;text-align:center;color:var(--text-muted)">Nenhum item cadastrado. Clique em "+ Novo Item Toner" para adicionar.</div>`}
  `;
}

// ── Renderização — Impressoras na Rede ────────────────────

function renderImpressoras(impressoras) {
  const el = document.getElementById('itens-lista');
  document.getElementById('badge-impressoras').textContent = impressoras.length || '';
  _impressorasFiltered = impressoras;

  const locs = [...new Set(impressoras.map(i => i.localizacao).filter(Boolean))].sort();

  el.innerHTML = `
    <div class="filter-bar" style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;margin-bottom:1rem">
      <input class="form-control" id="imp-search" type="text" placeholder="Buscar nome, IP, SELB…" style="max-width:240px">
      <select class="form-control" id="imp-loc-filter" style="max-width:200px">
        <option value="">Todas as localizações</option>
        ${locs.map(l => `<option value="${esc(l)}">${esc(l)}</option>`).join('')}
      </select>
      <span id="imp-count" style="color:var(--text-muted);font-size:.82rem;margin-left:.25rem">${impressoras.length} impressora${impressoras.length !== 1 ? 's' : ''}</span>
    </div>
    <div id="imp-tabela"></div>
  `;

  document.getElementById('imp-search').addEventListener('input', filtrarImpressoras);
  document.getElementById('imp-loc-filter').addEventListener('change', filtrarImpressoras);

  renderTabelaImpressoras(impressoras);
}

function filtrarImpressoras() {
  const search = (document.getElementById('imp-search').value || '').toLowerCase();
  const loc    = document.getElementById('imp-loc-filter').value;
  const filtered = _impressorasCache.filter(item => {
    const matchSearch = !search ||
      (item.nome || '').toLowerCase().includes(search) ||
      (item.ip   || '').toLowerCase().includes(search) ||
      (item.selb || '').toLowerCase().includes(search);
    const matchLoc = !loc || (item.localizacao || '') === loc;
    return matchSearch && matchLoc;
  });
  document.getElementById('imp-count').textContent = `${filtered.length} impressora${filtered.length !== 1 ? 's' : ''}`;
  renderTabelaImpressoras(filtered);
}

function renderTabelaImpressoras(lista) {
  const el = document.getElementById('imp-tabela');
  if (!el) return;
  const isMaster = adminInfo && adminInfo.is_master;

  if (!lista.length) {
    el.innerHTML = `<div class="empty-state" style="padding:2rem;text-align:center;color:var(--text-muted)">Nenhuma impressora encontrada.</div>`;
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
                <button class="btn btn-secondary btn-sm" onclick="abrirModalImpressora(${item.id})">Editar</button>
                ${isMaster ? `<button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="confirmarDeletarImpressora(${item.id},'${esc(item.nome).replace(/'/g, "\\'")}')">Excluir</button>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ── Carregar conteúdo da aba ──────────────────────────────

async function carregarItens() {
  document.getElementById('itens-lista').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  atualizarToolbar();
  try {
    if (abaAtiva === 'compra') {
      const r = await api('/api/admin/itens/chamados-compra');
      const chamados = await r.json();
      renderCompra(chamados);
    } else if (abaAtiva === 'micros') {
      const r = await api('/api/admin/inventario');
      _microsCache = await r.json();
      renderMicros(_microsCache);
    } else if (abaAtiva === 'toner') {
      const r = await api('/api/admin/estoque/itens');
      _tonerCache = await r.json();
      renderToner(_tonerCache);
    } else if (abaAtiva === 'impressoras') {
      const r = await api('/api/admin/estoque/impressoras');
      _impressorasCache = await r.json();
      renderImpressoras(_impressorasCache);
    }
  } catch (e) {
    if (e.message !== '401') document.getElementById('itens-lista').innerHTML = '<div style="padding:2rem;color:var(--danger)">Erro ao carregar dados.</div>';
  }
}

// ── Modal genérico (estoque/inventario legado) ────────────

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
  if (abaAtiva === 'micros') {
    abrirModalMicros(null);
  } else if (abaAtiva === 'impressoras') {
    abrirModalImpressora(null);
  } else if (abaAtiva === 'toner') {
    abrirNovoItemToner();
  }
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

// ── Modal Inventário de Micros ────────────────────────────

function fecharModalMicros() {
  document.getElementById('micros-modal-overlay').style.display = 'none';
  document.getElementById('micros-modal-body').innerHTML = '';
}

function abrirModalMicros(id) {
  document.getElementById('micros-modal-overlay').style.display = 'flex';
  const item = id ? _microsCache.find(i => i.id === id) : null;
  renderFormMicros(item || {}, !!id);
}

function renderFormMicros(item, isEdit) {
  document.getElementById('micros-modal-title').textContent = isEdit ? 'Editar Equipamento' : 'Adicionar Equipamento';

  document.getElementById('micros-modal-body').innerHTML = `
    <form id="form-micros" style="display:flex;flex-direction:column;gap:.8rem">
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Setor <span style="color:var(--danger)">*</span></label>
          <input class="form-control" id="fm-setor" type="text" value="${esc(item.setor || '')}" placeholder="Ex: CONTROLADORIA">
        </div>
        <div class="form-group">
          <label class="form-label">Usuário <span style="color:var(--danger)">*</span></label>
          <input class="form-control" id="fm-usuario" type="text" value="${esc(item.usuario || '')}" placeholder="Nome do usuário">
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Processador</label>
          <input class="form-control" id="fm-processador" type="text" value="${esc(item.processador || '')}" placeholder="Ex: I5 12500">
        </div>
        <div class="form-group">
          <label class="form-label">Memória</label>
          <input class="form-control" id="fm-memoria" type="text" value="${esc(item.memoria || '')}" placeholder="Ex: 8GB">
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">S.O.</label>
          <input class="form-control" id="fm-so" type="text" value="${esc(item.sistema_operacional || '')}" placeholder="Ex: WIN 11">
        </div>
        <div class="form-group">
          <label class="form-label">HD/SSD</label>
          <input class="form-control" id="fm-hd" type="text" value="${esc(item.hd_ssd || '')}" placeholder="Ex: SSD 256">
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Office</label>
          <input class="form-control" id="fm-office" type="text" value="${esc(item.office || '')}" placeholder="Ex: H & B 2021">
        </div>
        <div class="form-group">
          <label class="form-label">TAG</label>
          <input class="form-control" id="fm-tag" type="text" value="${esc(item.tag || '')}" placeholder="Código da tag">
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Entradas Monitor</label>
          <input class="form-control" id="fm-entradas" type="text" value="${esc(item.entradas_monitor || '')}" placeholder="Ex: VGA-D.P.">
        </div>
        <div class="form-group">
          <label class="form-label">Modelo Monitor</label>
          <input class="form-control" id="fm-monitor" type="text" value="${esc(item.modelo_monitor || '')}" placeholder="Ex: DELL">
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Status</label>
          <input class="form-control" id="fm-status" type="text" value="${esc(item.status || '')}" placeholder="Ex: NOVO, CONCLUIDO">
        </div>
        <div class="form-group">
          <label class="form-label">Hostname</label>
          <input class="form-control" id="fm-hostname" type="text" value="${esc(item.hostname || '')}" placeholder="Ex: CONTROL-01">
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Data Troca</label>
          <input class="form-control" id="fm-troca" type="text" value="${esc(item.data_troca || '')}" placeholder="Ex: 2024">
        </div>
        <div class="form-group">
          <label class="form-label">Atualização Win11</label>
          <input class="form-control" id="fm-win11" type="text" value="${esc(item.atualizacao_win11 || '')}" placeholder="Ex: CONCLUIDO">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Observação</label>
        <input class="form-control" id="fm-obs" type="text" value="${esc(item.observacao || '')}" placeholder="Observações">
      </div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.25rem">
        <button type="button" class="btn btn-secondary" onclick="fecharModalMicros()">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-salvar-micro">${isEdit ? 'Salvar alterações' : 'Adicionar'}</button>
      </div>
    </form>
  `;

  document.getElementById('form-micros').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar-micro');
    btn.disabled = true;
    btn.textContent = 'Salvando…';

    const setor = document.getElementById('fm-setor').value.trim();
    const usuario = document.getElementById('fm-usuario').value.trim();
    if (!setor) { mostrarToast('Setor é obrigatório', 'erro'); btn.disabled = false; btn.textContent = isEdit ? 'Salvar alterações' : 'Adicionar'; return; }
    if (!usuario) { mostrarToast('Usuário é obrigatório', 'erro'); btn.disabled = false; btn.textContent = isEdit ? 'Salvar alterações' : 'Adicionar'; return; }

    const body = {
      setor,
      usuario,
      processador: document.getElementById('fm-processador').value.trim(),
      memoria: document.getElementById('fm-memoria').value.trim(),
      sistema_operacional: document.getElementById('fm-so').value.trim(),
      hd_ssd: document.getElementById('fm-hd').value.trim(),
      office: document.getElementById('fm-office').value.trim(),
      tag: document.getElementById('fm-tag').value.trim(),
      entradas_monitor: document.getElementById('fm-entradas').value.trim(),
      modelo_monitor: document.getElementById('fm-monitor').value.trim(),
      status: document.getElementById('fm-status').value.trim(),
      hostname: document.getElementById('fm-hostname').value.trim(),
      data_troca: document.getElementById('fm-troca').value.trim(),
      atualizacao_win11: document.getElementById('fm-win11').value.trim(),
      observacao: document.getElementById('fm-obs').value.trim(),
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
      fecharModalMicros();
      mostrarToast(isEdit ? 'Equipamento atualizado' : 'Equipamento adicionado');
      carregarItens();
    } catch {
      btn.disabled = false;
      btn.textContent = isEdit ? 'Salvar alterações' : 'Adicionar';
    }
  });
}

async function confirmarDeletarMicro(id, label) {
  if (!adminInfo || !adminInfo.is_master) return;
  if (!confirm(`Excluir "${label}"? Esta ação não pode ser desfeita.`)) return;
  try {
    const r = await api(`/api/admin/inventario/${id}`, { method: 'DELETE' });
    if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro ao excluir', 'erro'); return; }
    mostrarToast('Equipamento excluído');
    carregarItens();
  } catch {}
}

// ── Modal Toner (novo/editar) — Estoque TI ───────────────

function abrirNovoItemToner() {
  document.getElementById('modal-title').textContent = 'Novo Item';
  abrirModal();
  document.getElementById('modal-body').innerHTML = `
    <form id="form-toner" style="display:flex;flex-direction:column;gap:.8rem">
      <div class="form-group">
        <label class="form-label">Nome <span style="color:var(--danger)">*</span></label>
        <input class="form-control" id="ft-nome" type="text" placeholder="Ex: RICOH SP 3710SF">
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select class="form-control" id="ft-tipo">
            <option value="toner_mono">Toner Mono</option>
            <option value="toner_color">Toner Color</option>
            <option value="resma">Resma/Papel</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:.25rem">
          <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-size:.88rem">
            <input type="checkbox" id="ft-urgente" style="width:16px;height:16px"> Urgente (alerta)
          </label>
        </div>
      </div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.25rem">
        <button type="button" class="btn btn-secondary" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-salvar-toner">Adicionar</button>
      </div>
    </form>
  `;
  document.getElementById('form-toner').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar-toner');
    btn.disabled = true; btn.textContent = 'Salvando…';
    const nome = document.getElementById('ft-nome').value.trim();
    if (!nome) { mostrarToast('Nome obrigatório', 'erro'); btn.disabled = false; btn.textContent = 'Adicionar'; return; }
    try {
      const r = await api('/api/admin/estoque/itens', { method: 'POST', body: JSON.stringify({
        nome, tipo: document.getElementById('ft-tipo').value, urgente: document.getElementById('ft-urgente').checked,
      }) });
      if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro', 'erro'); btn.disabled = false; btn.textContent = 'Adicionar'; return; }
      fecharModal(); mostrarToast('Item criado'); carregarItens();
    } catch { btn.disabled = false; btn.textContent = 'Adicionar'; }
  });
}

function abrirEditarItemToner(id) {
  const item = _tonerCache.find(i => i.id === id);
  if (!item) return;
  document.getElementById('modal-title').textContent = 'Editar Item';
  abrirModal();
  document.getElementById('modal-body').innerHTML = `
    <form id="form-toner" style="display:flex;flex-direction:column;gap:.8rem">
      <div class="form-group">
        <label class="form-label">Nome <span style="color:var(--danger)">*</span></label>
        <input class="form-control" id="ft-nome" type="text" value="${esc(item.nome)}">
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select class="form-control" id="ft-tipo">
            ${['toner_mono','toner_color','resma','outro'].map(t => `<option value="${t}" ${item.tipo === t ? 'selected' : ''}>${TIPO_LABELS[t]}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:.25rem">
          <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-size:.88rem">
            <input type="checkbox" id="ft-urgente" ${item.urgente ? 'checked' : ''} style="width:16px;height:16px"> Urgente (alerta)
          </label>
        </div>
      </div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.25rem">
        <button type="button" class="btn btn-secondary" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-salvar-toner">Salvar</button>
      </div>
    </form>
  `;
  document.getElementById('form-toner').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar-toner');
    btn.disabled = true; btn.textContent = 'Salvando…';
    try {
      const r = await api(`/api/admin/estoque/itens/${id}`, { method: 'PATCH', body: JSON.stringify({
        nome: document.getElementById('ft-nome').value.trim(),
        tipo: document.getElementById('ft-tipo').value,
        urgente: document.getElementById('ft-urgente').checked,
      }) });
      if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro', 'erro'); btn.disabled = false; btn.textContent = 'Salvar'; return; }
      fecharModal(); mostrarToast('Item atualizado'); carregarItens();
    } catch { btn.disabled = false; btn.textContent = 'Salvar'; }
  });
}

async function confirmarDeletarToner(id, nome) {
  if (!adminInfo || !adminInfo.is_master) return;
  if (!confirm(`Excluir "${nome}"? Isso apagará também o histórico de movimentações.`)) return;
  try {
    const r = await api(`/api/admin/estoque/itens/${id}`, { method: 'DELETE' });
    if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro ao excluir', 'erro'); return; }
    mostrarToast('Item excluído'); carregarItens();
  } catch {}
}

// ── Modal Movimentação — Estoque TI ──────────────────────

function fecharMovModal() {
  document.getElementById('mov-modal-overlay').style.display = 'none';
  document.getElementById('mov-modal-body').innerHTML = '';
}

function abrirMovimentacao(itemId, tipoMov) {
  const item = _tonerCache.find(i => i.id === itemId);
  if (!item) return;

  document.getElementById('mov-modal-overlay').style.display = 'flex';

  if (!tipoMov) {
    document.getElementById('mov-modal-title').textContent = item.nome;
    document.getElementById('mov-modal-body').innerHTML = `
      <p style="color:var(--text-muted);font-size:.85rem;margin-bottom:1.25rem">Selecione o tipo de movimentação:</p>
      <div style="display:flex;gap:1rem">
        <button class="btn btn-primary" style="flex:1;padding:.75rem 0;font-size:.95rem" onclick="abrirMovimentacao(${itemId},'entrada')">+ Entrada</button>
        <button class="btn btn-ghost" style="flex:1;padding:.75rem 0;font-size:.95rem;border:1.5px solid var(--danger);color:var(--danger)" onclick="abrirMovimentacao(${itemId},'saida')">− Saída</button>
      </div>
      <div style="margin-top:1rem;text-align:right">
        <button class="btn btn-secondary btn-sm" onclick="fecharMovModal()">Cancelar</button>
      </div>
    `;
    return;
  }

  // Determine current stock for the color that will be selected (for saída validation hint)
  const cores = [];
  if (item.tipo === 'toner_mono' || item.tipo === 'toner_color') cores.push({ val: 'preto', label: 'Preto', atual: item.qtd_preto || 0 });
  if (item.tipo === 'toner_color') {
    cores.push({ val: 'ciano', label: 'Ciano', atual: item.qtd_ciano || 0 });
    cores.push({ val: 'magenta', label: 'Magenta', atual: item.qtd_magenta || 0 });
    cores.push({ val: 'amarelo', label: 'Amarelo', atual: item.qtd_amarelo || 0 });
  }
  if (item.tipo === 'resma' || item.tipo === 'outro') cores.push({ val: 'geral', label: 'Geral', atual: item.qtd_geral || 0 });

  const showCor = cores.length > 1;

  document.getElementById('mov-modal-title').textContent = tipoMov === 'entrada' ? `Entrada — ${item.nome}` : `Saída — ${item.nome}`;
  document.getElementById('mov-modal-overlay').style.display = 'flex';

  document.getElementById('mov-modal-body').innerHTML = `
    <form id="form-mov" style="display:flex;flex-direction:column;gap:.8rem">
      ${showCor ? `
        <div class="form-group">
          <label class="form-label">Cor / Tipo</label>
          <select class="form-control" id="mov-cor" onchange="atualizarEstoqueAtual(${JSON.stringify(cores).replace(/"/g,'&quot;')}, this.value, '${tipoMov}')">
            ${cores.map(c => `<option value="${c.val}">${c.label}</option>`).join('')}
          </select>
        </div>
      ` : `<input type="hidden" id="mov-cor" value="${cores[0] ? cores[0].val : 'geral'}">`}
      ${tipoMov === 'saida' ? `<div id="mov-estoque-atual" style="font-size:.82rem;color:var(--text-muted);margin-top:-.4rem">Estoque atual: <strong>${cores[0] ? cores[0].atual : 0}</strong></div>` : ''}
      <div class="form-group">
        <label class="form-label">Quantidade</label>
        <input class="form-control" id="mov-qtd" type="number" min="1" value="1">
      </div>
      <div class="form-group">
        <label class="form-label">Observação <span style="color:var(--text-muted);font-size:.78rem">(opcional)</span></label>
        <input class="form-control" id="mov-obs" type="text" placeholder="Ex: Enviado para Recepção…">
      </div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.25rem">
        <button type="button" class="btn btn-secondary" onclick="fecharMovModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-salvar-mov">${tipoMov === 'entrada' ? 'Registrar Entrada' : 'Registrar Saída'}</button>
      </div>
    </form>
  `;

  // Store cores on window for the onchange handler
  window._movCores = cores;

  document.getElementById('form-mov').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar-mov');
    btn.disabled = true; btn.textContent = 'Salvando…';
    const cor = document.getElementById('mov-cor').value;
    const qtd = parseInt(document.getElementById('mov-qtd').value, 10);
    const obs = document.getElementById('mov-obs').value.trim();

    if (!qtd || qtd < 1) { mostrarToast('Quantidade inválida', 'erro'); btn.disabled = false; btn.textContent = tipoMov === 'entrada' ? 'Registrar Entrada' : 'Registrar Saída'; return; }

    // Client-side saída stock check
    if (tipoMov === 'saida') {
      const corObj = cores.find(c => c.val === cor);
      if (corObj && qtd > corObj.atual) {
        mostrarToast(`Quantidade excede o estoque atual (${corObj.atual})`, 'erro');
        btn.disabled = false; btn.textContent = 'Registrar Saída'; return;
      }
    }

    try {
      const r = await api(`/api/admin/estoque/itens/${itemId}/movimentacao`, {
        method: 'POST',
        body: JSON.stringify({ tipo: tipoMov, cor, quantidade: qtd, observacao: obs }),
      });
      if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro', 'erro'); btn.disabled = false; btn.textContent = tipoMov === 'entrada' ? 'Registrar Entrada' : 'Registrar Saída'; return; }
      fecharMovModal();
      mostrarToast(tipoMov === 'entrada' ? 'Entrada registrada' : 'Saída registrada');
      carregarItens();
    } catch { btn.disabled = false; btn.textContent = tipoMov === 'entrada' ? 'Registrar Entrada' : 'Registrar Saída'; }
  });
}

function atualizarEstoqueAtual(cores, corVal, tipoMov) {
  if (tipoMov !== 'saida') return;
  const el = document.getElementById('mov-estoque-atual');
  if (!el) return;
  const corObj = cores.find(c => c.val === corVal);
  if (corObj) el.innerHTML = `Estoque atual: <strong>${corObj.atual}</strong>`;
}

// ── Modal Histórico de Movimentações — Estoque TI ─────────

function fecharHistMovModal() {
  document.getElementById('hist-mov-modal-overlay').style.display = 'none';
  document.getElementById('hist-mov-modal-body').innerHTML = '';
}

async function abrirHistoricoMovimentacoes(itemId, nomeItem) {
  document.getElementById('hist-mov-modal-title').textContent = `Histórico — ${nomeItem}`;
  document.getElementById('hist-mov-modal-overlay').style.display = 'flex';
  document.getElementById('hist-mov-modal-body').innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  try {
    const r = await api(`/api/admin/estoque/itens/${itemId}/movimentacoes`);
    const movs = await r.json();

    if (!movs.length) {
      document.getElementById('hist-mov-modal-body').innerHTML = '<div style="padding:1rem;text-align:center;color:var(--text-muted)">Nenhuma movimentação registrada.</div>';
      return;
    }

    document.getElementById('hist-mov-modal-body').innerHTML = `
      <div class="table-wrap" style="max-height:400px;overflow-y:auto">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Cor</th>
              <th style="text-align:center">Qtd</th>
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
    document.getElementById('hist-mov-modal-body').innerHTML = '<div style="padding:1rem;color:var(--danger)">Erro ao carregar histórico.</div>';
  }
}

// ── Modal Impressoras — Estoque TI ────────────────────────

function fecharModalImpressora() {
  document.getElementById('imp-modal-overlay').style.display = 'none';
  document.getElementById('imp-modal-body').innerHTML = '';
}

function abrirModalImpressora(id) {
  const item = id ? _impressorasCache.find(i => i.id === id) : null;
  const isEdit = !!id;
  document.getElementById('imp-modal-title').textContent = isEdit ? 'Editar Impressora' : 'Nova Impressora';
  document.getElementById('imp-modal-overlay').style.display = 'flex';

  document.getElementById('imp-modal-body').innerHTML = `
    <form id="form-imp" style="display:flex;flex-direction:column;gap:.8rem">
      <div class="form-group">
        <label class="form-label">Nome <span style="color:var(--danger)">*</span></label>
        <input class="form-control" id="imp-nome" type="text" value="${esc(item ? item.nome : '')}" placeholder="Ex: RICOH SP 3710SF">
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">IP</label>
          <input class="form-control" id="imp-ip" type="text" value="${esc(item ? item.ip : '')}" placeholder="Ex: 10.1.7.17">
        </div>
        <div class="form-group">
          <label class="form-label">SELB</label>
          <input class="form-control" id="imp-selb" type="text" value="${esc(item ? item.selb : '')}" placeholder="Ex: 2IY9">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Localização</label>
        <input class="form-control" id="imp-loc" type="text" value="${esc(item ? item.localizacao : '')}" placeholder="Ex: RECEPCAO">
      </div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.25rem">
        <button type="button" class="btn btn-secondary" onclick="fecharModalImpressora()">Cancelar</button>
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
    const body = {
      nome,
      ip: document.getElementById('imp-ip').value.trim(),
      selb: document.getElementById('imp-selb').value.trim(),
      localizacao: document.getElementById('imp-loc').value.trim(),
    };
    try {
      const url = isEdit ? `/api/admin/estoque/impressoras/${id}` : '/api/admin/estoque/impressoras';
      const method = isEdit ? 'PATCH' : 'POST';
      const r = await api(url, { method, body: JSON.stringify(body) });
      if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro', 'erro'); btn.disabled = false; btn.textContent = isEdit ? 'Salvar' : 'Adicionar'; return; }
      fecharModalImpressora();
      mostrarToast(isEdit ? 'Impressora atualizada' : 'Impressora adicionada');
      carregarItens();
    } catch { btn.disabled = false; btn.textContent = isEdit ? 'Salvar' : 'Adicionar'; }
  });
}

async function confirmarDeletarImpressora(id, nome) {
  if (!adminInfo || !adminInfo.is_master) return;
  if (!confirm(`Excluir "${nome}"?`)) return;
  try {
    const r = await api(`/api/admin/estoque/impressoras/${id}`, { method: 'DELETE' });
    if (!r.ok) { const d = await r.json(); mostrarToast(d.erro || 'Erro', 'erro'); return; }
    mostrarToast('Impressora excluída'); carregarItens();
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

    // Expõe adminInfo para chamado-modal.js
    window.adminInfo = adminInfo;

    document.getElementById('btn-novo-item').addEventListener('click', abrirModalNovo);

    // Modal genérico (estoque/inventario legado)
    document.getElementById('btn-fechar-modal').addEventListener('click', fecharModal);
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) fecharModal();
    });

    // Modal chamado
    document.getElementById('cm-btn-fechar-modal').addEventListener('click', () => window.fecharChamadoModal());
    document.getElementById('cm-modal-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) window.fecharChamadoModal();
    });

    // Modal micros
    document.getElementById('micros-btn-fechar').addEventListener('click', fecharModalMicros);
    document.getElementById('micros-modal-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) fecharModalMicros();
    });

    // Modal movimentação
    document.getElementById('mov-btn-fechar').addEventListener('click', fecharMovModal);
    document.getElementById('mov-modal-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) fecharMovModal();
    });

    // Modal histórico movimentações
    document.getElementById('hist-mov-btn-fechar').addEventListener('click', fecharHistMovModal);
    document.getElementById('hist-mov-modal-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) fecharHistMovModal();
    });

    // Modal impressoras
    document.getElementById('imp-btn-fechar').addEventListener('click', fecharModalImpressora);
    document.getElementById('imp-modal-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) fecharModalImpressora();
    });

    await carregarItens();
  } catch {}
})();
