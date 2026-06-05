'use strict';

const RE_E164 = /^\+[1-9]\d{7,14}$/;

let _adminInfo = null;
async function checkAuth() {
  try {
    const r = await fetch('/api/admin/me', { credentials: 'include' });
    if (!r.ok) { window.location.href = '/admin-login.html'; return false; }
    _adminInfo = await r.json();
    return true;
  } catch { window.location.href = '/admin-login.html'; return false; }
}

async function apiFetch(url, opts = {}) {
  const r = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts });
  if (r.status === 401) { window.location.href = '/admin-login.html'; return null; }
  return r;
}

function toast(msg, tipo = 'sucesso') {
  const c = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast-notif toast-${tipo}`;
  el.innerHTML = `<span class="toast-icon">${tipo === 'sucesso' ? '✓' : '✕'}</span>${msg}`;
  c.appendChild(el);
  setTimeout(() => el.classList.add('hide'), 3000);
  setTimeout(() => el.remove(), 3500);
}

function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function fmtDT(iso) {
  if (!iso) return '—';
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z'));
  return d.toLocaleString('pt-BR', { timeZone:'America/Fortaleza', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function fmtHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z'));
  return d.toLocaleTimeString('pt-BR', { timeZone:'America/Fortaleza', hour:'2-digit', minute:'2-digit' });
}

function fmtDTLocal(iso) {
  if (!iso) return '—';
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z'));
  return d.toLocaleString('pt-BR', { timeZone:'America/Fortaleza' });
}

// ── Tab switching ──────────────────────────────────────────────────────────────
let _tabs = {};
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    Object.keys(_tabs).forEach(k => {
      const el = document.getElementById('tab-' + k);
      if (el) el.style.display = k === tab ? '' : 'none';
    });
    if (tab === 'reservas')   carregarReservas();
    if (tab === 'terapeutas') carregarTerapeutas();
    if (tab === 'perfis')     carregarPerfis();
  });
  _tabs[btn.dataset.tab] = true;
});

// ── Reservas ───────────────────────────────────────────────────────────────────

let _terapeutas = [];

async function carregarTerapeutasParaSelect() {
  const r = await apiFetch('/api/spa/terapeutas');
  if (!r) return;
  _terapeutas = await r.json();
  const sel = document.getElementById('r-terapeuta');
  sel.innerHTML = '<option value="">— Selecionar —</option>' +
    _terapeutas.filter(t => t.ativo).map(t => `<option value="${t.id}">${esc(t.nome)}</option>`).join('');
}

const LOCALE_LABEL = {
  'pt-BR':'Português (BR)', 'pt-PT':'Português (PT)',
  en:'English', fr:'Français', es:'Español', it:'Italiano', de:'Deutsch',
};

async function carregarReservas() {
  const tbody = document.getElementById('reservas-body');
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-secondary)"><div class="spinner-sm"></div></td></tr>';
  const r = await apiFetch('/api/spa/reservas');
  if (!r) return;
  const lista = await r.json();

  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:3rem;color:var(--text-secondary)">Nenhuma reserva cadastrada</td></tr>';
    return;
  }

  const agora = Date.now();

  tbody.innerHTML = lista.map(rv => {
    const termino    = new Date(rv.data_termino.includes('T') ? rv.data_termino : rv.data_termino.replace(' ','T')+'Z').getTime();
    const diffMs     = termino - agora;
    const janela30   = 30 * 60 * 1000;
    const podeLiberar = rv.status_pesquisa === 'BLOQUEADA' && diffMs < 0 && diffMs > -janela30;
    const link       = `${location.origin}/spa-pesquisa.html?t=${rv.token}`;
    const telefoneOk = rv.hospede_telefone && RE_E164.test(rv.hospede_telefone);

    // Coluna Pré-tratamento
    let docCell;
    if (rv.documento_pre_enviado) {
      const idioma = LOCALE_LABEL[rv.idioma_documento] || rv.idioma_documento || '—';
      const hora   = fmtHora(rv.documento_enviado_em);
      docCell = `<div class="doc-badge">
        <span class="doc-badge-label">✓ Enviado</span>
        <span class="doc-badge-meta">${esc(idioma)}<br>às ${hora}</span>
      </div>`;
    } else if (telefoneOk) {
      docCell = `<button class="btn-wa" onclick="abrirModalDoc(${rv.id})" title="Enviar formulário pré-tratamento via WhatsApp">
        📤 Pré-tratamento
      </button>`;
    } else {
      const tip = rv.hospede_telefone ? 'Número inválido — use +55...' : 'Adicione o telefone (+55...) na reserva';
      docCell = `<button class="btn-wa" disabled title="${tip}">
        📤 Pré-tratamento
      </button>`;
    }

    return `<tr>
      <td style="color:var(--text-secondary);font-size:.78rem">#${rv.id}</td>
      <td>
        <strong>${esc(rv.hospede_nome)}</strong>
        ${rv.hospede_email    ? `<br><span style="font-size:.72rem;color:var(--text-secondary)">${esc(rv.hospede_email)}</span>` : ''}
        ${rv.hospede_telefone ? `<br><span style="font-size:.72rem;color:var(--text-secondary)">📱 ${esc(rv.hospede_telefone)}</span>` : ''}
      </td>
      <td>${esc(rv.servico)}</td>
      <td>${esc(rv.terapeuta_nome || '—')}</td>
      <td style="white-space:nowrap">${fmtDT(rv.data_termino)}</td>
      <td>${docCell}</td>
      <td>
        <span class="badge-pesq pesq-${rv.status_pesquisa}">${labelStatus(rv.status_pesquisa)}</span>
        ${podeLiberar ? `<br><button class="btn btn-xs btn-primary" onclick="liberar(${rv.id})" style="margin-top:.3rem">Liberar</button>` : ''}
      </td>
      <td>
        <span class="url-copy" title="${esc(link)}" data-link="${esc(link)}" onclick="copiarLink(this)">${rv.token.slice(0,10)}…</span>
      </td>
      <td style="white-space:nowrap">
        <button class="btn btn-xs btn-ghost" onclick="abrirHistorico(${rv.id})" title="Histórico">📋</button>
        <button class="btn btn-xs btn-ghost" onclick="editarReserva(${rv.id})" title="Editar">✏️</button>
        <button class="btn btn-xs btn-danger" onclick="deletarReserva(${rv.id})" title="Excluir">🗑</button>
      </td>
    </tr>`;
  }).join('');
}

function labelStatus(s) {
  const m = { BLOQUEADA:'Bloqueada', LIBERADA:'Liberada', EM_ANDAMENTO:'Em andamento', CONCLUIDA:'Concluída', NAO_REALIZADA:'Não realizada' };
  return m[s] || s;
}

function copiarLink(el) {
  navigator.clipboard.writeText(el.dataset.link).then(() => toast('Link copiado!'));
}

async function liberar(id) {
  if (!confirm('Liberar pesquisa de satisfação para este hóspede?')) return;
  const r = await apiFetch(`/api/spa/reservas/${id}/liberar`, { method:'POST' });
  if (!r) return;
  const d = await r.json();
  if (!r.ok) return toast(d.erro || 'Erro ao liberar', 'erro');
  toast('Pesquisa liberada!');
  carregarReservas();
}

async function deletarReserva(id) {
  if (!confirm('Excluir esta reserva permanentemente?')) return;
  const r = await apiFetch(`/api/spa/reservas/${id}`, { method:'DELETE' });
  if (!r) return;
  const d = await r.json();
  if (!r.ok) return toast(d.erro || 'Erro ao excluir', 'erro');
  toast('Reserva excluída');
  carregarReservas();
}

// ── Modal Reserva ──────────────────────────────────────────────────────────────

document.getElementById('btn-nova-reserva').addEventListener('click', () => abrirModalReserva());
document.getElementById('btn-fechar-modal-reserva').addEventListener('click', fecharModalReserva);
document.getElementById('btn-cancelar-reserva').addEventListener('click', fecharModalReserva);
document.getElementById('btn-salvar-reserva').addEventListener('click', salvarReserva);

// Validação de telefone em tempo real no modal
document.getElementById('r-hospede-telefone').addEventListener('input', function () {
  const hint = document.getElementById('r-telefone-hint');
  const v = this.value.trim();
  if (!v) { hint.textContent = ''; return; }
  if (RE_E164.test(v)) {
    hint.textContent = '✓ Número válido';
    hint.style.color = '#15803d';
  } else {
    hint.textContent = 'Use o formato +5585999999999 (com código do país)';
    hint.style.color = '#92400e';
  }
});

function abrirModalReserva(dados) {
  document.getElementById('modal-reserva-titulo').textContent = dados ? 'Editar Reserva' : 'Nova Reserva';
  document.getElementById('reserva-id').value          = dados?.id || '';
  document.getElementById('r-hospede-nome').value      = dados?.hospede_nome || '';
  document.getElementById('r-hospede-email').value     = dados?.hospede_email || '';
  document.getElementById('r-hospede-telefone').value  = dados?.hospede_telefone || '';
  document.getElementById('r-telefone-hint').textContent = '';
  document.getElementById('r-servico').value           = dados?.servico || '';

  if (dados?.data_termino) {
    const d = new Date(dados.data_termino.includes('T') ? dados.data_termino : dados.data_termino.replace(' ','T')+'Z');
    const pad = n => String(n).padStart(2,'0');
    const local = new Date(d.getTime() + (-3) * 60 * 60 * 1000);
    document.getElementById('r-data-termino').value =
      `${local.getUTCFullYear()}-${pad(local.getUTCMonth()+1)}-${pad(local.getUTCDate())}T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
  } else {
    document.getElementById('r-data-termino').value = '';
  }

  carregarTerapeutasParaSelect().then(() => {
    if (dados?.terapeuta_id) document.getElementById('r-terapeuta').value = dados.terapeuta_id;
  });

  document.getElementById('modal-reserva-overlay').style.display = 'flex';
}

function fecharModalReserva() {
  document.getElementById('modal-reserva-overlay').style.display = 'none';
}

async function editarReserva(id) {
  const r = await apiFetch(`/api/spa/reservas/${id}`);
  if (!r) return;
  const d = await r.json();
  if (!r.ok) return toast(d.erro || 'Erro', 'erro');
  abrirModalReserva(d);
}

async function salvarReserva() {
  const id    = document.getElementById('reserva-id').value;
  const nome  = document.getElementById('r-hospede-nome').value.trim();
  const email = document.getElementById('r-hospede-email').value.trim();
  const tel   = document.getElementById('r-hospede-telefone').value.trim();
  const ter   = document.getElementById('r-terapeuta').value;
  const serv  = document.getElementById('r-servico').value.trim();
  const dt    = document.getElementById('r-data-termino').value;

  if (!nome || !serv || !dt) return toast('Preencha os campos obrigatórios', 'erro');
  if (tel && !RE_E164.test(tel)) return toast('Número de WhatsApp inválido — use +5585999999999', 'erro');

  const dtISO = dt ? new Date(dt + ':00-03:00').toISOString() : '';
  const body  = { hospede_nome: nome, hospede_email: email || null, hospede_telefone: tel || null, terapeuta_id: ter || null, servico: serv, data_termino: dtISO };
  const url   = id ? `/api/spa/reservas/${id}` : '/api/spa/reservas';
  const meth  = id ? 'PUT' : 'POST';

  const r = await apiFetch(url, { method: meth, body: JSON.stringify(body) });
  if (!r) return;
  const d = await r.json();
  if (!r.ok) return toast(d.erro || 'Erro ao salvar', 'erro');

  toast(id ? 'Reserva atualizada' : 'Reserva criada');
  fecharModalReserva();
  carregarReservas();
}

// ── Modal Idioma (Enviar Pré-tratamento) ───────────────────────────────────────

let _docReservaId  = null;
let _docLocale     = null;
let _enviandoDoc   = false;

document.getElementById('btn-fechar-modal-doc').addEventListener('click', fecharModalDoc);
document.getElementById('btn-cancelar-doc').addEventListener('click', fecharModalDoc);
document.getElementById('btn-confirmar-doc').addEventListener('click', confirmarEnvioDoc);

document.querySelectorAll('#lang-grid .lang-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('#lang-grid .lang-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    _docLocale = card.dataset.locale;
    document.getElementById('btn-confirmar-doc').disabled = false;
  });
});

function abrirModalDoc(reservaId) {
  _docReservaId = reservaId;
  _docLocale    = null;
  _enviandoDoc  = false;

  document.querySelectorAll('#lang-grid .lang-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('btn-confirmar-doc').disabled = true;
  document.getElementById('btn-confirmar-doc').textContent = 'Confirmar e enviar';

  // Buscar dados da reserva para mostrar o telefone
  apiFetch(`/api/spa/reservas/${reservaId}`).then(async r => {
    if (!r) return;
    const d = await r.json();
    const strip = document.getElementById('doc-phone-strip');
    const txt   = document.getElementById('doc-phone-txt');

    if (d.hospede_telefone && RE_E164.test(d.hospede_telefone)) {
      strip.className = 'phone-strip ok';
      txt.textContent = `Enviar para ${d.hospede_telefone}`;
    } else if (d.hospede_telefone) {
      strip.className = 'phone-strip err';
      txt.textContent = `Número inválido: ${d.hospede_telefone} — edite a reserva.`;
    } else {
      strip.className = 'phone-strip warn';
      txt.textContent = 'Nenhum WhatsApp cadastrado — edite a reserva para adicionar.';
    }
  }).catch(() => {});

  document.getElementById('modal-doc-overlay').style.display = 'flex';
}

function fecharModalDoc() {
  if (_enviandoDoc) return;
  document.getElementById('modal-doc-overlay').style.display = 'none';
}

async function confirmarEnvioDoc() {
  if (!_docLocale || !_docReservaId || _enviandoDoc) return;

  _enviandoDoc = true;
  const btn = document.getElementById('btn-confirmar-doc');
  btn.disabled = true;
  btn.textContent = 'Enviando…';

  try {
    const r = await apiFetch(`/api/spa/reservas/${_docReservaId}/enviar-documento`, {
      method: 'POST',
      body: JSON.stringify({ locale: _docLocale }),
    });
    if (!r) { _enviandoDoc = false; btn.disabled = false; btn.textContent = 'Confirmar e enviar'; return; }

    const d = await r.json();

    if (!r.ok) {
      toast(d.erro || 'Erro ao enviar', 'erro');
      _enviandoDoc = false;
      btn.disabled = false;
      btn.textContent = 'Confirmar e enviar';
      return;
    }

    // Sucesso
    document.getElementById('modal-doc-overlay').style.display = 'none';

    if (d.fallback && d.waUrl) {
      window.open(d.waUrl, '_blank', 'noopener');
      toast('WhatsApp Web aberto — envie a mensagem ao hóspede');
    } else {
      toast('Mensagem enviada via WhatsApp!');
    }

    carregarReservas();
  } catch {
    toast('Erro inesperado ao enviar', 'erro');
    _enviandoDoc = false;
    btn.disabled = false;
    btn.textContent = 'Confirmar e enviar';
  }
}

// ── Histórico ──────────────────────────────────────────────────────────────────

document.getElementById('btn-fechar-hist').addEventListener('click', () => {
  document.getElementById('modal-hist-overlay').style.display = 'none';
});

async function abrirHistorico(id) {
  const r = await apiFetch(`/api/spa/reservas/${id}/historico`);
  if (!r) return;
  const hist = await r.json();
  const el = document.getElementById('hist-list');
  if (!hist.length) {
    el.innerHTML = '<div style="color:var(--text-secondary);font-size:.84rem">Sem registros de histórico.</div>';
  } else {
    el.innerHTML = hist.map(h => `
      <div class="hist-item">
        <span class="hist-ts">${fmtDTLocal(h.criado_em)}</span>
        <span>
          <span class="hist-ev">${esc(h.evento)}</span>
          ${h.detalhes ? `<span style="color:var(--text-secondary)"> — ${esc(h.detalhes)}</span>` : ''}
        </span>
      </div>
    `).join('');
  }
  document.getElementById('modal-hist-overlay').style.display = 'flex';
}

// ── Terapeutas ─────────────────────────────────────────────────────────────────

async function carregarTerapeutas() {
  const lista = document.getElementById('terapeuta-list');
  lista.innerHTML = '<div class="empty-state" style="padding:2rem"><div class="spinner-sm"></div></div>';
  const r = await apiFetch('/api/spa/terapeutas');
  if (!r) return;
  const terapeutas = await r.json();
  if (!terapeutas.length) {
    lista.innerHTML = '<div class="empty-state" style="padding:2rem">Nenhuma terapeuta cadastrada</div>';
    return;
  }
  lista.innerHTML = terapeutas.map(t => `
    <div class="terapeuta-item${t.ativo ? '' : ' inativo'}" data-id="${t.id}">
      <div class="terapeuta-nome">${esc(t.nome)}</div>
      <button class="btn btn-xs btn-ghost" onclick="editarTerapeuta(${t.id},'${esc(t.nome)}')">✏️</button>
      <button class="btn btn-xs ${t.ativo ? 'btn-ghost' : 'btn-primary'}" onclick="toggleTerapeuta(${t.id})">
        ${t.ativo ? 'Desativar' : 'Ativar'}
      </button>
    </div>
  `).join('');
}

document.getElementById('btn-novo-terapeuta').addEventListener('click', () => abrirModalTerapeuta());
document.getElementById('btn-fechar-modal-terapeuta').addEventListener('click', fecharModalTerapeuta);
document.getElementById('btn-cancelar-terapeuta').addEventListener('click', fecharModalTerapeuta);
document.getElementById('btn-salvar-terapeuta').addEventListener('click', salvarTerapeuta);

function abrirModalTerapeuta(id, nome) {
  document.getElementById('modal-terapeuta-titulo').textContent = id ? 'Editar Terapeuta' : 'Novo Terapeuta';
  document.getElementById('terapeuta-id').value = id || '';
  document.getElementById('t-nome').value        = nome || '';
  document.getElementById('modal-terapeuta-overlay').style.display = 'flex';
  setTimeout(() => document.getElementById('t-nome').focus(), 50);
}

function fecharModalTerapeuta() {
  document.getElementById('modal-terapeuta-overlay').style.display = 'none';
}

function editarTerapeuta(id, nome) { abrirModalTerapeuta(id, nome); }

async function salvarTerapeuta() {
  const id   = document.getElementById('terapeuta-id').value;
  const nome = document.getElementById('t-nome').value.trim();
  if (!nome) return toast('Nome obrigatório', 'erro');

  const url  = id ? `/api/spa/terapeutas/${id}` : '/api/spa/terapeutas';
  const meth = id ? 'PUT' : 'POST';
  const r    = await apiFetch(url, { method: meth, body: JSON.stringify({ nome }) });
  if (!r) return;
  const d = await r.json();
  if (!r.ok) return toast(d.erro || 'Erro ao salvar', 'erro');

  toast(id ? 'Terapeuta atualizada' : 'Terapeuta cadastrada');
  fecharModalTerapeuta();
  carregarTerapeutas();
}

async function toggleTerapeuta(id) {
  const r = await apiFetch(`/api/spa/terapeutas/${id}/toggle`, { method: 'POST' });
  if (!r) return;
  carregarTerapeutas();
}

// ── Perfis de Hóspedes ─────────────────────────────────────────────────────────

async function carregarPerfis() {
  const tbody = document.getElementById('perfis-body');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem"><div class="spinner-sm"></div></td></tr>';
  const r = await apiFetch('/api/spa/perfis');
  if (!r) return;
  const lista = await r.json();
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:3rem;color:var(--text-secondary)">Nenhum perfil cadastrado</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(p => `
    <tr>
      <td style="color:var(--text-secondary);font-size:.78rem">#${p.id}</td>
      <td><strong>${esc(p.nome)} ${esc(p.sobrenome)}</strong></td>
      <td>${esc(p.email)}</td>
      <td>${esc(p.idioma)}</td>
      <td><span class="badge ${p.apto ? 'badge-concluido' : 'badge-cancelado'}">${p.apto ? 'Apto' : 'Não apto'}</span></td>
      <td style="white-space:nowrap;font-size:.78rem">${fmtDT(p.criado_em)}</td>
      <td><a href="/spa-profile.html" target="_blank" class="btn btn-xs btn-ghost">Formulário ↗</a></td>
    </tr>
  `).join('');
}

// ── Fechar modais ao clicar fora ───────────────────────────────────────────────
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay && overlay.id !== 'modal-doc-overlay') overlay.style.display = 'none';
    if (e.target === overlay && overlay.id === 'modal-doc-overlay' && !_enviandoDoc) overlay.style.display = 'none';
  });
});

// ── Inicialização ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!(await checkAuth())) return;

  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) btnLogout.addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/admin-login.html';
  });

  carregarReservas();
  setInterval(carregarReservas, 60 * 1000);
});
