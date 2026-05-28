(function () {
  'use strict';

  let setores = [];
  let editandoId = null;
  let confirmCallback = null;

  function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function toast(msg, tipo = 'sucesso') {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const el = document.createElement('div');
    el.className = `toast-notif toast-${tipo}`;
    const icon = tipo === 'sucesso' ? '✓' : '✕';
    el.innerHTML = `<span><span class="toast-icon">${icon}</span>${esc(msg)}</span>`;
    c.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
    setTimeout(() => { el.classList.add('hide'); setTimeout(() => el.remove(), 320); }, 3200);
  }

  async function api(url, opts = {}) {
    const res = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
    return data;
  }

  async function verificarAuth() {
    try {
      const info = await api('/api/admin/me');
      if (!info.is_master) {
        document.querySelector('main').innerHTML =
          '<div style="padding:2rem;color:var(--text-muted)">Acesso restrito a administradores master.</div>';
        return false;
      }
      return true;
    } catch {
      window.location.href = '/admin-login.html';
      return false;
    }
  }

  async function carregar() {
    setores = await api('/api/setores');
    renderizar(document.getElementById('filtro-setores')?.value || '');
  }

  function renderizar(filtro) {
    const el = document.getElementById('lista-setores');
    if (!el) return;

    const q = filtro.trim().toLowerCase();
    const lista = q ? setores.filter(s => s.nome.toLowerCase().includes(q)) : setores;

    if (!lista.length) {
      el.innerHTML = `<div class="empty-state">${q ? 'Nenhum setor encontrado.' : 'Nenhum setor cadastrado ainda.'}</div>`;
      return;
    }

    el.innerHTML = `<div class="st-grid">${lista.map(s => `
      <div class="st-card">
        <div class="st-card-body">
          <div class="st-card-nome">${esc(s.nome)}</div>
        </div>
        <div class="st-card-actions">
          <button class="btn btn-secondary btn-sm" data-editar="${s.id}">Editar</button>
          <button class="btn btn-danger btn-sm" data-excluir="${s.id}" data-nome="${esc(s.nome)}">Excluir</button>
        </div>
      </div>
    `).join('')}</div>`;

    el.querySelectorAll('[data-editar]').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = setores.find(x => x.id === +btn.dataset.editar);
        if (s) abrirModal(s);
      });
    });

    el.querySelectorAll('[data-excluir]').forEach(btn => {
      btn.addEventListener('click', () => confirmarExclusao(+btn.dataset.excluir, btn.dataset.nome));
    });
  }

  function abrirModal(setor = null) {
    editandoId = setor ? setor.id : null;
    document.getElementById('modal-setor-title').textContent = setor ? 'Editar setor' : 'Informar novo setor';
    document.getElementById('st-id').value = setor ? setor.id : '';
    document.getElementById('st-nome').value = setor ? setor.nome : '';
    document.getElementById('modal-setor-overlay').classList.add('open');
    requestAnimationFrame(() => document.getElementById('st-nome').focus());
  }

  function fecharModal() {
    document.getElementById('modal-setor-overlay').classList.remove('open');
    editandoId = null;
  }

  async function salvar() {
    const nome = document.getElementById('st-nome').value.trim();
    if (!nome) {
      document.getElementById('st-nome').focus();
      return;
    }
    const btn = document.getElementById('btn-salvar-setor');
    btn.disabled = true;
    try {
      if (editandoId) {
        await api(`/api/setores/${editandoId}`, { method: 'PUT', body: JSON.stringify({ nome }) });
        toast('Setor atualizado com sucesso');
      } else {
        await api('/api/setores', { method: 'POST', body: JSON.stringify({ nome }) });
        toast('Setor criado com sucesso');
      }
      fecharModal();
      await carregar();
    } catch (e) {
      toast(e.message || 'Erro ao salvar', 'erro');
    } finally {
      btn.disabled = false;
    }
  }

  function confirmarExclusao(id, nome) {
    document.getElementById('confirm-setor-msg').textContent = `Excluir o setor "${nome}"? Esta ação não pode ser desfeita.`;
    confirmCallback = async () => {
      try {
        await api(`/api/setores/${id}`, { method: 'DELETE' });
        toast('Setor excluído');
        fecharConfirm();
        await carregar();
      } catch (e) {
        toast(e.message || 'Erro ao excluir', 'erro');
      }
    };
    document.getElementById('modal-confirm-setor-overlay').classList.add('open');
  }

  function fecharConfirm() {
    document.getElementById('modal-confirm-setor-overlay').classList.remove('open');
    confirmCallback = null;
  }

  // ── Eventos ────────────────────────────────────────────────────────────────
  document.getElementById('btn-novo-setor').addEventListener('click', () => abrirModal());
  document.getElementById('btn-fechar-setor').addEventListener('click', fecharModal);
  document.getElementById('btn-cancelar-setor').addEventListener('click', fecharModal);
  document.getElementById('btn-salvar-setor').addEventListener('click', salvar);
  document.getElementById('st-nome').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); salvar(); } });

  document.getElementById('btn-fechar-confirm-setor').addEventListener('click', fecharConfirm);
  document.getElementById('btn-cancelar-confirm-setor').addEventListener('click', fecharConfirm);
  document.getElementById('btn-ok-confirm-setor').addEventListener('click', () => { if (confirmCallback) confirmCallback(); });

  document.getElementById('modal-setor-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) fecharModal();
  });
  document.getElementById('modal-confirm-setor-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) fecharConfirm();
  });

  let filtroT = null;
  document.getElementById('filtro-setores').addEventListener('input', e => {
    clearTimeout(filtroT);
    filtroT = setTimeout(() => renderizar(e.target.value), 150);
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  verificarAuth().then(ok => { if (ok) carregar(); });
})();
