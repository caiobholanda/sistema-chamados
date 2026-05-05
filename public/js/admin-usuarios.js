let meAdmin = null;
let editandoAdminId = null;
let abaAdmins = 'ativos';
let abaUsuarios = 'ativos';
let todosAdmins = [];
let todosUsuarios = [];

const DOMINIO_EMAIL = '@granmarquise.com.br';

function gerarSenhaAleatoria() {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const special = '!@#$%&*';
  const all = lower + upper + digits + special;
  let senha = [
    lower[Math.floor(Math.random() * lower.length)],
    upper[Math.floor(Math.random() * upper.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  for (let i = 0; i < 6; i++) senha.push(all[Math.floor(Math.random() * all.length)]);
  return senha.sort(() => Math.random() - 0.5).join('');
}

function preencherSenha(inputId, iconId, forcaId, barraId, reqsId) {
  const senha = gerarSenhaAleatoria();
  const input = document.getElementById(inputId);
  input.value = senha;
  input.type = 'text';
  const icon = document.getElementById(iconId);
  if (icon) icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
  if (forcaId) atualizarForca(inputId, forcaId, barraId, reqsId);
}

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

document.getElementById('btn-gerar-senha-admin').addEventListener('click', () =>
  preencherSenha('f-senha', 'icon-eye-f', 'forca-admin', 'barra-admin', 'reqs-admin'));

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

// ── Modal de confirmação ──────────────────────────────────────
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

// ── Boot ──────────────────────────────────────────────────────

(async () => {
  const r = await api('/api/admin/me');
  if (!r.ok) { location.replace('/admin-login.html'); return; }
  meAdmin = await r.json();

  if (!meAdmin.is_master) {
    // Admins comuns só veem usuários do portal
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

// ── Tabs principais ───────────────────────────────────────────

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

// ── Sub-tabs Administradores ──────────────────────────────────

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

// ── Sub-tabs Usuários ─────────────────────────────────────────

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
document.getElementById('modal-admin-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) fecharModalAdmin(); });

document.getElementById('form-admin').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg-modal-admin');
  const btn = document.getElementById('btn-salvar-admin');
  msg.innerHTML = '';
  btn.disabled = true;

  const body = {
    nome_completo: document.getElementById('f-nome').value.trim(),
    email: document.getElementById('f-email').value.trim().toLowerCase(),
    senha: document.getElementById('f-senha').value,
    is_master: document.getElementById('f-master').checked,
  };

  if (!body.email.endsWith(DOMINIO_EMAIL)) {
    msg.innerHTML = `<div class="alert alert-danger">E-mail deve terminar com ${DOMINIO_EMAIL}</div>`;
    btn.disabled = false; return;
  }
  if (!editandoAdminId && !senhaForte(body.senha)) {
    msg.innerHTML = '<div class="alert alert-danger">Senha fraca. Use ao menos 8 caracteres com maiúscula, minúscula, número e caractere especial.</div>';
    btn.disabled = false; return;
  }
  if (editandoAdminId && body.senha && !senhaForte(body.senha)) {
    msg.innerHTML = '<div class="alert alert-danger">Senha fraca. Use ao menos 8 caracteres com maiúscula, minúscula, número e caractere especial.</div>';
    btn.disabled = false; return;
  }

  try {
    let r;
    if (editandoAdminId) {
      const patch = { nome_completo: body.nome_completo, email: body.email, is_master: body.is_master };
      if (body.senha) patch.senha = body.senha;
      r = await api(`/api/admin/usuarios/${editandoAdminId}`, { method: 'PATCH', body: JSON.stringify(patch) });
    } else {
      r = await api('/api/admin/usuarios', { method: 'POST', body: JSON.stringify(body) });
    }
    const d = await r.json();
    if (!r.ok) { msg.innerHTML = `<div class="alert alert-danger">${d.erro}</div>`; return; }
    fecharModalAdmin();
    await carregarAdmins();
    msgGlobal(`<div class="alert alert-success">${d.mensagem}</div>`);
  } catch (err) {
    if (err.message !== '401') msg.innerHTML = '<div class="alert alert-danger">Erro ao salvar.</div>';
  } finally {
    btn.disabled = false;
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
      if (admin.senha_plain) {
        document.getElementById('f-senha').value = admin.senha_plain;
        document.getElementById('f-senha').type = 'text';
        document.getElementById('icon-eye-f').innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
      }
    }
  } else {
    document.getElementById('modal-admin-title').textContent = 'Novo administrador';
    document.getElementById('f-nome').value = '';
    document.getElementById('lbl-senha-dica').textContent = '(mín. 6 caracteres)';
  }

  resetarForca('forca-admin', 'barra-admin', 'reqs-admin');
  resetarEmailDica('dica-email-admin');
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

async function excluirAdmin(id) {
  if (!confirm('Excluir este administrador permanentemente? Esta ação não pode ser desfeita.')) return;
  const r = await api(`/api/admin/usuarios/${id}`, { method: 'DELETE' });
  const d = await r.json();
  if (!r.ok) { msgGlobal(`<div class="alert alert-danger">${d.erro}</div>`); return; }
  await carregarAdmins();
  msgGlobal(`<div class="alert alert-success">${d.mensagem}</div>`);
}

// ══════════════════════════════════════════════════════════════
//  USUÁRIOS DO PORTAL
// ══════════════════════════════════════════════════════════════

document.getElementById('btn-novo-usuario').addEventListener('click', () => abrirModalUsuario());
document.getElementById('btn-fechar-usuario').addEventListener('click', fecharModalUsuario);
document.getElementById('btn-cancelar-usuario').addEventListener('click', fecharModalUsuario);
document.getElementById('modal-usuario-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) fecharModalUsuario(); });

document.getElementById('form-usuario').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg-modal-usuario');
  const btn = document.getElementById('btn-salvar-usuario');
  msg.innerHTML = '';
  btn.disabled = true;

  const body = {
    nome: document.getElementById('fu-nome').value.trim(),
    email: document.getElementById('fu-email').value.trim().toLowerCase(),
    senha: document.getElementById('fu-senha').value,
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
            <th>Nome</th><th>E-mail</th>${meAdmin && meAdmin.is_master ? '<th style="text-align:center">Senha</th>' : ''}<th>Cadastrado em</th><th>Ações</th>
          </tr></thead>
          <tbody>
            ${filtrados.map(u => `
              <tr>
                <td>${u.nome}</td>
                <td style="font-size:.82rem">${u.email}</td>
                ${senhaCell(u.senha_plain)}
                <td style="font-size:.8rem">${new Date(u.criado_em.replace(' ','T')+'Z').toLocaleDateString('pt-BR',{timeZone:'America/Fortaleza'})}</td>
                <td>
                  <div style="display:flex;gap:.4rem;flex-wrap:wrap">
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
document.getElementById('modal-editar-usuario-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) fecharModalEditarUsuario(); });
document.getElementById('feu-email').addEventListener('input', () => atualizarEmailDica('feu-email', 'dica-email-editar-usuario'));
document.getElementById('feu-senha').addEventListener('input', () => atualizarForca('feu-senha', 'forca-editar-usuario', 'barra-editar-usuario', 'reqs-editar-usuario'));
document.getElementById('btn-gerar-senha-usuario').addEventListener('click', () =>
  preencherSenha('feu-senha', 'icon-eye-feu', 'forca-editar-usuario', 'barra-editar-usuario', 'reqs-editar-usuario'));

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
  document.getElementById('feu-senha').value = usuario.senha_plain || '';
  document.getElementById('feu-senha').type  = 'text';
  document.getElementById('icon-eye-feu').innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';

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
  msg.innerHTML = '';
  btn.disabled = true;

  const email = document.getElementById('feu-email').value.trim().toLowerCase();
  const senha = document.getElementById('feu-senha').value;

  if (!email.endsWith(DOMINIO_EMAIL)) {
    msg.innerHTML = `<div class="alert alert-danger">E-mail deve terminar com ${DOMINIO_EMAIL}</div>`;
    btn.disabled = false; return;
  }
  if (senha && !senhaForte(senha)) {
    msg.innerHTML = '<div class="alert alert-danger">Senha fraca. Use ao menos 8 caracteres com maiúscula, minúscula, número e caractere especial.</div>';
    btn.disabled = false; return;
  }

  const body = {
    nome:  document.getElementById('feu-nome').value.trim(),
    email,
  };
  if (senha) body.senha = senha;

  try {
    const r = await api(`/api/admin/portal-usuarios/${editandoUsuarioId}`, { method: 'PATCH', body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) { msg.innerHTML = `<div class="alert alert-danger">${d.erro}</div>`; return; }
    fecharModalEditarUsuario();
    await carregarUsuarios();
    msgGlobal(`<div class="alert alert-success">${d.mensagem}</div>`);
  } catch (err) {
    if (err.message !== '401') msg.innerHTML = '<div class="alert alert-danger">Erro ao salvar.</div>';
  } finally {
    btn.disabled = false;
  }
});

function abrirModalUsuario() {
  document.getElementById('msg-modal-usuario').innerHTML = '';
  document.getElementById('fu-nome').value = '';
  document.getElementById('fu-email').value = '';
  document.getElementById('fu-senha').value = '';
  resetarForca('forca-usuario', 'barra-usuario', 'reqs-usuario');
  resetarEmailDica('dica-email-usuario');
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

async function excluirUsuario(id, nome) {
  if (!confirm(`Excluir permanentemente o usuário "${nome}"?\n\nSeus chamados serão mantidos, mas a conta será removida definitivamente.`)) return;
  const r = await api(`/api/admin/portal-usuarios/${id}`, { method: 'DELETE' });
  const d = await r.json();
  if (!r.ok) { msgGlobal(`<div class="alert alert-danger">${d.erro}</div>`); return; }
  await carregarUsuarios();
  msgGlobal(`<div class="alert alert-success">${d.mensagem}</div>`);
}
