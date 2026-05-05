let adminInfo = null;
let chamadoAtual = null;
let abaAtiva = 'abertos';
let subAbaMeusAtiva = 'abertos';
let _chatAdminIv = null;

async function _atualizarChatAdmin(chamadoId) {
  const box = document.getElementById('chat-modal-msgs');
  if (!box) return;
  const atFundo = box.scrollTop + box.clientHeight >= box.scrollHeight - 6;
  const anterior = +(box.dataset.cnt || 0);
  try {
    const r = await api('/api/admin/chamados/' + chamadoId + '/mensagens');
    if (!r.ok) return;
    const msgs = await r.json();
    box.dataset.cnt = msgs.length;
    if (!msgs.length) {
      if (!box.querySelector('.chat-msg'))
        box.innerHTML = '<div class="chat-vazio">Nenhuma mensagem trocada ainda.</div>';
      return;
    }
    box.innerHTML = msgs.map(m => {
      const mine = m.autor_tipo === 'admin';
      return `
      <div class="chat-msg ${mine ? 'mine' : 'theirs'}">
        <div class="chat-msg-author">${m.autor_nome}</div>
        <div class="chat-msg-bubble">${m.mensagem}</div>
        <div class="chat-msg-time">${fmtData(m.criado_em)}</div>
      </div>`;
    }).join('');
    if (atFundo || anterior < msgs.length) box.scrollTop = box.scrollHeight;
  } catch {}
}

const STATUS_ABERTOS = ['aberto', 'em_andamento'];
const STATUS_ENCERRADOS = ['concluido', 'encerrado'];

const STATUS_LABELS = { aberto: 'Aberto', em_andamento: 'Em andamento', concluido: 'Concluído', encerrado: 'Encerrado' };
const PRIO_LABELS = { urgente: 'Urgente', alta: 'Alta', media: 'Média', baixa: 'Baixa' };

const CATEGORIAS_MAP = {
  software:     { nome: 'Software',        cor: '#6366F1', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>' },
  hardware:     { nome: 'Hardware',        cor: '#0EA5E9', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 18v3M8 21h8"/></svg>' },
  impressora:   { nome: 'Impressora',      cor: '#8B5CF6', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>' },
  ramal:        { nome: 'Ramal',           cor: '#EC4899', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.47 2 2 0 0 1 3.6 2.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.12 6.12l1.83-1.83a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>' },
  nobreak:      { nome: 'Nobreak',         cor: '#F59E0B', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>' },
  monitor:      { nome: 'Monitor',         cor: '#0891B2', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>' },
  mouse:        { nome: 'Mouse',           cor: '#10B981', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="7"/><path d="M12 2v8M5 10h14"/></svg>' },
  teclado:      { nome: 'Teclado',         cor: '#EF4444', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6" y2="10"/><line x1="10" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="14" y2="10"/><line x1="18" y1="10" x2="18" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/></svg>' },
  rede:         { nome: 'Rede / Internet', cor: '#059669', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' },
  acesso_senha: { nome: 'Acesso / Senha',  cor: '#DC2626', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' },
  cameras:      { nome: 'Câmeras / CFTV', cor: '#D97706', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>' },
  email:        { nome: 'E-mail',          cor: '#64748B', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>' },
  tv_projetor:  { nome: 'TV / Projetor',   cor: '#7C3AED', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>' },
  outros:       { nome: 'Outros',          cor: '#6B7280', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>' },
};

function badgeCategoria(cat) {
  if (!cat || !CATEGORIAS_MAP[cat]) return '';
  const { nome, cor, icone } = CATEGORIAS_MAP[cat];
  return `<span class="badge-categoria" style="--cat-cor:${cor}">${icone} ${nome}</span>`;
}

function fmtData(d) {
  if (!d) return '—';
  const iso = d.includes('T') ? d : d.replace(' ', 'T');
  const date = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' });
}

function badgeStatus(s) {
  return `<span class="badge badge-${s}">${STATUS_LABELS[s] || s}</span>`;
}
function badgePrio(p) {
  if (!p) return `<span class="badge badge-sem-prioridade">Sem prioridade</span>`;
  return `<span class="badge badge-${p}">${PRIO_LABELS[p]}</span>`;
}

async function api(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (res.status === 401) { location.replace('/admin-login.html'); throw new Error('401'); }
  return res;
}

(async () => {
  try {
    const r = await api('/api/admin/me');
    if (!r.ok) { location.replace('/admin-login.html'); return; }
    adminInfo = await r.json();

    if (adminInfo.is_master) {
      document.getElementById('nav-usuarios-wrap').innerHTML =
        '<a href="/admin-usuarios.html">Usuários</a>';
    }

    await carregarAdminsParaFiltro();
    atualizarFiltrosDeAba();
    await Promise.all([carregarChamados(), carregarEstatisticas(), carregarEquipamentos()]);
  } catch {}
})();

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    abaAtiva = btn.dataset.tab;
    const subtabs = document.getElementById('subtabs-meus');
    subtabs.style.display = abaAtiva === 'meus' ? 'inline-flex' : 'none';
    atualizarFiltrosDeAba();
    carregarChamados();
  });
});

document.querySelectorAll('.sub-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    subAbaMeusAtiva = btn.dataset.subtab;
    atualizarFiltrosDeAba();
    carregarChamados();
  });
});

function atualizarFiltrosDeAba() {
  const sel = document.getElementById('filtro-status');
  sel.innerHTML = '';
  if (abaAtiva === 'abertos') {
    sel.innerHTML = `
      <option value="">Todos (abertos)</option>
      <option value="aberto">Aberto</option>
      <option value="em_andamento">Em andamento</option>
    `;
  } else if (abaAtiva === 'meus') {
    if (subAbaMeusAtiva === 'abertos') {
      sel.innerHTML = `
        <option value="">Todos (abertos)</option>
        <option value="aberto">Aberto</option>
        <option value="em_andamento">Em andamento</option>
      `;
    } else {
      sel.innerHTML = `
        <option value="">Todos (encerrados)</option>
        <option value="concluido">Concluído</option>
        <option value="encerrado">Encerrado</option>
      `;
    }
  } else {
    sel.innerHTML = `
      <option value="">Todos (encerrados)</option>
      <option value="concluido">Concluído</option>
      <option value="encerrado">Encerrado</option>
    `;
  }
}

async function carregarEstatisticas() {
  try {
    const [rTodos, rMeus] = await Promise.all([
      api('/api/admin/chamados?status=aberto,em_andamento,concluido,encerrado'),
      adminInfo ? api(`/api/admin/chamados?admin_id=${adminInfo.id}&status=aberto,em_andamento,concluido,encerrado`) : Promise.resolve(null),
    ]);
    if (!rTodos.ok) return;
    const todos = await rTodos.json();

    const contagem = { aberto: 0, em_andamento: 0, concluido: 0, encerrado: 0 };
    todos.forEach(c => { if (contagem[c.status] !== undefined) contagem[c.status]++; });

    document.getElementById('cnt-aberto').textContent = contagem.aberto;
    document.getElementById('cnt-andamento').textContent = contagem.em_andamento;
    document.getElementById('cnt-concluido').textContent = contagem.concluido;
    document.getElementById('cnt-encerrado').textContent = contagem.encerrado;

    const totalAbertos = contagem.aberto + contagem.em_andamento;
    const totalEncerrados = contagem.concluido + contagem.encerrado;
    document.getElementById('badge-abertos').textContent = totalAbertos || '';
    document.getElementById('badge-encerrados').textContent = totalEncerrados || '';

    if (rMeus && rMeus.ok) {
      const meus = await rMeus.json();
      const meusAbertos    = meus.filter(c => STATUS_ABERTOS.includes(c.status)).length;
      const meusEncerrados = meus.filter(c => STATUS_ENCERRADOS.includes(c.status)).length;
      document.getElementById('badge-meus').textContent = meusAbertos || '';
      document.getElementById('badge-meus-abertos').textContent = meusAbertos || '';
      document.getElementById('badge-meus-encerrados').textContent = meusEncerrados || '';
    }
  } catch {}
}

document.getElementById('btn-logout').addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST' });
  location.replace('/admin-login.html');
});

document.getElementById('btn-filtrar').addEventListener('click', carregarChamados);
document.getElementById('btn-atualizar').addEventListener('click', () => {
  carregarChamados();
  carregarEstatisticas();
});
document.getElementById('btn-limpar').addEventListener('click', () => {
  document.getElementById('filtro-status').value = '';
  document.getElementById('filtro-setor').value = '';
  document.getElementById('filtro-admin').value = '';
  document.getElementById('filtro-inicio').value = '';
  document.getElementById('filtro-fim').value = '';
  document.getElementById('filtro-prioridade').value = '';
  carregarChamados();
});

document.getElementById('btn-fechar-modal').addEventListener('click', fecharModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) fecharModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharModal(); });

async function carregarAdminsParaFiltro() {
  try {
    const r = await api('/api/admin/usuarios');
    if (!r.ok) return;
    const admins = await r.json();
    const sel = document.getElementById('filtro-admin');
    admins.filter(a => a.ativo).forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.nome_completo;
      sel.appendChild(opt);
    });
  } catch {}
}

async function carregarChamados() {
  const lista = document.getElementById('lista-chamados');
  lista.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  const params = new URLSearchParams();
  const statusFiltro = document.getElementById('filtro-status').value;
  const setor = document.getElementById('filtro-setor').value;
  const adminId = document.getElementById('filtro-admin').value;
  const inicio = document.getElementById('filtro-inicio').value;
  const fim = document.getElementById('filtro-fim').value;
  const prioridade = document.getElementById('filtro-prioridade').value;

  if (abaAtiva === 'meus') {
    params.set('admin_id', adminInfo.id);
    if (statusFiltro) {
      params.set('status', statusFiltro);
    } else {
      const statusDaSubAba = subAbaMeusAtiva === 'abertos' ? STATUS_ABERTOS : STATUS_ENCERRADOS;
      params.set('status', statusDaSubAba.join(','));
    }
  } else {
    if (statusFiltro) {
      params.set('status', statusFiltro);
    } else {
      const statusDaAba = abaAtiva === 'abertos' ? STATUS_ABERTOS : STATUS_ENCERRADOS;
      params.set('status', statusDaAba.join(','));
    }
    if (adminId) params.set('admin_id', adminId);
  }

  if (setor) params.set('setor', setor);
  if (inicio) params.set('periodo_inicio', inicio);
  if (fim) params.set('periodo_fim', fim);
  if (prioridade) params.set('prioridade', prioridade);

  try {
    const r = await api('/api/admin/chamados?' + params);
    const chamados = await r.json();
    if (!chamados.length) {
      const msg = (abaAtiva === 'abertos' || (abaAtiva === 'meus' && subAbaMeusAtiva === 'abertos'))
        ? 'Nenhum chamado em aberto no momento.'
        : 'Nenhum chamado encerrado encontrado.';
      lista.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>
            </svg>
          </div>
          <p>${msg}</p>
        </div>`;
      return;
    }
    const PRIO_ORDEM = { urgente: 0, alta: 1, media: 2, baixa: 3 };
    chamados.sort((a, b) => {
      const prioDiff = (PRIO_ORDEM[a.prioridade] ?? 4) - (PRIO_ORDEM[b.prioridade] ?? 4);
      if (prioDiff !== 0) return prioDiff;
      if (!a.prazo && !b.prazo) return 0;
      if (!a.prazo) return 1;
      if (!b.prazo) return -1;
      return new Date(a.prazo) - new Date(b.prazo);
    });
    lista.innerHTML = chamados.map(c => renderChamadoItem(c)).join('');
    lista.querySelectorAll('.chamado-item').forEach(el => {
      el.addEventListener('click', () => abrirModal(el.dataset.id));
    });
  } catch (err) {
    if (err.message !== '401')
      lista.innerHTML = '<div class="alert alert-danger">Erro ao carregar chamados.</div>';
  }
}

function renderChamadoItem(c) {
  const encerrado = ['concluido', 'encerrado'].includes(c.status);
  return `
    <div class="chamado-item prioridade-${c.prioridade || 'sem'}${encerrado ? ' chamado-encerrado' : ''}" data-id="${c.id}" tabindex="0" role="button" aria-label="Abrir chamado #${c.id}">
      <div class="chamado-item-header">
        <span class="chamado-id">#${c.id}</span>
        ${badgeStatus(c.status)}
        ${badgePrio(c.prioridade)}
        ${badgeCategoria(c.categoria)}
        <span class="chamado-data-rel">${fmtData(c.criado_em)}</span>
      </div>
      <div class="chamado-nome">${c.nome}</div>
      <div class="chamado-desc">${c.descricao}</div>
      <div class="chamado-item-footer">
        <span class="chamado-footer-meta">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
          ${c.setor}
        </span>
        <span class="chamado-footer-meta">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.47 2 2 0 0 1 3.6 2.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.12 6.12l1.83-1.83a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          Ramal ${c.ramal}
        </span>
        ${c.prazo ? `<span class="chamado-footer-prazo"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Prazo: ${fmtData(c.prazo)}</span>` : ''}
        ${c.admin_nome ? `<span class="tag">${c.admin_nome}</span>` : ''}
      </div>
    </div>
  `;
}

async function abrirModal(id) {
  chamadoAtual = null;
  document.getElementById('modal-title').textContent = `Chamado #${id}`;
  document.getElementById('modal-body').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('btn-fechar-modal').focus();

  try {
    const r = await api(`/api/admin/chamados/${id}`);
    if (!r.ok) { document.getElementById('modal-body').innerHTML = '<div class="alert alert-danger">Erro ao carregar.</div>'; return; }
    chamadoAtual = await r.json();
    renderModalBody(chamadoAtual);
  } catch {}
}

function fecharModal() {
  if (_chatAdminIv) { clearInterval(_chatAdminIv); _chatAdminIv = null; }
  document.getElementById('modal-overlay').classList.remove('open');
  chamadoAtual = null;
  carregarChamados();
  carregarEstatisticas();
}

function renderModalBody(c) {
  const isAberto = ['aberto', 'em_andamento'].includes(c.status);
  const podeAssumir  = c.status === 'aberto';
  const podeConcluir = c.status === 'em_andamento';
  const podeEncerrar = isAberto;
  const podeReabrir  = ['concluido', 'encerrado'].includes(c.status);

  const historicoPrazos = (c.historico || []).filter(h => h.acao === 'prazo_alterado');
  const bannerPrazo = historicoPrazos.length > 0
    ? `<div class="banner-prazo"><strong>Prazo alterado ${historicoPrazos.length}x.</strong> Último por ${historicoPrazos[historicoPrazos.length-1].admin_nome || 'Admin'}: de "${historicoPrazos[historicoPrazos.length-1].valor_anterior ? fmtData(historicoPrazos[historicoPrazos.length-1].valor_anterior) : 'sem prazo'}" para "${historicoPrazos[historicoPrazos.length-1].valor_novo ? fmtData(historicoPrazos[historicoPrazos.length-1].valor_novo) : 'removido'}"</div>`
    : '';

  const historicoHtml = c.historico && c.historico.length > 0
    ? c.historico.map(h => `
        <div class="historico-item">
          <span class="historico-acao">${traduzirAcao(h.acao)}</span>
          ${h.valor_anterior !== null ? ` <span class="text-muted">de "${h.valor_anterior || '—'}"</span>` : ''}
          ${h.valor_novo !== null ? ` <span class="text-muted">para "${h.valor_novo || '—'}"</span>` : ''}
          <div class="historico-meta">${h.admin_nome || 'Sistema'} · ${fmtData(h.timestamp)}</div>
        </div>`).join('')
    : '<p class="text-muted" style="font-size:.85rem">Sem histórico.</p>';

  document.getElementById('modal-title').innerHTML = `Chamado #${c.id} ${badgeStatus(c.status)} ${badgeCategoria(c.categoria)}`;

  document.getElementById('modal-body').innerHTML = `
    <div style="display:grid;gap:1rem">

      ${bannerPrazo}

      <!-- ① Informações do chamado -->
      <div>
        <div class="modal-solicitante-row">
          <div>
            <div class="modal-solicitante-name">${c.nome}</div>
            <div class="modal-solicitante-meta">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              ${c.setor}
              <span style="color:var(--border-strong)">·</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.47 2 2 0 0 1 3.6 2.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.12 6.12l1.83-1.83a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Ramal ${c.ramal}
            </div>
          </div>
          <div class="modal-title-badges">
            ${badgePrio(c.prioridade)}
            ${c.admin_nome ? `<span class="tag">👤 ${c.admin_nome}</span>` : ''}
          </div>
        </div>
        <div class="modal-info-grid-3">
          <div><span class="modal-info-label">Aberto em</span>${fmtData(c.criado_em)}</div>
          <div><span class="modal-info-label">${c.prazo ? 'Prazo' : 'Atualizado em'}</span>${c.prazo ? `<strong style="color:var(--gold-dark)">${fmtData(c.prazo)}</strong>` : fmtData(c.atualizado_em)}</div>
          ${c.concluido_em ? `<div><span class="modal-info-label">Concluído em</span>${fmtData(c.concluido_em)}</div>` : '<div></div>'}
        </div>
        <div class="modal-categoria-row">
          <span class="modal-info-label">Categoria</span>
          ${badgeCategoria(c.categoria)}
          ${adminInfo && adminInfo.is_master ? `
            <select class="form-control form-control-sm" id="sel-categoria" style="margin-left:.5rem;flex:1;max-width:180px">
              ${Object.entries(CATEGORIAS_MAP).map(([id, cat]) =>
                `<option value="${id}" ${c.categoria === id ? 'selected' : ''}>${cat.nome}</option>`
              ).join('')}
            </select>
            <button class="btn btn-secondary btn-sm" id="btn-salvar-categoria">Salvar</button>
          ` : ''}
        </div>
        <div class="modal-desc">${c.descricao}</div>
        ${c.anexo_nome_original ? `
          <a href="/api/chamados/${c.id}/anexo" class="btn btn-secondary btn-sm" download style="margin-top:.55rem;display:inline-flex;align-items:center;gap:.35rem">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ${c.anexo_nome_original}
          </a>` : ''}
        ${c.solucao ? `
          <div style="margin-top:.6rem;background:rgba(21,128,61,.06);border-left:3px solid var(--success);border-radius:var(--radius-sm);padding:.5rem .8rem;font-size:.83rem;color:#166534">
            <strong>Solução / Motivo:</strong> ${c.solucao}
          </div>` : ''}
        ${c.nota !== null ? `
          <div class="alert alert-success" style="margin:.55rem 0 0;font-size:.83rem">
            <strong>Avaliação:</strong> ${c.nota}/10${c.comentario_avaliacao ? ' — ' + c.comentario_avaliacao : ''}
          </div>` : ''}
      </div>

      <!-- ② Ações -->
      <div class="modal-controls-card">
        <div class="modal-section-label">${isAberto ? 'Ações' : 'Gerenciar'}</div>
        <div id="msg-modal"></div>
        ${isAberto ? `
          <div class="modal-controls-row">
            <span class="modal-ctrl-label">Prioridade</span>
            <select class="form-control form-control-sm" id="sel-prioridade" style="flex:1;max-width:155px">
              <option value="">Sem prioridade</option>
              <option value="baixa"   ${c.prioridade==='baixa'  ?'selected':''}>Baixa</option>
              <option value="media"   ${c.prioridade==='media'  ?'selected':''}>Média</option>
              <option value="alta"    ${c.prioridade==='alta'   ?'selected':''}>Alta</option>
              <option value="urgente" ${c.prioridade==='urgente'?'selected':''}>Urgente</option>
            </select>
            <button class="btn btn-secondary btn-sm" id="btn-salvar-prio">Salvar</button>
          </div>
          <div class="modal-controls-row">
            <span class="modal-ctrl-label">Prazo</span>
            <input class="form-control form-control-sm" type="datetime-local" id="input-prazo" value="${c.prazo ? c.prazo.replace(' ','T').slice(0,16) : ''}" style="flex:1;max-width:195px">
            <button class="btn btn-secondary btn-sm" id="btn-salvar-prazo">Salvar</button>
            ${c.prazo ? `<button class="btn btn-secondary btn-sm" id="btn-remover-prazo" title="Remover prazo" style="padding:.32rem .6rem">✕</button>` : ''}
          </div>
          <div class="modal-action-btns">
            ${podeAssumir  ? `<button class="btn btn-primary btn-sm" id="btn-assumir">Assumir chamado</button>` : ''}
            ${podeConcluir ? `<button class="btn btn-success btn-sm" id="btn-concluir">Concluir</button>` : ''}
            ${podeEncerrar ? `<button class="btn btn-danger  btn-sm" id="btn-encerrar">Encerrar</button>` : ''}
          </div>
          <div id="area-concluir" style="display:none;margin-top:.7rem;padding-top:.7rem;border-top:1px solid var(--border)">
            <div class="form-group" style="margin-bottom:.5rem">
              <label for="txt-solucao">Solução aplicada <span class="req">*</span></label>
              <textarea class="form-control" id="txt-solucao" minlength="5" maxlength="2000" rows="3" placeholder="Descreva a solução aplicada..."></textarea>
            </div>
            <button class="btn btn-success btn-sm" id="btn-confirmar-concluir">Confirmar conclusão</button>
          </div>
          <div id="area-encerrar" style="display:none;margin-top:.7rem;padding-top:.7rem;border-top:1px solid var(--border)">
            <div class="form-group" style="margin-bottom:.5rem">
              <label for="txt-motivo">Motivo do encerramento <span class="req">*</span></label>
              <textarea class="form-control" id="txt-motivo" minlength="3" maxlength="500" rows="2" placeholder="Informe o motivo..."></textarea>
            </div>
            <button class="btn btn-danger btn-sm" id="btn-confirmar-encerrar">Confirmar encerramento</button>
          </div>
        ` : `
          <div class="modal-closed-actions">
            ${podeReabrir ? `<button class="btn btn-secondary btn-sm" id="btn-reabrir">Reabrir chamado</button>` : ''}
          </div>
        `}
      </div>

      <!-- ③ Chat (só se aberto) -->
      ${isAberto ? `
      <div>
        <div class="modal-section-label">Conversa com o usuário</div>
        <div class="chat-wrap">
          <div class="chat-header">Chat em tempo real</div>
          <div class="chat-messages" id="chat-modal-msgs" data-cnt="0">
            <div class="chat-vazio">Carregando...</div>
          </div>
          <form class="chat-input-row" id="chat-modal-form">
            <input type="text" class="chat-input" id="chat-modal-input" placeholder="Responder ao usuário..." maxlength="1000" autocomplete="off">
            <button type="submit" class="btn btn-primary btn-sm">Enviar</button>
          </form>
        </div>
      </div>` : ''}

      <!-- ④ Histórico -->
      <details>
        <summary style="cursor:pointer;font-size:.75rem;font-weight:700;color:var(--text-secondary);letter-spacing:.05em;text-transform:uppercase;user-select:none">Histórico de ações</summary>
        <div style="margin-top:.65rem">${historicoHtml}</div>
      </details>

      <!-- ⑤ Zona de perigo (só master) -->
      ${adminInfo && adminInfo.is_master ? `
        <div class="modal-danger-zone">
          <div class="modal-danger-label">Zona de perigo</div>
          <button class="btn btn-danger btn-sm" id="btn-deletar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Excluir chamado permanentemente
          </button>
        </div>` : ''}

    </div>
  `;

  setupModalEventos(c);
}

function setupModalEventos(c) {
  const msg = () => document.getElementById('msg-modal');
  const setMsg = (html) => { msg().innerHTML = html; };

  const btnSalvarCategoria = document.getElementById('btn-salvar-categoria');
  if (btnSalvarCategoria) {
    btnSalvarCategoria.addEventListener('click', async () => {
      const cat = document.getElementById('sel-categoria').value;
      const r = await api(`/api/admin/chamados/${c.id}/categoria`, { method: 'PATCH', body: JSON.stringify({ categoria: cat }) });
      const d = await r.json();
      setMsg(r.ok ? '<div class="alert alert-success">Categoria atualizada.</div>' : `<div class="alert alert-danger">${d.erro}</div>`);
      if (r.ok) {
        c.categoria = cat;
        document.getElementById('modal-title').innerHTML = `Chamado #${c.id} ${badgeStatus(c.status)} ${badgeCategoria(cat)}`;
      }
    });
  }

  const btnSalvarPrio = document.getElementById('btn-salvar-prio');
  if (btnSalvarPrio) {
    btnSalvarPrio.addEventListener('click', async () => {
      const prio = document.getElementById('sel-prioridade').value;
      const r = await api(`/api/admin/chamados/${c.id}/prioridade`, { method: 'PATCH', body: JSON.stringify({ prioridade: prio || null }) });
      const d = await r.json();
      setMsg(r.ok ? '<div class="alert alert-success">Prioridade salva.</div>' : `<div class="alert alert-danger">${d.erro}</div>`);
      if (r.ok) { c.prioridade = prio || null; }
    });
  }

  const btnSalvarPrazo = document.getElementById('btn-salvar-prazo');
  if (btnSalvarPrazo) {
    btnSalvarPrazo.addEventListener('click', async () => {
      const prazo = document.getElementById('input-prazo').value;
      const r = await api(`/api/admin/chamados/${c.id}/prazo`, { method: 'PATCH', body: JSON.stringify({ prazo: prazo || null }) });
      const d = await r.json();
      setMsg(r.ok ? '<div class="alert alert-success">Prazo atualizado.</div>' : `<div class="alert alert-danger">${d.erro}</div>`);
      if (r.ok) setTimeout(() => abrirModal(c.id), 600);
    });
  }

  const btnRemoverPrazo = document.getElementById('btn-remover-prazo');
  if (btnRemoverPrazo) {
    btnRemoverPrazo.addEventListener('click', async () => {
      const r = await api(`/api/admin/chamados/${c.id}/prazo`, { method: 'PATCH', body: JSON.stringify({ prazo: null }) });
      const d = await r.json();
      setMsg(r.ok ? '<div class="alert alert-success">Prazo removido.</div>' : `<div class="alert alert-danger">${d.erro}</div>`);
      if (r.ok) setTimeout(() => abrirModal(c.id), 600);
    });
  }

  const btnAssumir = document.getElementById('btn-assumir');
  if (btnAssumir) {
    btnAssumir.addEventListener('click', async () => {
      const r = await api(`/api/admin/chamados/${c.id}/assumir`, { method: 'PATCH', body: JSON.stringify({}) });
      const d = await r.json();
      setMsg(r.ok ? '<div class="alert alert-success">Chamado assumido.</div>' : `<div class="alert alert-danger">${d.erro}</div>`);
      if (r.ok) setTimeout(() => abrirModal(c.id), 600);
    });
  }

  const btnConcluir = document.getElementById('btn-concluir');
  if (btnConcluir) {
    btnConcluir.addEventListener('click', () => {
      const area = document.getElementById('area-concluir');
      area.style.display = area.style.display === 'none' ? 'block' : 'none';
    });
  }

  const btnConfConcluir = document.getElementById('btn-confirmar-concluir');
  if (btnConfConcluir) {
    btnConfConcluir.addEventListener('click', async () => {
      const solucao = document.getElementById('txt-solucao').value.trim();
      const r = await api(`/api/admin/chamados/${c.id}/concluir`, { method: 'PATCH', body: JSON.stringify({ solucao }) });
      const d = await r.json();
      setMsg(r.ok ? '<div class="alert alert-success">Chamado concluído.</div>' : `<div class="alert alert-danger">${d.erro}</div>`);
      if (r.ok) setTimeout(() => abrirModal(c.id), 700);
    });
  }

  const btnEncerrar = document.getElementById('btn-encerrar');
  if (btnEncerrar) {
    btnEncerrar.addEventListener('click', () => {
      const area = document.getElementById('area-encerrar');
      area.style.display = area.style.display === 'none' ? 'block' : 'none';
    });
  }

  const btnConfEncerrar = document.getElementById('btn-confirmar-encerrar');
  if (btnConfEncerrar) {
    btnConfEncerrar.addEventListener('click', async () => {
      const motivo = document.getElementById('txt-motivo').value.trim();
      const r = await api(`/api/admin/chamados/${c.id}/encerrar`, { method: 'PATCH', body: JSON.stringify({ motivo }) });
      const d = await r.json();
      setMsg(r.ok ? '<div class="alert alert-success">Chamado encerrado.</div>' : `<div class="alert alert-danger">${d.erro}</div>`);
      if (r.ok) setTimeout(() => abrirModal(c.id), 700);
    });
  }

  const btnReabrir = document.getElementById('btn-reabrir');
  if (btnReabrir) {
    btnReabrir.addEventListener('click', async () => {
      if (!confirm(`Reabrir o chamado #${c.id}? Ele voltará para o status "Aberto".`)) return;
      const r = await api(`/api/admin/chamados/${c.id}/reabrir`, { method: 'PATCH', body: JSON.stringify({}) });
      const d = await r.json();
      setMsg(r.ok ? '<div class="alert alert-success">Chamado reaberto.</div>' : `<div class="alert alert-danger">${d.erro}</div>`);
      if (r.ok) setTimeout(() => abrirModal(c.id), 600);
    });
  }

  const btnDeletar = document.getElementById('btn-deletar');
  if (btnDeletar) {
    btnDeletar.addEventListener('click', async () => {
      if (!confirm(`Excluir permanentemente o chamado #${c.id}? Esta ação não pode ser desfeita.`)) return;
      const r = await api(`/api/admin/chamados/${c.id}`, { method: 'DELETE' });
      const d = await r.json();
      if (r.ok) { fecharModal(); } else { setMsg(`<div class="alert alert-danger">${d.erro}</div>`); }
    });
  }

  const chatForm = document.getElementById('chat-modal-form');
  if (chatForm) {
    _atualizarChatAdmin(c.id);
    _chatAdminIv = setInterval(() => _atualizarChatAdmin(c.id), 10000);

    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('chat-modal-input');
      const texto = input.value.trim();
      if (!texto) return;
      const btn = chatForm.querySelector('button');
      btn.disabled = true;
      try {
        const r = await api(`/api/admin/chamados/${c.id}/mensagens`, {
          method: 'POST',
          body: JSON.stringify({ mensagem: texto }),
        });
        if (r.ok) { input.value = ''; await _atualizarChatAdmin(c.id); }
      } catch {}
      finally { btn.disabled = false; input.focus(); }
    });
  }
}

async function carregarEquipamentos() {
  try {
    const r = await api('/api/admin/relatorios/equipamentos');
    if (!r.ok) return;
    const lista = await r.json();
    if (!lista.length) return;

    const widget = document.getElementById('equipamentos-widget');
    const container = document.getElementById('equipamentos-lista');
    const max = lista[0].vezes;

    container.innerHTML = lista.map((item, i) => {
      const pct = max > 0 ? Math.round((item.vezes / max) * 100) : 0;
      const urgente = item.vezes >= 5;
      const alerta  = item.vezes >= 3 && item.vezes < 5;
      const cor = urgente ? 'var(--danger, #EF4444)' : alerta ? 'var(--gold, #C5A55A)' : 'var(--text-muted, #9CA3AF)';
      return `
        <div class="eq-item" title="Último chamado: ${fmtData(item.ultimo_chamado)}">
          <div class="eq-rank">${i + 1}</div>
          <div class="eq-info">
            <div class="eq-nome">${item.equipamento}</div>
            <div class="eq-bar-wrap">
              <div class="eq-bar" style="width:${pct}%;background:${cor}"></div>
            </div>
          </div>
          <div class="eq-vezes" style="color:${cor}">${item.vezes}×</div>
        </div>`;
    }).join('');

    widget.style.display = 'block';
  } catch {}
}

function traduzirAcao(acao) {
  const t = {
    prioridade_definida: 'Prioridade definida',
    status_alterado: 'Status alterado',
    prazo_alterado: 'Prazo alterado',
    solucao_registrada: 'Solução registrada',
    assumido: 'Chamado assumido',
    categoria_alterada: 'Categoria alterada',
  };
  return t[acao] || acao;
}
