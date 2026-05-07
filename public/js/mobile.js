const app = document.getElementById('mob-app');
let adminInfo = null;

const STATUS_LABELS = { aberto: 'Aberto', em_andamento: 'Em andamento', concluido: 'Concluído', encerrado: 'Encerrado' };
const PRIO_LABELS   = { urgente: 'Urgente', alta: 'Alta', media: 'Média', baixa: 'Baixa' };

function fmtData(d) {
  if (!d) return '—';
  const iso = d.includes('T') ? d : d.replace(' ', 'T');
  return new Date(iso.endsWith('Z') ? iso : iso + 'Z')
    .toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' });
}

async function api(url, opts = {}) {
  const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (r.status === 401) { renderLogin(); throw new Error('401'); }
  return r;
}

// ── Init ──────────────────────────────────────────────────────
(async () => {
  try {
    const r = await fetch('/api/admin/me');
    if (r.ok) { adminInfo = await r.json(); renderLista(); }
    else renderLogin();
  } catch { renderLogin(); }
})();

// ── Login ─────────────────────────────────────────────────────
function renderLogin() {
  adminInfo = null;
  app.innerHTML = `
    <div class="mob-login">
      <img src="https://letsimage.s3.amazonaws.com/editor/granmarquise/imgs/1760033174793-hotelgranmarquise_pos_footer.png"
           alt="Gran Marquise" class="mob-login-logo">
      <div class="mob-login-title">Suporte de TI</div>
      <div class="mob-login-sub">Conclusão de chamados</div>
      <div id="mob-msg-login"></div>
      <form id="mob-form-login" novalidate>
        <div class="mob-field">
          <label class="mob-label">E-mail</label>
          <input class="mob-input" type="email" id="mob-email"
                 placeholder="seu@granmarquise.com.br" autocomplete="email" required>
        </div>
        <div class="mob-field">
          <label class="mob-label">Senha</label>
          <input class="mob-input" type="password" id="mob-senha"
                 autocomplete="current-password" required placeholder="••••••••">
        </div>
        <button class="mob-btn mob-btn-primary" type="submit" id="mob-btn-entrar">Entrar</button>
      </form>
    </div>
  `;

  document.getElementById('mob-form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('mob-msg-login');
    const btn = document.getElementById('mob-btn-entrar');
    btn.disabled = true; btn.textContent = 'Entrando…';
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: document.getElementById('mob-email').value.trim(),
          senha: document.getElementById('mob-senha').value,
        }),
      });
      const d = await r.json();
      if (!r.ok) { msg.innerHTML = `<div class="mob-alert mob-alert-danger">${d.erro}</div>`; return; }
      adminInfo = await (await fetch('/api/admin/me')).json();
      renderLista();
    } catch { msg.innerHTML = '<div class="mob-alert mob-alert-danger">Erro de conexão.</div>'; }
    finally { btn.disabled = false; btn.textContent = 'Entrar'; }
  });
}

// ── Lista de chamados ─────────────────────────────────────────
let filtroAtivo = 'meus';

async function renderLista() {
  app.innerHTML = `
    <div class="mob-header">
      <div class="mob-header-info">
        <div class="mob-header-title">Chamados em aberto</div>
        ${adminInfo ? `<div class="mob-header-sub">${adminInfo.nome_completo}</div>` : ''}
      </div>
      <button class="mob-sair-btn" id="mob-sair">Sair</button>
    </div>
    <div class="mob-filtro-bar">
      <button class="mob-filtro-btn ${filtroAtivo === 'meus' ? 'ativo' : ''}" data-filtro="meus">Meus chamados</button>
      <button class="mob-filtro-btn ${filtroAtivo === 'todos' ? 'ativo' : ''}" data-filtro="todos">Todos</button>
    </div>
    <div id="mob-lista" class="mob-lista"><div class="mob-loading">Carregando…</div></div>
  `;

  document.getElementById('mob-sair').addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    renderLogin();
  });

  document.querySelectorAll('.mob-filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filtroAtivo = btn.dataset.filtro;
      document.querySelectorAll('.mob-filtro-btn').forEach(b => b.classList.toggle('ativo', b.dataset.filtro === filtroAtivo));
      carregarChamados();
    });
  });

  carregarChamados();
}

async function carregarChamados() {
  const lista = document.getElementById('mob-lista');
  lista.innerHTML = '<div class="mob-loading">Carregando…</div>';
  try {
    const params = new URLSearchParams({ status: 'aberto,em_andamento' });
    if (filtroAtivo === 'meus' && adminInfo) params.set('admin_id', adminInfo.id);
    const r = await api('/api/admin/chamados?' + params);
    if (!r.ok) return;
    const chamados = await r.json();
    const lista = document.getElementById('mob-lista');

    if (!chamados.length) {
      lista.innerHTML = '<div class="mob-empty">Nenhum chamado em aberto no momento.</div>';
      return;
    }

    lista.innerHTML = chamados.map(c => `
      <div class="mob-card" data-id="${c.id}">
        <div class="mob-card-head">
          <span class="badge badge-${c.status}">${STATUS_LABELS[c.status]}</span>
          ${c.prioridade ? `<span class="badge badge-${c.prioridade}">${PRIO_LABELS[c.prioridade]}</span>` : ''}
          <span class="mob-card-data">${fmtData(c.criado_em)}</span>
        </div>
        <div class="mob-card-nome">${c.nome}</div>
        <div class="mob-card-setor">${c.usuario_setor || c.setor}</div>
        <div class="mob-card-desc">${c.descricao.length > 120 ? c.descricao.slice(0, 120) + '…' : c.descricao}</div>
        ${c.admin_nome ? `<div class="mob-card-resp">Responsável: ${c.admin_nome}</div>` : ''}
      </div>
    `).join('');

    lista.querySelectorAll('.mob-card').forEach(el => {
      el.addEventListener('click', async () => {
        try {
          const r = await api(`/api/admin/chamados/${el.dataset.id}`);
          if (r.ok) renderDetalhe(await r.json());
        } catch {}
      });
    });
  } catch {}
}


// ── Detalhe + Conclusão ───────────────────────────────────────
function renderDetalhe(c) {
  app.innerHTML = `
    <div class="mob-header">
      <button class="mob-voltar-btn" id="mob-voltar">← Voltar</button>
    </div>

    <div class="mob-detalhe">
      <div class="mob-detalhe-nome">${c.nome}</div>
      <div class="mob-detalhe-setor">${c.usuario_setor || c.setor} · Ramal ${c.usuario_ramal || c.ramal}</div>
      <div class="mob-detalhe-desc">${c.descricao}</div>

      <div id="mob-msg-concluir"></div>

      <div class="mob-field" style="margin-top:1.5rem">
        <label class="mob-label">Solução aplicada <span class="req">*</span></label>
        <textarea class="mob-input mob-textarea" id="mob-solucao"
                  placeholder="Descreva o que foi feito…" maxlength="2000" rows="5"></textarea>
        <button type="button" class="mob-ok-btn" id="mob-ok-solucao">Ok</button>
      </div>

      <div class="mob-assin-section">
        <div class="mob-assin-titulo">
          Assinatura do solicitante
          <span class="mob-assin-opcional">(opcional)</span>
        </div>
        <div class="mob-assin-instrucao">O solicitante pode assinar abaixo para confirmar que o problema foi resolvido.</div>
        <div class="mob-canvas-wrap" id="mob-canvas-wrap">
          <canvas id="mob-canvas" class="mob-canvas"></canvas>
        </div>
        <button class="mob-btn mob-btn-ghost mob-btn-sm" id="mob-limpar">Limpar assinatura</button>
      </div>

      <button class="mob-btn mob-btn-success" id="mob-btn-concluir">Concluir chamado</button>
    </div>
  `;

  document.getElementById('mob-voltar').addEventListener('click', renderLista);

  document.getElementById('mob-ok-solucao').addEventListener('click', () => {
    document.getElementById('mob-solucao').blur();
  });

  // Canvas
  const canvas = document.getElementById('mob-canvas');
  const ctx = canvas.getContext('2d');
  const wrap = document.getElementById('mob-canvas-wrap');
  canvas.width = wrap.clientWidth || 340;
  canvas.height = 200;
  ctx.strokeStyle = '#1C1C1C';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let desenhando = false;
  let temTraco = false;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (canvas.width / rect.width),
      y: (src.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    desenhando = true; temTraco = true;
    canvas.setPointerCapture(e.pointerId);
    const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
  });
  canvas.addEventListener('pointermove', (e) => {
    e.preventDefault();
    if (!desenhando) return;
    const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke();
  });
  canvas.addEventListener('pointerup', () => { desenhando = false; ctx.beginPath(); });
  canvas.addEventListener('pointercancel', () => { desenhando = false; ctx.beginPath(); });

  document.getElementById('mob-limpar').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    temTraco = false;
  });

  document.getElementById('mob-btn-concluir').addEventListener('click', async () => {
    const solucao = document.getElementById('mob-solucao').value.trim();
    const msg = document.getElementById('mob-msg-concluir');
    if (!solucao || solucao.length < 5) {
      msg.innerHTML = '<div class="mob-alert mob-alert-danger">Informe a solução aplicada (mínimo 5 caracteres).</div>';
      document.getElementById('mob-solucao').focus();
      return;
    }
    const btn = document.getElementById('mob-btn-concluir');
    btn.disabled = true; btn.textContent = 'Concluindo…';
    try {
      const r = await api(`/api/admin/chamados/${c.id}/concluir`, {
        method: 'PATCH',
        body: JSON.stringify({
          solucao,
          assinatura: temTraco ? canvas.toDataURL('image/png') : null,
        }),
      });
      const d = await r.json();
      if (!r.ok) { msg.innerHTML = `<div class="mob-alert mob-alert-danger">${d.erro}</div>`; return; }
      renderSucesso(c);
    } catch { msg.innerHTML = '<div class="mob-alert mob-alert-danger">Erro de conexão.</div>'; }
    finally { if (btn.isConnected) { btn.disabled = false; btn.textContent = 'Concluir chamado'; } }
  });
}

// ── Tela de sucesso ───────────────────────────────────────────
function renderSucesso(c) {
  app.innerHTML = `
    <div class="mob-sucesso">
      <div class="mob-sucesso-icone">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="mob-sucesso-titulo">Chamado concluído!</div>
      <div class="mob-sucesso-sub">${c.nome}</div>
      <button class="mob-btn mob-btn-primary" id="mob-btn-voltar-lista">Ver chamados em aberto</button>
    </div>
  `;
  document.getElementById('mob-btn-voltar-lista').addEventListener('click', renderLista);
}
