(function () {
  'use strict';

  let servicos = [];
  let editandoId = null;

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
    const res = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
    return data;
  }

  /* ── Auth ── */
  async function verificarAuth() {
    try {
      await apiFetch('/api/admin/me');
    } catch {
      window.location.href = '/admin-login.html';
    }
  }

  /* ── Carregar ── */
  async function carregar() {
    try {
      servicos = await apiFetch('/api/servicos/admin');
      renderizar();
    } catch (e) {
      document.getElementById('lista-servicos').innerHTML =
        `<p style="color:var(--danger);padding:1rem">${e.message}</p>`;
    }
  }

  /* ── Render ── */
  function renderizar() {
    const el = document.getElementById('lista-servicos');
    if (!servicos.length) {
      el.innerHTML = '<p style="color:var(--text-muted);padding:1rem">Nenhum serviço cadastrado.</p>';
      return;
    }

    const ativos = servicos.filter(s => s.ativo);
    const inativos = servicos.filter(s => !s.ativo);

    let html = '';

    if (ativos.length) {
      html += '<div style="margin-bottom:1.5rem">';
      html += '<div style="font-size:.72rem;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--text-muted);margin-bottom:.5rem">Ativos</div>';
      html += renderTabela(ativos);
      html += '</div>';
    }

    if (inativos.length) {
      html += '<div>';
      html += '<div style="font-size:.72rem;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--text-muted);margin-bottom:.5rem">Inativos</div>';
      html += renderTabela(inativos);
      html += '</div>';
    }

    el.innerHTML = html;
    bindAcoes();
  }

  function renderTabela(lista) {
    let rows = lista.map(s => `
      <tr data-id="${s.id}">
        <td style="font-weight:500">${esc(s.nome)}</td>
        <td style="color:var(--text-muted);font-size:.85rem">${esc(s.descricao || '—')}</td>
        <td style="white-space:nowrap">
          <span class="badge ${s.ativo ? 'badge-aberto' : 'badge-encerrado'}">${s.ativo ? 'Ativo' : 'Inativo'}</span>
        </td>
        <td style="white-space:nowrap;text-align:right">
          <button class="btn btn-sm btn-secondary btn-editar" data-id="${s.id}" style="margin-right:.25rem">Editar</button>
          <button class="btn btn-sm ${s.ativo ? 'btn-danger' : 'btn-primary'} btn-toggle" data-id="${s.id}" data-ativo="${s.ativo ? 1 : 0}">
            ${s.ativo ? 'Desativar' : 'Ativar'}
          </button>
        </td>
      </tr>
    `).join('');

    return `
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="font-size:.72rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);background:var(--surface-2)">
            <th style="padding:.5rem 1rem;text-align:left;border-bottom:1px solid var(--border)">Nome</th>
            <th style="padding:.5rem 1rem;text-align:left;border-bottom:1px solid var(--border)">Descrição</th>
            <th style="padding:.5rem 1rem;text-align:left;border-bottom:1px solid var(--border)">Status</th>
            <th style="padding:.5rem 1rem;text-align:right;border-bottom:1px solid var(--border)">Ações</th>
          </tr>
        </thead>
        <tbody style="font-size:.88rem">
          ${rows}
        </tbody>
      </table>
    `;
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Bind ações da tabela ── */
  function bindAcoes() {
    document.querySelectorAll('.btn-editar').forEach(btn => {
      btn.addEventListener('click', () => abrirModalEdicao(Number(btn.dataset.id)));
    });
    document.querySelectorAll('.btn-toggle').forEach(btn => {
      btn.addEventListener('click', () => toggleAtivo(Number(btn.dataset.id), Number(btn.dataset.ativo)));
    });
  }

  /* ── Modal ── */
  function abrirModal(titulo) {
    document.getElementById('modal-servico-title').textContent = titulo;
    document.getElementById('modal-servico-overlay').classList.add('ativo');
    document.getElementById('servico-nome').focus();
  }

  function fecharModal() {
    document.getElementById('modal-servico-overlay').classList.remove('ativo');
    document.getElementById('form-servico').reset();
    document.getElementById('servico-id').value = '';
    editandoId = null;
  }

  function abrirModalCriacao() {
    editandoId = null;
    abrirModal('Novo Serviço');
  }

  function abrirModalEdicao(id) {
    const s = servicos.find(x => x.id === id);
    if (!s) return;
    editandoId = id;
    document.getElementById('servico-id').value = id;
    document.getElementById('servico-nome').value = s.nome;
    document.getElementById('servico-descricao').value = s.descricao || '';
    abrirModal('Editar Serviço');
  }

  /* ── Salvar ── */
  async function salvar() {
    const nome = document.getElementById('servico-nome').value.trim();
    const descricao = document.getElementById('servico-descricao').value.trim();

    if (!nome) {
      toast('Nome é obrigatório.', 'erro');
      document.getElementById('servico-nome').focus();
      return;
    }

    const btn = document.getElementById('btn-salvar-servico');
    btn.disabled = true;

    try {
      if (editandoId) {
        await apiFetch(`/api/servicos/${editandoId}`, {
          method: 'PATCH',
          body: JSON.stringify({ nome, descricao }),
        });
        toast('Serviço atualizado.');
      } else {
        await apiFetch('/api/servicos', {
          method: 'POST',
          body: JSON.stringify({ nome, descricao }),
        });
        toast('Serviço criado.');
      }
      fecharModal();
      await carregar();
    } catch (e) {
      toast(e.message, 'erro');
    } finally {
      btn.disabled = false;
    }
  }

  /* ── Toggle ativo ── */
  async function toggleAtivo(id, ativoAtual) {
    const novoAtivo = ativoAtual ? 0 : 1;
    try {
      await apiFetch(`/api/servicos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ativo: novoAtivo }),
      });
      toast(novoAtivo ? 'Serviço ativado.' : 'Serviço desativado.');
      await carregar();
    } catch (e) {
      toast(e.message, 'erro');
    }
  }

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', async () => {
    await verificarAuth();
    await carregar();

    document.getElementById('btn-novo-servico').addEventListener('click', abrirModalCriacao);
    document.getElementById('btn-salvar-servico').addEventListener('click', salvar);
    document.getElementById('btn-cancelar-servico').addEventListener('click', fecharModal);
    document.getElementById('btn-fechar-servico').addEventListener('click', fecharModal);

    document.getElementById('modal-servico-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) fecharModal();
    });

    document.getElementById('form-servico').addEventListener('submit', e => {
      e.preventDefault();
      salvar();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') fecharModal();
    });
  });
})();
