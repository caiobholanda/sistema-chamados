let adminInfo = null;
let chamadoAtual = null;

const PRIORIDADES = ['urgente', 'alta', 'media', 'baixa'];
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

// ── Init ──────────────────────────────────────────────────────
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
    await carregarChamados();
  } catch {}
})();

document.getElementById('btn-logout').addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST' });
  location.replace('/admin-login.html');
});

document.getElementById('btn-filtrar').addEventListener('click', carregarChamados);
document.getElementById('btn-atualizar').addEventListener('click', carregarChamados);
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
  const status = document.getElementById('filtro-status').value;
  const setor = document.getElementById('filtro-setor').value.trim();
  const adminId = document.getElementById('filtro-admin').value;
  const inicio = document.getElementById('filtro-inicio').value;
  const fim = document.getElementById('filtro-fim').value;
  if (status) params.set('status', status);
  if (setor) params.set('setor', setor);
  if (adminId) params.set('admin_id', adminId);
  if (inicio) params.set('periodo_inicio', inicio);
  if (fim) params.set('periodo_fim', fim);

  try {
    const r = await api('/api/admin/chamados?' + params);
    const chamados = await r.json();
    if (!chamados.length) {
      lista.innerHTML = '<div class="card text-center text-muted">Nenhum chamado encontrado.</div>';
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
  const prazoAlterado = c.prazo && false; // checamos no modal com histórico completo
  return `
    <div class="chamado-item prioridade-${c.prioridade || 'sem'}" data-id="${c.id}" tabindex="0" role="button" aria-label="Abrir chamado #${c.id}">
      <div class="chamado-item-header">
        <span class="chamado-id">#${c.id}</span>
        ${badgePrio(c.prioridade)}
        ${badgeStatus(c.status)}
        ${c.admin_nome ? `<span class="tag">${c.admin_nome}</span>` : ''}
      </div>
      <div class="chamado-nome">${c.nome}</div>
      <div class="chamado-meta">${c.setor} · Ramal ${c.ramal} · ${fmtData(c.criado_em)}${c.prazo ? ' · Prazo: '+fmtData(c.prazo) : ''}</div>
      <div class="chamado-desc">${c.descricao}</div>
    </div>
  `;
}

// ── Modal ─────────────────────────────────────────────────────
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
  document.getElementById('modal-overlay').classList.remove('open');
  chamadoAtual = null;
  carregarChamados();
}

function renderModalBody(c) {
  const historicoPrazos = (c.historico || []).filter(h => h.acao === 'prazo_alterado');
  const bannerPrazo = historicoPrazos.length > 0
    ? `<div class="banner-prazo">⚠️ <strong>Prazo alterado ${historicoPrazos.length}x.</strong> Último: ${fmtData(historicoPrazos[historicoPrazos.length-1].timestamp)} por ${historicoPrazos[historicoPrazos.length-1].admin_nome || 'Admin'} — de "${historicoPrazos[historicoPrazos.length-1].valor_anterior ? fmtData(historicoPrazos[historicoPrazos.length-1].valor_anterior) : 'sem prazo'}" para "${historicoPrazos[historicoPrazos.length-1].valor_novo ? fmtData(historicoPrazos[historicoPrazos.length-1].valor_novo) : 'removido'}"</div>`
    : '';

  const podeAssumir = c.status === 'aberto';
  const podeConcluir = c.status === 'em_andamento';
  const podeEncerrar = ['aberto', 'em_andamento'].includes(c.status);

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
      <div><span class="text-muted" style="font-size:.8rem">Descrição</span><br>${c.descricao}</div>
      ${c.anexo_nome_original ? `<div><a href="/api/chamados/${c.id}/anexo" class="btn btn-secondary btn-sm" download>⬇ ${c.anexo_nome_original}</a></div>` : ''}
      ${c.solucao ? `<div><span class="text-muted" style="font-size:.8rem">Solução / Motivo</span><br>${c.solucao}</div>` : ''}
      ${c.nota !== null ? `<div class="alert alert-success" style="margin:0"><strong>Avaliação do usuário:</strong> ${c.nota}/10${c.comentario_avaliacao ? ' — '+c.comentario_avaliacao : ''}</div>` : ''}

      <hr>
      <!-- Ações -->
      <div id="msg-modal"></div>

      <!-- Prioridade -->
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

      <!-- Prazo -->
      <div class="form-group mt-2" style="margin-bottom:.5rem">
        <label for="input-prazo">Prazo (data e hora)</label>
        <input class="form-control" type="datetime-local" id="input-prazo" value="${c.prazo ? c.prazo.replace(' ','T').slice(0,16) : ''}">
      </div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" id="btn-salvar-prazo">Salvar prazo</button>
        ${c.prazo ? `<button class="btn btn-secondary btn-sm" id="btn-remover-prazo">Remover prazo</button>` : ''}
      </div>

      <!-- Botões de transição -->
      <div class="modal-footer" style="margin-top:0;padding-top:0;border:none;flex-wrap:wrap">
        ${podeAssumir ? `<button class="btn btn-primary" id="btn-assumir">Assumir</button>` : ''}
        ${podeConcluir ? `<button class="btn btn-success" id="btn-concluir">Concluir</button>` : ''}
        ${podeEncerrar ? `<button class="btn btn-danger" id="btn-encerrar">Encerrar</button>` : ''}
      </div>

      <!-- Campos contextuais -->
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

      <hr>
      <!-- Histórico -->
      <details>
        <summary style="cursor:pointer;font-size:.88rem;font-weight:600">Histórico de ações</summary>
        <div style="margin-top:.75rem">${historicoHtml}</div>
      </details>
    </div>
  `;

  // Eventos botões
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
      setMsg(r.ok ? '<div class="alert alert-success">Chamado assumido!</div>' : `<div class="alert alert-danger">${d.erro}</div>`);
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
      setMsg(r.ok ? '<div class="alert alert-success">Chamado concluído!</div>' : `<div class="alert alert-danger">${d.erro}</div>`);
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
