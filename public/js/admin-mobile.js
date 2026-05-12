let adminInfo = null;
let tabAtiva = 'meus';
let chamadoAtual = null;
let _chatIv = null;

const STATUS_LABELS = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  aguardando_compra: 'Ag. compra',
  aguardando_chegar: 'Ag. chegar',
  concluido: 'Concluído',
  encerrado: 'Encerrado',
};
const PRIO_LABELS = { urgente: 'Urgente', alta: 'Alta', media: 'Média', baixa: 'Baixa' };
const STATUS_ATIVOS = ['aberto', 'em_andamento', 'aguardando_compra', 'aguardando_chegar'];

async function api(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (res.status === 401) { location.replace('/admin-login.html'); throw new Error('401'); }
  return res;
}

function fmtData(d) {
  if (!d) return '—';
  const iso = d.includes('T') ? d : d.replace(' ', 'T');
  const date = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' });
}

// ── Init ──────────────────────────────────────────────────────────────────────

(async () => {
  try {
    const r = await api('/api/admin/me');
    if (!r.ok) { location.replace('/admin-login.html'); return; }
    adminInfo = await r.json();
    document.getElementById('mob-sub').textContent = adminInfo.nome_completo || 'Gran Marquise';
    await carregarLista();
    // Auto-refresh silencioso da lista enquanto não há chat aberto
    setInterval(() => { if (!chamadoAtual) carregarLista(true); }, 10000);
  } catch {}
})();

// ── Eventos ───────────────────────────────────────────────────────────────────

document.querySelectorAll('.mob-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mob-tab').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    tabAtiva = btn.dataset.tab;
    carregarLista();
  });
});

document.getElementById('btn-voltar').addEventListener('click', voltarParaLista);

document.getElementById('btn-refresh').addEventListener('click', () => {
  if (chamadoAtual) _atualizarChat(chamadoAtual.id);
  else carregarLista();
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST' });
  location.replace('/admin-login.html');
});

// ── Lista de chamados ─────────────────────────────────────────────────────────

async function carregarLista(silencioso = false) {
  const container = document.getElementById('view-lista');
  if (!silencioso) container.innerHTML = '<div class="mob-loading"><div class="spinner"></div></div>';

  try {
    const params = new URLSearchParams({ status: STATUS_ATIVOS.join(',') });
    if (tabAtiva === 'meus' && adminInfo) params.set('admin_id', adminInfo.id);

    const r = await api('/api/admin/chamados?' + params);
    if (!r.ok) return;
    const chamados = await r.json();

    // Atualiza badges de contagem
    const elMeus  = document.getElementById('cnt-meus');
    const elTodos = document.getElementById('cnt-todos');
    if (tabAtiva === 'meus') {
      elMeus.textContent = chamados.length || '';
      elMeus.style.display = chamados.length ? 'inline-flex' : 'none';
    } else {
      elTodos.textContent = chamados.length || '';
      elTodos.style.display = chamados.length ? 'inline-flex' : 'none';
    }

    if (!chamados.length) {
      container.innerHTML = '<div class="mob-empty">Nenhum chamado em aberto.</div>';
      return;
    }

    // Ordena: urgente → alta → média → baixa → sem prioridade; mesmo nível: mais recente primeiro
    const ordemPrio = { urgente: 0, alta: 1, media: 2, baixa: 3 };
    chamados.sort((a, b) => {
      const pa = ordemPrio[a.prioridade] ?? 4;
      const pb = ordemPrio[b.prioridade] ?? 4;
      return pa !== pb ? pa - pb : new Date(b.criado_em) - new Date(a.criado_em);
    });

    container.innerHTML = chamados.map(c => `
      <div class="chamado-card ${c.prioridade || ''}" data-id="${c.id}" role="button" tabindex="0" aria-label="Abrir chamado #${c.id}">
        <div class="card-top">
          <span class="card-id">#${c.id}</span>
          <span class="badge badge-${c.status}">${STATUS_LABELS[c.status] || c.status}</span>
          ${c.prioridade ? `<span class="badge badge-${c.prioridade}">${PRIO_LABELS[c.prioridade]}</span>` : ''}
        </div>
        <div class="card-nome">${c.nome}</div>
        <div class="card-desc">${c.descricao}</div>
        <div class="card-footer">
          <span class="card-meta">${c.usuario_setor || c.setor}</span>
          ${c.admin_nome
            ? `<span class="card-meta">· ${c.admin_nome}</span>`
            : `<span class="card-meta-warn">· Sem responsável</span>`}
          <span class="card-meta" style="margin-left:auto">${fmtData(c.criado_em)}</span>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.chamado-card').forEach(el => {
      el.addEventListener('click', () => abrirChat(+el.dataset.id));
    });
  } catch {}
}

// ── Chat ──────────────────────────────────────────────────────────────────────

async function abrirChat(id) {
  if (_chatIv) { clearInterval(_chatIv); _chatIv = null; }
  chamadoAtual = null;

  // Troca de view
  document.getElementById('view-lista-wrap').style.display = 'none';
  const viewChat = document.getElementById('view-chat');
  viewChat.classList.add('ativo');
  document.getElementById('btn-voltar').style.display = 'flex';
  document.getElementById('chat-msgs').innerHTML = '<div class="chat-vazio">Carregando...</div>';
  document.getElementById('chat-info').innerHTML = '';
  document.getElementById('chat-input-wrap').innerHTML = '';

  try {
    const r = await api(`/api/admin/chamados/${id}`);
    if (!r.ok) { voltarParaLista(); return; }
    chamadoAtual = await r.json();

    _renderHeader(chamadoAtual);
    _renderInput(chamadoAtual);
    await _atualizarChat(id);

    if (STATUS_ATIVOS.includes(chamadoAtual.status)) {
      _chatIv = setInterval(() => _atualizarChat(id), 3000);
    }
  } catch {}
}

function _renderHeader(c) {
  document.getElementById('mob-title').textContent = `#${c.id} — ${c.nome.split(' ')[0]}`;
  document.getElementById('mob-sub').textContent = STATUS_LABELS[c.status] || c.status;

  document.getElementById('chat-info').innerHTML = `
    <div class="chat-info-nome">${c.nome}</div>
    <div class="chat-info-meta">
      <span class="badge badge-${c.status}">${STATUS_LABELS[c.status] || c.status}</span>
      <span style="font-size:.76rem;color:#888">${c.usuario_setor || c.setor}</span>
      ${(c.usuario_ramal || c.ramal) ? `<span style="font-size:.76rem;color:#888">· Ramal ${c.usuario_ramal || c.ramal}</span>` : ''}
      ${c.admin_nome ? `<span style="font-size:.76rem;color:#888">· ${c.admin_nome}</span>` : ''}
    </div>
    <div class="chat-info-desc">${c.descricao}</div>
  `;
}

function _renderInput(c) {
  const wrap = document.getElementById('chat-input-wrap');

  if (!STATUS_ATIVOS.includes(c.status)) {
    wrap.innerHTML = '<div class="chat-encerrado">Chamado encerrado — não é possível enviar mensagens.</div>';
    return;
  }

  wrap.innerHTML = `
    <form class="chat-input-area" id="chat-form">
      <textarea class="chat-textarea" id="chat-input" placeholder="Responder ao usuário..." maxlength="1000" rows="1" autocomplete="off"></textarea>
      <button type="submit" class="chat-send-btn" id="chat-send-btn" aria-label="Enviar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </form>
  `;

  const textarea = document.getElementById('chat-input');
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 110) + 'px';
  });

  document.getElementById('chat-form').addEventListener('submit', async e => {
    e.preventDefault();
    const texto = textarea.value.trim();
    if (!texto || !chamadoAtual) return;
    const btn = document.getElementById('chat-send-btn');
    btn.disabled = true;
    try {
      const r = await api(`/api/admin/chamados/${chamadoAtual.id}/mensagens`, {
        method: 'POST',
        body: JSON.stringify({ mensagem: texto }),
      });
      if (r.ok) {
        textarea.value = '';
        textarea.style.height = 'auto';
        await _atualizarChat(chamadoAtual.id);
      }
    } catch {} finally {
      if (btn.isConnected) { btn.disabled = false; textarea.focus(); }
    }
  });
}

async function _atualizarChat(chamadoId) {
  const box = document.getElementById('chat-msgs');
  if (!box) return;
  const atFundo = box.scrollTop + box.clientHeight >= box.scrollHeight - 10;
  const anterior = +(box.dataset.cnt || 0);

  try {
    const r = await api(`/api/admin/chamados/${chamadoId}/mensagens?_t=${Date.now()}`);
    if (!r.ok) return;
    if (!chamadoAtual || Number(chamadoAtual.id) !== Number(chamadoId)) return;
    const msgs = await r.json();

    box.dataset.cnt = msgs.length;
    if (msgs.length === anterior && anterior > 0) return;

    if (!msgs.length) {
      box.innerHTML = '<div class="chat-vazio">Nenhuma mensagem ainda. Inicie a conversa!</div>';
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

    if (atFundo || msgs.length > anterior) box.scrollTop = box.scrollHeight;
  } catch {}
}

function voltarParaLista() {
  if (_chatIv) { clearInterval(_chatIv); _chatIv = null; }
  chamadoAtual = null;

  document.getElementById('view-chat').classList.remove('ativo');
  document.getElementById('view-lista-wrap').style.display = 'flex';
  document.getElementById('btn-voltar').style.display = 'none';
  document.getElementById('mob-title').textContent = 'Chamados TI';
  document.getElementById('mob-sub').textContent = adminInfo ? adminInfo.nome_completo : 'Gran Marquise';

  carregarLista();
}
