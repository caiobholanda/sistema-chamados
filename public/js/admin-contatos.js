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

  /* ── Fetch ── */
  async function apiFetch(url, opts = {}) {
    const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
    return data;
  }

  /* ── Carregar ── */
  async function carregar() {
    try {
      contatos = await apiFetch('/api/admin/contatos');
      renderizar();
      atualizarDatalist();
    } catch (e) {
      toast(e.message, 'erro');
    }
  }

  /* ── Filtro ── */
  function filtrar() {
    const q = (document.getElementById('busca-contatos').value || '').toLowerCase().trim();
    if (!q) return contatos;
    return contatos.filter(c =>
      (c.area || '').toLowerCase().includes(q) ||
      (c.wpp || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.pessoas || []).some(p =>
        (p.nome || '').toLowerCase().includes(q) ||
        (p.responsabilidade || '').toLowerCase().includes(q)
      )
    );
  }

  /* ── Links ── */
  function linkTel(n) {
    if (!n) return '<span style="color:var(--text-muted)">—</span>';
    const l = n.replace(/\D/g, '');
    return `<a href="tel:+55${l}">${n}</a>`;
  }
  function linkWpp(n) {
    if (!n) return '<span style="color:var(--text-muted)">—</span>';
    const l = n.replace(/\D/g, '');
    return `<a href="https://wa.me/55${l}" target="_blank" rel="noopener">${n}</a>`;
  }
  function linkEmail(e) {
    if (!e) return '<span style="color:var(--text-muted)">—</span>';
    return `<a href="mailto:${e}">${e}</a>`;
  }
  function dash(v) { return v || '<span style="color:var(--text-muted)">—</span>'; }

  /* ── Renderizar lista ── */
  function renderizar() {
    const lista = document.getElementById('lista-contatos');
    const dados = filtrar();

    if (dados.length === 0) {
      lista.innerHTML = `<div style="padding:3rem 0;text-align:center;color:var(--text-muted);font-size:.9rem">
        Nenhum contato encontrado.
      </div>`;
      return;
    }

    lista.innerHTML = dados.map(c => {
      const temMeta = c.wpp || c.telefone_fixo || c.email;
      const pessoas = c.pessoas || [];

      return `
        <div class="card" style="margin-bottom:1.25rem;overflow:hidden">
          <div class="contato-card-header">
            <span style="color:var(--gold);font-size:.82rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase">
              ${c.area || '<span style="color:rgba(212,175,55,.5)">Sem nome</span>'}
            </span>
            <div style="display:flex;gap:.3rem;flex-shrink:0">
              <button class="btn btn-ghost btn-sm" data-edit="${c.id}" title="Editar" style="color:rgba(255,255,255,.7)">✏️ Editar</button>
              <button class="btn btn-ghost btn-sm" data-del="${c.id}" data-nome="${c.area || 'este contato'}" title="Excluir" style="color:#f87171">🗑</button>
            </div>
          </div>

          ${temMeta ? `
          <div class="contato-card-meta">
            ${c.wpp ? `<span class="meta-item">📱 WPP: ${linkWpp(c.wpp)}</span>` : ''}
            ${c.telefone_fixo ? `<span class="meta-item">☎️ Fixo: ${linkTel(c.telefone_fixo)}</span>` : ''}
            ${c.email ? `<span class="meta-item">✉️ ${linkEmail(c.email)}</span>` : ''}
          </div>` : ''}

          <div class="contato-card-pessoas">
            ${pessoas.length > 0 ? `
              <div class="pessoas-header">
                <div>Nome</div>
                <div>Responsabilidade</div>
                <div>Celular</div>
                <div></div>
              </div>
              ${pessoas.map(p => `
                <div class="pessoa-linha">
                  <div>${dash(p.nome)}</div>
                  <div style="color:var(--text-secondary)">${dash(p.responsabilidade)}</div>
                  <div>${p.celular ? linkTel(p.celular) : '<span style="color:var(--text-muted)">—</span>'}</div>
                  <div class="p-acoes"></div>
                </div>
              `).join('')}
            ` : `
              <div style="padding:.75rem 1rem;font-size:.8rem;color:var(--text-muted)">Nenhuma pessoa cadastrada.</div>
            `}
          </div>
        </div>`;
    }).join('');

    lista.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => abrirEditar(+btn.dataset.edit)));
    lista.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', () => confirmarExcluir(+btn.dataset.del, btn.dataset.nome)));
  }

  function atualizarDatalist() {
    const dl = document.getElementById('areas-datalist');
    if (!dl) return;
    const areas = [...new Set(contatos.map(c => c.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    dl.innerHTML = areas.map(a => `<option value="${a}">`).join('');
  }

  /* ── Pessoas no modal ── */
  function renderPessoas(lista) {
    const container = document.getElementById('pessoas-container');
    const vazio = document.getElementById('pessoas-vazio');
    container.innerHTML = '';
    (lista || []).forEach(p => adicionarLinhaPessoa(p));
    atualizarVazio();
  }

  function adicionarLinhaPessoa(p = {}) {
    const container = document.getElementById('pessoas-container');
    const row = document.createElement('div');
    row.className = 'pessoa-row';
    row.innerHTML = `
      <div>
        <input class="form-control p-nome" type="text" placeholder="Nome" maxlength="80" value="${p.nome || ''}" autocomplete="off">
      </div>
      <div>
        <input class="form-control p-resp" type="text" placeholder="Responsabilidade" maxlength="80" value="${p.responsabilidade || ''}" autocomplete="off">
      </div>
      <div>
        <input class="form-control p-cel" type="tel" placeholder="(85) 9 0000-0000" maxlength="20" value="${p.celular || ''}" inputmode="tel">
      </div>
      <button type="button" class="btn-remover-pessoa" title="Remover">✕</button>
    `;
    row.querySelector('.btn-remover-pessoa').addEventListener('click', () => {
      row.remove();
      atualizarVazio();
    });
    container.appendChild(row);
    atualizarVazio();
  }

  function atualizarVazio() {
    const container = document.getElementById('pessoas-container');
    const vazio = document.getElementById('pessoas-vazio');
    vazio.style.display = container.children.length === 0 ? 'block' : 'none';
  }

  function coletarPessoas() {
    return Array.from(document.getElementById('pessoas-container').querySelectorAll('.pessoa-row')).map(row => ({
      nome: row.querySelector('.p-nome').value.trim() || null,
      responsabilidade: row.querySelector('.p-resp').value.trim() || null,
      celular: row.querySelector('.p-cel').value.trim() || null,
    }));
  }

  /* ── Modal ── */
  function abrirModal(titulo) {
    document.getElementById('modal-contato-title').textContent = titulo;
    document.getElementById('msg-modal-contato').innerHTML = '';
    document.getElementById('modal-contato-overlay').style.display = 'flex';
  }

  function fecharModal() {
    document.getElementById('modal-contato-overlay').style.display = 'none';
    document.getElementById('form-contato').reset();
    document.getElementById('contato-id').value = '';
    document.getElementById('pessoas-container').innerHTML = '';
    atualizarVazio();
  }

  function abrirNovo() {
    document.getElementById('contato-id').value = '';
    document.getElementById('fc-area').value = '';
    document.getElementById('fc-wpp').value = '';
    document.getElementById('fc-fixo').value = '';
    document.getElementById('fc-email').value = '';
    renderPessoas([]);
    abrirModal('Novo Contato');
  }

  function abrirEditar(id) {
    const c = contatos.find(x => x.id === id);
    if (!c) return;
    document.getElementById('contato-id').value = id;
    document.getElementById('fc-area').value = c.area || '';
    document.getElementById('fc-wpp').value = c.wpp || '';
    document.getElementById('fc-fixo').value = c.telefone_fixo || '';
    document.getElementById('fc-email').value = c.email || '';
    renderPessoas(c.pessoas || []);
    abrirModal('Editar Contato');
  }

  async function salvar(e) {
    e.preventDefault();
    const id = document.getElementById('contato-id').value;
    const payload = {
      area: document.getElementById('fc-area').value.trim() || null,
      wpp: document.getElementById('fc-wpp').value.trim() || null,
      telefone_fixo: document.getElementById('fc-fixo').value.trim() || null,
      email: document.getElementById('fc-email').value.trim() || null,
      pessoas: coletarPessoas(),
    };

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
      document.getElementById('msg-modal-contato').innerHTML =
        `<div class="alert alert-danger" style="margin-bottom:.75rem">${err.message}</div>`;
    }
  }

  /* ── Excluir ── */
  function confirmarExcluir(id, nome) {
    excluirId = id;
    document.getElementById('excluir-msg').textContent = `Tem certeza que deseja excluir "${nome}"? Todas as pessoas cadastradas neste contato também serão removidas.`;
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
    document.getElementById('btn-add-pessoa').addEventListener('click', () => adicionarLinhaPessoa());
    document.getElementById('form-contato').addEventListener('submit', salvar);

    document.getElementById('btn-fechar-excluir').addEventListener('click', fecharExcluir);
    document.getElementById('btn-cancelar-excluir').addEventListener('click', fecharExcluir);
    document.getElementById('btn-ok-excluir').addEventListener('click', executarExcluir);

    document.getElementById('busca-contatos').addEventListener('input', renderizar);
  });
})();
