(async () => {
  const params = new URLSearchParams(location.search);
  const id = parseInt(params.get('id'), 10);
  const app = document.getElementById('app');

  function fmtData(d) {
    if (!d) return '—';
    const iso = d.includes('T') ? d : d.replace(' ', 'T');
    return new Date(iso.endsWith('Z') ? iso : iso + 'Z').toLocaleString('pt-BR', {
      timeZone: 'America/Fortaleza', day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  const STATUS_LABELS = {
    enviada: 'Enviada', em_analise: 'Em Análise',
    em_producao: 'Em Produção', feita: 'Feita', negada: 'Negada'
  };

  if (!id) {
    app.innerHTML = '<div class="alert alert-danger">ID de sugestão inválido.</div>';
    return;
  }

  const meR = await fetch('/api/usuarios/me', { credentials: 'include' });
  if (!meR.ok) { location.replace('/'); return; }

  const [sugR, histR] = await Promise.all([
    fetch(`/api/sugestoes/${id}`, { credentials: 'include' }),
    fetch(`/api/sugestoes/${id}/historico`, { credentials: 'include' })
  ]);

  if (!sugR.ok) {
    app.innerHTML = '<div style="padding:2rem;text-align:center"><a href="/" class="btn btn-secondary btn-sm" style="margin-bottom:1rem">← Voltar</a><div class="alert alert-danger">Sugestão não encontrada ou acesso negado.</div></div>';
    return;
  }

  const sug = await sugR.json();
  const hist = histR.ok ? await histR.json() : [];

  const campoExtraLabel = sug.status === 'feita' ? 'Como foi implementado' : sug.status === 'negada' ? 'Justificativa' : '';

  const histHTML = hist.length ? hist.map((h, i) => `
    <div style="display:flex;gap:.85rem;padding-bottom:.25rem">
      <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">
        <div style="width:11px;height:11px;border-radius:50%;background:var(--gold);margin-top:3px;box-shadow:0 0 0 3px var(--gold-light,#fef3c7)"></div>
        ${i < hist.length - 1 ? '<div style="width:2px;flex:1;background:var(--border);margin-top:4px;min-height:28px"></div>' : ''}
      </div>
      <div style="flex:1;padding-bottom:1.1rem">
        <div style="font-size:.72rem;color:var(--text-muted)">${fmtData(h.timestamp)}${h.admin_nome ? ` · por ${h.admin_nome}` : ''}</div>
        <div style="font-size:.9rem;margin-top:.2rem">
          ${h.status_anterior ? `<span style="color:var(--text-muted)">${STATUS_LABELS[h.status_anterior] || h.status_anterior}</span> → ` : ''}
          <strong>${STATUS_LABELS[h.status_novo] || h.status_novo}</strong>
        </div>
        ${h.campo_extra ? `<div style="font-size:.82rem;color:var(--text-secondary);margin-top:.4rem;padding:.45rem .65rem;background:var(--bg);border-radius:5px;border-left:3px solid var(--gold);font-style:italic">"${h.campo_extra}"</div>` : ''}
      </div>
    </div>`).join('') :
    '<div style="color:var(--text-muted);font-size:.88rem;padding:.5rem 0">Sem alterações registradas ainda.</div>';

  app.innerHTML = `
    <div style="margin-bottom:1.5rem">
      <a href="/" class="btn btn-secondary btn-sm">← Voltar</a>
    </div>

    <div class="page-header" style="margin-bottom:1.5rem">
      <div style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap">
        <div class="page-title">Sugestão #${sug.id}</div>
        <span class="badge badge-${sug.status}">${STATUS_LABELS[sug.status] || sug.status}</span>
      </div>
      <div class="page-subtitle">Enviada em ${fmtData(sug.criado_em)}</div>
    </div>

    <div class="card" style="padding:1.25rem 1.4rem;margin-bottom:1.25rem">
      <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:.5rem">Texto da sugestão</div>
      <div style="font-size:.9rem;line-height:1.7;white-space:pre-wrap">${sug.texto}</div>
      ${sug.campo_extra ? `
        <div style="margin-top:.85rem;padding:.6rem .8rem;background:var(--bg);border-radius:6px;border:1px solid var(--border)">
          <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:.25rem">${campoExtraLabel}</div>
          <div style="font-size:.85rem;color:var(--text-secondary);font-style:italic">${sug.campo_extra}</div>
        </div>` : ''}
    </div>

    <div class="card" style="padding:1.25rem 1.4rem">
      <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:1rem">Histórico de alterações</div>
      ${histHTML}
    </div>
  `;
})();
