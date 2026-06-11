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

// ── Etiquetas / Combo ─────────────────────────────────────────────────────────
let _etiquetasDin = [];
let _catCombo = null;

function _criarComboEtiqueta(wrapEl, cfg = {}) {
  if (!wrapEl) return null;
  if (!document.getElementById('_et-combo-css')) {
    const st = document.createElement('style');
    st.id = '_et-combo-css';
    st.textContent = `
      .et-combo-item { transition: background .1s; }
      .et-combo-item:hover { background: var(--surface-2, #f9fafb) !important; }
      .et-combo-sel  { background: var(--gold-light, #fef3c7) !important; }
    `;
    document.head.appendChild(st);
  }
  const cls = cfg.sm ? 'form-control form-control-sm' : 'form-control';
  wrapEl.innerHTML = `<div style="position:relative">
    <input type="text" class="${cls}" data-combo-inp placeholder="${cfg.placeholder || 'Selecionar etiqueta…'}" autocomplete="off">
    <input type="hidden" data-combo-val>
    <div data-combo-dd style="display:none;position:absolute;z-index:1050;left:0;right:0;top:calc(100% + 2px);background:var(--surface);border:1px solid var(--border);border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.15);max-height:220px;overflow-y:auto"></div>
  </div>`;
  const inp  = wrapEl.querySelector('[data-combo-inp]');
  const valI = wrapEl.querySelector('[data-combo-val]');
  const dd   = wrapEl.querySelector('[data-combo-dd]');

  function _bc(et) {
    const parts = [];
    let cur = et;
    while (cur?.parent_slug) {
      const p = _etiquetasDin.find(x => x.slug === cur.parent_slug);
      if (!p) break;
      parts.unshift(p.nome);
      cur = p;
    }
    return parts.join(' › ');
  }

  function _render(q) {
    if (!_etiquetasDin.length) {
      dd.innerHTML = '<div style="padding:.5rem .75rem;color:var(--text-muted);font-size:.82rem">Carregando etiquetas…</div>';
      dd.style.display = 'block'; return;
    }
    const query = (q || '').toLowerCase().trim();
    let list = _etiquetasDin.filter(e => e.ativo !== 0);
    if (query) {
      list = list.filter(e => {
        const bc = _bc(e);
        return e.nome.toLowerCase().includes(query) || bc.toLowerCase().includes(query) || e.slug.includes(query);
      });
    }
    if (query) {
      list.sort((a, b) => {
        const aNm = a.nome.toLowerCase(), bNm = b.nome.toLowerCase();
        const aExact = aNm === query, bExact = bNm === query;
        if (aExact !== bExact) return aExact ? -1 : 1;
        const aNmMatch = aNm.includes(query), bNmMatch = bNm.includes(query);
        if (aNmMatch !== bNmMatch) return aNmMatch ? -1 : 1;
        return aNm.localeCompare(bNm, 'pt-BR', { sensitivity: 'base' });
      });
    } else {
      list.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
    }
    if (!list.length) {
      dd.innerHTML = '<div style="padding:.55rem .9rem;color:var(--text-muted);font-size:.82rem">Nenhuma etiqueta encontrada</div>';
    } else {
      dd.innerHTML = list.map(e => {
        const bc = _bc(e);
        const cor = e.cor || '#6B7280';
        const sel = e.slug === valI.value;
        return `<div class="et-combo-item${sel ? ' et-combo-sel' : ''}" data-slug="${e.slug}"
          style="padding:.5rem .9rem;cursor:pointer;display:flex;align-items:center;gap:.6rem;border-bottom:1px solid var(--border-light,#f3f4f6)">
          <span style="
            display:inline-flex;align-items:center;
            padding:.2rem .55rem;border-radius:3px;
            font-size:.65rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;flex-shrink:0;
            background:color-mix(in srgb,${cor} 12%,transparent);
            color:${cor};
            border:1px solid color-mix(in srgb,${cor} 30%,transparent)
          ">${e.nome}</span>
          ${bc ? `<span style="font-size:.74rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${bc}</span>` : ''}
          ${sel ? `<span style="margin-left:auto;font-size:.75rem;color:var(--gold,#d4953d);font-weight:800;flex-shrink:0">✓</span>` : ''}
        </div>`;
      }).join('');
    }
    dd.style.display = 'block';
  }

  function _close() { dd.style.display = 'none'; }

  function _pick(slug) {
    const et = slug ? _etiquetasDin.find(e => e.slug === slug) : null;
    valI.value = slug || '';
    if (et) { const bc = _bc(et); inp.value = bc ? `${bc} › ${et.nome}` : et.nome; }
    else inp.value = '';
    _close();
    cfg.onChange?.(slug, et);
  }

  inp.addEventListener('focus', () => _render(inp.value));
  inp.addEventListener('input', () => {
    if (!inp.value.trim()) { valI.value = ''; cfg.onChange?.('', null); }
    _render(inp.value);
  });
  inp.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') _close();
    if (ev.key === 'Enter') { ev.preventDefault(); const f = dd.querySelector('.et-combo-item'); if (f) _pick(f.dataset.slug); }
  });
  dd.addEventListener('mousedown', ev => {
    const item = ev.target.closest('.et-combo-item');
    if (!item) return;
    ev.preventDefault();
    _pick(item.dataset.slug);
  });
  document.addEventListener('click', ev => { if (!wrapEl.contains(ev.target)) _close(); }, true);

  return {
    getValue: () => valI.value,
    setValue(slug) { _pick(slug); },
    clear() { valI.value = ''; inp.value = ''; _close(); },
    get inputEl() { return inp; },
  };
}

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

// ── Fetch helper (JSON only) ──────────────────────────────────────────────────
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
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
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

// ── Anexos ────────────────────────────────────────────────────────────────────
let _progArquivos = [];
const _IMGS_EXT_RE = /\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|avif)$/i;
const _VID_EXT_RE  = /\.(mp4|webm|mov|avi|mkv|wmv)$/i;
const _HINT_DEFAULT = 'Você pode clicar várias vezes para adicionar mais arquivos. Até 10, máx. 200 MB cada.';

function _renderProgTiles() {
  const box  = document.getElementById('prog-anexo-tiles');
  const hint = document.getElementById('prog-anexo-hint');
  if (!box) return;
  if (!_progArquivos.length) {
    box.innerHTML = '';
    if (hint) { hint.textContent = _HINT_DEFAULT; hint.style.color = ''; }
    return;
  }
  box.innerHTML = _progArquivos.map((f, i) => {
    const nome = f.name.replace(/"/g, '&quot;');
    let media;
    if (_IMGS_EXT_RE.test(f.name)) {
      const url = URL.createObjectURL(f);
      media = `<img src="${url}" style="max-width:100%;max-height:80px;border-radius:4px;display:block;margin-bottom:.25rem">`;
    } else if (_VID_EXT_RE.test(f.name)) {
      media = `<span style="font-size:1.2rem">🎬</span> `;
    } else {
      media = `<span style="font-size:1.2rem">📄</span> `;
    }
    return `<div class="anexo-tile" style="display:inline-flex;flex-direction:column;align-items:center;padding:.4rem .55rem;border:1px solid var(--border);border-radius:6px;gap:.2rem;max-width:120px;position:relative;background:var(--surface)">
      ${media}
      <span style="font-size:.7rem;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100px">${nome}</span>
      <button class="anexo-tile-remove" data-idx="${i}" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;border:none;background:#ef4444;color:#fff;font-size:.65rem;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700">✕</button>
    </div>`;
  }).join('');
  if (hint) {
    hint.style.color = 'var(--gold-dark)';
    hint.textContent = `✓ ${_progArquivos.length} ${_progArquivos.length===1?'arquivo selecionado':'arquivos selecionados'} · clique em "Adicionar arquivos" para incluir mais`;
  }
}

function _resetProgArquivos() {
  _progArquivos = [];
  const inp = document.getElementById('prog-anexo');
  if (inp) inp.value = '';
  _renderProgTiles();
}

document.getElementById('btn-prog-adicionar-arquivo')?.addEventListener('click', () => {
  document.getElementById('prog-anexo')?.click();
});

document.getElementById('prog-anexo')?.addEventListener('change', function () {
  Array.from(this.files || []).forEach(f => {
    const dup = _progArquivos.some(x => x.name === f.name && x.size === f.size);
    if (!dup && _progArquivos.length < 10) _progArquivos.push(f);
  });
  this.value = '';
  _renderProgTiles();
});

document.getElementById('prog-anexo-tiles')?.addEventListener('click', e => {
  const btn = e.target.closest('.anexo-tile-remove');
  if (!btn) return;
  _progArquivos.splice(+btn.dataset.idx, 1);
  _renderProgTiles();
});

// ── Modal ─────────────────────────────────────────────────────────────────────
let _editId = null;

function abrirModal(titulo = 'Novo Agendamento') {
  document.getElementById('modal-titulo').textContent = titulo;
  const btnSalvar = document.getElementById('btn-salvar');
  if (btnSalvar) btnSalvar.textContent = _editId ? 'Salvar alterações' : 'Criar agendamento';
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
  _catCombo?.clear();
  document.getElementById('f-descricao').value = '';
  document.getElementById('f-admin').value = '';
  document.getElementById('f-admin-hint').style.display = 'none';
  document.getElementById('f-frequencia').value = '';
  document.getElementById('f-hora').value = '08:00';
  document.getElementById('f-pular-feriados').checked = true;
  atualizarCamposFreq();
  _resetProgArquivos();
  // reset usuario search
  const busca = document.getElementById('prog-usuario-busca');
  const resultados = document.getElementById('prog-usuario-resultados');
  const selecionado = document.getElementById('prog-usuario-selecionado');
  if (busca) busca.value = '';
  if (resultados) { resultados.style.display = 'none'; resultados.innerHTML = ''; }
  if (selecionado) { selecionado.style.display = 'none'; selecionado.dataset.usuarioId = ''; }
}

function lerFormAgendamento() {
  const freq = document.getElementById('f-frequencia').value;
  return {
    descricao:    document.getElementById('f-descricao').value,
    categoria:    _catCombo?.getValue() || '',
    frequencia:   freq,
    hora:         document.getElementById('f-hora').value,
    dia_semana:   freq==='semanal'  ? parseInt(document.getElementById('f-dia-semana').value) : null,
    dia_mes:      ['mensal','bimestral','trimestral','semestral','anual'].includes(freq)
                    ? parseInt(document.getElementById('f-dia-mes').value) : null,
    mes:          freq==='anual' ? parseInt(document.getElementById('f-mes').value) : null,
    pular_feriados: document.getElementById('f-pular-feriados').checked ? 1 : 0,
  };
}

function preencherForm(prog) {
  _catCombo?.setValue(prog.categoria || '');
  document.getElementById('f-descricao').value  = prog.descricao || '';
  document.getElementById('f-admin').value      = prog.admin_responsavel_id || '';
  document.getElementById('f-frequencia').value = prog.frequencia || '';
  document.getElementById('f-hora').value       = prog.hora || '08:00';
  document.getElementById('f-pular-feriados').checked = !!prog.pular_feriados;
  atualizarCamposFreq();
  if (prog.dia_semana != null) document.getElementById('f-dia-semana').value = prog.dia_semana;
  if (prog.dia_mes != null)    document.getElementById('f-dia-mes').value    = prog.dia_mes;
  if (prog.mes != null)        document.getElementById('f-mes').value        = prog.mes;
  // show admin hint if admin is set
  const hint = document.getElementById('f-admin-hint');
  const sel  = document.getElementById('f-admin');
  if (hint && sel && sel.value) {
    hint.textContent = `Você salva o agendamento — ${sel.options[sel.selectedIndex]?.text ?? ''} será o responsável atribuído.`;
    hint.style.display = '';
  }
  // usuario hint
  if (prog.usuario_id && prog.nome) {
    const selecionado = document.getElementById('prog-usuario-selecionado');
    if (selecionado) {
      selecionado.textContent = `✓ ${prog.nome}${prog.setor ? ` · ${prog.setor}` : ''}`;
      selecionado.dataset.usuarioId = prog.usuario_id;
      selecionado.style.display = '';
    }
    const busca = document.getElementById('prog-usuario-busca');
    if (busca) busca.value = prog.nome;
  }
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

document.getElementById('f-admin').addEventListener('change', function () {
  const hint = document.getElementById('f-admin-hint');
  if (this.value) {
    hint.textContent = `Você cria o agendamento — ${this.options[this.selectedIndex].text} será o responsável atribuído.`;
    hint.style.display = '';
  } else {
    hint.style.display = 'none';
  }
});

document.getElementById('btn-novo').addEventListener('click', () => {
  _editId = null;
  limparForm();
  popularAdmins();
  abrirModal('Novo Agendamento');
});
document.getElementById('btn-fechar-modal').addEventListener('click', fecharModal);
document.getElementById('btn-cancelar-modal').addEventListener('click', fecharModal);

const _fecharLogModal = () => { document.getElementById('log-modal-overlay').style.display = 'none'; };
document.getElementById('btn-fechar-log').addEventListener('click', _fecharLogModal);
document.getElementById('btn-fechar-log-2').addEventListener('click', _fecharLogModal);

document.getElementById('btn-preview').addEventListener('click', async () => {
  const body = lerFormAgendamento();
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
  const erroEl = document.getElementById('modal-erro');
  erroEl.style.display = 'none';

  if (_progArquivos.length > 10) {
    erroEl.textContent = 'Máximo 10 anexos por agendamento.';
    erroEl.style.display = 'block';
    return;
  }

  const agend = lerFormAgendamento();
  const fd = new FormData();
  fd.append('descricao',    agend.descricao);
  fd.append('categoria',    agend.categoria || '');
  fd.append('frequencia',   agend.frequencia || '');
  fd.append('hora',         agend.hora || '08:00');
  fd.append('pular_feriados', agend.pular_feriados ? '1' : '0');
  if (agend.dia_semana != null) fd.append('dia_semana', agend.dia_semana);
  if (agend.dia_mes    != null) fd.append('dia_mes',    agend.dia_mes);
  if (agend.mes        != null) fd.append('mes',        agend.mes);

  const adminId = document.getElementById('f-admin').value;
  if (adminId) fd.append('admin_responsavel_id', adminId);

  const usuarioId = document.getElementById('prog-usuario-selecionado')?.dataset.usuarioId;
  if (usuarioId) fd.append('usuario_id', usuarioId);

  _progArquivos.forEach(f => fd.append('anexos', f, f.name));

  const url    = _editId ? `/api/admin/programados/${_editId}` : '/api/admin/programados';
  const method = _editId ? 'PUT' : 'POST';

  const btn = document.getElementById('btn-salvar');
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = 'Salvando…';

  const r = await fetch(url, { method, body: fd, credentials: 'include' });
  btn.disabled = false;
  btn.textContent = label;

  if (r.status === 401) { window.location.href = '/admin-login.html'; return; }
  const d = await r.json();
  if (!d.ok) {
    erroEl.textContent = d.erro || 'Erro ao salvar';
    erroEl.style.display = 'block';
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
  limparForm();
  await popularAdmins();
  preencherForm(d.item);
  abrirModal('Editar Agendamento');
};

window.toggleProg = async (id) => {
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
    ? d.items.map(it => `<tr style="border-bottom:1px solid var(--border-light,#f3f4f6)">
        <td style="padding:.45rem .6rem"><a href="/admin-painel.html#chamado=${it.chamado_id}" target="_blank" style="color:var(--gold)">#${it.chamado_id}</a></td>
        <td style="padding:.45rem .6rem">${esc(it.nome)} · ${esc(it.setor)}</td>
        <td style="padding:.45rem .6rem"><span class="badge badge-status badge-status-${it.status}">${it.status}</span></td>
        <td style="padding:.45rem .6rem">${fmtDT(it.executado_em)}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:var(--text-secondary)">Nenhum chamado gerado ainda.</td></tr>';
  document.getElementById('log-modal-titulo').textContent = `Log — ${titulo}`;
  document.getElementById('log-modal-tbody').innerHTML = rows;
  document.getElementById('log-modal-overlay').style.display = 'flex';
};

// ── Admins ────────────────────────────────────────────────────────────────────
async function popularAdmins() {
  const sel = document.getElementById('f-admin');
  sel.innerHTML = '<option value="">Assumir eu mesmo</option>';
  try {
    const r = await fetch('/api/admin/colegas', { credentials: 'include' });
    if (!r.ok) return;
    const lista = await r.json();
    (Array.isArray(lista) ? lista : []).forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.nome_completo;
      sel.appendChild(opt);
    });
  } catch {}
}

// ── Etiquetas ─────────────────────────────────────────────────────────────────
async function carregarEtiquetas() {
  const r = await apiFetch('/api/etiquetas');
  if (!r) return;
  const lista = await r.json();
  _etiquetasDin = Array.isArray(lista) ? lista : [];
  _catCombo = _criarComboEtiqueta(document.getElementById('f-cat-combo'), { placeholder: '— selecionar serviço —' });
}

// ── Busca de usuário do portal (master only) ──────────────────────────────────
let _usuariosPortal = null;

async function carregarUsuariosPortal() {
  const wrap = document.getElementById('prog-usuario-wrap');
  if (!wrap) return;
  if (!_adminInfo || !_adminInfo.is_master) { wrap.style.display = 'none'; return; }
  wrap.style.display = '';

  try {
    const r = await fetch('/api/admin/portal-usuarios', { credentials: 'include' });
    if (!r.ok) return;
    const lista = await r.json();
    _usuariosPortal = Array.isArray(lista) ? lista.filter(u => u.ativo !== 0) : [];
  } catch {}

  const busca    = document.getElementById('prog-usuario-busca');
  const resultEl = document.getElementById('prog-usuario-resultados');
  const selEl    = document.getElementById('prog-usuario-selecionado');

  function _mostrar(lista) {
    if (!lista.length) { resultEl.style.display = 'none'; return; }
    resultEl.innerHTML = lista.slice(0, 8).map(u =>
      `<div class="prog-usu-item" data-id="${u.id}" data-nome="${esc(u.nome)}"
        style="padding:.45rem .8rem;cursor:pointer;font-size:.82rem;border-bottom:1px solid var(--border)">
        ${esc(u.nome)}${u.setor ? ' · <span style="color:var(--text-muted)">' + esc(u.setor) + '</span>' : ''}
      </div>`).join('');
    resultEl.style.display = 'block';
    resultEl.querySelectorAll('.prog-usu-item').forEach(el => {
      el.addEventListener('mouseenter', () => el.style.background = 'var(--bg-hover,#f3f4f6)');
      el.addEventListener('mouseleave', () => el.style.background = '');
      el.addEventListener('click', () => {
        const u = (_usuariosPortal || []).find(x => x.id === +el.dataset.id);
        if (!u) return;
        busca.value = u.nome;
        selEl.innerHTML = `✓ ${esc(u.nome)}${u.setor ? ` · <span style="color:var(--text-muted);font-weight:400">${esc(u.setor)}</span>` : ''}`;
        selEl.dataset.usuarioId = u.id;
        selEl.style.display = '';
        resultEl.style.display = 'none';
      });
    });
  }

  busca.addEventListener('input', () => {
    selEl.style.display = 'none';
    selEl.dataset.usuarioId = '';
    const q = busca.value.trim().toLowerCase();
    if (!q || !_usuariosPortal) { resultEl.style.display = 'none'; return; }
    const filtrados = _usuariosPortal.filter(u =>
      u.nome.toLowerCase().includes(q) || (u.email && u.email.toLowerCase().includes(q)) || (u.setor && u.setor.toLowerCase().includes(q))
    );
    _mostrar(filtrados);
  });
  busca.addEventListener('focus', () => {
    const q = busca.value.trim().toLowerCase();
    if (q && _usuariosPortal) {
      const filtrados = _usuariosPortal.filter(u => u.nome.toLowerCase().includes(q));
      _mostrar(filtrados);
    }
  });
  busca.addEventListener('blur', () => setTimeout(() => { resultEl.style.display = 'none'; }, 150));
}

// ── Sub-modal: Novo usuário ───────────────────────────────────────────────────
function _abrirModalUsuario() {
  ['pnu-nome','pnu-setor','pnu-email','pnu-senha','pnu-ramal'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('msg-prog-usuario').innerHTML = '';
  document.getElementById('modal-prog-novo-usuario').style.display = 'flex';
  document.getElementById('pnu-nome').focus();
}

function _fecharModalUsuario() {
  document.getElementById('modal-prog-novo-usuario').style.display = 'none';
}

document.getElementById('btn-prog-novo-usuario')?.addEventListener('click', _abrirModalUsuario);
document.getElementById('btn-fechar-prog-usuario')?.addEventListener('click', _fecharModalUsuario);
document.getElementById('btn-pnu-cancelar')?.addEventListener('click', _fecharModalUsuario);

document.getElementById('form-prog-usuario')?.addEventListener('submit', async e => {
  e.preventDefault();
  const msg  = document.getElementById('msg-prog-usuario');
  const btn  = document.getElementById('btn-pnu-salvar');
  const nome  = document.getElementById('pnu-nome').value.trim();
  const email = document.getElementById('pnu-email').value.trim();
  const senha = document.getElementById('pnu-senha').value;
  const setor = document.getElementById('pnu-setor').value.trim();
  const ramal = document.getElementById('pnu-ramal').value.trim();
  msg.innerHTML = '';
  btn.disabled = true; btn.textContent = 'Criando…';
  try {
    const r = await fetch('/api/admin/portal-usuarios', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, setor: setor || null, ramal: ramal || null }),
    });
    const d = await r.json();
    if (!r.ok) {
      msg.innerHTML = `<div style="padding:.5rem .75rem;background:#fee2e2;border-radius:6px;font-size:.82rem;color:#991b1b;margin-bottom:.75rem">${esc(d.erro || 'Erro ao criar.')}</div>`;
      return;
    }
    if (!_usuariosPortal) _usuariosPortal = [];
    _usuariosPortal.push({ id: d.id, nome, email, setor: setor || null, ativo: 1 });
    const busca     = document.getElementById('prog-usuario-busca');
    const selecionado = document.getElementById('prog-usuario-selecionado');
    if (busca) busca.value = nome;
    if (selecionado) {
      selecionado.innerHTML = `✓ ${esc(nome)}${setor ? ` · <span style="color:var(--text-muted);font-weight:400">${esc(setor)}</span>` : ''}`;
      selecionado.dataset.usuarioId = d.id;
      selecionado.style.display = '';
    }
    _fecharModalUsuario();
    toast('Usuário criado!');
  } catch {
    msg.innerHTML = '<div style="padding:.5rem .75rem;background:#fee2e2;border-radius:6px;font-size:.82rem;color:#991b1b;margin-bottom:.75rem">Erro de conexão.</div>';
  } finally { btn.disabled = false; btn.textContent = 'Criar usuário'; }
});

// ── Sub-modal: Nova etiqueta ──────────────────────────────────────────────────
function _pneSetCor(cor) {
  document.getElementById('pne-cor-valor').value = cor;
  document.querySelectorAll('.pne-cor-btn').forEach(b => {
    const sel = b.dataset.cor === cor;
    b.style.border = sel ? `2px solid ${b.dataset.cor}` : '2px solid transparent';
    b.style.outline = sel ? '2px solid white' : '';
    b.style.outlineOffset = sel ? '-4px' : '';
  });
}

function _abrirModalEtiqueta() {
  document.getElementById('pne-nome').value = '';
  document.getElementById('pne-descricao').value = '';
  document.getElementById('msg-prog-etiqueta').innerHTML = '';
  _pneSetCor('#5B6796');
  const sel = document.getElementById('pne-parent');
  sel.innerHTML = '<option value="">— sem pai (etiqueta raiz) —</option>';
  (_etiquetasDin || []).filter(e => e.ativo !== 0).forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.slug; opt.textContent = e.nome;
    sel.appendChild(opt);
  });
  document.getElementById('modal-prog-nova-etiqueta').style.display = 'flex';
  document.getElementById('pne-nome').focus();
}

function _fecharModalEtiqueta() {
  document.getElementById('modal-prog-nova-etiqueta').style.display = 'none';
}

document.getElementById('btn-prog-nova-etiqueta')?.addEventListener('click', _abrirModalEtiqueta);
document.getElementById('btn-fechar-prog-etiqueta')?.addEventListener('click', _fecharModalEtiqueta);
document.getElementById('btn-pne-cancelar')?.addEventListener('click', _fecharModalEtiqueta);

document.getElementById('pne-cores')?.addEventListener('click', e => {
  const b = e.target.closest('.pne-cor-btn');
  if (b) _pneSetCor(b.dataset.cor);
});

document.getElementById('pne-parent')?.addEventListener('change', function () {
  const pai = (_etiquetasDin || []).find(e => e.slug === this.value);
  _pneSetCor(pai?.cor || '#5B6796');
});

document.getElementById('form-prog-etiqueta')?.addEventListener('submit', async e => {
  e.preventDefault();
  const msg  = document.getElementById('msg-prog-etiqueta');
  const btn  = document.getElementById('btn-pne-salvar');
  const nome     = document.getElementById('pne-nome').value.trim();
  const cor      = document.getElementById('pne-cor-valor').value;
  const parent   = document.getElementById('pne-parent').value || null;
  const descricao = document.getElementById('pne-descricao').value.trim() || null;
  msg.innerHTML = '';
  if (!nome) {
    msg.innerHTML = '<div style="padding:.5rem .75rem;background:#fee2e2;border-radius:6px;font-size:.82rem;color:#991b1b;margin-bottom:.75rem">Nome é obrigatório.</div>';
    return;
  }
  btn.disabled = true; btn.textContent = 'Criando…';
  try {
    const r = await fetch('/api/etiquetas', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, cor, parent_slug: parent, descricao }),
    });
    const d = await r.json();
    if (!r.ok) {
      msg.innerHTML = `<div style="padding:.5rem .75rem;background:#fee2e2;border-radius:6px;font-size:.82rem;color:#991b1b;margin-bottom:.75rem">${esc(d.erro || 'Erro ao criar.')}</div>`;
      return;
    }
    const rEt = await fetch('/api/etiquetas', { credentials: 'include' });
    if (rEt.ok) {
      _etiquetasDin = await rEt.json();
      if (_catCombo && d.slug) _catCombo.setValue(d.slug);
    }
    _fecharModalEtiqueta();
    toast('Etiqueta criada!');
  } catch {
    msg.innerHTML = '<div style="padding:.5rem .75rem;background:#fee2e2;border-radius:6px;font-size:.82rem;color:#991b1b;margin-bottom:.75rem">Erro de conexão.</div>';
  } finally { btn.disabled = false; btn.textContent = 'Criar etiqueta'; }
});

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
  const ok = await checkAuth();
  if (!ok) return;
  if (!_adminInfo?.is_master) {
    document.getElementById('btn-prog-nova-etiqueta')?.style.setProperty('display', 'none');
  }
  carregarEtiquetas();
  carregarUsuariosPortal();
  carregarAgendamentos();
})();
