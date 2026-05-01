let adminInfo = null;
let chamadoAtual = null;
let abaAtiva = 'abertos';
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
    box.innerHTML = msgs.map(m => `
      <div class="chat-msg ${m.autor_tipo}">
        <div class="chat-msg-bubble">${m.mensagem}</div>
        <div class="chat-msg-meta">${m.autor_nome} · ${fmtData(m.criado_em)}</div>
      </div>`).join('');
    if (atFundo || anterior < msgs.length) box.scrollTop = box.scrollHeight;
  } catch {}
}

const STATUS_ABERTOS = ['aberto', 'em_andamento'];
const STATUS_ENCERRADOS = ['concluido', 'encerrado'];

const STATUS_LABELS = { aberto: 'Aberto', em_andamento: 'Em andamento', concluido: 'Concluído', encerrado: 'Encerrado' };
const PRIO_LABELS = { urgente: 'Urgente', alta: 'Alta', media: 'Média', baixa: 'Baixa' };

function fmtData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
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
    await Promise.all([carregarChamados(), carregarEstatisticas()]);
  } catch {}
})();

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    abaAtiva = btn.dataset.tab;
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
    const r = await api('/api/admin/chamados?limit=9999');
    if (!r.ok) return;
    const todos = await r.json();

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
  const setor = document.getElementById('filtro-setor').value.trim();
  const adminId = document.getElementById('filtro-admin').value;
  const inicio = document.getElementById('filtro-inicio').value;
  const fim = document.getElementById('filtro-fim').value;

  if (statusFiltro) {
    params.set('status', statusFiltro);
  } else {
    const statusDaAba = abaAtiva === 'abertos' ? STATUS_ABERTOS : STATUS_ENCERRADOS;
    params.set('status', statusDaAba.join(','));
  }

  if (setor) params.set('setor', setor);
  if (adminId) params.set('admin_id', adminId);
  if (inicio) params.set('periodo_inicio', inicio);
  if (fim) params.set('periodo_fim', fim);

  try {
    const r = await api('/api/admin/chamados?' + params);
    const chamados = await r.json();
    if (!chamados.length) {
      const msg = abaAtiva === 'abertos'
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
        ${badgePrio(c.prioridade)}
        ${badgeStatus(c.status)}
        ${c.admin_nome ? `<span class="tag">${c.admin_nome}</span>` : ''}
        <span class="chamado-data-rel">${fmtData(c.criado_em)}</span>
      </div>
      <div class="chamado-nome">${c.nome}</div>
      <div class="chamado-meta">${c.setor} · Ramal ${c.ramal}${c.prazo ? ' · <strong>Prazo:</strong> ' + fmtData(c.prazo) : ''}</div>
      <div class="chamado-desc">${c.descricao}</div>
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
  const historicoPrazos = (c.historico || []).filter(h => h.acao === 'prazo_alterado');
  const bannerPrazo = historicoPrazos.length > 0
    ? `<div class="banner-prazo"><strong>Prazo alterado ${historicoPrazos.length}x.</strong> Último: ${fmtData(historicoPrazos[historicoPrazos.length-1].timestamp)} por ${historicoPrazos[historicoPrazos.length-1].admin_nome || 'Admin'} — de "${historicoPrazos[historicoPrazos.length-1].valor_anterior ? fmtData(historicoPrazos[historicoPrazos.length-1].valor_anterior) : 'sem prazo'}" para "${historicoPrazos[historicoPrazos.length-1].valor_novo ? fmtData(historicoPrazos[historicoPrazos.length-1].valor_novo) : 'removido'}"</div>`
    : '';

  const podeAssumir  = c.status === 'aberto';
  const podeConcluir = c.status === 'em_andamento';
  const podeEncerrar = ['aberto', 'em_andamento'].includes(c.status);
  const podeReabrir  = ['concluido', 'encerrado'].includes(c.status);

  const historicoHtml = c.historico && c.historico.length > 0
    ? c.historico.map(h => `
        <div class="historico-item">
          <span class="historico-acao">${traduzirAcao(h.acao)}</span>
          ${h.valor_anterior !== null ? ` <span class="text-muted">de "${h.valor_anterior || '—'}"</span>` : ''}
          ${h.valor_novo !== null ? ` <span class="text-muted">para "${h.valor_novo || '—'}"</span>` : ''}
          <div class="historico-meta">${h.admin_nome || 'Sistema'} · ${fmtData(h.timestamp)}</div>
        </div>
      `).join('')
    : '<p class="text-muted" style="font-size:.85rem">Sem histórico.</p>';

  document.getElementById('modal-body').innerHTML = `
    <div style="display:grid;gap:.85rem">
      ${bannerPrazo}
      <div class="flex gap-1 flex-wrap">
        ${badgeStatus(c.status)} ${badgePrio(c.prioridade)}
        ${c.admin_nome ? `<span class="tag">Responsável: ${c.admin_nome}</span>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;font-size:.88rem">
        <div><span class="text-muted">Solicitante</span><br><strong>${c.nome}</strong></div>
        <div><span class="text-muted">Setor / Ramal</span><br>${c.setor} / ${c.ramal}</div>
        <div><span class="text-muted">Aberto em</span><br>${fmtData(c.criado_em)}</div>
        <div><span class="text-muted">Atualizado em</span><br>${fmtData(c.atualizado_em)}</div>
        ${c.prazo ? `<div><span class="text-muted">Prazo</span><br><strong>${fmtData(c.prazo)}</strong></div>` : ''}
        ${c.concluido_em ? `<div><span class="text-muted">Concluído em</span><br>${fmtData(c.concluido_em)}</div>` : ''}
      </div>
      <div><span class="text-muted" style="font-size:.78rem">Descrição</span><br>${c.descricao}</div>
      ${c.anexo_nome_original ? `<div><a href="/api/chamados/${c.id}/anexo" class="btn btn-secondary btn-sm" download>Baixar anexo: ${c.anexo_nome_original}</a></div>` : ''}
      ${c.solucao ? `<div><span class="text-muted" style="font-size:.78rem">Solução / Motivo</span><br>${c.solucao}</div>` : ''}
      ${c.nota !== null ? `<div class="alert alert-success" style="margin:0"><strong>Avaliação do usuário:</strong> ${c.nota}/10${c.comentario_avaliacao ? ' — '+c.comentario_avaliacao : ''}</div>` : ''}

      <hr>
      <div id="msg-modal"></div>

      <div class="form-group" style="margin-bottom:.5rem">
        <label for="sel-prioridade">Prioridade</label>
        <select class="form-control" id="sel-prioridade">
          <option value="">Sem prioridade</option>
          <option value="baixa" ${c.prioridade==='baixa'?'selected':''}>Baixa</option>
          <option value="media" ${c.prioridade==='media'?'selected':''}>Média</option>
          <option value="alta" ${c.prioridade==='alta'?'selected':''}>Alta</option>
          <option value="urgente" ${c.prioridade==='urgente'?'selected':''}>Urgente</option>
        </select>
      </div>
      <button class="btn btn-secondary btn-sm" id="btn-salvar-prio">Salvar prioridade</button>

      <div class="form-group mt-2" style="margin-bottom:.5rem">
        <label for="input-prazo">Prazo (data e hora)</label>
        <input class="form-control" type="datetime-local" id="input-prazo" value="${c.prazo ? c.prazo.replace(' ','T').slice(0,16) : ''}">
      </div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" id="btn-salvar-prazo">Salvar prazo</button>
        ${c.prazo ? `<button class="btn btn-secondary btn-sm" id="btn-remover-prazo">Remover prazo</button>` : ''}
      </div>

      <div class="modal-footer" style="margin-top:0;padding-top:0;border:none;flex-wrap:wrap">
        ${podeAssumir  ? `<button class="btn btn-primary btn-sm" id="btn-assumir">Assumir chamado</button>` : ''}
        ${podeConcluir ? `<button class="btn btn-success btn-sm" id="btn-concluir">Concluir</button>` : ''}
        ${podeEncerrar ? `<button class="btn btn-danger btn-sm"  id="btn-encerrar">Encerrar</button>` : ''}
        ${podeReabrir  ? `<button class="btn btn-secondary btn-sm" id="btn-reabrir">Reabrir</button>` : ''}
        ${adminInfo && adminInfo.is_master ? `<button class="btn btn-danger btn-sm" id="btn-deletar" style="margin-left:auto">Excluir</button>` : ''}
      </div>

      <div id="area-concluir" style="display:none">
        <div class="form-group">
          <label for="txt-solucao">Solução aplicada <span class="req">*</span></label>
          <textarea class="form-control" id="txt-solucao" minlength="5" maxlength="2000" placeholder="Descreva a solução..."></textarea>
        </div>
        <button class="btn btn-success btn-sm" id="btn-confirmar-concluir">Confirmar conclusão</button>
      </div>
      <div id="area-encerrar" style="display:none">
        <div class="form-group">
          <label for="txt-motivo">Motivo do encerramento <span class="req">*</span></label>
          <textarea class="form-control" id="txt-motivo" minlength="3" maxlength="500" placeholder="Informe o motivo..."></textarea>
        </div>
        <button class="btn btn-danger btn-sm" id="btn-confirmar-encerrar">Confirmar encerramento</button>
      </div>

      ${['aberto', 'em_andamento'].includes(c.status) ? `
      <div>
        <div style="font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text-secondary);margin-bottom:.55rem">Conversa com o usuário</div>
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

      <hr>
      <details>
        <summary style="cursor:pointer;font-size:.82rem;font-weight:600;color:var(--text-secondary);letter-spacing:.04em;text-transform:uppercase">Histórico de ações</summary>
        <div style="margin-top:.75rem">${historicoHtml}</div>
      </details>
    </div>
  `;

  setupModalEventos(c);
}

function setupModalEventos(c) {
  const msg = () => document.getElementById('msg-modal');
  const setMsg = (html) => { msg().innerHTML = html; };

  document.getElementById('btn-salvar-prio').addEventListener('click', async () => {
    const prio = document.getElementById('sel-prioridade').value;
    const r = await api(`/api/admin/chamados/${c.id}/prioridade`, { method: 'PATCH', body: JSON.stringify({ prioridade: prio || null }) });
    const d = await r.json();
    setMsg(r.ok ? '<div class="alert alert-success">Prioridade salva.</div>' : `<div class="alert alert-danger">${d.erro}</div>`);
    if (r.ok) { c.prioridade = prio || null; }
  });

  document.getElementById('btn-salvar-prazo').addEventListener('click', async () => {
    const prazo = document.getElementById('input-prazo').value;
    const r = await api(`/api/admin/chamados/${c.id}/prazo`, { method: 'PATCH', body: JSON.stringify({ prazo: prazo || null }) });
    const d = await r.json();
    setMsg(r.ok ? '<div class="alert alert-success">Prazo atualizado.</div>' : `<div class="alert alert-danger">${d.erro}</div>`);
    if (r.ok) setTimeout(() => abrirModal(c.id), 600);
  });

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

function traduzirAcao(acao) {
  const t = {
    prioridade_definida: 'Prioridade definida',
    status_alterado: 'Status alterado',
    prazo_alterado: 'Prazo alterado',
    solucao_registrada: 'Solução registrada',
    assumido: 'Chamado assumido',
  };
  return t[acao] || acao;
}
