let meAdmin = null;
let editandoId = null;

async function api(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (res.status === 401) { location.replace('/admin-login.html'); throw new Error('401'); }
  return res;
}

(async () => {
  const r = await api('/api/admin/me');
  if (!r.ok) { location.replace('/admin-login.html'); return; }
  meAdmin = await r.json();
  if (!meAdmin.is_master) { location.replace('/admin-painel.html'); return; }
  await carregarAdmins();
})();

document.getElementById('btn-logout').addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST' });
  location.replace('/admin-login.html');
});

document.getElementById('btn-novo').addEventListener('click', () => abrirModal(null));
document.getElementById('btn-fechar').addEventListener('click', fecharModal);
document.getElementById('btn-cancelar').addEventListener('click', fecharModal);
document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) fecharModal(); });

document.getElementById('form-admin').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg-modal');
  const btn = document.getElementById('btn-salvar');
  msg.innerHTML = '';
  btn.disabled = true;

  const body = {
    usuario: document.getElementById('f-usuario').value.trim(),
    nome_completo: document.getElementById('f-nome').value.trim(),
    senha: document.getElementById('f-senha').value,
    is_master: document.getElementById('f-master').checked,
  };

  try {
    let r, d;
    if (editandoId) {
      const patch = { nome_completo: body.nome_completo, is_master: body.is_master };
      if (body.senha) patch.senha = body.senha;
      r = await api(`/api/admin/usuarios/${editandoId}`, { method: 'PATCH', body: JSON.stringify(patch) });
    } else {
      r = await api('/api/admin/usuarios', { method: 'POST', body: JSON.stringify(body) });
    }
    d = await r.json();
    if (!r.ok) { msg.innerHTML = `<div class="alert alert-danger">${d.erro}</div>`; return; }
    fecharModal();
    await carregarAdmins();
    document.getElementById('msg-global').innerHTML = `<div class="alert alert-success">${d.mensagem}</div>`;
    setTimeout(() => document.getElementById('msg-global').innerHTML = '', 3000);
  } catch (err) {
    if (err.message !== '401') msg.innerHTML = '<div class="alert alert-danger">Erro ao salvar.</div>';
  } finally {
    btn.disabled = false;
  }
});

async function carregarAdmins() {
  const lista = document.getElementById('lista');
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
                      <button class="btn btn-secondary btn-sm" onclick="abrirModal(${a.id})">Editar</button>
                      ${a.id !== meAdmin.id ? `
                        <button class="btn btn-secondary btn-sm" onclick="toggleAtivo(${a.id}, ${a.ativo})">${a.ativo ? 'Desativar' : 'Reativar'}</button>
                        <button class="btn btn-danger btn-sm" onclick="removerAdmin(${a.id})">Remover</button>
                      ` : '<span class="text-muted" style="font-size:.75rem">você</span>'}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    if (err.message !== '401') lista.innerHTML = '<div class="alert alert-danger">Erro ao carregar.</div>';
  }
}

async function abrirModal(id) {
  editandoId = id;
  document.getElementById('msg-modal').innerHTML = '';
  document.getElementById('f-senha').value = '';
  document.getElementById('f-master').checked = false;

  if (id) {
    document.getElementById('modal-title').textContent = 'Editar administrador';
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
    document.getElementById('modal-title').textContent = 'Novo administrador';
    document.getElementById('f-usuario').disabled = false;
    document.getElementById('f-usuario').value = '';
    document.getElementById('f-nome').value = '';
    document.getElementById('lbl-senha-dica').textContent = '(mínimo 6 caracteres)';
  }

  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('f-usuario').focus();
}

function fecharModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  editandoId = null;
}

async function toggleAtivo(id, ativo) {
  const r = await api(`/api/admin/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify({ ativo: !ativo }) });
  const d = await r.json();
  if (!r.ok) { alert(d.erro); return; }
  await carregarAdmins();
}

async function removerAdmin(id) {
  if (!confirm('Tem certeza? Esta ação excluirá o administrador permanentemente e não pode ser desfeita.')) return;
  const r = await api(`/api/admin/usuarios/${id}`, { method: 'DELETE' });
  const d = await r.json();
  if (!r.ok) { alert(d.erro); return; }
  await carregarAdmins();
}
