const app = document.getElementById('app');

const STATUS_LABELS = { aberto: 'Aberto', em_andamento: 'Em andamento', concluido: 'Concluído', encerrado: 'Encerrado' };

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

function renderAuth(abaInicial = 'login') {
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
        <div class="tabs-bar" style="margin-bottom:1.75rem">
          <button class="tab-btn ${abaInicial === 'login' ? 'ativo' : ''}" id="tab-login">Entrar</button>
          <button class="tab-btn ${abaInicial === 'cadastro' ? 'ativo' : ''}" id="tab-cadastro">Criar conta</button>
        </div>

        <div id="msg-auth"></div>

        <form id="form-login" style="display:${abaInicial === 'login' ? 'block' : 'none'}">
          <div class="form-group">
            <label for="login-email">E-mail</label>
            <input class="form-control" type="email" id="login-email" placeholder="seu@email.com" autocomplete="email" required>
          </div>
          <div class="form-group">
            <label for="login-senha">Senha</label>
            <input class="form-control" type="password" id="login-senha" autocomplete="current-password" required placeholder="••••••••">
          </div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top:.5rem">Entrar</button>
          <p style="text-align:center;margin-top:1rem;font-size:.78rem;color:var(--text-muted)">
            Não tem conta? <button type="button" id="ir-cadastro" style="background:none;border:none;color:var(--gold-dark);cursor:pointer;font-weight:600;font-size:.78rem">Criar conta</button>
          </p>
        </form>

        <form id="form-cadastro" style="display:${abaInicial === 'cadastro' ? 'block' : 'none'}">
          <div class="form-group">
            <label for="cad-nome">Nome completo <span class="req">*</span></label>
            <input class="form-control" type="text" id="cad-nome" placeholder="Seu nome completo" minlength="2" maxlength="80" required>
          </div>
          <div class="form-group">
            <label for="cad-email">E-mail <span class="req">*</span></label>
            <input class="form-control" type="email" id="cad-email" placeholder="seu@email.com" autocomplete="email" required>
          </div>
          <div class="form-group">
            <label for="cad-senha">Senha <span class="req">*</span></label>
            <input class="form-control" type="password" id="cad-senha" minlength="6" placeholder="Mínimo 6 caracteres" autocomplete="new-password" required>
          </div>
          <button type="submit" class="btn btn-primary btn-full" style="margin-top:.5rem">Criar conta</button>
          <p style="text-align:center;margin-top:1rem;font-size:.78rem;color:var(--text-muted)">
            Já tem conta? <button type="button" id="ir-login" style="background:none;border:none;color:var(--gold-dark);cursor:pointer;font-weight:600;font-size:.78rem">Entrar</button>
          </p>
        </form>
      </div>

    </div>
  `;

  function mostrarLogin() {
    document.getElementById('tab-login').classList.add('ativo');
    document.getElementById('tab-cadastro').classList.remove('ativo');
    document.getElementById('form-login').style.display = 'block';
    document.getElementById('form-cadastro').style.display = 'none';
    document.getElementById('msg-auth').innerHTML = '';
  }
  function mostrarCadastro() {
    document.getElementById('tab-cadastro').classList.add('ativo');
    document.getElementById('tab-login').classList.remove('ativo');
    document.getElementById('form-cadastro').style.display = 'block';
    document.getElementById('form-login').style.display = 'none';
    document.getElementById('msg-auth').innerHTML = '';
  }

  document.getElementById('tab-login').addEventListener('click', mostrarLogin);
  document.getElementById('tab-cadastro').addEventListener('click', mostrarCadastro);
  document.getElementById('ir-cadastro') && document.getElementById('ir-cadastro').addEventListener('click', mostrarCadastro);
  document.getElementById('ir-login') && document.getElementById('ir-login').addEventListener('click', mostrarLogin);

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

  document.getElementById('form-cadastro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('msg-auth');
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Criando conta...';
    try {
      const r = await apiFetch('/api/usuarios/registro', {
        method: 'POST',
        body: JSON.stringify({
          nome: document.getElementById('cad-nome').value,
          email: document.getElementById('cad-email').value,
          senha: document.getElementById('cad-senha').value,
        }),
      });
      const d = await r.json();
      if (!r.ok) { msg.innerHTML = `<div class="alert alert-danger">${d.erro}</div>`; return; }
      const u = await (await apiFetch('/api/usuarios/me')).json();
      renderPainel(u);
    } catch { msg.innerHTML = '<div class="alert alert-danger">Erro de conexão.</div>'; }
    finally { btn.disabled = false; btn.textContent = 'Criar conta'; }
  });
}

function renderPainel(usuario) {
  const header = document.querySelector('header');
  if (header) header.style.display = '';
  document.body.classList.remove('auth-mode');
  app.innerHTML = `
    <div class="painel-usuario">
      <div class="painel-header">
        <div>
          <div class="painel-saudacao">Bem-vindo ao Portal de TI</div>
          <div class="painel-nome">${usuario.nome}</div>
          <div class="painel-email">${usuario.email}</div>
        </div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
          <button class="btn btn-primary btn-sm" id="btn-novo-chamado">Abrir chamado</button>
          <button class="btn btn-ghost btn-sm" id="btn-logout-usuario">Sair</button>
        </div>
      </div>

      <div id="area-form-chamado" style="display:none"></div>

      <div class="tabs-bar">
        <button class="tab-btn ativo" id="tab-abertos">Em Aberto <span class="tab-badge" id="badge-abertos-u"></span></button>
        <button class="tab-btn" id="tab-encerrados">Encerrados <span class="tab-badge" id="badge-encerrados-u"></span></button>
      </div>

      <div class="filtros-card">
        <div id="msg-painel"></div>
        <div id="lista-usuario"><div class="loading"><div class="spinner"></div></div></div>
      </div>
    </div>
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

      const abertos = todosChamados.filter(c => ['aberto', 'em_andamento'].includes(c.status));
      const encerrados = todosChamados.filter(c => ['concluido', 'encerrado'].includes(c.status));
      document.getElementById('badge-abertos-u').textContent = abertos.length || '';
      document.getElementById('badge-encerrados-u').textContent = encerrados.length || '';

      renderListaChamados(todosChamados, abaAtiva);
    } catch {
      lista.innerHTML = '<div class="alert alert-danger">Erro ao carregar chamados.</div>';
    }
  }

  carregarChamados();

  function renderListaChamados(todos, aba) {
    const lista = document.getElementById('lista-usuario');
    const filtrados = aba === 'abertos'
      ? todos.filter(c => ['aberto', 'em_andamento'].includes(c.status))
      : todos.filter(c => ['concluido', 'encerrado'].includes(c.status));

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
            <input class="form-control" type="text" id="ch-setor" required minlength="2" maxlength="60" placeholder="Ex: Recepção, Restaurante...">
          </div>
          <div class="form-group">
            <label for="ch-ramal">Ramal <span class="req">*</span></label>
            <input class="form-control" type="text" id="ch-ramal" required pattern="\\d{4}" minlength="4" maxlength="4" placeholder="0000" inputmode="numeric">
            <p class="form-hint">Exatamente 4 dígitos</p>
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
    const ramal = document.getElementById('ch-ramal').value.trim();
    if (!/^\d{4}$/.test(ramal)) {
      msg.innerHTML = '<div class="alert alert-danger">Ramal deve ter exatamente 4 dígitos.</div>';
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
