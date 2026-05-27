(function () {
  'use strict';

  /* ── Categorias estáticas do sistema (somente leitura) ── */
  const CATS_SISTEMA = [
    { slug: 'software',        nome: 'Software',                  cor: '#6366F1', parent_slug: null },
    { slug: 'hardware',        nome: 'Hardware',                  cor: '#0EA5E9', parent_slug: null },
    { slug: 'cameras',         nome: 'Câmeras / CFTV',            cor: '#06B6D4', parent_slug: null },
    { slug: 'email',           nome: 'E-mail',                    cor: '#F43F5E', parent_slug: null },
    { slug: 'processo_compra', nome: 'Processo de Compra',        cor: '#F97316', parent_slug: null },
    { slug: 'impressora',      nome: 'Impressora',                cor: '#8B5CF6', parent_slug: 'hardware' },
    { slug: 'ramal',           nome: 'Ramal / Telefone',          cor: '#EC4899', parent_slug: 'hardware' },
    { slug: 'nobreak',         nome: 'Nobreak',                   cor: '#F59E0B', parent_slug: 'hardware' },
    { slug: 'monitor',         nome: 'Monitor',                   cor: '#10B981', parent_slug: 'hardware' },
    { slug: 'mouse',           nome: 'Mouse',                     cor: '#6B7280', parent_slug: 'hardware' },
    { slug: 'teclado',         nome: 'Teclado',                   cor: '#6B7280', parent_slug: 'hardware' },
    { slug: 'rede',            nome: 'Rede / Internet',           cor: '#3B82F6', parent_slug: 'hardware' },
    { slug: 'acesso_senha',    nome: 'Acesso / Senha',            cor: '#EF4444', parent_slug: 'hardware' },
    { slug: 'tv_projetor',     nome: 'TV',                        cor: '#8B5CF6', parent_slug: 'hardware' },
    { slug: 'projetor',        nome: 'Projetor',                  cor: '#7C3AED', parent_slug: 'hardware' },
    { slug: 'tablet',          nome: 'Tablet',                    cor: '#0EA5E9', parent_slug: 'hardware' },
    { slug: 'celular',         nome: 'Celular',                   cor: '#06B6D4', parent_slug: 'hardware' },
    { slug: 'outros',          nome: 'Outros',                    cor: '#6B7280', parent_slug: 'hardware' },
    { slug: 'thex_pos',        nome: 'THEX POS (TOTVS)',          cor: '#DC2626', parent_slug: 'software' },
    { slug: 'thex_pms',        nome: 'THEX PMS (TOTVS)',          cor: '#B91C1C', parent_slug: 'software' },
    { slug: 'modulo_eventos',  nome: 'Módulo Eventos',            cor: '#7C3AED', parent_slug: 'software' },
    { slug: 'modulo_cp',       nome: 'Módulo Contas a Pagar',     cor: '#DB2777', parent_slug: 'software' },
    { slug: 'modulo_cr',       nome: 'Módulo Contas a Receber',   cor: '#0891B2', parent_slug: 'software' },
    { slug: 'modulo_rad',      nome: 'Módulo RAD',                cor: '#9333EA', parent_slug: 'software' },
    { slug: 'modulo_fiscal',   nome: 'Módulo Fiscal Flex',        cor: '#B45309', parent_slug: 'software' },
    { slug: 'modulo_contab',   nome: 'Módulo Contabilidade',      cor: '#0369A1', parent_slug: 'software' },
    { slug: 'modulo_compras',  nome: 'Módulo Compras',            cor: '#15803D', parent_slug: 'software' },
    { slug: 'modulo_almox',    nome: 'Módulo Almoxarifado',       cor: '#92400E', parent_slug: 'software' },
    { slug: 'modulo_caf',      nome: 'Módulo CAF',                cor: '#6D28D9', parent_slug: 'software' },
    { slug: 'modulo_cfinan',   nome: 'Módulo CFINAN',             cor: '#1D4ED8', parent_slug: 'software' },
    { slug: 'modulo_fatura',   nome: 'Módulo Fatura',             cor: '#0F766E', parent_slug: 'software' },
    { slug: 'app_comanda',     nome: 'App Comanda Eletrônica',    cor: '#BE123C', parent_slug: 'software' },
    { slug: 'app_governanca',  nome: 'App Minha Governança',      cor: '#0E7490', parent_slug: 'software' },
    { slug: 'letsbook',        nome: 'LetsBook (PMWEB)',          cor: '#7C3AED', parent_slug: 'software' },
    { slug: 'urmobo',          nome: 'URMOBO (MDM)',              cor: '#374151', parent_slug: 'software' },
    { slug: 'cardapio_digital',nome: 'Cardápio Digital',          cor: '#D97706', parent_slug: 'software' },
    { slug: 'central_ti',      nome: 'Central de Serviços TI',    cor: '#6B7280', parent_slug: 'software' },
  ];

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
          '<div style="padding:2rem;color:var(--text-muted)">Acesso restrito a administradores master.</div>';
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

  /* ── Helpers de nome ── */
  function nomePai(slug) {
    if (!slug) return '';
    const est = PARENTS_ESTATICOS.find(p => p.slug === slug);
    if (est) return est.nome;
    const din = etiquetas.find(e => e.slug === slug);
    return din ? din.nome : slug;
  }

  /* ── Render ── */
  function renderizar() {
    const el = document.getElementById('lista-etiquetas');
    let html = '';

    /* ── Seção: Etiquetas do sistema (estáticas) ── */
    const sistPrimarias = CATS_SISTEMA.filter(e => !e.parent_slug);
    html += `
      <div style="margin-bottom:1.5rem">
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.6rem">
          <span style="font-size:.72rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--text-muted)">Categorias do sistema</span>
          <span style="font-size:.68rem;color:var(--text-muted);background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:1px 7px">somente leitura</span>
        </div>
        <div class="etiqueta-group">`;

    for (const cat of sistPrimarias) {
      const subs = CATS_SISTEMA.filter(e => e.parent_slug === cat.slug);
      html += renderRowSistema(cat, null);
      for (const s of subs) html += renderRowSistema(s, cat.nome, true);
    }
    html += '</div></div>';

    /* ── Seção: Etiquetas personalizadas ── */
    html += `
      <div>
        <div style="font-size:.72rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--text-muted);margin-bottom:.6rem">Etiquetas personalizadas</div>`;

    if (!etiquetas.length) {
      html += '<div class="empty-state">Nenhuma etiqueta personalizada ainda.<br>Clique em <strong>+ Nova Etiqueta</strong> para criar.</div>';
    } else {
      const primarias = etiquetas.filter(e => !e.parent_slug);
      const subPorParent = {};
      etiquetas.filter(e => e.parent_slug).forEach(e => {
        if (!subPorParent[e.parent_slug]) subPorParent[e.parent_slug] = [];
        subPorParent[e.parent_slug].push(e);
      });

      /* Primárias dinâmicas + seus filhos */
      if (primarias.length) {
        html += '<div class="etiqueta-group">';
        for (const e of primarias) {
          html += renderRow(e, null);
          for (const s of (subPorParent[e.slug] || [])) html += renderRow(s, e.nome, true);
        }
        html += '</div>';
      }

      /* Subs de pais estáticos */
      for (const p of PARENTS_ESTATICOS) {
        const subs = subPorParent[p.slug] || [];
        if (!subs.length) continue;
        html += `<div class="etiqueta-group" style="margin-top:.5rem">
          <div class="etiqueta-group-header">
            Sub-etiquetas de ${esc(p.nome)}
          </div>`;
        for (const s of subs) html += renderRow(s, p.nome, true);
        html += '</div>';
      }
    }
    html += '</div>';

    el.innerHTML = html;
    bindAcoes();
  }

  function renderRowSistema(e, parentNome, isSub = false) {
    return `
      <div class="etiqueta-row" style="opacity:.7">
        ${isSub ? '<div style="width:20px;flex-shrink:0"></div>' : ''}
        <span class="etiqueta-dot" style="background:${esc(e.cor)}"></span>
        <span class="etiqueta-nome">${esc(e.nome)}</span>
        ${isSub && parentNome ? `<span class="etiqueta-parent-badge">${esc(parentNome)}</span>` : ''}
        <span class="etiqueta-desc" style="flex:1"></span>
        <span style="font-size:.68rem;color:var(--text-muted)">sistema</span>
      </div>`;
  }

  function renderRow(e, parentNome, isSub = false) {
    return `
      <div class="etiqueta-row${e.ativo ? '' : ' etiqueta-inativo'}" data-id="${e.id}">
        ${isSub ? '<div style="width:20px;flex-shrink:0"></div>' : ''}
        <span class="etiqueta-dot" style="background:${esc(e.cor || '#6B7280')}"></span>
        <span class="etiqueta-nome">${esc(e.nome)}</span>
        ${isSub && parentNome ? `<span class="etiqueta-parent-badge">${esc(parentNome)}</span>` : ''}
        <span class="etiqueta-desc">${esc(e.descricao || '—')}</span>
        ${!e.ativo ? '<span class="badge badge-encerrado" style="flex-shrink:0">Inativa</span>' : ''}
        <div class="etiqueta-actions">
          <button class="btn btn-sm btn-secondary btn-editar-et" data-id="${e.id}">Editar</button>
          <button class="btn btn-sm ${e.ativo ? 'btn-ghost' : 'btn-primary'} btn-toggle-et" data-id="${e.id}" data-ativo="${e.ativo ? 1 : 0}">${e.ativo ? 'Desativar' : 'Ativar'}</button>
          <button class="btn btn-sm btn-danger btn-del-et" data-id="${e.id}">✕</button>
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

    const grp1 = document.createElement('optgroup');
    grp1.label = 'Categorias do sistema';
    PARENTS_ESTATICOS.forEach(p => {
      const o = document.createElement('option');
      o.value = p.slug; o.textContent = p.nome;
      if (p.slug === parentAtual) o.selected = true;
      grp1.appendChild(o);
    });
    sel.appendChild(grp1);

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
