'use strict';

const FREQ_LABEL = {
  diario:'Diário', semanal:'Semanal', mensal:'Mensal',
  bimestral:'Bimestral', trimestral:'Trimestral', semestral:'Semestral', anual:'Anual',
};
const FREQ_SHORT = {
  diario:'DIA', semanal:'SEM', mensal:'MES',
  bimestral:'BIM', trimestral:'TRI', semestral:'SEM·A', anual:'ANO',
};
const DIA_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MESES = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// ── Auth ──────────────────────────────────────────────────────────────────────
let _adminInfo = null;
async function checkAuth() {
  try {
    const r = await fetch('/api/admin/me', { credentials: 'include' });
    if (!r.ok) { window.location.href = '/admin-login.html'; return false; }
    _adminInfo = await r.json();
    return true;
  } catch { window.location.href = '/admin-login.html'; return false; }
}

// ── Fetch helper ──────────────────────────────────────────────────────────────
async function apiFetch(url, opts = {}) {
  const r = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts });
  if (r.status === 401) { window.location.href = '/admin-login.html'; return null; }
  return r;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, tipo = 'sucesso') {
  const c = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast-notif toast-${tipo}`;
  el.innerHTML = `<span class="toast-icon">${tipo==='sucesso'?'✓':'✕'}</span>${msg}`;
  c.appendChild(el);
  setTimeout(() => el.classList.add('hide'), 3000);
  setTimeout(() => el.remove(), 3500);
}

// ── Formatadores ──────────────────────────────────────────────────────────────
function fmtDT(iso) {
  if (!iso) return '—';
  const d = new Date(iso.replace(' ','T')+'Z');
  return d.toLocaleDateString('pt-BR',{timeZone:'America/Fortaleza'}) + ' ' +
         d.toLocaleTimeString('pt-BR',{timeZone:'America/Fortaleza',hour:'2-digit',minute:'2-digit'});
}

function descrFreq(prog) {
  const { frequencia, dia_semana, dia_mes, mes, hora } = prog;
  const h = hora || '08:00';
  switch (frequencia) {
    case 'diario':     return `Todo dia às ${h}`;
    case 'semanal':    return `Toda ${DIA_SEMANA[dia_semana] ?? '?'} às ${h}`;
    case 'mensal':     return `Todo dia ${dia_mes} às ${h}`;
    case 'bimestral':  return `Dia ${dia_mes} a cada 2 meses`;
    case 'trimestral': return `Dia ${dia_mes} a cada 3 meses`;
    case 'semestral':  return `Dia ${dia_mes} a cada 6 meses`;
    case 'anual':      return `${dia_mes}/${mes} todo ano às ${h}`;
    default:           return frequencia;
  }
}

// ── Renderizar cards ──────────────────────────────────────────────────────────
function renderCards(items) {
  const grid = document.getElementById('prog-grid');
  document.getElementById('prog-empty').style.display = items.length ? 'none' : 'block';
  grid.innerHTML = items.map(p => `
    <div class="prog-card ${p.ativo ? '' : 'inativo'}" data-id="${p.id}">
      <div class="prog-card-head">
        <div class="prog-freq-dot freq-${p.frequencia}">${FREQ_SHORT[p.frequencia]??p.frequencia}</div>
        <div style="flex:1;min-width:0">
          <div class="prog-card-title">${esc(p.titulo)}</div>
          <div class="prog-card-sub">${descrFreq(p)} · ${esc(p.setor)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div class="prog-next">Próxima: ${fmtDT(p.proxima_execucao)}</div>
          ${p.total_gerados ? `<div style="font-size:.7rem;color:var(--text-secondary)">${p.total_gerados} gerado${p.total_gerados>1?'s':''}</div>` : ''}
        </div>
      </div>
      <div class="prog-card-body">
        <div class="prog-meta"><strong>Solicitante:</strong> ${esc(p.nome)}</div>
        <div class="prog-meta"><strong>Categoria:</strong> ${esc(p.categoria||'—')}</div>
        <div class="prog-meta"><strong>Prioridade:</strong> ${esc(p.prioridade)}</div>
        ${p.admin_nome ? `<div class="prog-meta"><strong>Responsável:</strong> ${esc(p.admin_nome)}</div>` : ''}
        ${p.ultima_execucao ? `<div class="prog-meta"><strong>Última execução:</strong> ${fmtDT(p.ultima_execucao)}</div>` : ''}
      </div>
      <div class="prog-card-actions">
        <button class="toggle-btn ${p.ativo?'ativo':'inativo'}" onclick="toggleProg(${p.id},${p.ativo})">${p.ativo?'✓ Ativo':'✗ Inativo'}</button>
        <button class="btn btn-ghost btn-sm" onclick="editarProg(${p.id})">Editar</button>
        <button class="btn btn-ghost btn-sm" onclick="verLog(${p.id},'${esc(p.titulo)}')">Log</button>
        <div style="flex:1"></div>
        <button class="btn btn-danger btn-sm" onclick="deletarProg(${p.id},'${esc(p.titulo)}')">Excluir</button>
      </div>
    </div>
  `).join('');
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Carregar dados ────────────────────────────────────────────────────────────
async function carregarAgendamentos() {
  document.getElementById('prog-loading').style.display = 'block';
  const r = await apiFetch('/api/admin/programados');
  document.getElementById('prog-loading').style.display = 'none';
  if (!r) return;
  const d = await r.json();
  if (d.ok) renderCards(d.items);
}

async function carregarHistorico() {
  const tbody = document.getElementById('hist-body');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-secondary)">Carregando…</td></tr>';
  const r = await apiFetch('/api/admin/programados/recentes');
  if (!r) return;
  const d = await r.json();
  if (!d.ok || !d.items.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhuma execução registrada ainda.</td></tr>';
    return;
  }
  tbody.innerHTML = d.items.map(it => `
    <tr>
      <td><strong>${esc(it.prog_titulo)}</strong></td>
      <td><a href="/admin-painel.html#chamado=${it.chamado_id}" target="_blank" style="color:var(--gold)">#${it.chamado_id}</a></td>
      <td>${esc(it.nome)} · ${esc(it.setor)}</td>
      <td><span class="badge badge-status badge-status-${it.status}">${it.status}</span></td>
      <td>${fmtDT(it.executado_em)}</td>
    </tr>
  `).join('');
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('tab-agendamentos').style.display = tab==='agendamentos' ? 'block' : 'none';
    document.getElementById('tab-historico').style.display    = tab==='historico'    ? 'block' : 'none';
    if (tab==='historico') carregarHistorico();
  });
});

// ── Modal ─────────────────────────────────────────────────────────────────────
let _editId = null;

function abrirModal(titulo = 'Novo Agendamento') {
  document.getElementById('modal-titulo').textContent = titulo;
  document.getElementById('modal-overlay').style.display = 'flex';
  document.getElementById('modal-erro').style.display = 'none';
  document.getElementById('preview-datas').style.display = 'none';
}

function fecharModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  _editId = null;
  limparForm();
}

function limparForm() {
  ['f-titulo','f-nome','f-setor','f-ramal','f-categoria','f-descricao','f-pessoa-busca'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const selEl = document.getElementById('f-pessoa-selecionada');
  if (selEl) selEl.style.display = 'none';
  const resEl = document.getElementById('f-pessoa-resultados');
  if (resEl) resEl.style.display = 'none';
  document.getElementById('f-frequencia').value = '';
  document.getElementById('f-hora').value = '08:00';
  document.getElementById('f-prioridade').value = 'normal';
  document.getElementById('f-admin').value = '';
  document.getElementById('f-pular-feriados').checked = true;
  atualizarCamposFreq();
}

function lerForm() {
  const freq = document.getElementById('f-frequencia').value;
  return {
    titulo:             document.getElementById('f-titulo').value,
    nome:               document.getElementById('f-nome').value,
    setor:              document.getElementById('f-setor').value,
    ramal:              document.getElementById('f-ramal').value,
    descricao:          document.getElementById('f-descricao').value,
    categoria:          document.getElementById('f-categoria').value,
    prioridade:         document.getElementById('f-prioridade').value,
    admin_responsavel_id: document.getElementById('f-admin').value || null,
    frequencia:         freq,
    hora:               document.getElementById('f-hora').value,
    dia_semana:         freq==='semanal'  ? parseInt(document.getElementById('f-dia-semana').value) : null,
    dia_mes:            ['mensal','bimestral','trimestral','semestral','anual'].includes(freq)
                          ? parseInt(document.getElementById('f-dia-mes').value) : null,
    mes:                freq==='anual' ? parseInt(document.getElementById('f-mes').value) : null,
    pular_feriados:     document.getElementById('f-pular-feriados').checked ? 1 : 0,
  };
}

function preencherForm(prog) {
  document.getElementById('f-titulo').value     = prog.titulo || '';
  document.getElementById('f-nome').value       = prog.nome || '';
  document.getElementById('f-setor').value      = prog.setor || '';
  document.getElementById('f-ramal').value      = prog.ramal || '';
  document.getElementById('f-categoria').value  = prog.categoria || '';
  document.getElementById('f-descricao').value  = prog.descricao || '';
  document.getElementById('f-prioridade').value = prog.prioridade || 'normal';
  document.getElementById('f-admin').value      = prog.admin_responsavel_id || '';
  document.getElementById('f-frequencia').value = prog.frequencia || '';
  document.getElementById('f-hora').value       = prog.hora || '08:00';
  document.getElementById('f-pular-feriados').checked = !!prog.pular_feriados;
  atualizarCamposFreq();
  if (prog.dia_semana != null) document.getElementById('f-dia-semana').value = prog.dia_semana;
  if (prog.dia_mes != null)    document.getElementById('f-dia-mes').value    = prog.dia_mes;
  if (prog.mes != null)        document.getElementById('f-mes').value        = prog.mes;
}

function atualizarCamposFreq() {
  const freq = document.getElementById('f-frequencia').value;
  document.getElementById('campo-dia-semana').style.display =
    freq==='semanal' ? 'block' : 'none';
  document.getElementById('campo-dia-mes').style.display =
    ['mensal','bimestral','trimestral','semestral','anual'].includes(freq) ? 'block' : 'none';
  document.getElementById('campo-mes').style.display =
    freq==='anual' ? 'block' : 'none';
}
document.getElementById('f-frequencia').addEventListener('change', atualizarCamposFreq);

document.getElementById('btn-novo').addEventListener('click', () => {
  _editId = null;
  limparForm();
  abrirModal('Novo Agendamento');
});
document.getElementById('btn-fechar-modal').addEventListener('click', fecharModal);
document.getElementById('btn-cancelar-modal').addEventListener('click', fecharModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) fecharModal();
});

document.getElementById('btn-preview').addEventListener('click', async () => {
  const body = lerForm();
  const r = await apiFetch('/api/admin/programados/preview', { method: 'POST', body: JSON.stringify(body) });
  if (!r) return;
  const d = await r.json();
  if (!d.ok) {
    document.getElementById('modal-erro').textContent = d.erro || 'Erro ao calcular datas';
    document.getElementById('modal-erro').style.display = 'block';
    return;
  }
  document.getElementById('modal-erro').style.display = 'none';
  const lista = document.getElementById('preview-lista');
  lista.innerHTML = d.datas.map(dt => `<span class="preview-chip">${fmtDT(dt)}</span>`).join('');
  document.getElementById('preview-datas').style.display = 'block';
});

document.getElementById('btn-salvar').addEventListener('click', async () => {
  const body = lerForm();
  const url    = _editId ? `/api/admin/programados/${_editId}` : '/api/admin/programados';
  const method = _editId ? 'PUT' : 'POST';
  const r = await apiFetch(url, { method, body: JSON.stringify(body) });
  if (!r) return;
  const d = await r.json();
  if (!d.ok) {
    document.getElementById('modal-erro').textContent = d.erro || 'Erro ao salvar';
    document.getElementById('modal-erro').style.display = 'block';
    return;
  }
  fecharModal();
  toast(_editId ? 'Agendamento atualizado!' : 'Agendamento criado!');
  carregarAgendamentos();
});

// ── Ações ─────────────────────────────────────────────────────────────────────
window.editarProg = async (id) => {
  const r = await apiFetch(`/api/admin/programados/${id}`);
  if (!r) return;
  const d = await r.json();
  if (!d.ok) return;
  _editId = id;
  preencherForm(d.item);
  abrirModal('Editar Agendamento');
};

window.toggleProg = async (id, ativoAtual) => {
  const r = await apiFetch(`/api/admin/programados/${id}/toggle`, { method: 'PATCH' });
  if (!r) return;
  const d = await r.json();
  if (d.ok) { toast(d.ativo ? 'Agendamento ativado' : 'Agendamento pausado'); carregarAgendamentos(); }
};

window.deletarProg = async (id, titulo) => {
  if (!confirm(`Excluir o agendamento "${titulo}"?\nO histórico de chamados gerados não será apagado.`)) return;
  const r = await apiFetch(`/api/admin/programados/${id}`, { method: 'DELETE' });
  if (!r) return;
  const d = await r.json();
  if (d.ok) { toast('Agendamento excluído'); carregarAgendamentos(); }
};

window.verLog = async (id, titulo) => {
  const r = await apiFetch(`/api/admin/programados/${id}/log`);
  if (!r) return;
  const d = await r.json();
  if (!d.ok) return;
  const rows = d.items.length
    ? d.items.map(it => `<tr>
        <td>#${it.chamado_id}</td>
        <td>${esc(it.nome)} · ${esc(it.setor)}</td>
        <td><span class="badge badge-status badge-status-${it.status}">${it.status}</span></td>
        <td>${fmtDT(it.executado_em)}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" style="text-align:center;padding:1rem;color:var(--text-secondary)">Nenhum chamado gerado ainda.</td></tr>';
  alert(`Log do agendamento "${titulo}"\n\n(Abra a aba Histórico para ver o log completo)`);
};

// ── Carregar admins para select ───────────────────────────────────────────────
async function carregarAdmins() {
  const r = await apiFetch('/api/admin/transferencia-admins');
  if (!r) return;
  const lista = await r.json();
  const sel = document.getElementById('f-admin');
  (Array.isArray(lista) ? lista : []).forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = a.nome_completo || a.nome || a.usuario;
    sel.appendChild(opt);
  });
}

async function carregarSetores() {
  const r = await apiFetch('/api/setores');
  if (!r) return;
  const d = await r.json();
  const dl = document.getElementById('setores-list');
  (Array.isArray(d) ? d : (d.setores || d.items || [])).forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.nome || s;
    dl.appendChild(opt);
  });
}

async function carregarEtiquetas() {
  const r = await apiFetch('/api/etiquetas');
  if (!r) return;
  const lista = await r.json();
  const dl = document.getElementById('etiquetas-list');
  (Array.isArray(lista) ? lista : []).forEach(et => {
    const opt = document.createElement('option');
    opt.value = et.nome;
    dl.appendChild(opt);
  });
}

// ── Busca de solicitante do portal ────────────────────────────────────────────
let _portalUsers = [];

async function carregarUsuariosPortal() {
  const r = await apiFetch('/api/admin/portal-usuarios');
  if (!r) return;
  const lista = await r.json();
  _portalUsers = Array.isArray(lista) ? lista.filter(u => u.ativo !== 0) : [];
}

function setupPessoaBusca() {
  const busca    = document.getElementById('f-pessoa-busca');
  const resultEl = document.getElementById('f-pessoa-resultados');
  const selEl    = document.getElementById('f-pessoa-selecionada');
  const fSetor   = document.getElementById('f-setor');

  function getFiltrados() {
    const setor = fSetor.value.trim().toLowerCase();
    const q     = busca.value.trim().toLowerCase();
    return _portalUsers.filter(u => {
      const okSetor = !setor || (u.setor && u.setor.toLowerCase().includes(setor));
      const okNome  = !q || u.nome.toLowerCase().includes(q) || (u.email && u.email.toLowerCase().includes(q));
      return okSetor && okNome;
    }).slice(0, 8);
  }

  function mostrar(lista) {
    if (!lista.length) { resultEl.style.display = 'none'; return; }
    resultEl.innerHTML = lista.map(u => `
      <div class="pp-opt" data-nome="${esc(u.nome)}" data-ramal="${esc(u.ramal||'')}"
           style="padding:.55rem .9rem;cursor:pointer;border-bottom:1px solid var(--border-light,#f3f4f6)">
        <div style="font-size:.85rem;font-weight:600">${esc(u.nome)}</div>
        <div style="font-size:.74rem;color:var(--text-secondary)">${esc(u.setor||'—')}${u.ramal ? ` · Ramal ${esc(u.ramal)}` : ''}</div>
      </div>`).join('');
    resultEl.style.display = 'block';
    resultEl.querySelectorAll('.pp-opt').forEach(el => {
      el.addEventListener('mouseenter', () => el.style.background = 'var(--surface-2,#f9fafb)');
      el.addEventListener('mouseleave', () => el.style.background = '');
      el.addEventListener('mousedown', e => {
        e.preventDefault();
        const nome  = el.dataset.nome;
        const ramal = el.dataset.ramal;
        document.getElementById('f-nome').value  = nome;
        document.getElementById('f-ramal').value = ramal;
        busca.value = nome;
        selEl.textContent = `${nome}${ramal ? ` · Ramal ${ramal}` : ''}`;
        selEl.style.display = 'block';
        resultEl.style.display = 'none';
      });
    });
  }

  busca.addEventListener('input', () => { selEl.style.display = 'none'; mostrar(getFiltrados()); });
  busca.addEventListener('focus', () => mostrar(getFiltrados()));
  busca.addEventListener('blur',  () => setTimeout(() => { resultEl.style.display = 'none'; }, 150));

  fSetor.addEventListener('input', () => {
    busca.value = '';
    selEl.style.display = 'none';
    resultEl.style.display = 'none';
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
  const ok = await checkAuth();
  if (!ok) return;
  setupPessoaBusca();
  carregarAdmins();
  carregarSetores();
  carregarEtiquetas();
  carregarUsuariosPortal();
  carregarAgendamentos();
})();
