(function () {
  'use strict';

  let contatos = [];
  let excluirId = null;

  /* ── Toast ── */
  function toast(msg, tipo = 'sucesso') {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const el = document.createElement('div');
    el.className = `toast toast-${tipo}`;
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  /* ── Fetch helpers ── */
  async function apiFetch(url, opts = {}) {
    const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
    return data;
  }

  /* ── Carregar e renderizar ── */
  async function carregar() {
    try {
      contatos = await apiFetch('/api/admin/contatos');
      renderizar();
      atualizarDatalist();
    } catch (e) {
      toast(e.message, 'erro');
    }
  }

  function filtrar() {
    const q = (document.getElementById('busca-contatos').value || '').toLowerCase();
    if (!q) return contatos;
    return contatos.filter(c =>
      (c.area || '').toLowerCase().includes(q) ||
      (c.nome || '').toLowerCase().includes(q) ||
      (c.responsabilidade || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  }

  function linkTel(numero) {
    if (!numero) return '';
    const limpo = numero.replace(/\D/g, '');
    return `<a href="tel:+55${limpo}" style="color:inherit;text-decoration:none">${numero}</a>`;
  }

  function linkWpp(numero) {
    if (!numero) return '';
    const limpo = numero.replace(/\D/g, '');
    return `<a href="https://wa.me/55${limpo}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">${numero}</a>`;
  }

  function linkEmail(email) {
    if (!email) return '';
    return `<a href="mailto:${email}" style="color:inherit;text-decoration:none">${email}</a>`;
  }

  function renderizar() {
    const lista = document.getElementById('lista-contatos');
    const dados = filtrar();

    if (dados.length === 0) {
      lista.innerHTML = `<div class="empty-state" style="padding:3rem 0;text-align:center;color:var(--text-muted)">
        Nenhum contato encontrado.
      </div>`;
      return;
    }

    /* Agrupar por área */
    const grupos = {};
    for (const c of dados) {
      const chave = c.area || '—';
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(c);
    }

    let html = '';
    for (const area of Object.keys(grupos).sort((a, b) => a.localeCompare(b, 'pt-BR'))) {
      const itens = grupos[area];
      html += `
        <div class="card" style="margin-bottom:1.25rem;overflow:hidden">
          <div style="background:var(--navy);padding:.6rem 1rem;display:flex;align-items:center;justify-content:space-between">
            <span style="color:var(--gold);font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase">${area}</span>
            <span style="color:rgba(255,255,255,.4);font-size:.72rem">${itens.length} ${itens.length === 1 ? 'contato' : 'contatos'}</span>
          </div>
          <div class="table-wrap" style="border:none;border-radius:0;box-shadow:none">
            <table style="margin:0">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Responsabilidade</th>
                  <th>WhatsApp</th>
                  <th>Fixo</th>
                  <th>Celular</th>
                  <th>E-mail</th>
                  <th style="width:80px"></th>
                </tr>
              </thead>
              <tbody>
                ${itens.map(c => `
                  <tr>
                    <td>${c.nome || '<span style="color:var(--text-muted)">—</span>'}</td>
                    <td>${c.responsabilidade || '<span style="color:var(--text-muted)">—</span>'}</td>
                    <td>${c.wpp ? linkWpp(c.wpp) : '<span style="color:var(--text-muted)">—</span>'}</td>
                    <td>${c.telefone_fixo ? linkTel(c.telefone_fixo) : '<span style="color:var(--text-muted)">—</span>'}</td>
                    <td>${c.celular ? linkTel(c.celular) : '<span style="color:var(--text-muted)">—</span>'}</td>
                    <td>${c.email ? linkEmail(c.email) : '<span style="color:var(--text-muted)">—</span>'}</td>
                    <td>
                      <div style="display:flex;gap:.3rem;justify-content:flex-end">
                        <button class="btn btn-ghost btn-sm" data-edit="${c.id}" title="Editar">✏️</button>
                        <button class="btn btn-ghost btn-sm" data-del="${c.id}" data-nome="${c.nome || c.area || 'este contato'}" title="Excluir" style="color:var(--danger)">🗑</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
    }

    lista.innerHTML = html;
    lista.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => abrirEditar(+btn.dataset.edit)));
    lista.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', () => confirmarExcluir(+btn.dataset.del, btn.dataset.nome)));
  }

  function atualizarDatalist() {
    const dl = document.getElementById('areas-datalist');
    if (!dl) return;
    const areas = [...new Set(contatos.map(c => c.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    dl.innerHTML = areas.map(a => `<option value="${a}">`).join('');
  }

  /* ── Modal Contato ── */
  function abrirModal(titulo) {
    document.getElementById('modal-contato-title').textContent = titulo;
    document.getElementById('msg-modal-contato').innerHTML = '';
    document.getElementById('modal-contato-overlay').style.display = 'flex';
  }

  function fecharModal() {
    document.getElementById('modal-contato-overlay').style.display = 'none';
    document.getElementById('form-contato').reset();
    document.getElementById('contato-id').value = '';
  }

  function abrirNovo() {
    document.getElementById('contato-id').value = '';
    abrirModal('Novo Contato');
  }

  function abrirEditar(id) {
    const c = contatos.find(x => x.id === id);
    if (!c) return;
    document.getElementById('contato-id').value = id;
    document.getElementById('fc-area').value = c.area || '';
    document.getElementById('fc-nome').value = c.nome || '';
    document.getElementById('fc-resp').value = c.responsabilidade || '';
    document.getElementById('fc-wpp').value = c.wpp || '';
    document.getElementById('fc-fixo').value = c.telefone_fixo || '';
    document.getElementById('fc-cel').value = c.celular || '';
    document.getElementById('fc-email').value = c.email || '';
    abrirModal('Editar Contato');
  }

  async function salvar(e) {
    e.preventDefault();
    const id = document.getElementById('contato-id').value;
    const payload = {
      area: document.getElementById('fc-area').value.trim() || null,
      nome: document.getElementById('fc-nome').value.trim() || null,
      responsabilidade: document.getElementById('fc-resp').value.trim() || null,
      wpp: document.getElementById('fc-wpp').value.trim() || null,
      telefone_fixo: document.getElementById('fc-fixo').value.trim() || null,
      celular: document.getElementById('fc-cel').value.trim() || null,
      email: document.getElementById('fc-email').value.trim() || null,
    };

    const msgEl = document.getElementById('msg-modal-contato');
    try {
      if (id) {
        await apiFetch(`/api/admin/contatos/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast('Contato atualizado.');
      } else {
        await apiFetch('/api/admin/contatos', { method: 'POST', body: JSON.stringify(payload) });
        toast('Contato criado.');
      }
      fecharModal();
      carregar();
    } catch (err) {
      msgEl.innerHTML = `<div class="alert alert-danger" style="margin-bottom:.75rem">${err.message}</div>`;
    }
  }

  /* ── Modal Excluir ── */
  function confirmarExcluir(id, nome) {
    excluirId = id;
    document.getElementById('excluir-msg').textContent = `Tem certeza que deseja excluir "${nome}"? Esta ação não pode ser desfeita.`;
    document.getElementById('modal-excluir-overlay').style.display = 'flex';
  }

  function fecharExcluir() {
    document.getElementById('modal-excluir-overlay').style.display = 'none';
    excluirId = null;
  }

  async function executarExcluir() {
    if (!excluirId) return;
    try {
      await apiFetch(`/api/admin/contatos/${excluirId}`, { method: 'DELETE' });
      toast('Contato excluído.');
      fecharExcluir();
      carregar();
    } catch (err) {
      toast(err.message, 'erro');
      fecharExcluir();
    }
  }

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', () => {
    carregar();

    document.getElementById('btn-novo-contato').addEventListener('click', abrirNovo);
    document.getElementById('btn-fechar-contato').addEventListener('click', fecharModal);
    document.getElementById('btn-cancelar-contato').addEventListener('click', fecharModal);
    document.getElementById('form-contato').addEventListener('submit', salvar);

    document.getElementById('btn-fechar-excluir').addEventListener('click', fecharExcluir);
    document.getElementById('btn-cancelar-excluir').addEventListener('click', fecharExcluir);
    document.getElementById('btn-ok-excluir').addEventListener('click', executarExcluir);

    document.getElementById('busca-contatos').addEventListener('input', renderizar);
  });
})();
