let adminInfo = null;
let chamadoAtual = null;
let abaAtiva = 'abertos';
let subAbaMeusAtiva = 'abertos';
let _chatAdminIv = null;
let _chamadosHash = null;


async function _atualizarChatAdmin(chamadoId) {
  const box = document.getElementById('chat-modal-msgs');
  if (!box) return;
  const atFundo = box.scrollTop + box.clientHeight >= box.scrollHeight - 6;
  const anterior = +(box.dataset.cnt || 0);
  try {
    const r = await api('/api/admin/chamados/' + chamadoId + '/mensagens?_t=' + Date.now());
    if (!r.ok) return;
    const msgs = await r.json();
    box.dataset.cnt = msgs.length;
    if (!msgs.length) {
      if (!box.querySelector('.chat-msg'))
        box.innerHTML = '<div class="chat-vazio">Nenhuma mensagem trocada ainda.</div>';
      return;
    }
    if (msgs.length === anterior) return;
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
  tv_projetor:    { nome: 'TV / Projetor',       cor: '#7C3AED', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>' },
  processo_compra:{ nome: 'Processo de Compra', cor: '#16A34A', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>' },
  outros:         { nome: 'Outros',              cor: '#6B7280', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>' },
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
  return `<span class="badge badge-${s}" data-status="${s}" title="Filtrar por: ${STATUS_LABELS[s] || s}" style="cursor:pointer">${STATUS_LABELS[s] || s}</span>`;
}

function filtrarPorStatus(status) {
  const tabTarget = STATUS_ABERTOS.includes(status) ? 'abertos' : 'encerrados';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('ativo'));
  document.getElementById('tab-' + tabTarget).classList.add('ativo');
  abaAtiva = tabTarget;
  document.getElementById('subtabs-meus').style.display = 'none';
  atualizarFiltrosDeAba();
  document.getElementById('filtro-status').value = status;
  carregarChamados();
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

    // Abre modal diretamente se vier de outra página via ?chamado=ID
    const urlParams = new URLSearchParams(location.search);
    const chamadoParam = urlParams.get('chamado');
    if (chamadoParam && +chamadoParam) {
      setTimeout(() => abrirModal(+chamadoParam), 200);
    }

    // Auto-refresh silencioso a cada 5s (não atualiza se o modal estiver aberto)
    setInterval(() => {
      if (chamadoAtual) return;
      carregarChamados(true);
      carregarEstatisticas();
    }, 5000);
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
        <option value="">Todos (concluídos)</option>
        <option value="concluido,encerrado">Concluído</option>
      `;
    }
  } else {
    sel.innerHTML = `
      <option value="">Todos (concluídos)</option>
      <option value="concluido,encerrado">Concluído</option>
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
    document.getElementById('cnt-concluido').textContent = contagem.concluido + contagem.encerrado;

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

document.querySelectorAll('#stats-strip .stat-pill').forEach(pill => {
  pill.style.cursor = 'pointer';
  pill.title = 'Clique para filtrar';
});
document.getElementById('stats-strip').addEventListener('click', e => {
  const pill = e.target.closest('.stat-pill');
  if (!pill) return;
  const num = pill.querySelector('.stat-num');
  if (!num) return;
  const map = { 'cnt-aberto': 'aberto', 'cnt-andamento': 'em_andamento', 'cnt-concluido': 'concluido,encerrado' };
  const status = map[num.id];
  if (status) filtrarPorStatus(status);
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

async function carregarChamados(silencioso = false) {
  const lista = document.getElementById('lista-chamados');
  if (!silencioso) lista.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

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

    // Silencioso: só re-renderiza se os dados mudaram
    if (silencioso) {
      const novoHash = JSON.stringify(chamados.map(c =>
        [c.id, c.status, c.prioridade, c.admin_responsavel_id, c.nota, c.prazo, c.categoria, c.atualizado_em]
      ));
      if (novoHash === _chamadosHash) return;
      _chamadosHash = novoHash;
    } else {
      _chamadosHash = null;
    }

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
    chamados.sort((a, b) => {
      const prioDiff = scorePrioridade(a) - scorePrioridade(b);
      if (prioDiff !== 0) return prioDiff;
      // mesmo nível: prazo mais próximo primeiro; sem prazo, mais recente primeiro
      if (!a.prazo && !b.prazo) return new Date(b.criado_em) - new Date(a.criado_em);
      if (!a.prazo) return 1;
      if (!b.prazo) return -1;
      const prazoDiff = new Date(a.prazo) - new Date(b.prazo);
      if (prazoDiff !== 0) return prazoDiff;
      return new Date(b.criado_em) - new Date(a.criado_em);
    });
    lista.innerHTML = chamados.map(c => renderChamadoItem(c)).join('');
    lista.querySelectorAll('.chamado-item').forEach(el => {
      el.addEventListener('click', e => {
        const badge = e.target.closest('.badge[data-status]');
        if (badge) { filtrarPorStatus(badge.dataset.status); return; }
        abrirModal(el.dataset.id);
      });
    });
  } catch (err) {
    if (err.message !== '401' && !silencioso)
      lista.innerHTML = '<div class="alert alert-danger">Erro ao carregar chamados.</div>';
  }
}

function estaAtrasado(c) {
  if (!c.prazo) return false;
  if (['concluido', 'encerrado'].includes(c.status)) return false;
  const iso = c.prazo.includes('T') ? c.prazo : c.prazo.replace(' ', 'T');
  return new Date(iso.endsWith('Z') ? iso : iso + 'Z') < new Date();
}

function scorePrioridade(c) {
  if (c.prioridade === 'urgente') return 0;
  if (estaAtrasado(c))           return 1;
  if (c.prioridade === 'alta')   return 2;
  if (c.prioridade === 'media')  return 3;
  if (c.prioridade === 'baixa')  return 4;
  return 5; // sem prioridade
}

function renderChamadoItem(c) {
  const encerrado = ['concluido', 'encerrado'].includes(c.status);
  const atrasado  = estaAtrasado(c);
  return `
    <div class="chamado-item prioridade-${c.prioridade || 'sem'}${encerrado ? ' chamado-encerrado' : ''}${atrasado ? ' chamado-atraso' : ''}" data-id="${c.id}" tabindex="0" role="button" aria-label="Abrir chamado #${c.id}">
      <div class="chamado-item-header">
        ${badgeStatus(c.status)}
        ${atrasado ? `<span class="badge badge-atraso">⚠ Em atraso</span>` : ''}
        ${badgePrio(c.prioridade)}
        ${badgeCategoria(c.categoria)}
        <span class="chamado-data-rel">${fmtData(c.criado_em)}</span>
      </div>
      <div class="chamado-nome">${c.nome}</div>
      <div class="chamado-desc">${c.descricao}</div>
      <div class="chamado-item-footer">
        <span class="chamado-footer-meta">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
          ${c.usuario_setor || c.setor}
        </span>
        <span class="chamado-footer-meta">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.47 2 2 0 0 1 3.6 2.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.12 6.12l1.83-1.83a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          Ramal ${c.ramal}
        </span>
        ${c.prazo ? `<span class="chamado-footer-prazo${atrasado ? ' prazo-vencido' : ''}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Prazo: ${fmtData(c.prazo)}</span>` : ''}
        ${c.admin_nome ? `<span class="tag">${c.admin_nome}</span>` : ''}
      </div>
    </div>
  `;
}


async function abrirModal(id) {
  chamadoAtual = null;
  document.getElementById('modal-title').textContent = 'Chamado';
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
  const podeAssumir  = ['aberto', 'em_andamento'].includes(c.status);
  const podeConcluir = ['aberto', 'em_andamento'].includes(c.status);
  const podeReabrir  = ['concluido', 'encerrado'].includes(c.status);
  const atrasado = estaAtrasado(c);

  const bannerAtraso = atrasado
    ? `<div class="banner-atraso"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> <strong>Chamado em atraso</strong> — prazo vencido em ${fmtData(c.prazo)}</div>`
    : '';

  const historicoPrazos = (c.historico || []).filter(h => h.acao === 'prazo_alterado');
  const bannerPrazo = historicoPrazos.length > 0
    ? `<div class="banner-prazo"><strong>Prazo alterado ${historicoPrazos.length}x.</strong> Último por ${historicoPrazos[historicoPrazos.length-1].admin_nome || 'Admin'}: de "${historicoPrazos[historicoPrazos.length-1].valor_anterior ? fmtData(historicoPrazos[historicoPrazos.length-1].valor_anterior) : 'sem prazo'}" para "${historicoPrazos[historicoPrazos.length-1].valor_novo ? fmtData(historicoPrazos[historicoPrazos.length-1].valor_novo) : 'removido'}"</div>`
    : '';


  const initial = (c.nome || '?').trim().charAt(0).toUpperCase();

  document.getElementById('modal-title').innerHTML = `${badgeStatus(c.status)} ${badgeCategoria(c.categoria)}`;

  document.getElementById('modal-body').innerHTML = `
    <div class="mv2">

      <!-- Logo Gran Marquise + info centralizada do solicitante -->
      <div class="mv2-logo-bar">
        <img src="https://letsimage.s3.amazonaws.com/editor/granmarquise/imgs/1760033174793-hotelgranmarquise_pos_footer.png" alt="Gran Marquise" class="mv2-logo-img">
        <div class="mv2-logo-user">
          <div class="mv2-logo-user-nome">${c.nome}</div>
          <div class="mv2-logo-user-setor">
            <span>${c.usuario_setor || c.setor}</span>
            ${(c.usuario_ramal || c.ramal) ? `<span class="mv2-sep">·</span><span>Ramal ${c.usuario_ramal || c.ramal}</span>` : ''}
            ${c.prioridade ? `<span class="mv2-sep">·</span><span>${PRIO_LABELS[c.prioridade]}</span>` : ''}
          </div>
        </div>
        <div></div>
      </div>

      ${bannerAtraso}${bannerPrazo}

      <!-- Layout duas colunas: info + ações -->
      <div class="mv2-layout">

        <!-- Coluna esquerda: informações -->
        <div class="mv2-main">

          <div class="mv2-cards-row">
            <div class="mv2-card ${c.admin_nome ? 'mv2-card-ok' : 'mv2-card-vazio'}">
              <div class="mv2-card-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div>
                <div class="mv2-card-label">Administrador responsável</div>
                <div class="mv2-card-val">${c.admin_nome || 'Não atribuído'}</div>
              </div>
            </div>
            <div class="mv2-card">
              <div class="mv2-card-icon mv2-card-icon-neutral">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              </div>
              <div>
                <div class="mv2-card-label">Setor do chamado</div>
                <div class="mv2-card-val">${c.setor}</div>
              </div>
            </div>
          </div>

          <div class="mv2-ts-row">
            <div class="mv2-ts-chip">
              <span class="mv2-ts-label">Aberto em</span>
              <span class="mv2-ts-val">${fmtData(c.criado_em)}</span>
            </div>
            ${c.prazo ? `<div class="mv2-ts-chip ${atrasado ? 'mv2-ts-danger' : 'mv2-ts-warn'}">
              <span class="mv2-ts-label">${atrasado ? '⚠ Prazo vencido' : 'Prazo'}</span>
              <span class="mv2-ts-val">${fmtData(c.prazo)}</span>
            </div>` : ''}
            ${c.concluido_em ? `<div class="mv2-ts-chip mv2-ts-ok">
              <span class="mv2-ts-label">Concluído em</span>
              <span class="mv2-ts-val">${fmtData(c.concluido_em)}</span>
            </div>` : ''}
          </div>

          <div class="mv2-cat-row">
            <span class="mv2-field-label">Categoria</span>
            ${badgeCategoria(c.categoria) || '<span class="mv2-empty-text">Não classificado</span>'}
            <select class="form-control form-control-sm" id="sel-categoria" style="flex:1;max-width:180px;margin-left:.25rem">
              ${Object.entries(CATEGORIAS_MAP).map(([id, cat]) => `<option value="${id}" ${c.categoria === id ? 'selected' : ''}>${cat.nome}</option>`).join('')}
            </select>
            <button class="btn btn-secondary btn-sm" id="btn-salvar-categoria">Salvar</button>
          </div>

          <div class="mv2-section">
            <span class="mv2-field-label">Descrição do problema</span>
            <div class="mv2-desc">${c.descricao}</div>
          </div>

          ${c.anexo_nome_original ? `
            <a href="/api/chamados/${c.id}/anexo" class="mv2-anexo-btn" download>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              ${c.anexo_nome_original}
            </a>` : ''}

          ${c.solucao ? `
            <div class="mv2-solucao">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:#16a34a"><polyline points="20 6 9 17 4 12"/></svg>
              <div>
                <div class="mv2-field-label" style="color:#16a34a">Solução aplicada</div>
                <div style="font-size:.86rem;color:#166534;margin-top:.1rem">${c.solucao}</div>
              </div>
            </div>` : ''}

          ${c.nota !== null ? `
            <div class="mv2-avaliacao">
              <span style="font-size:1rem">⭐</span>
              <div>
                <div class="mv2-field-label">Avaliação do usuário</div>
                <div style="font-size:.86rem;font-weight:600;color:var(--text)">${c.nota}/10${c.comentario_avaliacao ? `<span style="font-weight:400;color:var(--text-muted)"> — ${c.comentario_avaliacao}</span>` : ''}</div>
              </div>
            </div>` : ''}

          ${c.assinado_em ? `
            <div class="mv2-assinatura-admin">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:#15803d;margin-top:.1rem"><polyline points="20 6 9 17 4 12"/></svg>
              <div>
                <div class="mv2-field-label" style="color:#15803d">Recebimento confirmado pelo solicitante</div>
                <div style="font-size:.79rem;color:var(--text-muted);margin:.15rem 0 .5rem">${fmtData(c.assinado_em)}</div>
                ${c.assinatura ? `<img src="${c.assinatura}" alt="Assinatura do solicitante" class="assinatura-img-admin">` : ''}
              </div>
            </div>` : ''}
        </div>

        <!-- Coluna direita: ações -->
        <div class="mv2-side">
          <div id="msg-modal" style="margin-bottom:.4rem"></div>
          <div class="mv2-actions-card">
            <div class="mv2-side-title">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Gerenciar chamado
            </div>
            ${isAberto ? `
              <div class="mv2-ctrl-row">
                <span class="mv2-ctrl-lbl">Prioridade</span>
                <select class="form-control form-control-sm" id="sel-prioridade" style="flex:1">
                  <option value="">Sem prioridade</option>
                  <option value="baixa"   ${c.prioridade==='baixa'  ?'selected':''}>Baixa</option>
                  <option value="media"   ${c.prioridade==='media'  ?'selected':''}>Média</option>
                  <option value="alta"    ${c.prioridade==='alta'   ?'selected':''}>Alta</option>
                  <option value="urgente" ${c.prioridade==='urgente'?'selected':''}>Urgente</option>
                </select>
                <button class="btn btn-secondary btn-sm" id="btn-salvar-prio">Salvar</button>
              </div>
              <div class="mv2-ctrl-row">
                <span class="mv2-ctrl-lbl">Prazo</span>
                <input class="form-control form-control-sm" type="datetime-local" id="input-prazo" value="${c.prazo ? c.prazo.replace(' ','T').slice(0,16) : ''}" style="flex:1">
                <button class="btn btn-secondary btn-sm" id="btn-salvar-prazo">Salvar</button>
                ${c.prazo ? `<button class="btn btn-secondary btn-sm" id="btn-remover-prazo" title="Remover prazo" style="padding:.32rem .5rem">✕</button>` : ''}
              </div>
              <div class="mv2-action-btns">
                ${podeAssumir  ? `<button class="btn btn-primary btn-sm" id="btn-assumir" style="flex:1">Assumir</button>` : ''}
                ${isAberto     ? `<button class="btn btn-secondary btn-sm" id="btn-transferir" style="flex:1">Transferir</button>` : ''}
                ${podeConcluir ? `<button class="btn btn-success btn-sm" id="btn-concluir" style="flex:1">Concluir</button>` : ''}
              </div>
              <div id="area-transferir" style="display:none;margin-top:.6rem;padding-top:.6rem;border-top:1px solid var(--border)">
                <div class="form-group" style="margin-bottom:.4rem">
                  <label style="font-size:.8rem">Transferir para</label>
                  <select class="form-control form-control-sm" id="sel-transferir-admin">
                    <option value="">Selecione um admin...</option>
                  </select>
                </div>
                <button class="btn btn-primary btn-sm" id="btn-confirmar-transferir" style="width:100%">Confirmar transferência</button>
              </div>
              <div id="area-concluir" style="display:none;margin-top:.6rem;padding-top:.6rem;border-top:1px solid var(--border)">
                <div class="form-group" style="margin-bottom:.4rem">
                  <label for="txt-solucao" style="font-size:.8rem">Solução aplicada <span class="req">*</span></label>
                  <textarea class="form-control" id="txt-solucao" minlength="5" maxlength="2000" rows="3" placeholder="Descreva a solução aplicada..."></textarea>
                </div>
                <button class="btn btn-success btn-sm" id="btn-confirmar-concluir" style="width:100%">Confirmar conclusão</button>
              </div>
            ` : `
              <div style="padding:.2rem 0">
                ${podeReabrir ? `<button class="btn btn-secondary btn-sm" id="btn-reabrir" style="width:100%">Reabrir chamado</button>` : '<p class="text-muted" style="font-size:.83rem;margin:0">Chamado encerrado.</p>'}
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- Histórico + Zona de perigo: full-width, lado a lado -->
      <div class="mv2-fullrow">
        <button class="mv2-historico" id="btn-hist-completo">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Histórico de ações
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left:auto"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        ${adminInfo && adminInfo.is_master ? `
        <div class="modal-danger-zone mv2-danger-compact">
          <div class="modal-danger-label">Zona de perigo</div>
          <button class="btn btn-danger btn-sm" id="btn-deletar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Excluir chamado
          </button>
        </div>` : ''}
      </div>

      <!-- Chat em tempo real: full-width -->
      ${isAberto ? `
      <div class="mv2-chat-card mv2-chat-full">
        <div class="mv2-chat-head">
          <span class="mv2-chat-dot"></span>
          Conversa em tempo real
        </div>
        <div class="chat-messages mv2-chat-msgs" id="chat-modal-msgs" data-cnt="0">
          <div class="chat-vazio">Carregando...</div>
        </div>
        <div class="chat-send-error" id="chat-modal-err"></div>
        <form class="chat-input-row" id="chat-modal-form">
          <input type="text" class="chat-input" id="chat-modal-input" placeholder="Responder ao usuário..." maxlength="1000" autocomplete="off">
          <button type="submit" class="btn btn-primary btn-sm">Enviar</button>
        </form>
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
      if (r.ok) setTimeout(() => abrirModal(c.id), 600);
    });
  }

  const btnSalvarPrio = document.getElementById('btn-salvar-prio');
  if (btnSalvarPrio) {
    btnSalvarPrio.addEventListener('click', async () => {
      const prio = document.getElementById('sel-prioridade').value;
      const r = await api(`/api/admin/chamados/${c.id}/prioridade`, { method: 'PATCH', body: JSON.stringify({ prioridade: prio || null }) });
      const d = await r.json();
      setMsg(r.ok ? '<div class="alert alert-success">Prioridade salva.</div>' : `<div class="alert alert-danger">${d.erro}</div>`);
      if (r.ok) setTimeout(() => abrirModal(c.id), 600);
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

  const btnTransferir = document.getElementById('btn-transferir');
  if (btnTransferir) {
    btnTransferir.addEventListener('click', async () => {
      const area = document.getElementById('area-transferir');
      if (area.style.display === 'none') {
        area.style.display = 'block';
        const r = await api('/api/admin/usuarios');
        if (r.ok) {
          const admins = await r.json();
          const sel = document.getElementById('sel-transferir-admin');
          sel.innerHTML = '<option value="">Selecione um admin...</option>' +
            admins.filter(a => a.ativo && a.id !== adminInfo.id).map(a =>
              `<option value="${a.id}">${a.nome_completo}${a.is_master ? ' ★' : ''}</option>`
            ).join('');
        }
      } else {
        area.style.display = 'none';
      }
    });
  }

  const btnConfTransferir = document.getElementById('btn-confirmar-transferir');
  if (btnConfTransferir) {
    btnConfTransferir.addEventListener('click', async () => {
      const adminId = document.getElementById('sel-transferir-admin').value;
      if (!adminId) { setMsg('<div class="alert alert-danger">Selecione um admin.</div>'); return; }
      const r = await api(`/api/admin/chamados/${c.id}/transferir`, { method: 'PATCH', body: JSON.stringify({ admin_id: parseInt(adminId) }) });
      const d = await r.json();
      setMsg(r.ok ? `<div class="alert alert-success">${d.mensagem}</div>` : `<div class="alert alert-danger">${d.erro}</div>`);
      if (r.ok) setTimeout(() => abrirModal(c.id), 700);
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
      if (!solucao || solucao.length < 5) {
        setMsg('<div class="alert alert-danger">Informe a solução aplicada (mínimo 5 caracteres).</div>');
        document.getElementById('txt-solucao').focus();
        return;
      }
      btnConfConcluir.disabled = true; btnConfConcluir.textContent = 'Concluindo…';
      try {
        const r = await api(`/api/admin/chamados/${c.id}/concluir`, { method: 'PATCH', body: JSON.stringify({ solucao }) });
        const d = await r.json();
        setMsg(r.ok ? '<div class="alert alert-success">Chamado concluído.</div>' : `<div class="alert alert-danger">${d.erro}</div>`);
        if (r.ok) setTimeout(() => abrirModal(c.id), 700);
      } finally {
        if (btnConfConcluir.isConnected) { btnConfConcluir.disabled = false; btnConfConcluir.textContent = 'Confirmar conclusão'; }
      }
    });
  }

  const btnReabrir = document.getElementById('btn-reabrir');
  if (btnReabrir) {
    btnReabrir.addEventListener('click', async () => {
      if (!confirm(`Reabrir o chamado? Ele voltará para o status "Aberto".`)) return;
      const r = await api(`/api/admin/chamados/${c.id}/reabrir`, { method: 'PATCH', body: JSON.stringify({}) });
      const d = await r.json();
      setMsg(r.ok ? '<div class="alert alert-success">Chamado reaberto.</div>' : `<div class="alert alert-danger">${d.erro}</div>`);
      if (r.ok) setTimeout(() => abrirModal(c.id), 600);
    });
  }

  const btnDeletar = document.getElementById('btn-deletar');
  if (btnDeletar) {
    btnDeletar.addEventListener('click', async () => {
      if (!confirm(`Excluir permanentemente este chamado? Esta ação não pode ser desfeita.`)) return;
      const r = await api(`/api/admin/chamados/${c.id}`, { method: 'DELETE' });
      const d = await r.json();
      if (r.ok) { fecharModal(); } else { setMsg(`<div class="alert alert-danger">${d.erro}</div>`); }
    });
  }

  const btnHistCompleto = document.getElementById('btn-hist-completo');
  if (btnHistCompleto) {
    btnHistCompleto.addEventListener('click', () => window.abrirHistoricoModal(c));
  }

  const chatForm = document.getElementById('chat-modal-form');
  if (chatForm) {
    _atualizarChatAdmin(c.id);
    _chatAdminIv = setInterval(() => _atualizarChatAdmin(c.id), 3000);

    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('chat-modal-input');
      const errEl = document.getElementById('chat-modal-err');
      const texto = input.value.trim();
      if (!texto) return;
      const btn = chatForm.querySelector('button');
      btn.disabled = true;
      if (errEl) errEl.textContent = '';
      try {
        const r = await api(`/api/admin/chamados/${c.id}/mensagens`, {
          method: 'POST',
          body: JSON.stringify({ mensagem: texto }),
        });
        if (r.ok) {
          input.value = '';
          await _atualizarChatAdmin(c.id);
        } else {
          const d = await r.json().catch(() => ({}));
          if (errEl) errEl.textContent = d.erro || 'Erro ao enviar mensagem.';
        }
      } catch {
        if (errEl) errEl.textContent = 'Erro de conexão.';
      }
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

let _swReg = null;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function iniciarPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    // Registra o SW e aguarda até ele estar ativo (ready resolve só quando o SW controla a página)
    await navigator.serviceWorker.register('/sw.js');
    _swReg = await navigator.serviceWorker.ready;

    const perm = Notification.permission;
    if (perm === 'granted') await _subscribePush();
    atualizarBotaoNotificacao(perm);

    // Re-verifica a subscription a cada 30 minutos (mantém viva mesmo sem recarregar a página)
    setInterval(() => {
      if (Notification.permission === 'granted') _subscribePush();
    }, 30 * 60 * 1000);
  } catch (err) {
    console.warn('[Push] SW registro falhou:', err);
  }
}

let _lastSubscribeTs = 0;

async function _subscribePush() {
  if (!_swReg) return;
  // Throttle: no mínimo 30s entre tentativas para evitar loops
  const now = Date.now();
  if (now - _lastSubscribeTs < 30_000) return;
  _lastSubscribeTs = now;

  try {
    // 1. Busca a chave VAPID atual do servidor
    const r = await api('/api/admin/push/vapid-public-key');
    if (!r.ok) { console.warn('[Push] Falha ao buscar VAPID key, status:', r.status); return; }
    const { publicKey } = await r.json();
    const appKey = urlBase64ToUint8Array(publicKey);

    // 2. Verifica se já existe uma subscription no browser
    let sub = await _swReg.pushManager.getSubscription();

    if (sub) {
      // 3. Compara a chave da subscription existente com a chave atual do servidor
      try {
        const existingKey = new Uint8Array(sub.options.applicationServerKey);
        const keysMismatch = existingKey.length !== appKey.length ||
          existingKey.some((byte, i) => byte !== appKey[i]);

        if (keysMismatch) {
          // A chave VAPID mudou — desinscrevemos e criamos nova subscription
          console.warn('[Push] Chave VAPID mudou — atualizando subscription...');
          await sub.unsubscribe();
          sub = null;
        }
        // Se as chaves batem, reutilizamos a subscription existente (apenas re-salva no servidor)
      } catch {
        // Não conseguiu comparar as chaves — força nova subscription por segurança
        await sub.unsubscribe();
        sub = null;
      }
    }

    // 4. Cria nova subscription se necessário
    if (!sub) {
      sub = await _swReg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey });
    }

    // 5. Sempre salva no servidor (garante que o DB tenha a subscription mesmo após wipe)
    const saveResp = await api('/api/admin/push/subscribe', {
      method: 'POST',
      body: JSON.stringify(sub.toJSON()),
    });
    if (!saveResp.ok) console.warn('[Push] Falha ao registrar subscription no servidor:', saveResp.status);
  } catch (err) {
    console.warn('[Push] _subscribePush falhou:', err.message || err);
  }
}

function atualizarBotaoNotificacao(perm) {
  const btn = document.getElementById('btn-notificacoes');
  if (!btn) return;
  if (perm === 'granted') {
    btn.textContent = '🔔';
    btn.title = 'Notificações ativas';
    btn.style.opacity = '1';
  } else if (perm === 'denied') {
    btn.textContent = '🔕';
    btn.title = 'Notificações bloqueadas pelo navegador';
    btn.style.opacity = '0.5';
  } else {
    btn.textContent = '🔔';
    btn.title = 'Clique para ativar notificações';
    btn.style.opacity = '0.6';
  }
}

document.getElementById('btn-notificacoes').addEventListener('click', async () => {
  if (!('Notification' in window)) { alert('Seu navegador não suporta notificações.'); return; }
  if (Notification.permission === 'denied') {
    alert('Notificações estão bloqueadas. Libere nas configurações do navegador.'); return;
  }
  const perm = await Notification.requestPermission();
  atualizarBotaoNotificacao(perm);
  if (perm === 'granted') await _subscribePush();
});

function mostrarToast(titulo, corpo) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast-notif';
  el.innerHTML = `<button class="toast-close" aria-label="Fechar">✕</button><strong>${titulo}</strong><span>${corpo}</span>`;
  el.querySelector('.toast-close').addEventListener('click', () => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 350);
  });
  container.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 350);
  }, 6000);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'notif') {
      mostrarToast(event.data.title || 'Chamados TI', event.data.body || '');
    }
  });
}

// Quando o admin volta para a aba, re-verifica a subscription (throttle interno em _subscribePush)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && Notification.permission === 'granted') {
    _subscribePush();
  }
});

iniciarPush();
