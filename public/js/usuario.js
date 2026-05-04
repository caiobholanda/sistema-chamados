const app = document.getElementById('app');

const STATUS_LABELS = { aberto: 'Aberto', em_andamento: 'Em andamento', concluido: 'Concluído', encerrado: 'Encerrado' };

const RAMAIS_VALIDOS = new Set([
  '5001','5002','5003','5004','5005','5010','5012','5015',
  '5050','5051','5055','5056','5058','5061','5062','5066','5067',
  '5093','5094',
  '5207','5208','5216','5221','5222','5223','5224','5225','5226',
  '5227','5228','5230','5231','5237','5238','5239','5240','5241',
  '5242','5243','5244','5245','5246','5248','5250','5252','5253',
  '5255','5256','5257','5258','5259','5261','5262','5265','5267',
  '5269','5271','5273','5285','5286','5288',
  '5305','5310','5311','5332','5334','5340','5363','5364','5369',
  '8406','8415','8421','8424','8425','8426','8464','8471','8494'
]);

// ── Chat (usuário) ─────────────────────────────────────────────

const _chatIntervals = new Map();

function _limparChats() {
  _chatIntervals.forEach(iv => clearInterval(iv));
  _chatIntervals.clear();
}

function _renderMsgChat(m) {
  const mine = m.autor_tipo === 'usuario';
  return `<div class="chat-msg ${mine ? 'mine' : 'theirs'}">
    ${!mine ? `<div class="chat-msg-author">${m.autor_nome}</div>` : ''}
    <div class="chat-msg-bubble">${m.mensagem}</div>
    <div class="chat-msg-time">${fmtData(m.criado_em)}</div>
  </div>`;
}

async function _atualizarChat(chamadoId) {
  const box = document.getElementById('chat-msgs-' + chamadoId);
  if (!box) return;
  const atFundo = box.scrollTop + box.clientHeight >= box.scrollHeight - 6;
  const anterior = +(box.dataset.cnt || 0);
  try {
    const r = await apiFetch('/api/chamados/' + chamadoId + '/mensagens');
    if (!r.ok) return;
    const msgs = await r.json();
    box.dataset.cnt = msgs.length;
    if (!msgs.length) {
      if (!box.querySelector('.chat-msg'))
        box.innerHTML = '<div class="chat-vazio">Nenhuma mensagem ainda. Escreva para o suporte!</div>';
      return;
    }
    box.innerHTML = msgs.map(_renderMsgChat).join('');
    if (atFundo || anterior < msgs.length) box.scrollTop = box.scrollHeight;
  } catch {}
}

function _iniciarChat(chamadoId) {
  _atualizarChat(chamadoId);
  _chatIntervals.set(chamadoId, setInterval(() => _atualizarChat(chamadoId), 12000));

  const form = document.getElementById('chat-form-' + chamadoId);
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input-' + chamadoId);
    const texto = input.value.trim();
    if (!texto) return;
    const btn = form.querySelector('button');
    btn.disabled = true;
    try {
      const r = await apiFetch('/api/chamados/' + chamadoId + '/mensagens', {
        method: 'POST',
        body: JSON.stringify({ mensagem: texto }),
      });
      if (r.ok) { input.value = ''; await _atualizarChat(chamadoId); }
    } catch {}
    finally { btn.disabled = false; input.focus(); }
  });
}

function fmtData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function badgeStatus(s) {
  return `<span class="badge badge-${s}">${STATUS_LABELS[s] || s}</span>`;
}

async function apiFetch(url, opts = {}) {
  return fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
}

(async () => {
  const r = await apiFetch('/api/usuarios/me');
  if (r.ok) {
    const usuario = await r.json();
    renderPainel(usuario);
  } else {
    renderAuth();
  }
})();

function renderAuth() {
  _limparChats();
  const header = document.querySelector('header');
  if (header) header.style.display = 'none';
  document.body.classList.add('auth-mode');

  app.innerHTML = `
    <div class="auth-page">

      <div class="auth-brand">
        <div class="auth-brand-monogram">GM</div>
        <div class="auth-brand-name">Gran Marquise</div>
        <div class="auth-brand-sub">Portal de Chamados de TI</div>
        <p class="auth-brand-desc">Registre e acompanhe suas solicitações ao setor de<br>Tecnologia da Informação do Hotel Gran Marquise.</p>
      </div>

      <div class="auth-card">
        <div class="auth-card-title">Entrar no portal</div>
        <div class="auth-card-sub">Utilize seu e-mail e senha para acessar</div>
        <div id="msg-auth"></div>
        <form id="form-login">
          <div class="form-group">
            <label for="login-email">E-mail</label>
            <input class="form-control" type="email" id="login-email" placeholder="seu@email.com" autocomplete="email" required>
          </div>
          <div class="form-group">
            <label for="login-senha">Senha</label>
            <input class="form-control" type="password" id="login-senha" autocomplete="current-password" required placeholder="••••••••">
          </div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top:.5rem">Entrar</button>
        </form>
      </div>

    </div>
  `;

  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('msg-auth');
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Entrando...';
    try {
      const r = await apiFetch('/api/usuarios/login', {
        method: 'POST',
        body: JSON.stringify({ email: document.getElementById('login-email').value, senha: document.getElementById('login-senha').value }),
      });
      const d = await r.json();
      if (!r.ok) { msg.innerHTML = `<div class="alert alert-danger">${d.erro}</div>`; return; }
      const u = await (await apiFetch('/api/usuarios/me')).json();
      renderPainel(u);
    } catch { msg.innerHTML = '<div class="alert alert-danger">Erro de conexão.</div>'; }
    finally { btn.disabled = false; btn.textContent = 'Entrar'; }
  });
}

function renderPainel(usuario) {
  const header = document.querySelector('header');
  if (header) {
    header.style.display = '';
    const nav = header.querySelector('nav');
    if (nav) nav.innerHTML = `
      <span style="font-size:.82rem;color:var(--text-muted);margin-right:.25rem">${usuario.nome}</span>
      <button id="btn-logout-usuario" class="btn btn-ghost btn-sm" style="margin-left:.25rem">Sair</button>
    `;
  }
  document.body.classList.remove('auth-mode');
  app.innerHTML = `
    <div id="msg-global"></div>

    <div class="page-header">
      <div>
        <div class="page-title">Meus Chamados</div>
        <div class="page-subtitle">Acompanhe suas solicitações de TI — ${usuario.email}</div>
      </div>
      <button class="btn btn-primary btn-sm" id="btn-novo-chamado">+ Abrir chamado</button>
    </div>

    <div class="stats-strip" id="stats-strip-u">
      <div class="stat-pill">
        <div class="stat-dot dot-aberto">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-num" id="cnt-u-aberto">—</div>
          <div class="stat-label">Abertos</div>
        </div>
      </div>
      <div class="stat-pill">
        <div class="stat-dot dot-andamento">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-num" id="cnt-u-andamento">—</div>
          <div class="stat-label">Em andamento</div>
        </div>
      </div>
      <div class="stat-pill">
        <div class="stat-dot dot-concluido">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-num" id="cnt-u-concluido">—</div>
          <div class="stat-label">Concluídos</div>
        </div>
      </div>
      <div class="stat-pill">
        <div class="stat-dot dot-encerrado">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-num" id="cnt-u-encerrado">—</div>
          <div class="stat-label">Encerrados</div>
        </div>
      </div>
    </div>

    <div id="area-form-chamado" style="display:none"></div>

    <div class="tabs-bar">
      <button class="tab-btn ativo" id="tab-abertos">Em Aberto <span class="tab-badge" id="badge-abertos-u"></span></button>
      <button class="tab-btn" id="tab-encerrados">Encerrados <span class="tab-badge" id="badge-encerrados-u"></span></button>
    </div>

    <div id="lista-usuario"><div class="loading"><div class="spinner"></div></div></div>
  `;

  let abaAtiva = 'abertos';
  let todosChamados = [];

  document.getElementById('btn-logout-usuario').addEventListener('click', async () => {
    await apiFetch('/api/usuarios/logout', { method: 'POST' });
    renderAuth();
  });

  document.getElementById('btn-novo-chamado').addEventListener('click', () => {
    const area = document.getElementById('area-form-chamado');
    if (area.style.display === 'none') {
      renderFormChamado(usuario, area, () => { area.style.display = 'none'; carregarChamados(); });
      area.style.display = 'block';
    } else {
      area.style.display = 'none';
    }
  });

  document.getElementById('tab-abertos').addEventListener('click', () => {
    abaAtiva = 'abertos';
    document.getElementById('tab-abertos').classList.add('ativo');
    document.getElementById('tab-encerrados').classList.remove('ativo');
    renderListaChamados(todosChamados, abaAtiva);
  });

  document.getElementById('tab-encerrados').addEventListener('click', () => {
    abaAtiva = 'encerrados';
    document.getElementById('tab-encerrados').classList.add('ativo');
    document.getElementById('tab-abertos').classList.remove('ativo');
    renderListaChamados(todosChamados, abaAtiva);
  });

  async function carregarChamados() {
    const lista = document.getElementById('lista-usuario');
    lista.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
      const r = await apiFetch('/api/usuarios/meus-chamados');
      if (r.status === 401) { renderAuth(); return; }
      todosChamados = await r.json();

      const qtd = { aberto: 0, em_andamento: 0, concluido: 0, encerrado: 0 };
      todosChamados.forEach(c => { if (qtd[c.status] !== undefined) qtd[c.status]++; });

      const el = id => document.getElementById(id);
      if (el('cnt-u-aberto'))    el('cnt-u-aberto').textContent    = qtd.aberto;
      if (el('cnt-u-andamento')) el('cnt-u-andamento').textContent = qtd.em_andamento;
      if (el('cnt-u-concluido')) el('cnt-u-concluido').textContent = qtd.concluido;
      if (el('cnt-u-encerrado')) el('cnt-u-encerrado').textContent = qtd.encerrado;

      const abertos = qtd.aberto + qtd.em_andamento;
      const encerrados = qtd.concluido + qtd.encerrado;
      el('badge-abertos-u').textContent = abertos || '';
      el('badge-encerrados-u').textContent = encerrados || '';

      renderListaChamados(todosChamados, abaAtiva);
    } catch {
      lista.innerHTML = '<div class="alert alert-danger">Erro ao carregar chamados.</div>';
    }
  }

  carregarChamados();

  const PRIO_ORDEM = { urgente: 0, alta: 1, media: 2, baixa: 3 };

  function renderListaChamados(todos, aba) {
    _limparChats();
    const lista = document.getElementById('lista-usuario');
    const filtrados = (aba === 'abertos'
      ? todos.filter(c => ['aberto', 'em_andamento'].includes(c.status))
      : todos.filter(c => ['concluido', 'encerrado'].includes(c.status)))
      .sort((a, b) => (PRIO_ORDEM[a.prioridade] ?? 4) - (PRIO_ORDEM[b.prioridade] ?? 4));

    if (!filtrados.length) {
      const msg = aba === 'abertos' ? 'Nenhum chamado em aberto.' : 'Nenhum chamado encerrado ainda.';
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

    lista.innerHTML = filtrados.map(c => renderCardChamado(c)).join('');

    filtrados.filter(c => c.status === 'concluido' && c.nota === null).forEach(c => {
      const form = document.getElementById(`form-avaliacao-${c.id}`);
      if (!form) return;
      const stars = form.querySelectorAll('.star-btn');
      const notaInput = form.querySelector('.nota-valor');
      stars.forEach(btn => {
        btn.addEventListener('click', () => {
          notaInput.value = btn.dataset.nota;
          stars.forEach(b => b.classList.toggle('ativo', parseInt(b.dataset.nota) <= parseInt(btn.dataset.nota)));
        });
      });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById(`msg-av-${c.id}`);
        const nota = notaInput.value;
        if (!nota) { msg.innerHTML = '<div class="alert alert-danger">Selecione uma nota.</div>'; return; }
        const btn = form.querySelector('button[type=submit]');
        btn.disabled = true; btn.textContent = 'Enviando...';
        try {
          const r = await apiFetch(`/api/chamados/${c.id}/avaliar`, {
            method: 'POST',
            body: JSON.stringify({ nota: parseInt(nota), comentario_avaliacao: form.querySelector('.comentario-av').value }),
          });
          const d = await r.json();
          if (!r.ok) { msg.innerHTML = `<div class="alert alert-danger">${d.erro}</div>`; return; }
          await carregarChamados();
        } catch { msg.innerHTML = '<div class="alert alert-danger">Erro ao enviar.</div>'; }
        finally { btn.disabled = false; btn.textContent = 'Enviar avaliação'; }
      });
    });

    filtrados.filter(c => ['aberto', 'em_andamento'].includes(c.status)).forEach(c => {
      _iniciarChat(c.id);
    });
  }
}

function renderCardChamado(c) {
  const encerrado = ['concluido', 'encerrado'].includes(c.status);

  const avaliacaoHtml = () => {
    if (c.status !== 'concluido') return '';
    if (c.nota !== null) {
      return `<div class="alert alert-success" style="margin-top:.75rem;margin-bottom:0;font-size:.85rem">
        <strong>Sua avaliação:</strong> ${c.nota}/10${c.comentario_avaliacao ? ` — <em>${c.comentario_avaliacao}</em>` : ''}
      </div>`;
    }
    return `
      <div class="avaliacao-box">
        <p style="font-size:.82rem;font-weight:600;margin-bottom:.5rem;color:var(--text)">Avalie o atendimento:</p>
        <div id="msg-av-${c.id}"></div>
        <form id="form-avaliacao-${c.id}">
          <div class="stars" style="margin-bottom:.5rem">
            ${Array.from({length:10},(_,i)=>`<button type="button" class="star-btn" data-nota="${i+1}">${i+1}</button>`).join('')}
          </div>
          <input type="hidden" class="nota-valor" value="">
          <textarea class="form-control comentario-av" maxlength="500" placeholder="Comentário (opcional)" style="margin-bottom:.5rem;min-height:60px"></textarea>
          <button type="submit" class="btn btn-primary btn-sm">Enviar avaliação</button>
        </form>
      </div>
    `;
  };

  const chatHtml = !encerrado ? `
    <div class="chat-wrap">
      <div class="chat-header">Conversa com o Suporte</div>
      <div class="chat-messages" id="chat-msgs-${c.id}" data-cnt="0">
        <div class="chat-vazio">Carregando...</div>
      </div>
      <form class="chat-input-row" id="chat-form-${c.id}">
        <input type="text" class="chat-input" id="chat-input-${c.id}" placeholder="Escreva uma mensagem para o suporte..." maxlength="1000" autocomplete="off">
        <button type="submit" class="btn btn-primary btn-sm">Enviar</button>
      </form>
    </div>
  ` : '';

  return `
    <div class="chamado-card-usuario${encerrado ? ' encerrado' : ''}">
      <div class="chamado-card-header">
        <div class="flex gap-1 flex-wrap" style="align-items:center">
          ${badgeStatus(c.status)}
          ${c.prioridade ? `<span class="badge badge-${c.prioridade}">${c.prioridade.charAt(0).toUpperCase()+c.prioridade.slice(1)}</span>` : ''}
        </div>
        <span class="text-muted" style="font-size:.76rem">${fmtData(c.criado_em)}</span>
      </div>
      <div class="chamado-card-setor">${c.setor} <span style="color:var(--text-muted);font-family:Inter,sans-serif;font-size:.8rem;font-weight:400">· Ramal ${c.ramal}</span></div>
      <div class="chamado-card-desc">${c.descricao}</div>
      ${c.admin_nome ? `<div style="font-size:.75rem;color:var(--gold-dark);font-weight:600;margin-top:.4rem;letter-spacing:.02em">Responsável: <span style="color:var(--text-secondary);font-weight:400">${c.admin_nome}</span></div>` : ''}
      ${c.prazo ? `<div style="font-size:.74rem;color:var(--text-muted);margin-top:.2rem">Prazo: ${fmtData(c.prazo)}</div>` : ''}
      ${c.solucao ? `<div class="solucao-box"><strong>Solução:</strong> ${c.solucao}</div>` : ''}
      ${avaliacaoHtml()}
      ${chatHtml}
    </div>
  `;
}

function renderFormChamado(usuario, container, onSuccess) {
  container.innerHTML = `
    <div class="card" style="margin-top:1rem;border-top:2px solid var(--gold);border-left:none">
      <div class="card-header" style="border-bottom-color:rgba(197,165,90,.18)">
        <div class="card-title" style="font-family:'Cormorant Garamond',Georgia,serif;font-size:1.05rem;letter-spacing:.01em">Novo Chamado</div>
      </div>
      <div id="msg-form-chamado"></div>
      <form id="form-chamado-usuario" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label for="ch-setor">Setor <span class="req">*</span></label>
            <select class="form-control" id="ch-setor" required>
              <option value="">Selecione seu setor...</option>
              <optgroup label="Hospedagem">
                <option>Recepção</option>
                <option>Concierge</option>
                <option>Governança</option>
                <option>Reservas</option>
                <option>Mensageria / Portaria</option>
              </optgroup>
              <optgroup label="Alimentos &amp; Bebidas">
                <option>Restaurante Mucuripe</option>
                <option>Restaurante Mangostin</option>
                <option>Bar Rooftop</option>
                <option>Lobby Bar</option>
                <option>Room Service</option>
                <option>Cozinha</option>
                <option>Confeitaria / Padaria</option>
                <option>Nutrição</option>
                <option>Banquetes</option>
              </optgroup>
              <optgroup label="Eventos">
                <option>Eventos e Convenções</option>
              </optgroup>
              <optgroup label="Bem-estar &amp; Lazer">
                <option>Spa by L'Occitane</option>
                <option>Fitness Center</option>
                <option>Piscina</option>
                <option>Play Gran</option>
              </optgroup>
              <optgroup label="Administrativo">
                <option>Gerência Geral</option>
                <option>Recursos Humanos</option>
                <option>Financeiro</option>
                <option>Controladoria</option>
                <option>Compras / Almoxarifado</option>
                <option>Comercial / Vendas</option>
                <option>Marketing</option>
                <option>Revenue Management</option>
                <option>Tecnologia da Informação</option>
                <option>Jurídico</option>
              </optgroup>
              <optgroup label="Operacional">
                <option>Manutenção</option>
                <option>Segurança</option>
                <option>Lavanderia</option>
                <option>Rouparia</option>
                <option>Estacionamento</option>
                <option>Transportes</option>
              </optgroup>
            </select>
          </div>
          <div class="form-group">
            <label for="ch-ramal">Ramal <span class="req">*</span></label>
            <input class="form-control" type="text" id="ch-ramal" required pattern="\\d{4}" minlength="4" maxlength="4" placeholder="0000" inputmode="numeric">
            <p class="form-hint">4 dígitos — apenas ramais cadastrados são aceitos</p>
          </div>
        </div>
        <div class="form-group">
          <label for="ch-descricao">Descrição do problema <span class="req">*</span></label>
          <textarea class="form-control" id="ch-descricao" required minlength="10" maxlength="2000" placeholder="Descreva o problema com detalhes..."></textarea>
        </div>
        <div class="form-group">
          <label for="ch-anexo">Anexo (opcional)</label>
          <input class="form-control" type="file" id="ch-anexo" name="anexo" accept=".jpg,.jpeg,.png,.pdf,.txt,.log,.docx">
          <p class="form-hint">jpg, png, pdf, txt, log, docx — máx. 10 MB</p>
        </div>
        <div style="display:flex;gap:.5rem">
          <button type="submit" class="btn btn-primary" id="btn-enviar-chamado">Enviar Chamado</button>
          <button type="button" class="btn btn-secondary" id="btn-cancelar-chamado">Cancelar</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('btn-cancelar-chamado').addEventListener('click', onSuccess);

  document.getElementById('form-chamado-usuario').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('msg-form-chamado');
    const btn = document.getElementById('btn-enviar-chamado');
    const setor = document.getElementById('ch-setor').value;
    if (!setor) {
      msg.innerHTML = '<div class="alert alert-danger">Selecione o seu setor.</div>';
      document.getElementById('ch-setor').focus();
      return;
    }
    const ramal = document.getElementById('ch-ramal').value.trim();
    if (!/^\d{4}$/.test(ramal)) {
      msg.innerHTML = '<div class="alert alert-danger">Ramal deve ter exatamente 4 dígitos.</div>';
      document.getElementById('ch-ramal').focus();
      return;
    }
    if (!RAMAIS_VALIDOS.has(ramal)) {
      msg.innerHTML = '<div class="alert alert-danger">Ramal <strong>' + ramal + '</strong> não existe. Verifique o número e tente novamente.</div>';
      document.getElementById('ch-ramal').focus();
      return;
    }
    const descricao = document.getElementById('ch-descricao').value.trim();
    if (descricao.length < 10) {
      msg.innerHTML = '<div class="alert alert-danger">Por favor, descreva melhor o problema. A descrição precisa ter ao menos 10 caracteres para que o suporte entenda o que está acontecendo.</div>';
      document.getElementById('ch-descricao').focus();
      return;
    }
    btn.disabled = true; btn.textContent = 'Enviando...';
    try {
      const fd = new FormData();
      fd.append('nome', usuario.nome);
      fd.append('setor', document.getElementById('ch-setor').value);
      fd.append('ramal', ramal);
      fd.append('descricao', document.getElementById('ch-descricao').value);
      const anexo = document.getElementById('ch-anexo').files[0];
      if (anexo) fd.append('anexo', anexo);

      const r = await fetch('/api/chamados', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) { msg.innerHTML = `<div class="alert alert-danger">${d.erro}</div>`; return; }
      onSuccess();
    } catch { msg.innerHTML = '<div class="alert alert-danger">Erro de conexão.</div>'; }
    finally { btn.disabled = false; btn.textContent = 'Enviar Chamado'; }
  });
}
