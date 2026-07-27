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
  // True quando o usuario alterou a cor manualmente; impede que a heranca
  // automatica de cor (ao escolher etiqueta pai) sobrescreva uma escolha
  // explicita do usuario.
  let _corManual = false;

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
      window.location.href = '/acesso-hub.html?next=' + encodeURIComponent(location.href);
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
    const filtro = etiquetasFiltradas();
    const ativas = filtro.filter(e => e.ativo);
    const inativas = filtro.filter(e => !e.ativo);

    if (!ativas.length && !inativas.length) {
      el.innerHTML = '<div class="empty-state">Nenhuma etiqueta encontrada.</div>';
      return;
    }

    let html = '';

    if (ativas.length) {
      const byParent = {};
      ativas.forEach(e => {
        const p = e.parent_slug || '__root__';
        if (!byParent[p]) byParent[p] = [];
        byParent[p].push(e);
      });

      const countAll = slug => (byParent[slug] || []).reduce((n, k) => n + 1 + countAll(k.slug), 0);
      const renderSub = slug => (byParent[slug] || []).map(k => renderCard(k, breadcrumb(k)) + renderSub(k.slug)).join('');

      const roots = byParent['__root__'] || [];
      html += '<div class="et-grid">';
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

      // Órfãos ATIVOS: pai fora da lista de ativas (ex.: pai inativo/filtrado)
      const ativasSet = new Set(ativas.map(e => e.slug));
      const orfaos = ativas.filter(e => e.parent_slug && !ativasSet.has(e.parent_slug));
      if (orfaos.length) {
        html += '<div><div class="et-section-label">Sub-etiquetas</div><div class="et-cards">';
        for (const s of orfaos) html += renderCard(s, breadcrumb(s) || nomePai(s.parent_slug));
        html += '</div></div>';
      }
      html += '</div>';
    } else {
      html += '<div class="empty-state">Nenhuma etiqueta ativa.</div>';
    }

    // Seção "Etiquetas desativadas" (accordion recolhido). Restauráveis.
    if (inativas.length) {
      html += `<details class="et-desativadas" style="margin-top:1.5rem">
        <summary style="cursor:pointer;font-weight:600;color:var(--text-muted);padding:.5rem 0">
          Etiquetas desativadas (${inativas.length})
        </summary>
        <div class="et-cards" style="margin-top:.75rem">
          ${inativas.map(e => renderCard(e, breadcrumb(e) || nomePai(e.parent_slug))).join('')}
        </div>
      </details>`;
    }

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
          ${e.ativo ? `
            <button class="btn btn-sm btn-secondary btn-editar-et" data-id="${e.id}">Editar</button>
            <button class="btn btn-sm btn-danger btn-del-et" data-id="${e.id}" title="Desativar">✕</button>
          ` : `
            <button class="btn btn-sm btn-secondary btn-reativar-et" data-id="${e.id}">Reativar</button>
            <button class="btn btn-sm btn-danger btn-excluir-def-et" data-id="${e.id}">Excluir definitivamente</button>
          `}
        </div>
      </div>`;
  }

  function bindAcoes() {
    document.querySelectorAll('.btn-editar-et').forEach(b => b.addEventListener('click', () => abrirEdicao(+b.dataset.id)));
    document.querySelectorAll('.btn-del-et').forEach(b => b.addEventListener('click', () => confirmarDesativar(+b.dataset.id)));
    document.querySelectorAll('.btn-reativar-et').forEach(b => b.addEventListener('click', () => reativar(+b.dataset.id)));
    document.querySelectorAll('.btn-excluir-def-et').forEach(b => b.addEventListener('click', () => confirmarExclusaoDefinitiva(+b.dataset.id)));
  }

  /* ── Modal ── */
  function _criarParentCombo(wrapEl, opts) {
    if (!wrapEl) return null;
    const onChange = (opts && typeof opts.onChange === 'function') ? opts.onChange : null;
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

    function _pick(slug, fromUser) {
      valI.value = slug || '';
      if (!slug) { inp.value = ''; }
      else {
        const et = etiquetas.find(e => e.slug === slug);
        if (et) { const bc = breadcrumb(et); inp.value = bc ? `${bc} › ${et.nome}` : et.nome; }
        else inp.value = slug;
      }
      _close();
      if (fromUser && onChange) {
        try { onChange(slug || null); } catch (e) { console.error('[parentCombo onChange]', e); }
      }
    }

    inp.addEventListener('focus', () => { inp.select(); _render(''); });
    inp.addEventListener('input', () => { if (!inp.value.trim()) valI.value = ''; _render(inp.value); });
    inp.addEventListener('keydown', ev => {
      if (ev.key === 'Escape') _close();
      if (ev.key === 'Enter') { ev.preventDefault(); const f = dd.querySelector('.et-pcomb-item'); if (f) _pick(f.dataset.slug, true); }
    });
    dd.addEventListener('mousedown', ev => {
      const item = ev.target.closest('.et-pcomb-item');
      if (!item) return;
      ev.preventDefault();
      _pick(item.dataset.slug, true);
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
    // Se ja existe um pai selecionado de antemao (ao editar), herda a cor dele
    // como sugestao inicial — comportamento consistente com o auto-pick em
    // tempo real quando o usuario muda o pai no combo.
    let corInicial = dados.cor;
    if (!corInicial && dados.parent_slug) {
      const pai = etiquetas.find(e => e.slug === dados.parent_slug);
      if (pai && pai.cor) corInicial = pai.cor;
    }
    const cor = corInicial || corAleatoria();
    // Edicao: respeita a cor existente como decisao do usuario (nao
    // sobrescreve ao trocar pai). Criacao: cor herdada/aleatoria, livre
    // para ser sobrescrita pela heranca enquanto o usuario nao mexer no input.
    _corManual = !!(dados.id && dados.cor);

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
    _corManual = false;
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
    // Usa a API do combo (em vez de ler o hidden input direto) — mais robusto
    // a mudancas internas e mesma fonte de verdade do que e exibido.
    const parent_slug = (_parentCombo?.getValue()) || null;

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

  function confirmarDesativar(id) {
    const e = etiquetas.find(x => x.id === id);
    if (!e) return;
    const filhos = etiquetas.filter(x => x.parent_slug === e.slug && x.ativo);
    const msgEl = document.getElementById('confirm-msg');

    if (filhos.length === 0) {
      msgEl.innerHTML = `Desativar <strong>"${esc(e.nome)}"</strong>?<br><br>
        Ela sai das opções de classificação, mas <strong>pode ser reativada a qualquer momento</strong>
        na seção "Etiquetas desativadas". Chamados existentes não são afetados.`;
    } else {
      const nomesFilhos = filhos.map(f => `"${esc(f.nome)}"`).join(', ');
      const destino = e.parent_slug
        ? `sobem para "${esc(nomePai(e.parent_slug))}"`
        : `viram etiquetas principais`;
      msgEl.innerHTML = `Desativar <strong>"${esc(e.nome)}"</strong>?<br><br>
        Suas ${filhos.length === 1 ? 'sub-etiqueta' : `${filhos.length} sub-etiquetas`} (${nomesFilhos})
        ${destino} <strong>temporariamente</strong>. Ao reativar, a hierarquia original é restaurada.
        Chamados existentes não são afetados.`;
    }

    confirmCallback = async () => {
      try {
        await api(`/api/etiquetas/${id}/desativar`, { method: 'PATCH' });
        toast('Etiqueta desativada.');
        fecharConfirm();
        await carregar();
      } catch (err) { toast(err.message, 'erro'); }
    };
    document.getElementById('modal-confirm-overlay').classList.add('open');
  }

  async function reativar(id) {
    try {
      await api(`/api/etiquetas/${id}/reativar`, { method: 'PATCH' });
      toast('Etiqueta reativada.');
      await carregar();
    } catch (err) { toast(err.message, 'erro'); }
  }

  function confirmarExclusaoDefinitiva(id) {
    const e = etiquetas.find(x => x.id === id);
    if (!e) return;
    const msgEl = document.getElementById('confirm-msg');
    msgEl.innerHTML = `<strong>Excluir DEFINITIVAMENTE "${esc(e.nome)}"?</strong><br><br>
      Esta ação é <strong>irreversível</strong> — o registro será apagado do banco.
      Sub-etiquetas ainda vinculadas sobem de nível. Chamados existentes não são afetados.`;

    // Dupla confirmação: o primeiro OK troca a mensagem e re-arma o callback.
    confirmCallback = () => {
      msgEl.innerHTML = `<strong>Tem certeza absoluta?</strong><br><br>
        Não há como desfazer a exclusão de "${esc(e.nome)}".`;
      confirmCallback = async () => {
        try {
          await api(`/api/etiquetas/${id}`, { method: 'DELETE' });
          toast('Etiqueta excluída definitivamente.');
          fecharConfirm();
          await carregar();
        } catch (err) { toast(err.message, 'erro'); }
      };
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
    _parentCombo = _criarParentCombo(document.getElementById('et-parent-combo'), {
      // Quando o usuario escolhe uma etiqueta pai, herda a cor dela
      // automaticamente — desde que ele ainda nao tenha mexido na cor
      // manualmente nesta sessao do modal.
      onChange(slug) {
        if (_corManual) return;
        if (!slug) return;
        const pai = etiquetas.find(e => e.slug === slug);
        if (!pai || !pai.cor) return;
        const inp = document.getElementById('et-cor');
        if (inp) inp.value = pai.cor;
        atualizarPreview(pai.cor, document.getElementById('et-nome').value || 'Etiqueta');
      },
    });

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
      _corManual = true; // qualquer mexida manual trava a heranca automatica
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
