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
  let _parentCombo = null;

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
      window.location.href = 'https://hub-granmarquise.fly.dev/?next=' + encodeURIComponent(location.href);
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
  function _criarParentCombo(wrapEl) {
    if (!wrapEl) return null;
    if (!document.getElementById('_et-pcomb-css')) {
      const st = document.createElement('style');
      st.id = '_et-pcomb-css';
      st.textContent = '.et-pcomb-item:hover{background:var(--surface-2)}.et-pcomb-sel{background:var(--surface-2)}';
      document.head.appendChild(st);
    }
    wrapEl.innerHTML = `<div style="position:relative">
      <input type="text" class="form-control" data-pcomb-inp placeholder="Buscar etiqueta pai…" autocomplete="off">
      <input type="hidden" id="et-parent" data-pcomb-val>
      <div data-pcomb-dd style="display:none;position:absolute;z-index:1050;left:0;right:0;top:calc(100% + 2px);background:var(--surface);border:1px solid var(--border);border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.15);max-height:220px;overflow-y:auto"></div>
    </div>`;
    const inp  = wrapEl.querySelector('[data-pcomb-inp]');
    const valI = wrapEl.querySelector('[data-pcomb-val]');
    const dd   = wrapEl.querySelector('[data-pcomb-dd]');

    function _getSubtreeSlugs(slug) {
      const slugs = new Set();
      const queue = [slug];
      while (queue.length) {
        const s = queue.shift();
        if (!s || slugs.has(s)) continue;
        slugs.add(s);
        etiquetas.filter(e => e.parent_slug === s).forEach(e => queue.push(e.slug));
      }
      return slugs;
    }

    function _render(q) {
      const query = (q || '').toLowerCase().trim();
      const editandoSlug = editandoId ? (etiquetas.find(e => e.id === editandoId)?.slug) : null;
      const subtreeSlugs = editandoSlug ? _getSubtreeSlugs(editandoSlug) : new Set();
      const candidatos = etiquetas.filter(e => e.ativo && !subtreeSlugs.has(e.slug));
      const filtered = (query
        ? candidatos.filter(e => { const bc = breadcrumb(e); return e.nome.toLowerCase().includes(query) || bc.toLowerCase().includes(query); })
        : candidatos).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

      const showSemPai = !query || 'sem pai'.includes(query) || 'raiz'.includes(query);
      const semPaiHtml = showSemPai
        ? `<div class="et-pcomb-item${!valI.value ? ' et-pcomb-sel' : ''}" data-slug=""
            style="padding:.42rem .75rem;cursor:pointer;font-size:.82rem;color:var(--text-muted);font-style:italic;border-bottom:1px solid var(--border-light,#f3f4f6)">
            — Sem pai (etiqueta raiz) —
          </div>`
        : '';

      dd.innerHTML = semPaiHtml + (filtered.length
        ? filtered.map(e => {
            const bc = breadcrumb(e);
            const cor = e.cor || '#6B7280';
            return `<div class="et-pcomb-item${e.slug === valI.value ? ' et-pcomb-sel' : ''}" data-slug="${e.slug}"
              style="padding:.42rem .75rem;cursor:pointer;display:flex;align-items:center;gap:.45rem;font-size:.83rem">
              <span style="width:7px;height:7px;border-radius:50%;background:${cor};flex-shrink:0"></span>
              <span>${bc ? `<span style="color:var(--text-muted);font-size:.74rem">${bc} › </span>` : ''}<strong style="font-weight:600">${e.nome}</strong></span>
            </div>`;
          }).join('')
        : (showSemPai ? '' : '<div style="padding:.4rem .75rem;color:var(--text-muted);font-size:.82rem">Nenhuma etiqueta encontrada</div>'));
      dd.style.display = semPaiHtml || filtered.length || query ? 'block' : 'none';
    }

    function _close() { dd.style.display = 'none'; }

    function _pick(slug) {
      valI.value = slug || '';
      if (!slug) { inp.value = ''; }
      else {
        const et = etiquetas.find(e => e.slug === slug);
        if (et) { const bc = breadcrumb(et); inp.value = bc ? `${bc} › ${et.nome}` : et.nome; }
        else inp.value = slug;
      }
      _close();
    }

    inp.addEventListener('focus', () => { inp.select(); _render(''); });
    inp.addEventListener('input', () => { if (!inp.value.trim()) valI.value = ''; _render(inp.value); });
    inp.addEventListener('keydown', ev => {
      if (ev.key === 'Escape') _close();
      if (ev.key === 'Enter') { ev.preventDefault(); const f = dd.querySelector('.et-pcomb-item'); if (f) _pick(f.dataset.slug); }
    });
    dd.addEventListener('mousedown', ev => {
      const item = ev.target.closest('.et-pcomb-item');
      if (!item) return;
      ev.preventDefault();
      _pick(item.dataset.slug);
    });
    document.addEventListener('click', ev => { if (!wrapEl.contains(ev.target)) _close(); }, true);

    return {
      getValue: () => valI.value || null,
      setValue(slug) { _pick(slug || ''); },
      clear() { valI.value = ''; inp.value = ''; _close(); },
    };
  }

  function abrirModal(titulo, dados = {}) {
    editandoId = dados.id || null;
    const cor = dados.cor || corAleatoria();

    document.getElementById('modal-etiqueta-title').textContent = titulo;
    document.getElementById('et-id').value    = dados.id || '';
    document.getElementById('et-nome').value  = dados.nome || '';
    document.getElementById('et-descricao').value = dados.descricao || '';
    document.getElementById('et-cor').value   = cor;
    atualizarPreview(cor, dados.nome || 'Etiqueta');
    const wrap = document.getElementById('et-parent-wrap');
    if (wrap) wrap.style.display = '';
    _parentCombo?.setValue(dados.parent_slug || '');
    document.getElementById('modal-etiqueta-overlay').classList.add('open');
    setTimeout(() => document.getElementById('et-nome').focus(), 50);
  }

  function fecharModal() {
    document.getElementById('modal-etiqueta-overlay').classList.remove('open');
    document.getElementById('form-etiqueta').reset();
    _parentCombo?.clear();
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
    const parent_slug = document.getElementById('et-parent').value || null;

    if (!nome) { toast('Nome é obrigatório.', 'erro'); document.getElementById('et-nome').focus(); return; }

    const btn = document.getElementById('btn-salvar-etiqueta');
    btn.disabled = true;
    try {
      const body = { nome, descricao, cor, parent_slug };

      if (editandoId) {
        await api(`/api/etiquetas/${editandoId}`, { method: 'PATCH', body: JSON.stringify(body) });
        toast('Etiqueta atualizada.');
      } else {
        await api('/api/etiquetas', { method: 'POST', body: JSON.stringify(body) });
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
    const filhos = etiquetas.filter(x => x.parent_slug === e.slug);
    const msgEl = document.getElementById('confirm-msg');

    if (filhos.length === 0) {
      msgEl.textContent = `Excluir permanentemente "${e.nome}"? Chamados com essa etiqueta não serão afetados.`;
    } else {
      const nomesFilhos = filhos.map(f => `"${esc(f.nome)}"`).join(', ');
      const destino = e.parent_slug
        ? `passarão a ser sub-etiquetas de "${esc(nomePai(e.parent_slug))}"`
        : `passarão a ser etiquetas principais`;
      msgEl.innerHTML = `
        <strong>A etiqueta "${esc(e.nome)}" possui ${filhos.length === 1 ? 'uma sub-etiqueta' : `${filhos.length} sub-etiquetas`}:</strong>
        ${nomesFilhos}.<br><br>
        Ao excluir, elas ${destino} automaticamente. Chamados existentes não serão afetados.<br><br>
        <strong>Deseja confirmar a exclusão?</strong>`;
    }

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
    _parentCombo = _criarParentCombo(document.getElementById('et-parent-combo'));

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
