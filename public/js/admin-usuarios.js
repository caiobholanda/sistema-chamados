let meAdmin = null;
let editandoAdminId = null;

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

// ── Boot ──────────────────────────────────────────────────────

(async () => {
  const r = await api('/api/admin/me');
  if (!r.ok) { location.replace('/admin-login.html'); return; }
  meAdmin = await r.json();
  if (!meAdmin.is_master) { location.replace('/admin-painel.html'); return; }
  await Promise.all([carregarAdmins(), carregarUsuarios()]);
})();

document.getElementById('btn-logout').addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST' });
  location.replace('/admin-login.html');
});

// ── Tabs ──────────────────────────────────────────────────────

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

// ══════════════════════════════════════════════════════════════
//  ADMINISTRADORES
// ══════════════════════════════════════════════════════════════

document.getElementById('btn-novo-admin').addEventListener('click', () => abrirModalAdmin(null));
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
    usuario: document.getElementById('f-usuario').value.trim(),
    nome_completo: document.getElementById('f-nome').value.trim(),
    senha: document.getElementById('f-senha').value,
    is_master: document.getElementById('f-master').checked,
  };

  try {
    let r;
    if (editandoAdminId) {
      const patch = { nome_completo: body.nome_completo, is_master: body.is_master };
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
    const admins = await r.json();
    lista.innerHTML = `
      <div class="card" style="padding:0;overflow:hidden">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Usuário</th><th>Nome</th><th>Tipo</th><th>Status</th><th>Criado em</th><th>Ações</th>
            </tr></thead>
            <tbody>
              ${admins.map(a => `
                <tr>
                  <td><code>${a.usuario}</code></td>
                  <td>${a.nome_completo}</td>
                  <td>${a.is_master ? '<span class="badge badge-urgente">Master</span>' : 'Admin'}</td>
                  <td>${a.ativo ? '<span class="badge badge-concluido">Ativo</span>' : '<span class="badge badge-encerrado">Inativo</span>'}</td>
                  <td style="font-size:.8rem">${new Date(a.criado_em).toLocaleDateString('pt-BR')}</td>
                  <td>
                    <div style="display:flex;gap:.4rem;flex-wrap:wrap">
                      <button class="btn btn-secondary btn-sm" onclick="abrirModalAdmin(${a.id})">Editar</button>
                      ${a.id !== meAdmin.id ? `
                        <button class="btn btn-secondary btn-sm" onclick="toggleAdmin(${a.id}, ${a.ativo})">${a.ativo ? 'Desativar' : 'Reativar'}</button>
                        <button class="btn btn-danger btn-sm" onclick="excluirAdmin(${a.id})">Excluir</button>
                      ` : '<span class="text-muted" style="font-size:.75rem;padding:.3rem .5rem">você</span>'}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch (err) {
    if (err.message !== '401') lista.innerHTML = '<div class="alert alert-danger">Erro ao carregar.</div>';
  }
}

async function abrirModalAdmin(id) {
  editandoAdminId = id;
  document.getElementById('msg-modal-admin').innerHTML = '';
  document.getElementById('f-senha').value = '';
  document.getElementById('f-master').checked = false;

  if (id) {
    document.getElementById('modal-admin-title').textContent = 'Editar administrador';
    document.getElementById('f-usuario').disabled = true;
    document.getElementById('lbl-senha-dica').textContent = '(deixe em branco para não alterar)';
    const r = await api('/api/admin/usuarios');
    const admins = await r.json();
    const admin = admins.find(a => a.id === id);
    if (admin) {
      document.getElementById('f-usuario').value = admin.usuario;
      document.getElementById('f-nome').value = admin.nome_completo;
      document.getElementById('f-master').checked = !!admin.is_master;
    }
  } else {
    document.getElementById('modal-admin-title').textContent = 'Novo administrador';
    document.getElementById('f-usuario').disabled = false;
    document.getElementById('f-usuario').value = '';
    document.getElementById('f-nome').value = '';
    document.getElementById('lbl-senha-dica').textContent = '(mín. 6 caracteres)';
  }

  document.getElementById('modal-admin-overlay').classList.add('open');
  document.getElementById('f-usuario').focus();
}

function fecharModalAdmin() {
  document.getElementById('modal-admin-overlay').classList.remove('open');
  editandoAdminId = null;
}

async function toggleAdmin(id, ativo) {
  const r = await api(`/api/admin/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify({ ativo: !ativo }) });
  const d = await r.json();
  if (!r.ok) { msgGlobal(`<div class="alert alert-danger">${d.erro}</div>`); return; }
  await carregarAdmins();
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
    email: document.getElementById('fu-email').value.trim(),
    senha: document.getElementById('fu-senha').value,
  };

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
    const usuarios = await r.json();

    if (!usuarios.length) {
      lista.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </div>
          <p>Nenhum usuário cadastrado ainda.</p>
        </div>`;
      return;
    }

    lista.innerHTML = `
      <div class="card" style="padding:0;overflow:hidden">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Nome</th><th>E-mail</th><th>Status</th><th>Cadastrado em</th><th>Ações</th>
            </tr></thead>
            <tbody>
              ${usuarios.map(u => `
                <tr>
                  <td>${u.nome}</td>
                  <td style="font-size:.82rem">${u.email}</td>
                  <td>${u.ativo !== 0 ? '<span class="badge badge-concluido">Ativo</span>' : '<span class="badge badge-encerrado">Inativo</span>'}</td>
                  <td style="font-size:.8rem">${new Date(u.criado_em).toLocaleDateString('pt-BR')}</td>
                  <td>
                    <div style="display:flex;gap:.4rem;flex-wrap:wrap">
                      <button class="btn btn-secondary btn-sm" onclick="toggleUsuario(${u.id}, ${u.ativo !== 0})">${u.ativo !== 0 ? 'Desativar' : 'Reativar'}</button>
                      <button class="btn btn-danger btn-sm" onclick="excluirUsuario(${u.id}, '${u.nome.replace(/'/g, "\\'")}')">Excluir</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch (err) {
    if (err.message !== '401') lista.innerHTML = '<div class="alert alert-danger">Erro ao carregar.</div>';
  }
}

function abrirModalUsuario() {
  document.getElementById('msg-modal-usuario').innerHTML = '';
  document.getElementById('fu-nome').value = '';
  document.getElementById('fu-email').value = '';
  document.getElementById('fu-senha').value = '';
  document.getElementById('modal-usuario-overlay').classList.add('open');
  document.getElementById('fu-nome').focus();
}

function fecharModalUsuario() {
  document.getElementById('modal-usuario-overlay').classList.remove('open');
}

async function toggleUsuario(id, ativo) {
  const r = await api(`/api/admin/portal-usuarios/${id}`, { method: 'PATCH', body: JSON.stringify({ ativo: !ativo }) });
  const d = await r.json();
  if (!r.ok) { msgGlobal(`<div class="alert alert-danger">${d.erro}</div>`); return; }
  await carregarUsuarios();
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
