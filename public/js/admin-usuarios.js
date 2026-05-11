let meAdmin = null;
let editandoAdminId = null;
let abaAdmins = 'ativos';
let abaUsuarios = 'ativos';
let todosAdmins = [];
let todosUsuarios = [];

const DOMINIO_EMAIL = '@granmarquise.com.br';


function toggleSenha(el) {
  if (el.dataset.shown === '1') {
    el.textContent = '••••••••';
    el.dataset.shown = '0';
  } else {
    el.textContent = el.dataset.senha || '—';
    el.dataset.shown = '1';
  }
}

function senhaCell(senhaPlain) {
  if (!meAdmin || !meAdmin.is_master) return '';
  const safe = (senhaPlain || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;');
  const display = senhaPlain ? '••••••••' : '—';
  return `<td style="text-align:center"><span data-senha="${safe}" data-shown="0" style="font-family:monospace;font-size:.82rem;cursor:pointer;user-select:all" title="Clique para revelar" onclick="toggleSenha(this)">${display}</span></td>`;
}

function verificarSenha(senha) {
  return {
    len:     senha.length >= 8,
    upper:   /[A-Z]/.test(senha),
    lower:   /[a-z]/.test(senha),
    digit:   /[0-9]/.test(senha),
    special: /[^A-Za-z0-9]/.test(senha),
  };
}

function senhaForte(senha) {
  const r = verificarSenha(senha);
  return Object.values(r).every(Boolean);
}

function atualizarForca(senhaId, forcaId, barraId, reqsId) {
  const senha = document.getElementById(senhaId).value;
  const forca = document.getElementById(forcaId);
  if (!senha) { forca.classList.remove('visivel'); return; }
  forca.classList.add('visivel');

  const r = verificarSenha(senha);
  const score = Object.values(r).filter(Boolean).length;
  const cores = ['#e53935', '#e53935', '#fb8c00', '#fdd835', '#7cb342', '#43a047'];

  const barra = document.getElementById(barraId);
  barra.style.width = `${score * 20}%`;
  barra.style.background = cores[score];

  const reqs = document.getElementById(reqsId);
  reqs.querySelector('[data-req="len"]').classList.toggle('ok', r.len);
  reqs.querySelector('[data-req="upper"]').classList.toggle('ok', r.upper);
  reqs.querySelector('[data-req="lower"]').classList.toggle('ok', r.lower);
  reqs.querySelector('[data-req="digit"]').classList.toggle('ok', r.digit);
  reqs.querySelector('[data-req="special"]').classList.toggle('ok', r.special);
}

function atualizarEmailDica(emailId, dicaId) {
  const email = document.getElementById(emailId).value.trim().toLowerCase();
  const dica = document.getElementById(dicaId);
  if (!email) {
    dica.className = 'email-dominio-dica';
    dica.textContent = `Use apenas ${DOMINIO_EMAIL}`;
    return;
  }
  if (email.endsWith(DOMINIO_EMAIL)) {
    dica.className = 'email-dominio-dica valido';
    dica.textContent = '✓ Domínio correto';
  } else {
    dica.className = 'email-dominio-dica invalido';
    dica.textContent = `✗ Use apenas ${DOMINIO_EMAIL}`;
  }
}

function resetarForca(forcaId, barraId, reqsId) {
  const forca = document.getElementById(forcaId);
  forca.classList.remove('visivel');
  document.getElementById(barraId).style.width = '0';
  document.getElementById(reqsId).querySelectorAll('li').forEach(li => li.classList.remove('ok'));
}

function resetarEmailDica(dicaId) {
  const dica = document.getElementById(dicaId);
  dica.className = 'email-dominio-dica';
  dica.textContent = `Use apenas ${DOMINIO_EMAIL}`;
}

document.getElementById('f-senha').addEventListener('input', () =>
  atualizarForca('f-senha', 'forca-admin', 'barra-admin', 'reqs-admin'));


document.getElementById('btn-eye-f-senha').addEventListener('click', () => {
  const input = document.getElementById('f-senha');
  const icon  = document.getElementById('icon-eye-f');
  const oculto = input.type === 'password';
  input.type = oculto ? 'text' : 'password';
  icon.innerHTML = oculto
    ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
});
document.getElementById('f-email').addEventListener('input', () =>
  atualizarEmailDica('f-email', 'dica-email-admin'));
document.getElementById('fu-senha').addEventListener('input', () =>
  atualizarForca('fu-senha', 'forca-usuario', 'barra-usuario', 'reqs-usuario'));
document.getElementById('fu-email').addEventListener('input', () =>
  atualizarEmailDica('fu-email', 'dica-email-usuario'));

document.getElementById('btn-eye-fu-senha').addEventListener('click', () => {
  const input = document.getElementById('fu-senha');
  const icon  = document.getElementById('icon-eye-fu');
  const oculto = input.type === 'password';
  input.type = oculto ? 'text' : 'password';
  icon.innerHTML = oculto
    ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
});

async function api(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (res.status === 401) { location.replace('/admin-login.html'); throw new Error('401'); }
  return res;
}

function msgGlobal(html, dur = 3500) {
  const el = document.getElementById('msg-global');
  el.innerHTML = html;
  setTimeout(() => { el.innerHTML = ''; }, dur);
}


let _confirmarResolve = null;

function confirmar(titulo, msg, btnLabel = 'Confirmar') {
  return new Promise(resolve => {
    _confirmarResolve = resolve;
    document.getElementById('confirmar-title').textContent = titulo;
    document.getElementById('confirmar-msg').textContent = msg;
    document.getElementById('btn-ok-confirmar').textContent = btnLabel;
    document.getElementById('modal-confirmar-overlay').classList.add('open');
  });
}

function fecharModalConfirmar(resultado) {
  document.getElementById('modal-confirmar-overlay').classList.remove('open');
  if (_confirmarResolve) { _confirmarResolve(resultado); _confirmarResolve = null; }
}

document.getElementById('btn-fechar-confirmar').addEventListener('click', () => fecharModalConfirmar(false));
document.getElementById('btn-cancelar-confirmar').addEventListener('click', () => fecharModalConfirmar(false));
document.getElementById('btn-ok-confirmar').addEventListener('click', () => fecharModalConfirmar(true));
document.getElementById('modal-confirmar-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) fecharModalConfirmar(false);
});

(async () => {
  const r = await api('/api/admin/me');
  if (!r.ok) { location.replace('/admin-login.html'); return; }
  meAdmin = await r.json();

  if (!meAdmin.is_master) {
    document.getElementById('tab-admins').style.display = 'none';
    document.getElementById('section-admins').style.display = 'none';
    document.getElementById('tab-usuarios').classList.add('ativo');
    document.getElementById('section-usuarios').style.display = '';
    await carregarUsuarios();
  } else {
    await Promise.all([carregarAdmins(), carregarUsuarios()]);
  }
})();

document.getElementById('btn-logout').addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST' });
  location.replace('/admin-login.html');
});


document.getElementById('tab-admins').addEventListener('click', () => {
  document.getElementById('tab-admins').classList.add('ativo');
  document.getElementById('tab-usuarios').classList.remove('ativo');
  document.getElementById('section-admins').style.display = '';
  document.getElementById('section-usuarios').style.display = 'none';
});

document.getElementById('tab-usuarios').addEventListener('click', () => {
  document.getElementById('tab-usuarios').classList.add('ativo');
  document.getElementById('tab-admins').classList.remove('ativo');
  document.getElementById('section-usuarios').style.display = '';
  document.getElementById('section-admins').style.display = 'none';
});


document.getElementById('sub-admins-ativos').addEventListener('click', () => {
  abaAdmins = 'ativos';
  document.getElementById('sub-admins-ativos').classList.add('ativo');
  document.getElementById('sub-admins-inativos').classList.remove('ativo');
  renderAdmins();
});

document.getElementById('sub-admins-inativos').addEventListener('click', () => {
  abaAdmins = 'inativos';
  document.getElementById('sub-admins-inativos').classList.add('ativo');
  document.getElementById('sub-admins-ativos').classList.remove('ativo');
  renderAdmins();
});


document.getElementById('sub-usuarios-ativos').addEventListener('click', () => {
  abaUsuarios = 'ativos';
  document.getElementById('sub-usuarios-ativos').classList.add('ativo');
  document.getElementById('sub-usuarios-inativos').classList.remove('ativo');
  renderUsuarios();
});

document.getElementById('sub-usuarios-inativos').addEventListener('click', () => {
  abaUsuarios = 'inativos';
  document.getElementById('sub-usuarios-inativos').classList.add('ativo');
  document.getElementById('sub-usuarios-ativos').classList.remove('ativo');
  renderUsuarios();
});

// ══════════════════════════════════════════════════════════════
//  ADMINISTRADORES
// ══════════════════════════════════════════════════════════════

document.getElementById('btn-novo-admin').addEventListener('click', () => {
  if (!meAdmin || !meAdmin.is_master) return;
  abrirModalAdmin(null);
});
document.getElementById('btn-fechar-admin').addEventListener('click', fecharModalAdmin);
document.getElementById('btn-cancelar-admin').addEventListener('click', fecharModalAdmin);
// Modal NÃO fecha ao clicar fora — só pelo X ou Cancelar (evita perda de dados ao arrastar mouse)

document.getElementById('form-admin').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg-modal-admin');
  const btn = document.getElementById('btn-salvar-admin');
  const txtOriginal = btn.textContent;
  msg.innerHTML = '';
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  const senhaInput = document.getElementById('f-senha');
  const senha = senhaInput.value;
  const senhaOriginal = senhaInput.dataset.original || '';
  const senhaMudou = senha !== senhaOriginal;

  const body = {
    nome_completo: document.getElementById('f-nome').value.trim(),
    email: document.getElementById('f-email').value.trim().toLowerCase(),
    is_master: document.getElementById('f-master').checked,
  };

  if (!body.email.endsWith(DOMINIO_EMAIL)) {
    msg.innerHTML = `<div class="alert alert-danger">E-mail deve terminar com ${DOMINIO_EMAIL}</div>`;
    btn.disabled = false; btn.textContent = txtOriginal; return;
  }
  if (!editandoAdminId && !senhaForte(senha)) {
    msg.innerHTML = '<div class="alert alert-danger">Senha fraca. Use ao menos 8 caracteres com maiúscula, minúscula, número e caractere especial.</div>';
    btn.disabled = false; btn.textContent = txtOriginal; return;
  }
  if (editandoAdminId && senhaMudou && senha && !senhaForte(senha)) {
    msg.innerHTML = '<div class="alert alert-danger">Senha fraca. Use ao menos 8 caracteres com maiúscula, minúscula, número e caractere especial.</div>';
    btn.disabled = false; btn.textContent = txtOriginal; return;
  }
  if (!editandoAdminId) body.senha = senha;
  else if (senhaMudou && senha) body.senha = senha;

  try {
    const idSalvoAdmin = editandoAdminId;
    let r;
    if (idSalvoAdmin) {
      r = await api(`/api/admin/usuarios/${idSalvoAdmin}`, { method: 'PATCH', body: JSON.stringify(body) });
    } else {
      r = await api('/api/admin/usuarios', { method: 'POST', body: JSON.stringify(body) });
    }
    const d = await r.json();
    if (!r.ok) { msg.innerHTML = `<div class="alert alert-danger">${d.erro}</div>`; return; }

    if (idSalvoAdmin) {
      const a = todosAdmins.find(x => x.id === idSalvoAdmin);
      if (a) {
        a.nome_completo = body.nome_completo;
        a.email = body.email;
        a.is_master = body.is_master ? 1 : 0;
        if (body.senha) a.senha_plain = body.senha;
      }
      renderAdmins();
      fecharModalAdmin();
      msgGlobal(`<div class="alert alert-success">${d.mensagem || 'Admin atualizado'}</div>`);
    } else {
      await carregarAdmins();
      fecharModalAdmin();
      msgGlobal(`<div class="alert alert-success">${d.mensagem}</div>`);
    }
  } catch (err) {
    if (err.message !== '401') msg.innerHTML = '<div class="alert alert-danger">Erro ao salvar.</div>';
  } finally {
    btn.disabled = false;
    btn.textContent = txtOriginal;
  }
});

async function carregarAdmins() {
  const lista = document.getElementById('lista-admins');
  try {
    const r = await api('/api/admin/usuarios');
    todosAdmins = await r.json();
    const ativos = todosAdmins.filter(a => a.ativo);
    const inativos = todosAdmins.filter(a => !a.ativo);
    document.getElementById('badge-admins-ativos').textContent = ativos.length || '';
    document.getElementById('badge-admins-inativos').textContent = inativos.length || '';
    document.getElementById('badge-tab-admins').textContent = todosAdmins.length || '';
    renderAdmins();
  } catch (err) {
    if (err.message !== '401') lista.innerHTML = '<div class="alert alert-danger">Erro ao carregar.</div>';
  }
}

function renderAdmins() {
  const lista = document.getElementById('lista-admins');
  const filtrados = todosAdmins.filter(a => abaAdmins === 'ativos' ? a.ativo : !a.ativo);

  if (!filtrados.length) {
    lista.innerHTML = `<div class="empty-state"><div class="empty-icon">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg></div>
      <p>Nenhum administrador ${abaAdmins === 'ativos' ? 'ativo' : 'inativo'}.</p>
    </div>`;
    return;
  }

  lista.innerHTML = `
    <div class="card" style="padding:0;overflow:hidden">
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th style="text-align:center">Usuário</th><th style="text-align:center">Nome</th><th style="text-align:center">E-mail</th><th style="text-align:center">Tipo</th>${meAdmin && meAdmin.is_master ? '<th style="text-align:center">Senha</th>' : ''}<th style="text-align:center">Criado em</th><th style="text-align:center">Ações</th>
          </tr></thead>
          <tbody>
            ${filtrados.map(a => `
              <tr>
                <td style="text-align:center"><code>${a.usuario}</code></td>
                <td style="text-align:center">${a.nome_completo}</td>
                <td style="text-align:center;font-size:.82rem">${a.email || '<span class="text-muted">—</span>'}</td>
                <td style="text-align:center">${a.is_master ? '<span class="badge badge-urgente">Master</span>' : '<span style="font-size:.78rem;color:var(--text-secondary)">Admin</span>'}</td>
                ${senhaCell(a.senha_plain)}
                <td style="text-align:center;font-size:.8rem">${new Date(a.criado_em.replace(' ','T')+'Z').toLocaleDateString('pt-BR',{timeZone:'America/Fortaleza'})}</td>
                <td style="text-align:center">
                  <div style="display:flex;gap:.4rem;flex-wrap:wrap;justify-content:center">
                    <button class="btn btn-secondary btn-sm" onclick="abrirModalAdmin(${a.id})">Editar</button>
                    ${a.id !== meAdmin.id ? `
                      <button class="btn btn-secondary btn-sm" onclick="toggleAdmin(${a.id}, ${a.ativo})">${a.ativo ? 'Desativar' : 'Reativar'}</button>
                    ` : '<span class="text-muted" style="font-size:.75rem;padding:.3rem .5rem">você</span>'}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

async function abrirModalAdmin(id) {
  editandoAdminId = id;
  document.getElementById('msg-modal-admin').innerHTML = '';
  document.getElementById('f-senha').value = '';
  document.getElementById('f-senha').type = 'password';
  document.getElementById('icon-eye-f').innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  document.getElementById('f-email').value = '';
  document.getElementById('f-master').checked = false;
  document.getElementById('f-master').disabled = false;
  document.getElementById('f-master').title = '';

  if (id) {
    document.getElementById('modal-admin-title').textContent = 'Editar administrador';
    document.getElementById('lbl-senha-dica').textContent = '(deixe em branco para não alterar)';
    const admin = todosAdmins.find(a => a.id === id);
    if (admin) {
      document.getElementById('f-nome').value = admin.nome_completo;
      document.getElementById('f-email').value = admin.email || '';
      document.getElementById('f-master').checked = !!admin.is_master;
      const eSiMesmo = id === meAdmin.id;
      document.getElementById('f-master').disabled = eSiMesmo;
      document.getElementById('f-master').title = eSiMesmo ? 'Você não pode remover seu próprio status de master' : '';
      const dicaF = document.getElementById('dica-senha-f');
      if (admin.senha_plain) {
        document.getElementById('f-senha').value = admin.senha_plain;
        document.getElementById('f-senha').dataset.original = admin.senha_plain;
        document.getElementById('f-senha').type = 'text';
        document.getElementById('icon-eye-f').innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
        dicaF.style.display = 'none';
      } else {
        document.getElementById('f-senha').value = '';
        document.getElementById('f-senha').dataset.original = '';
        document.getElementById('f-senha').type = 'password';
        document.getElementById('icon-eye-f').innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
        dicaF.style.display = '';
      }
    }
  } else {
    document.getElementById('modal-admin-title').textContent = 'Novo administrador';
    document.getElementById('f-nome').value = '';
    document.getElementById('f-email').value = DOMINIO_EMAIL;
    document.getElementById('lbl-senha-dica').textContent = '(mín. 6 caracteres)';
    document.getElementById('dica-senha-f').style.display = 'none';
  }

  resetarForca('forca-admin', 'barra-admin', 'reqs-admin');
  atualizarEmailDica('f-email', 'dica-email-admin');
  document.getElementById('modal-admin-overlay').classList.add('open');
  document.getElementById('f-nome').focus();
}

function fecharModalAdmin() {
  document.getElementById('modal-admin-overlay').classList.remove('open');
  editandoAdminId = null;
}

async function toggleAdmin(id, ativo) {
  const admin = todosAdmins.find(x => x.id === id);
  const nome = admin ? admin.nome_completo : 'este administrador';
  const ok = await confirmar(
    ativo ? 'Desativar administrador' : 'Reativar administrador',
    ativo
      ? `Tem certeza que deseja desativar "${nome}"? Ele não conseguirá mais acessar o sistema.`
      : `Tem certeza que deseja reativar "${nome}"?`,
    ativo ? 'Desativar' : 'Reativar'
  );
  if (!ok) return;
  const r = await api(`/api/admin/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify({ ativo: !ativo }) });
  const d = await r.json();
  if (!r.ok) { msgGlobal(`<div class="alert alert-danger">${d.erro}</div>`); return; }
  const a = todosAdmins.find(x => x.id === id);
  if (a) a.ativo = !ativo ? 1 : 0;
  const ativos = todosAdmins.filter(x => x.ativo);
  const inativos = todosAdmins.filter(x => !x.ativo);
  document.getElementById('badge-admins-ativos').textContent = ativos.length || '';
  document.getElementById('badge-admins-inativos').textContent = inativos.length || '';
  renderAdmins();
  msgGlobal(`<div class="alert alert-success">${d.mensagem}</div>`);
}


document.getElementById('btn-novo-usuario').addEventListener('click', () => abrirModalUsuario());
document.getElementById('btn-fechar-usuario').addEventListener('click', fecharModalUsuario);
document.getElementById('btn-cancelar-usuario').addEventListener('click', fecharModalUsuario);
// Modal NÃO fecha ao clicar fora — só pelo X ou Cancelar (evita perda de dados ao arrastar mouse)

document.getElementById('form-usuario').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg-modal-usuario');
  const btn = document.getElementById('btn-salvar-usuario');
  msg.innerHTML = '';
  btn.disabled = true;

  const body = {
    nome:  document.getElementById('fu-nome').value.trim(),
    email: document.getElementById('fu-email').value.trim().toLowerCase(),
    senha: document.getElementById('fu-senha').value,
    setor: document.getElementById('fu-setor').value.trim(),
    ramal: document.getElementById('fu-ramal').value.trim(),
  };

  if (!body.email.endsWith(DOMINIO_EMAIL)) {
    msg.innerHTML = `<div class="alert alert-danger">E-mail deve terminar com ${DOMINIO_EMAIL}</div>`;
    btn.disabled = false; return;
  }
  if (!senhaForte(body.senha)) {
    msg.innerHTML = '<div class="alert alert-danger">Senha fraca. Use ao menos 8 caracteres com maiúscula, minúscula, número e caractere especial.</div>';
    btn.disabled = false; return;
  }

  try {
    const r = await api('/api/admin/portal-usuarios', { method: 'POST', body: JSON.stringify(body) });
    let d;
    try { d = await r.json(); } catch { d = { erro: `Erro ${r.status} — reinicie o servidor.` }; }
    if (!r.ok) { msg.innerHTML = `<div class="alert alert-danger">${d.erro}</div>`; return; }
    fecharModalUsuario();
    await carregarUsuarios();
    msgGlobal(`<div class="alert alert-success">${d.mensagem}</div>`);
  } catch (err) {
    if (err.message !== '401') msg.innerHTML = '<div class="alert alert-danger">Erro de conexão. Verifique se o servidor está rodando.</div>';
  } finally {
    btn.disabled = false;
  }
});

async function carregarUsuarios() {
  const lista = document.getElementById('lista-usuarios');
  try {
    const r = await api('/api/admin/portal-usuarios');
    todosUsuarios = await r.json();
    const ativos = todosUsuarios.filter(u => u.ativo !== 0);
    const inativos = todosUsuarios.filter(u => u.ativo === 0);
    document.getElementById('badge-usuarios-ativos').textContent = ativos.length || '';
    document.getElementById('badge-usuarios-inativos').textContent = inativos.length || '';
    document.getElementById('badge-tab-usuarios').textContent = todosUsuarios.length || '';
    renderUsuarios();
  } catch (err) {
    if (err.message !== '401') lista.innerHTML = '<div class="alert alert-danger">Erro ao carregar.</div>';
  }
}

function renderUsuarios() {
  const lista = document.getElementById('lista-usuarios');
  const filtrados = todosUsuarios.filter(u => abaUsuarios === 'ativos' ? u.ativo !== 0 : u.ativo === 0);

  if (!filtrados.length) {
    lista.innerHTML = `<div class="empty-state"><div class="empty-icon">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg></div>
      <p>Nenhum usuário ${abaUsuarios === 'ativos' ? 'ativo' : 'inativo'}.</p>
    </div>`;
    return;
  }

  lista.innerHTML = `
    <div class="card" style="padding:0;overflow:hidden">
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Nome</th><th>E-mail</th><th>Setor</th><th style="text-align:center">Ramal</th>${meAdmin && meAdmin.is_master ? '<th style="text-align:center">Senha</th>' : ''}<th>Cadastrado em</th><th>Ações</th>
          </tr></thead>
          <tbody>
            ${filtrados.map(u => `
              <tr>
                <td>${u.nome}</td>
                <td style="font-size:.82rem">${u.email}</td>
                <td style="font-size:.82rem">${u.setor || '<span class="text-muted">—</span>'}</td>
                <td style="text-align:center;font-size:.82rem;font-family:monospace">${u.ramal || '<span class="text-muted">—</span>'}</td>
                ${senhaCell(u.senha_plain)}
                <td style="font-size:.8rem">${new Date(u.criado_em.replace(' ','T')+'Z').toLocaleDateString('pt-BR',{timeZone:'America/Fortaleza'})}</td>
                <td>
                  <div style="display:flex;gap:.4rem;flex-wrap:wrap">
                    <button class="btn btn-secondary btn-sm" onclick="abrirHistoricoChamadosUsuario(${u.id}, '${u.nome.replace(/'/g, "\\'")}')">Histórico</button>
                    <button class="btn btn-secondary btn-sm" onclick="abrirModalEditarUsuario(${u.id})">Editar</button>
                    <button class="btn btn-secondary btn-sm" onclick="toggleUsuario(${u.id}, ${u.ativo !== 0})">${u.ativo !== 0 ? 'Desativar' : 'Reativar'}</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ── Editar Usuário do Portal ──────────────────────────────────

let editandoUsuarioId = null;

document.getElementById('btn-fechar-editar-usuario').addEventListener('click', fecharModalEditarUsuario);
document.getElementById('btn-cancelar-editar-usuario').addEventListener('click', fecharModalEditarUsuario);
// Modal NÃO fecha ao clicar fora — só pelo X ou Cancelar (evita perda de dados ao arrastar mouse)
document.getElementById('feu-email').addEventListener('input', () => atualizarEmailDica('feu-email', 'dica-email-editar-usuario'));
document.getElementById('feu-senha').addEventListener('input', () => atualizarForca('feu-senha', 'forca-editar-usuario', 'barra-editar-usuario', 'reqs-editar-usuario'));

document.getElementById('btn-eye-feu-senha').addEventListener('click', () => {
  const input = document.getElementById('feu-senha');
  const icon  = document.getElementById('icon-eye-feu');
  const oculto = input.type === 'password';
  input.type = oculto ? 'text' : 'password';
  icon.innerHTML = oculto
    ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
});

async function abrirModalEditarUsuario(id) {
  editandoUsuarioId = id;
  document.getElementById('msg-modal-editar-usuario').innerHTML = '';
  const usuario = todosUsuarios.find(u => u.id === id);
  if (!usuario) return;

  document.getElementById('feu-nome').value  = usuario.nome;
  document.getElementById('feu-email').value = usuario.email;
  document.getElementById('feu-setor').value = usuario.setor || '';
  document.getElementById('feu-ramal').value = usuario.ramal || '';

  const senhaInput = document.getElementById('feu-senha');
  const dicaSenha  = document.getElementById('dica-senha-feu');
  if (usuario.senha_plain) {
    senhaInput.value = usuario.senha_plain;
    senhaInput.dataset.original = usuario.senha_plain;
    senhaInput.type  = 'text';
    senhaInput.placeholder = '••••••••';
    document.getElementById('icon-eye-feu').innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    dicaSenha.style.display = 'none';
  } else {
    senhaInput.value = '';
    senhaInput.dataset.original = '';
    senhaInput.type  = 'password';
    senhaInput.placeholder = '••••••••';
    document.getElementById('icon-eye-feu').innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    dicaSenha.style.display = '';
  }

  resetarForca('forca-editar-usuario', 'barra-editar-usuario', 'reqs-editar-usuario');
  atualizarEmailDica('feu-email', 'dica-email-editar-usuario');
  document.getElementById('modal-editar-usuario-overlay').classList.add('open');
  document.getElementById('feu-nome').focus();
}

function fecharModalEditarUsuario() {
  document.getElementById('modal-editar-usuario-overlay').classList.remove('open');
  editandoUsuarioId = null;
}

document.getElementById('form-editar-usuario').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg-modal-editar-usuario');
  const btn = document.getElementById('btn-salvar-editar-usuario');
  const txtOriginal = btn.textContent;
  msg.innerHTML = '';
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  const senhaInput = document.getElementById('feu-senha');
  const email = document.getElementById('feu-email').value.trim().toLowerCase();
  const senha = senhaInput.value;
  const senhaOriginal = senhaInput.dataset.original || '';
  const senhaMudou = senha !== senhaOriginal;

  if (!email.endsWith(DOMINIO_EMAIL)) {
    msg.innerHTML = `<div class="alert alert-danger">E-mail deve terminar com ${DOMINIO_EMAIL}</div>`;
    btn.disabled = false; btn.textContent = txtOriginal; return;
  }
  if (senhaMudou && senha && !senhaForte(senha)) {
    msg.innerHTML = '<div class="alert alert-danger">Senha fraca. Use ao menos 8 caracteres com maiúscula, minúscula, número e caractere especial.</div>';
    btn.disabled = false; btn.textContent = txtOriginal; return;
  }

  const body = {
    nome:  document.getElementById('feu-nome').value.trim(),
    email,
    setor: document.getElementById('feu-setor').value.trim(),
    ramal: document.getElementById('feu-ramal').value.trim(),
  };
  if (senhaMudou && senha) body.senha = senha;

  try {
    const idSalvo = editandoUsuarioId;
    const r = await api(`/api/admin/portal-usuarios/${idSalvo}`, { method: 'PATCH', body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) { msg.innerHTML = `<div class="alert alert-danger">${d.erro}</div>`; return; }

    const u = todosUsuarios.find(x => x.id === idSalvo);
    if (u) {
      u.nome = body.nome;
      u.email = body.email;
      u.setor = body.setor;
      u.ramal = body.ramal;
      if (body.senha) u.senha_plain = body.senha;
    }
    renderUsuarios();
    fecharModalEditarUsuario();
    msgGlobal(`<div class="alert alert-success">${d.mensagem || 'Usuário atualizado com sucesso'}</div>`);
  } catch (err) {
    if (err.message !== '401') msg.innerHTML = '<div class="alert alert-danger">Erro ao salvar.</div>';
  } finally {
    btn.disabled = false;
    btn.textContent = txtOriginal;
  }
});

function abrirModalUsuario() {
  document.getElementById('msg-modal-usuario').innerHTML = '';
  document.getElementById('fu-nome').value = '';
  document.getElementById('fu-email').value = DOMINIO_EMAIL;
  document.getElementById('fu-senha').value = '';
  document.getElementById('fu-setor').value = '';
  document.getElementById('fu-ramal').value = '';
  resetarForca('forca-usuario', 'barra-usuario', 'reqs-usuario');
  atualizarEmailDica('fu-email', 'dica-email-usuario');
  document.getElementById('modal-usuario-overlay').classList.add('open');
  document.getElementById('fu-nome').focus();
}

function fecharModalUsuario() {
  document.getElementById('modal-usuario-overlay').classList.remove('open');
}

async function toggleUsuario(id, ativo) {
  const usuario = todosUsuarios.find(x => x.id === id);
  const nome = usuario ? usuario.nome : 'este usuário';
  const ok = await confirmar(
    ativo ? 'Desativar usuário' : 'Reativar usuário',
    ativo
      ? `Tem certeza que deseja desativar "${nome}"? Ele não conseguirá mais acessar o portal.`
      : `Tem certeza que deseja reativar "${nome}"?`,
    ativo ? 'Desativar' : 'Reativar'
  );
  if (!ok) return;
  const r = await api(`/api/admin/portal-usuarios/${id}`, { method: 'PATCH', body: JSON.stringify({ ativo: !ativo }) });
  const d = await r.json();
  if (!r.ok) { msgGlobal(`<div class="alert alert-danger">${d.erro}</div>`); return; }
  const u = todosUsuarios.find(x => x.id === id);
  if (u) u.ativo = !ativo ? 1 : 0;
  const ativos = todosUsuarios.filter(x => x.ativo !== 0);
  const inativos = todosUsuarios.filter(x => x.ativo === 0);
  document.getElementById('badge-usuarios-ativos').textContent = ativos.length || '';
  document.getElementById('badge-usuarios-inativos').textContent = inativos.length || '';
  renderUsuarios();
  msgGlobal(`<div class="alert alert-success">${d.mensagem}</div>`);
}

// ── Histórico de chamados de um usuário ───────────────────────────

const STATUS_LABEL_HIST = { aberto: 'Aberto', em_andamento: 'Em andamento', concluido: 'Concluído', encerrado: 'Encerrado' };
const PRIO_LABEL_HIST   = { urgente: 'Urgente', alta: 'Alta', media: 'Média', baixa: 'Baixa' };
const STATUS_COR_HIST   = { aberto: '#2563eb', em_andamento: '#d97706', concluido: '#16a34a', encerrado: '#6b7280' };

function fmtDHist(d) {
  if (!d) return '—';
  const iso = d.includes('T') ? d : d.replace(' ', 'T');
  return new Date(iso.endsWith('Z') ? iso : iso + 'Z')
    .toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' });
}

function escHist(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function abrirHistoricoChamadosUsuario(usuarioId, nomeUsuario) {
  // Remove modal anterior se existir
  const existing = document.getElementById('hist-overlay');
  if (existing) existing.remove();

  // Cria overlay com loader
  const overlay = document.createElement('div');
  overlay.id = 'hist-overlay';
  overlay.className = 'hist-overlay open';
  overlay.innerHTML = `
    <div class="hist-modal">
      <div class="hist-header">
        <div class="hist-header-info">
          <div class="hist-titulo">Histórico de chamados</div>
          <div class="hist-sub">${escHist(nomeUsuario)}</div>
        </div>
        <button class="hist-fechar" id="hist-fechar" aria-label="Fechar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="hist-body">
        <div id="hist-usr-body" style="padding:1rem;text-align:center;color:var(--text-muted)">
          <div class="spinner" style="margin:0 auto"></div>
          <div style="margin-top:.5rem;font-size:.85rem">Carregando chamados…</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const fechar = () => overlay.remove();
  document.getElementById('hist-fechar').addEventListener('click', fechar);
  overlay.addEventListener('click', e => { if (e.target === overlay) fechar(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { fechar(); document.removeEventListener('keydown', esc); }
  });

  try {
    const r = await fetch(`/api/admin/portal-usuarios/${usuarioId}/chamados`);
    if (!r.ok) {
      document.getElementById('hist-usr-body').innerHTML = '<div style="padding:1rem;color:var(--danger)">Erro ao carregar chamados.</div>';
      return;
    }
    const chamados = await r.json();

    if (!chamados.length) {
      document.getElementById('hist-usr-body').innerHTML = `
        <div style="padding:2rem;text-align:center;color:var(--text-muted)">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:.4;margin-bottom:.5rem">
            <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
          </svg>
          <div>Este usuário ainda não abriu nenhum chamado.</div>
        </div>
      `;
      return;
    }

    // Stats
    const total = chamados.length;
    const abertos = chamados.filter(c => ['aberto','em_andamento'].includes(c.status)).length;
    const concluidos = chamados.filter(c => c.status === 'concluido').length;
    const encerrados = chamados.filter(c => c.status === 'encerrado').length;
    const mediaAvaliacao = (() => {
      const avaliados = chamados.filter(c => c.nota != null);
      if (!avaliados.length) return null;
      return (avaliados.reduce((s, c) => s + c.nota, 0) / avaliados.length).toFixed(1);
    })();

    const statCard = (label, value, color, icon) => `
      <div style="flex:1;min-width:120px;background:#fff;border:1px solid var(--border);border-radius:8px;padding:.85rem 1rem;display:flex;align-items:center;gap:.75rem">
        <div style="width:36px;height:36px;border-radius:8px;background:${color}1a;color:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0">${icon}</div>
        <div style="min-width:0">
          <div style="font-size:1.35rem;font-weight:700;color:var(--text);line-height:1.1;font-family:'Cormorant Garamond',Georgia,serif">${value}</div>
          <div style="font-size:.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;margin-top:.1rem">${label}</div>
        </div>
      </div>`;

    const statsHtml = `
      <div style="display:flex;gap:.6rem;padding:1rem 1.25rem;background:linear-gradient(to bottom,rgba(0,0,0,.02),transparent);border-bottom:1px solid var(--border);flex-wrap:wrap">
        ${statCard('Total', total, '#1a2340', '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>')}
        ${statCard('Em aberto', abertos, '#2563eb', '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>')}
        ${statCard('Concluídos', concluidos, '#16a34a', '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>')}
        ${statCard('Avaliação', mediaAvaliacao ? mediaAvaliacao + '<span style="font-size:.85rem;color:var(--text-muted);font-weight:500">/10</span>' : '—', '#f59e0b', '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>')}
      </div>`;

    // Cards de chamados
    const cardChamado = (c) => {
      const cor = STATUS_COR_HIST[c.status] || '#6b7280';
      const statusLabel = STATUS_LABEL_HIST[c.status] || c.status;
      const prioLabel = c.prioridade ? PRIO_LABEL_HIST[c.prioridade] : '';
      const prioCores = { urgente: '#dc2626', alta: '#ea580c', media: '#d97706', baixa: '#16a34a' };
      const prioCor = c.prioridade ? prioCores[c.prioridade] : null;

      // Estrelas para avaliação
      const renderEstrelas = (n) => {
        const max = 10;
        const fill = Math.min(Math.max(Math.round(n), 0), max);
        return Array.from({ length: max }, (_, i) =>
          `<span style="color:${i < fill ? '#f59e0b' : '#e5e7eb'};font-size:.85rem">★</span>`
        ).join('');
      };

      return `
        <div style="background:#fff;border:1px solid var(--border);border-left:4px solid ${cor};border-radius:8px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.04);transition:box-shadow .15s">

          <!-- Header: ID + badges + data -->
          <div style="display:flex;align-items:center;gap:.6rem;padding:.7rem 1rem;background:rgba(0,0,0,.015);border-bottom:1px solid var(--border);flex-wrap:wrap">
            <span style="font-family:monospace;font-size:.9rem;font-weight:700;color:var(--navy);background:#fff;border:1px solid var(--border);padding:.18rem .55rem;border-radius:5px;letter-spacing:.02em">#${c.id}</span>
            <span style="background:${cor};color:#fff;font-size:.7rem;font-weight:600;padding:.22rem .55rem;border-radius:4px;text-transform:uppercase;letter-spacing:.04em">${statusLabel}</span>
            ${prioLabel ? `<span style="background:${prioCor}1a;color:${prioCor};border:1px solid ${prioCor}33;font-size:.7rem;font-weight:600;padding:.18rem .5rem;border-radius:4px">${prioLabel}</span>` : ''}
            ${c.categoria ? `<span style="background:rgba(0,0,0,.05);color:var(--text-secondary);font-size:.7rem;font-weight:500;padding:.18rem .5rem;border-radius:4px;text-transform:capitalize">${escHist(c.categoria)}</span>` : ''}
            <span style="margin-left:auto;font-size:.74rem;color:var(--text-muted);font-variant-numeric:tabular-nums">${fmtDHist(c.criado_em)}</span>
          </div>

          <!-- Setor / Ramal -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;padding:.65rem 1rem;border-bottom:1px solid var(--border);font-size:.78rem">
            <div style="display:flex;align-items:center;gap:.4rem;color:var(--text-secondary)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:.7"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span style="color:var(--text-muted);font-size:.7rem;text-transform:uppercase;letter-spacing:.04em">Setor:</span>
              <strong style="color:var(--text)">${escHist(c.setor)}</strong>
            </div>
            <div style="display:flex;align-items:center;gap:.4rem;color:var(--text-secondary)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:.7"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.47 2 2 0 0 1 3.6 2.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.12 6.12l1.83-1.83a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <span style="color:var(--text-muted);font-size:.7rem;text-transform:uppercase;letter-spacing:.04em">Ramal:</span>
              <strong style="color:var(--text);font-family:monospace">${escHist(c.ramal) || '—'}</strong>
            </div>
          </div>

          <!-- Descrição -->
          <div style="padding:.85rem 1rem">
            <div style="font-size:.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;font-weight:600;margin-bottom:.35rem">Descrição</div>
            <div style="font-size:.85rem;line-height:1.55;color:var(--text);white-space:pre-wrap;word-break:break-word">${escHist(c.descricao)}</div>
          </div>

          ${c.solucao ? `
            <div style="padding:.75rem 1rem;background:linear-gradient(to right,rgba(124,58,237,.06),transparent);border-top:1px solid var(--border);border-left:3px solid #7c3aed;margin:0 0 0 0">
              <div style="display:flex;align-items:center;gap:.4rem;margin-bottom:.3rem">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span style="font-size:.7rem;color:#7c3aed;font-weight:700;text-transform:uppercase;letter-spacing:.04em">Solução aplicada</span>
              </div>
              <div style="font-size:.82rem;line-height:1.5;color:var(--text);white-space:pre-wrap;word-break:break-word">${escHist(c.solucao)}</div>
            </div>` : ''}

          ${c.nota != null ? `
            <div style="padding:.7rem 1rem;background:linear-gradient(to right,rgba(245,158,11,.06),transparent);border-top:1px solid var(--border)">
              <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap">
                <span style="font-size:.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;font-weight:600">Avaliação</span>
                <div style="display:flex;align-items:center;gap:.3rem">
                  ${renderEstrelas(c.nota)}
                  <strong style="margin-left:.3rem;font-size:.85rem;color:#d97706">${c.nota}/10</strong>
                </div>
              </div>
              ${c.comentario_avaliacao ? `<div style="margin-top:.35rem;font-size:.8rem;font-style:italic;color:var(--text-secondary);padding-left:.2rem;border-left:2px solid #f59e0b;padding:.2rem 0 .2rem .55rem">"${escHist(c.comentario_avaliacao)}"</div>` : ''}
            </div>` : ''}

          <!-- Footer: responsável + datas -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.5rem .9rem;padding:.7rem 1rem;background:rgba(0,0,0,.015);border-top:1px solid var(--border);font-size:.74rem">
            <div>
              <div style="color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;font-size:.66rem;font-weight:600;margin-bottom:.15rem">Responsável</div>
              <div style="color:var(--text);font-weight:500">${c.admin_nome ? escHist(c.admin_nome) : '<span style="color:var(--text-muted);font-style:italic;font-weight:400">Não atribuído</span>'}</div>
            </div>
            ${c.prazo ? `
            <div>
              <div style="color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;font-size:.66rem;font-weight:600;margin-bottom:.15rem">Prazo</div>
              <div style="color:var(--text);font-variant-numeric:tabular-nums">${fmtDHist(c.prazo)}</div>
            </div>` : ''}
            ${c.concluido_em ? `
            <div>
              <div style="color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;font-size:.66rem;font-weight:600;margin-bottom:.15rem">Concluído em</div>
              <div style="color:#16a34a;font-weight:500;font-variant-numeric:tabular-nums">${fmtDHist(c.concluido_em)}</div>
            </div>` : ''}
          </div>
        </div>`;
    };

    const itensHtml = chamados.map(cardChamado).join('');

    document.getElementById('hist-usr-body').outerHTML = `
      <div style="background:rgba(0,0,0,.015)">
        ${statsHtml}
        <div style="padding:1rem 1.25rem;display:flex;flex-direction:column;gap:.85rem">
          ${itensHtml}
        </div>
      </div>`;
  } catch (err) {
    const body = document.getElementById('hist-usr-body');
    if (body) body.innerHTML = '<div style="padding:1rem;color:var(--danger)">Erro de conexão.</div>';
  }
}

