(function () {
  'use strict';

  const CORES_PALETA = [
    '#6366F1','#0EA5E9','#06B6D4','#10B981','#F59E0B','#EF4444',
    '#EC4899','#8B5CF6','#F97316','#14B8A6','#3B82F6','#84CC16',
    '#E11D48','#7C3AED','#0891B2','#DC2626','#D97706','#059669',
  ];

  function corAleatoria() {
    return CORES_PALETA[Math.floor(Math.random() * CORES_PALETA.length)];
  }

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
    el.className = `toast-notif toast-${tipo}`;
    const icon = tipo === 'sucesso' ? '✓' : '✕';
    el.innerHTML = `<span><span class="toast-icon">${icon}</span>${esc(msg)}</span>`;
    c.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
    setTimeout(() => {
      el.classList.add('hide');
      setTimeout(() => el.remove(), 320);
    }, 3200);
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
    const et = etiquetas.find(e => e.slug === slug);
    return et ? et.nome : slug;
  }

  function breadcrumb(e) {
    if (!e.parent_slug) return '';
    const pai = etiquetas.find(x => x.slug === e.parent_slug);
    if (!pai) return e.parent_slug;
    const paiBC = breadcrumb(pai);
    return paiBC ? `${paiBC} › ${pai.nome}` : pai.nome;
  }

  function etiquetasFiltradas() {
    const q = (document.getElementById('filtro-etiquetas')?.value || '').toLowerCase().trim();
    if (!q) return etiquetas;
    return etiquetas.filter(e => {
      const pNome = nomePai(e.parent_slug).toLowerCase();
      return e.nome.toLowerCase().includes(q)
        || (e.descricao || '').toLowerCase().includes(q)
        || (e.slug || '').toLowerCase().includes(q)
        || pNome.includes(q);
    });
  }

  function renderizar() {
    const el = document.getElementById('lista-etiquetas');
    const lista = etiquetasFiltradas();

    if (!lista.length) {
      el.innerHTML = '<div class="empty-state">Nenhuma etiqueta encontrada.</div>';
      return;
    }

    const byParent = {};
    lista.forEach(e => {
      const p = e.parent_slug || '__root__';
      if (!byParent[p]) byParent[p] = [];
      byParent[p].push(e);
    });

    function countAll(slug) {
      return (byParent[slug] || []).reduce((n, k) => n + 1 + countAll(k.slug), 0);
    }

    function renderSub(slug) {
      return (byParent[slug] || []).map(k => {
        const bc = breadcrumb(k);
        return renderCard(k, bc) + renderSub(k.slug);
      }).join('');
    }

    const roots = byParent['__root__'] || [];
    let html = '<div class="et-grid">';
    for (const p of roots) {
      const total = 1 + countAll(p.slug);
      html += '<div>';
      html += `<div class="et-section-label">
        <span style="width:8px;height:8px;border-radius:50%;background:${esc(p.cor||'#6B7280')};display:inline-block;flex-shrink:0"></span>
        ${esc(p.nome)}
        <span>${total} etiqueta${total>1?'s':''}</span>
      </div>`;
      html += '<div class="et-cards">';
      html += renderCard(p);
      html += renderSub(p.slug);
      html += '</div></div>';
    }

    // Órfãos: etiquetas cujo pai não está na lista filtrada
    const listaSet = new Set(lista.map(e => e.slug));
    const orfaos = lista.filter(e => e.parent_slug && !listaSet.has(e.parent_slug));
    if (orfaos.length) {
      html += '<div><div class="et-section-label">Sub-etiquetas</div><div class="et-cards">';
      for (const s of orfaos) html += renderCard(s, breadcrumb(s) || nomePai(s.parent_slug));
      html += '</div></div>';
    }

    html += '</div>';
    el.innerHTML = html;
    bindAcoes();
  }

  function renderCard(e, ancestralNome) {
    const cor = e.cor || '#6B7280';
    return `
      <div class="et-card${e.ativo ? '' : ' et-card-inativo'}" data-id="${e.id}">
        <div class="et-card-accent" style="background:${esc(cor)}"></div>
        <div class="et-card-body">
          <div class="et-card-top">
            <span style="width:9px;height:9px;border-radius:50%;background:${esc(cor)};flex-shrink:0;display:inline-block"></span>
            <span class="et-card-nome">${esc(e.nome)}</span>
            ${ancestralNome ? `<span class="et-card-sub-badge">↳ ${esc(ancestralNome)}</span>` : ''}
            ${!e.ativo ? '<span class="et-card-inativo-badge">Inativa</span>' : ''}
          </div>
          ${e.descricao ? `<div class="et-card-desc">${esc(e.descricao)}</div>` : '<div class="et-card-desc" style="font-style:italic;opacity:.5">Sem descrição</div>'}
        </div>
        <div class="et-card-actions">
          <button class="btn btn-sm btn-secondary btn-editar-et" data-id="${e.id}">Editar</button>
          <button class="btn btn-sm btn-danger btn-del-et" data-id="${e.id}">✕</button>
        </div>
      </div>`;
  }

  function bindAcoes() {
    document.querySelectorAll('.btn-editar-et').forEach(b => b.addEventListener('click', () => abrirEdicao(+b.dataset.id)));
    document.querySelectorAll('.btn-del-et').forEach(b => b.addEventListener('click', () => confirmarDelete(+b.dataset.id)));
  }

  /* ── Modal ── */
  function popularParentSelect(parentAtual, eSistema) {
    const wrap = document.getElementById('et-parent-wrap');
    const sel  = document.getElementById('et-parent');
    // Etiquetas do sistema têm hierarquia fixa — esconde campo pai
    if (eSistema) { if (wrap) wrap.style.display = 'none'; return; }
    if (wrap) wrap.style.display = '';
    sel.innerHTML = '<option value="">— Nenhuma (etiqueta principal) —</option>';

    // Inclui todas as etiquetas como possíveis pais (permite hierarquia de 3+ níveis)
    const candidatos = etiquetas.filter(e => e.ativo && e.id !== editandoId);
    const pSistema = candidatos.filter(e => e.sistema);
    const pCustom  = candidatos.filter(e => !e.sistema);

    if (pSistema.length) {
      const g = document.createElement('optgroup');
      g.label = 'Sistema';
      pSistema.forEach(e => {
        const o = document.createElement('option');
        const bc = breadcrumb(e);
        o.value = e.slug;
        o.textContent = bc ? `${bc} › ${e.nome}` : e.nome;
        if (e.slug === parentAtual) o.selected = true;
        g.appendChild(o);
      });
      sel.appendChild(g);
    }
    if (pCustom.length) {
      const g = document.createElement('optgroup');
      g.label = 'Personalizadas';
      pCustom.forEach(e => {
        const o = document.createElement('option');
        const bc = breadcrumb(e);
        o.value = e.slug;
        o.textContent = bc ? `${bc} › ${e.nome}` : e.nome;
        if (e.slug === parentAtual) o.selected = true;
        g.appendChild(o);
      });
      sel.appendChild(g);
    }
  }

  function abrirModal(titulo, dados = {}) {
    editandoId = dados.id || null;
    const eSistema = !!dados.sistema;
    const cor = dados.cor || corAleatoria();

    document.getElementById('modal-etiqueta-title').textContent = titulo;
    document.getElementById('et-id').value    = dados.id || '';
    document.getElementById('et-nome').value  = dados.nome || '';
    document.getElementById('et-descricao').value = dados.descricao || '';
    document.getElementById('et-cor').value   = cor;
    atualizarPreview(cor, dados.nome || 'Etiqueta');
    popularParentSelect(dados.parent_slug || '', eSistema);
    document.getElementById('modal-etiqueta-overlay').classList.add('open');
    setTimeout(() => document.getElementById('et-nome').focus(), 50);
  }

  function fecharModal() {
    document.getElementById('modal-etiqueta-overlay').classList.remove('open');
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
    const nome      = document.getElementById('et-nome').value.trim();
    const descricao = document.getElementById('et-descricao').value.trim();
    const cor       = document.getElementById('et-cor').value;
    const wrap      = document.getElementById('et-parent-wrap');
    const parent_slug = (wrap && wrap.style.display === 'none')
      ? undefined
      : (document.getElementById('et-parent').value || null);

    if (!nome) { toast('Nome é obrigatório.', 'erro'); document.getElementById('et-nome').focus(); return; }

    const btn = document.getElementById('btn-salvar-etiqueta');
    btn.disabled = true;
    try {
      const body = { nome, descricao, cor };
      if (parent_slug !== undefined) body.parent_slug = parent_slug;

      if (editandoId) {
        await api(`/api/etiquetas/${editandoId}`, { method: 'PATCH', body: JSON.stringify(body) });
        toast('Etiqueta atualizada.');
      } else {
        await api('/api/etiquetas', { method: 'POST', body: JSON.stringify({ ...body, parent_slug: parent_slug ?? null }) });
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

  function confirmarDelete(id) {
    const e = etiquetas.find(x => x.id === id);
    if (!e) return;
    document.getElementById('confirm-msg').textContent =
      `Excluir permanentemente "${e.nome}"? Chamados com essa etiqueta não serão afetados.`;
    confirmCallback = async () => {
      try {
        await api(`/api/etiquetas/${id}`, { method: 'DELETE' });
        toast('Etiqueta excluída.');
        fecharConfirm();
        await carregar();
      } catch (err) { toast(err.message, 'erro'); }
    };
    document.getElementById('modal-confirm-overlay').classList.add('open');
  }

  function fecharConfirm() {
    document.getElementById('modal-confirm-overlay').classList.remove('open');
    confirmCallback = null;
  }

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', async () => {
    const ok = await verificarAuth();
    if (!ok) return;
    await carregar();

    document.getElementById('filtro-etiquetas').addEventListener('input', () => renderizar());
    document.getElementById('btn-nova-etiqueta').addEventListener('click', () => abrirModal('Nova Etiqueta'));
    document.getElementById('btn-salvar-etiqueta').addEventListener('click', salvar);
    document.getElementById('btn-cancelar-etiqueta').addEventListener('click', fecharModal);
    document.getElementById('btn-fechar-etiqueta').addEventListener('click', fecharModal);
    document.getElementById('modal-etiqueta-overlay').addEventListener('click', ev => { if (ev.target === ev.currentTarget) fecharModal(); });
    document.getElementById('form-etiqueta').addEventListener('submit', ev => { ev.preventDefault(); salvar(); });

    document.getElementById('btn-ok-confirm').addEventListener('click', () => confirmCallback?.());
    document.getElementById('btn-cancelar-confirm').addEventListener('click', fecharConfirm);
    document.getElementById('btn-fechar-confirm').addEventListener('click', fecharConfirm);
    document.getElementById('modal-confirm-overlay').addEventListener('click', ev => { if (ev.target === ev.currentTarget) fecharConfirm(); });

    document.getElementById('et-cor').addEventListener('input', ev => {
      atualizarPreview(ev.target.value, document.getElementById('et-nome').value || 'Etiqueta');
    });
    document.getElementById('et-nome').addEventListener('input', ev => {
      atualizarPreview(document.getElementById('et-cor').value, ev.target.value || 'Etiqueta');
    });

    document.addEventListener('keydown', ev => {
      if (ev.key === 'Escape') { fecharModal(); fecharConfirm(); }
    });
  });
})();
