(function () {
  'use strict';

  const PARENTS_ESTATICOS = [
    { slug: 'software',        nome: 'Software' },
    { slug: 'hardware',        nome: 'Hardware' },
    { slug: 'cameras',         nome: 'Câmeras / CFTV' },
    { slug: 'email',           nome: 'E-mail' },
    { slug: 'processo_compra', nome: 'Processo de Compra' },
  ];

  let etiquetas = [];
  let editandoId = null;
  let confirmCallback = null;

  /* ── Utils ── */
  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function toast(msg, tipo = 'sucesso') {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const el = document.createElement('div');
    el.className = `toast toast-${tipo}`;
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => el.remove(), 3500);
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

  /* ── Auth (master only) ── */
  async function verificarAuth() {
    try {
      const info = await api('/api/admin/me');
      if (!info.is_master) {
        document.querySelector('main').innerHTML =
          '<div class="empty-state">Acesso restrito a administradores master.</div>';
        return false;
      }
      return true;
    } catch {
      window.location.href = '/admin-login.html';
      return false;
    }
  }

  /* ── Carregar ── */
  async function carregar() {
    try {
      etiquetas = await api('/api/etiquetas/admin');
      renderizar();
    } catch (e) {
      document.getElementById('lista-etiquetas').innerHTML =
        `<p style="color:var(--danger);padding:1rem">${esc(e.message)}</p>`;
    }
  }

  /* ── Render ── */
  function nomePai(slug) {
    if (!slug) return '';
    const estatico = PARENTS_ESTATICOS.find(p => p.slug === slug);
    if (estatico) return estatico.nome;
    const dinamico = etiquetas.find(e => e.slug === slug);
    return dinamico ? dinamico.nome : slug;
  }

  function renderizar() {
    const el = document.getElementById('lista-etiquetas');
    if (!etiquetas.length) {
      el.innerHTML = '<div class="empty-state">Nenhuma etiqueta personalizada criada ainda.<br>Clique em <strong>+ Nova Etiqueta</strong> para começar.</div>';
      return;
    }

    const primarias = etiquetas.filter(e => !e.parent_slug);
    const subPorParent = {};
    etiquetas.filter(e => e.parent_slug).forEach(e => {
      if (!subPorParent[e.parent_slug]) subPorParent[e.parent_slug] = [];
      subPorParent[e.parent_slug].push(e);
    });

    let html = '<div class="etiqueta-tree">';

    if (primarias.length) {
      html += `<div class="etiqueta-group">
        <div class="etiqueta-group-header">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/></svg>
          Etiquetas Principais
        </div>`;
      for (const e of primarias) {
        html += renderRow(e, null);
        const subs = subPorParent[e.slug] || [];
        if (subs.length) {
          for (const s of subs) html += renderRow(s, e.nome, true);
        }
      }
      html += '</div>';
    }

    // Subs de pais estáticos
    const staticParentKeys = PARENTS_ESTATICOS.map(p => p.slug);
    const subsEstaticos = etiquetas.filter(e => e.parent_slug && staticParentKeys.includes(e.parent_slug));
    if (subsEstaticos.length) {
      const agrupado = {};
      subsEstaticos.forEach(e => {
        if (!agrupado[e.parent_slug]) agrupado[e.parent_slug] = [];
        agrupado[e.parent_slug].push(e);
      });
      for (const [pSlug, subs] of Object.entries(agrupado)) {
        const pNome = nomePai(pSlug);
        html += `<div class="etiqueta-group">
          <div class="etiqueta-group-header">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            Sub-etiquetas de ${esc(pNome)}
          </div>`;
        for (const s of subs) html += renderRow(s, pNome, true);
        html += '</div>';
      }
    }

    html += '</div>';
    el.innerHTML = html;
    bindAcoes();
  }

  function renderRow(e, parentNome, isSub = false) {
    const dot = e.ativo ? `background:${esc(e.cor || '#6B7280')}` : 'background:#ccc';
    return `
      <div class="etiqueta-row${e.ativo ? '' : ' etiqueta-inativo'}" data-id="${e.id}">
        ${isSub ? '<div style="width:20px;flex-shrink:0"></div>' : ''}
        <span class="etiqueta-dot" style="${dot}"></span>
        <span class="etiqueta-nome">${esc(e.nome)}</span>
        ${parentNome && !isSub ? '' : isSub ? `<span class="etiqueta-parent-badge">${esc(parentNome || e.parent_slug)}</span>` : ''}
        <span class="etiqueta-desc">${esc(e.descricao || '—')}</span>
        ${!e.ativo ? '<span class="badge badge-encerrado" style="flex-shrink:0">Inativa</span>' : ''}
        <div class="etiqueta-actions">
          <button class="btn btn-sm btn-secondary btn-editar-et" data-id="${e.id}" title="Editar">Editar</button>
          <button class="btn btn-sm ${e.ativo ? 'btn-ghost' : 'btn-primary'} btn-toggle-et" data-id="${e.id}" data-ativo="${e.ativo ? 1 : 0}" title="${e.ativo ? 'Desativar' : 'Ativar'}">${e.ativo ? 'Desativar' : 'Ativar'}</button>
          <button class="btn btn-sm btn-danger btn-del-et" data-id="${e.id}" title="Excluir">✕</button>
        </div>
      </div>`;
  }

  function bindAcoes() {
    document.querySelectorAll('.btn-editar-et').forEach(b => b.addEventListener('click', () => abrirEdicao(+b.dataset.id)));
    document.querySelectorAll('.btn-toggle-et').forEach(b => b.addEventListener('click', () => toggleAtivo(+b.dataset.id, +b.dataset.ativo)));
    document.querySelectorAll('.btn-del-et').forEach(b => b.addEventListener('click', () => confirmarDelete(+b.dataset.id)));
  }

  /* ── Modal Etiqueta ── */
  function popularParentSelect(parentAtual) {
    const sel = document.getElementById('et-parent');
    sel.innerHTML = '<option value="">— Nenhuma (etiqueta principal) —</option>';

    // Pais estáticos
    const grp1 = document.createElement('optgroup');
    grp1.label = 'Categorias do sistema';
    PARENTS_ESTATICOS.forEach(p => {
      const o = document.createElement('option');
      o.value = p.slug; o.textContent = p.nome;
      if (p.slug === parentAtual) o.selected = true;
      grp1.appendChild(o);
    });
    sel.appendChild(grp1);

    // Etiquetas dinâmicas primárias (editando != id atual)
    const dinPrimarias = etiquetas.filter(e => !e.parent_slug && e.ativo && e.id !== editandoId);
    if (dinPrimarias.length) {
      const grp2 = document.createElement('optgroup');
      grp2.label = 'Etiquetas personalizadas';
      dinPrimarias.forEach(e => {
        const o = document.createElement('option');
        o.value = e.slug; o.textContent = e.nome;
        if (e.slug === parentAtual) o.selected = true;
        grp2.appendChild(o);
      });
      sel.appendChild(grp2);
    }
  }

  function abrirModal(titulo, dados = {}) {
    editandoId = dados.id || null;
    document.getElementById('modal-etiqueta-title').textContent = titulo;
    document.getElementById('et-id').value = dados.id || '';
    document.getElementById('et-nome').value = dados.nome || '';
    document.getElementById('et-descricao').value = dados.descricao || '';
    const cor = dados.cor || '#6B7280';
    document.getElementById('et-cor').value = cor;
    atualizarPreview(cor, dados.nome || 'Etiqueta');
    popularParentSelect(dados.parent_slug || '');
    document.getElementById('modal-etiqueta-overlay').classList.add('ativo');
    document.getElementById('et-nome').focus();
  }

  function fecharModal() {
    document.getElementById('modal-etiqueta-overlay').classList.remove('ativo');
    document.getElementById('form-etiqueta').reset();
    editandoId = null;
  }

  function atualizarPreview(cor, nome) {
    const el = document.getElementById('et-preview');
    const nomeEl = document.getElementById('et-preview-nome');
    if (el) el.style.background = cor;
    if (nomeEl) nomeEl.textContent = nome || 'Etiqueta';
  }

  /* ── Salvar ── */
  async function salvar() {
    const nome = document.getElementById('et-nome').value.trim();
    const descricao = document.getElementById('et-descricao').value.trim();
    const parent_slug = document.getElementById('et-parent').value || null;
    const cor = document.getElementById('et-cor').value;

    if (!nome) { toast('Nome é obrigatório.', 'erro'); document.getElementById('et-nome').focus(); return; }

    const btn = document.getElementById('btn-salvar-etiqueta');
    btn.disabled = true;
    try {
      if (editandoId) {
        await api(`/api/etiquetas/${editandoId}`, { method: 'PATCH', body: JSON.stringify({ nome, descricao, parent_slug, cor }) });
        toast('Etiqueta atualizada.');
      } else {
        await api('/api/etiquetas', { method: 'POST', body: JSON.stringify({ nome, descricao, parent_slug, cor }) });
        toast('Etiqueta criada.');
      }
      fecharModal();
      await carregar();
    } catch (e) {
      toast(e.message, 'erro');
    } finally {
      btn.disabled = false;
    }
  }

  function abrirEdicao(id) {
    const e = etiquetas.find(x => x.id === id);
    if (!e) return;
    abrirModal('Editar Etiqueta', e);
  }

  /* ── Toggle ativo ── */
  async function toggleAtivo(id, ativoAtual) {
    try {
      await api(`/api/etiquetas/${id}`, { method: 'PATCH', body: JSON.stringify({ ativo: ativoAtual ? 0 : 1 }) });
      toast(ativoAtual ? 'Etiqueta desativada.' : 'Etiqueta ativada.');
      await carregar();
    } catch (e) { toast(e.message, 'erro'); }
  }

  /* ── Delete com confirmação ── */
  function confirmarDelete(id) {
    const e = etiquetas.find(x => x.id === id);
    if (!e) return;
    document.getElementById('confirm-msg').textContent =
      `Excluir permanentemente a etiqueta "${e.nome}"? Chamados com essa etiqueta não serão afetados.`;
    confirmCallback = async () => {
      try {
        await api(`/api/etiquetas/${id}`, { method: 'DELETE' });
        toast('Etiqueta excluída.');
        fecharConfirm();
        await carregar();
      } catch (err) { toast(err.message, 'erro'); }
    };
    document.getElementById('modal-confirm-overlay').classList.add('ativo');
  }

  function fecharConfirm() {
    document.getElementById('modal-confirm-overlay').classList.remove('ativo');
    confirmCallback = null;
  }

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', async () => {
    const ok = await verificarAuth();
    if (!ok) return;
    await carregar();

    document.getElementById('btn-nova-etiqueta').addEventListener('click', () => abrirModal('Nova Etiqueta'));
    document.getElementById('btn-salvar-etiqueta').addEventListener('click', salvar);
    document.getElementById('btn-cancelar-etiqueta').addEventListener('click', fecharModal);
    document.getElementById('btn-fechar-etiqueta').addEventListener('click', fecharModal);
    document.getElementById('modal-etiqueta-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) fecharModal(); });
    document.getElementById('form-etiqueta').addEventListener('submit', e => { e.preventDefault(); salvar(); });

    document.getElementById('btn-ok-confirm').addEventListener('click', () => confirmCallback?.());
    document.getElementById('btn-cancelar-confirm').addEventListener('click', fecharConfirm);
    document.getElementById('btn-fechar-confirm').addEventListener('click', fecharConfirm);
    document.getElementById('modal-confirm-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) fecharConfirm(); });

    document.getElementById('et-cor').addEventListener('input', e => {
      atualizarPreview(e.target.value, document.getElementById('et-nome').value || 'Etiqueta');
    });
    document.getElementById('et-nome').addEventListener('input', e => {
      atualizarPreview(document.getElementById('et-cor').value, e.target.value || 'Etiqueta');
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { fecharModal(); fecharConfirm(); }
    });
  });
})();
