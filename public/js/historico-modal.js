(() => {
  function fmtD(d) {
    if (!d) return '—';
    const iso = d.includes('T') ? d : d.replace(' ', 'T');
    return new Date(iso.endsWith('Z') ? iso : iso + 'Z')
      .toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' });
  }

  const ACAO_LABEL = {
    prioridade_definida:  'Prioridade definida',
    status_alterado:      'Status alterado',
    prazo_alterado:       'Prazo alterado',
    solucao_registrada:   'Solução registrada',
    assumido:             'Chamado assumido',
    transferido:          'Chamado transferido',
    categoria_alterada:   'Categoria alterada',
    avaliacao_registrada: 'Avaliação do solicitante',
    descricao_alterada:   'Chamado reaberto pelo solicitante',
    acordo_assinado:      'Acordo de Responsabilidade assinado',
    acordo_resetado:      'Acordo cancelado ao reabrir',
  };

  const STATUS_LABEL = { aberto: 'Aberto', em_andamento: 'Em andamento', concluido: 'Concluído', encerrado: 'Encerrado' };

  function iconeAcao(acao, valorNovo) {
    if (acao === 'status_alterado') {
      if (valorNovo === 'concluido')    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      if (valorNovo === 'aberto')       return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>';
      if (valorNovo === 'em_andamento') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
      if (valorNovo === 'encerrado')    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    }
    if (acao === 'solucao_registrada') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';
    if (acao === 'assumido' || acao === 'transferido') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    if (acao === 'prazo_alterado') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
    if (acao === 'prioridade_definida') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    if (acao === 'avaliacao_registrada') return '★';
    if (acao === 'descricao_alterada') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    if (acao === 'acordo_assinado') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></svg>';
    if (acao === 'acordo_resetado') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>';
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>';
  }

  function corDot(acao, valorNovo) {
    if (acao === 'status_alterado') {
      if (valorNovo === 'concluido')    return '#16a34a';
      if (valorNovo === 'aberto')       return '#2563eb';
      if (valorNovo === 'em_andamento') return '#d97706';
      if (valorNovo === 'encerrado')    return '#6b7280';
    }
    if (acao === 'solucao_registrada')  return '#7c3aed';
    if (acao === 'prazo_alterado')      return '#dc2626';
    if (acao === 'avaliacao_registrada') return '#f59e0b';
    if (acao === 'descricao_alterada')  return '#0ea5e9';
    if (acao === 'acordo_assinado')     return '#15803d';
    if (acao === 'acordo_resetado')     return '#f59e0b';
    return '#64748b';
  }

  function descricaoAcao(h) {
    const label = ACAO_LABEL[h.acao] || h.acao;
    if (h.acao === 'status_alterado') {
      const ant = STATUS_LABEL[h.valor_anterior] || h.valor_anterior || '—';
      const nov = STATUS_LABEL[h.valor_novo]     || h.valor_novo     || '—';
      return `${label}: <strong>${ant}</strong> → <strong>${nov}</strong>`;
    }
    if (h.acao === 'solucao_registrada') {
      return `${label}: <em style="color:#555">${h.valor_novo || ''}</em>`;
    }
    if (h.acao === 'prazo_alterado') {
      const ant = h.valor_anterior ? fmtD(h.valor_anterior) : 'sem prazo';
      const nov = h.valor_novo     ? fmtD(h.valor_novo)     : 'removido';
      return `${label}: de <strong>${ant}</strong> para <strong>${nov}</strong>`;
    }
    if (h.acao === 'prioridade_definida') {
      const ant = h.valor_anterior || 'nenhuma';
      const nov = h.valor_novo     || 'nenhuma';
      return `${label}: <strong>${ant}</strong> → <strong>${nov}</strong>`;
    }
    if (h.acao === 'assumido') {
      return `${label} (${h.valor_anterior || '?'} → em andamento)`;
    }
    if (h.acao === 'transferido') {
      return `${label} para <strong>${h.valor_novo || '?'}</strong>`;
    }
    if (h.acao === 'categoria_alterada') {
      return `${label}: <strong>${h.valor_novo || '—'}</strong>`;
    }
    if (h.acao === 'avaliacao_registrada') {
      const n = Math.min(Math.max(Number(h.valor_anterior) || 0, 0), 5);
      const estrelas = '★'.repeat(n) + '☆'.repeat(5 - n);
      return `${label}: <span style="color:#f59e0b;font-size:1rem;letter-spacing:.05em">${estrelas}</span>${h.valor_novo ? ` — <em style="color:#555">"${h.valor_novo}"</em>` : ''}`;
    }
    if (h.acao === 'descricao_alterada') {
      return `${label}
        <div style="margin-top:.35rem;font-size:.72rem;color:#94a3b8">Descrição anterior:</div>
        <div class="ht-desc-box" style="opacity:.65;font-style:italic;margin-top:.1rem">${h.valor_anterior || ''}</div>
        <div style="margin-top:.35rem;font-size:.72rem;color:#94a3b8">Nova descrição:</div>
        <div class="ht-desc-box" style="margin-top:.1rem">${h.valor_novo || ''}</div>`;
    }
    if (h.acao === 'acordo_assinado') {
      const usuarioNome = h.valor_anterior || '';
      const dados = (() => { try { return JSON.parse(h.valor_novo || '{}'); } catch { return {}; } })();
      const linhasEquip = (() => { try { return JSON.parse(dados.equipamentos || '[]'); } catch { return []; } })();
      const ts = h.timestamp ? (h.timestamp.includes('T') ? h.timestamp : h.timestamp.replace(' ', 'T') + 'Z') : null;
      const dtObj = ts ? new Date(ts.endsWith('Z') ? ts : ts + 'Z') : null;
      const dataFmt = dtObj ? dtObj.toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
      const horaFmt = dtObj ? dtObj.toLocaleTimeString('pt-BR', { timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit' }) : '';
      const equipRows = linhasEquip.filter(r => r.tipo || r.marca || r.modelo).map(r =>
        `<tr><td style="padding:.2rem .4rem;border:1px solid #d1fae5">${r.quantidade||1}</td><td style="padding:.2rem .4rem;border:1px solid #d1fae5">${r.tipo||''}</td><td style="padding:.2rem .4rem;border:1px solid #d1fae5">${r.marca||''}</td><td style="padding:.2rem .4rem;border:1px solid #d1fae5">${r.modelo||''}</td></tr>`
      ).join('');
      return `Acordo de Responsabilidade assinado pelo solicitante
        <div style="margin-top:.6rem;border:1px solid #bbf7d0;border-radius:4px;overflow:hidden;background:#fff">
          <div style="padding:.45rem .8rem;background:#dcfce7;border-bottom:1px solid #bbf7d0;font-size:.72rem;font-weight:700;color:#15803d;letter-spacing:.02em">
            ✓ TERMO DE RESPONSABILIDADE — ${dataFmt}${horaFmt ? ' às ' + horaFmt : ''}
          </div>
          <div style="padding:.75rem .9rem;font-size:.75rem;color:#1e293b;line-height:1.65">
            <div style="text-align:center;margin-bottom:.6rem">
              <div style="font-weight:700;font-size:.82rem">Hotel Gran Marquise</div>
              <div style="font-size:.7rem;color:#64748b;font-weight:600">Termo de Responsabilidade de Equipamentos</div>
            </div>
            <div style="display:grid;grid-template-columns:auto 1fr;gap:.18rem .5rem;margin-bottom:.5rem;font-size:.73rem">
              <span style="color:#64748b">Eu,</span><strong>${usuarioNome}</strong>
              <span style="color:#64748b">Empresa:</span><span>Hotel Gran Marquise</span>
              <span style="color:#64748b">Setor:</span><span>${dados.setor || '—'}</span>
              <span style="color:#64748b">Cargo:</span><span>${dados.cargo || '—'}</span>
            </div>
            <p style="font-size:.72rem;color:#475569;margin:.4rem 0;border-left:2px solid #bbf7d0;padding-left:.5rem">
              estou recebendo emprestado o equipamento abaixo discriminado pelo setor de TI – Tecnologia da Informação.
              Estou ciente que o mesmo se encontra em perfeito estado de funcionamento. Em caso de quebra, roubo ou avaria
              estarei me responsabilizando pelo equipamento abaixo.
            </p>
            ${linhasEquip.length ? `<p style="font-size:.72rem;font-weight:700;color:#1e293b;margin:.3rem 0"><strong>Equipamento: ${linhasEquip.map(r => [r.quantidade, r.tipo, r.marca, r.modelo].filter(Boolean).join(' ')).join(', ')}</strong></p>` : ''}
            ${equipRows ? `<table style="width:100%;border-collapse:collapse;font-size:.72rem;margin:.4rem 0">
              <thead><tr style="background:#f0fdf4">
                <th style="padding:.2rem .4rem;border:1px solid #d1fae5;text-align:left;font-weight:600;width:50px">Qtd</th>
                <th style="padding:.2rem .4rem;border:1px solid #d1fae5;text-align:left;font-weight:600">Tipo</th>
                <th style="padding:.2rem .4rem;border:1px solid #d1fae5;text-align:left;font-weight:600">Marca</th>
                <th style="padding:.2rem .4rem;border:1px solid #d1fae5;text-align:left;font-weight:600">Modelo</th>
              </tr></thead>
              <tbody>${equipRows}</tbody>
            </table>` : ''}
            <div style="margin-top:.75rem;font-size:.72rem;color:#64748b;text-align:right">Fortaleza, ${dataFmt}</div>
            <div style="margin-top:.6rem;display:flex;justify-content:center;border-top:1px solid #e2e8f0;padding-top:.6rem">
              <div style="text-align:center;min-width:180px">
                <div style="font-weight:600;font-size:.8rem;margin-bottom:.4rem">${usuarioNome.split(' ')[0]}</div>
                <div style="border-top:1px solid #94a3b8;padding-top:.25rem;font-size:.68rem;color:#94a3b8">Assinatura do Funcionário</div>
              </div>
            </div>
          </div>
        </div>`;
    }
    if (h.acao === 'acordo_resetado') {
      return `Acordo de responsabilidade cancelado <span style="font-size:.8em;color:#94a3b8">(chamado reaberto — nova assinatura será necessária)</span>`;
    }
    const partes = [];
    if (h.valor_anterior !== null && h.valor_anterior !== undefined) partes.push(`de "${h.valor_anterior}"`);
    if (h.valor_novo     !== null && h.valor_novo     !== undefined) partes.push(`para "${h.valor_novo}"`);
    return label + (partes.length ? ' ' + partes.join(' ') : '');
  }

  function renderOverlay(c) {
    const existing = document.getElementById('hist-overlay');
    if (existing) existing.remove();

    // Build unified timeline
    const eventos = [];

    // Abertura do chamado (synthetic)
    eventos.push({
      _tipo: 'abertura',
      _ts: c.criado_em,
    });

    // Historico de ações
    for (const h of (c.historico || [])) {
      eventos.push({ _tipo: 'acao', _ts: h.timestamp, ...h });
    }

    // Todas as assinaturas do histórico (salvas no momento da criação)
    for (const ah of (c.assinaturasHistorico || [])) {
      eventos.push({ _tipo: 'assinatura_hist', _ts: ah.criado_em, ...ah });
    }

    // Compatibilidade: assinatura atual sem entrada na tabela (chamados antigos)
    if (c.assinado_em && !(c.assinaturasHistorico || []).length) {
      eventos.push({
        _tipo: 'assinatura_hist',
        _ts: c.assinado_em,
        assinatura: c.assinatura,
        assinado_em: c.assinado_em,
        admin_nome: null,
      });
    }

    // Sort chronologically
    eventos.sort((a, b) => {
      if (!a._ts) return -1;
      if (!b._ts) return 1;
      const ta = new Date(a._ts.includes('T') ? a._ts : a._ts.replace(' ', 'T'));
      const tb = new Date(b._ts.includes('T') ? b._ts : b._ts.replace(' ', 'T'));
      return ta - tb;
    });

    const itensHtml = eventos.map(ev => {
      if (ev._tipo === 'abertura') {
        return `
          <div class="ht-item">
            <div class="ht-dot" style="background:#2563eb">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
            </div>
            <div class="ht-content">
              <div class="ht-titulo">Chamado aberto por <strong>${c.nome}</strong></div>
              <div class="ht-sub">${c.setor} · Ramal ${c.ramal || c.usuario_ramal || '—'}</div>
              <div class="ht-desc-box">${c.descricao}</div>
              <div class="ht-meta">${fmtD(ev._ts)}</div>
            </div>
          </div>`;
      }

      if (ev._tipo === 'acao') {
        const cor = corDot(ev.acao, ev.valor_novo);
        return `
          <div class="ht-item">
            <div class="ht-dot" style="background:${cor}">${iconeAcao(ev.acao, ev.valor_novo)}</div>
            <div class="ht-content">
              <div class="ht-titulo">${descricaoAcao(ev)}</div>
              <div class="ht-meta">${ev.admin_nome || 'Sistema'} · ${fmtD(ev.timestamp)}</div>
            </div>
          </div>`;
      }

      if (ev._tipo === 'assinatura_hist') {
        return `
          <div class="ht-item ht-item-assin">
            <div class="ht-dot ht-dot-assin">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/><path d="M8 12l3 3 5-5"/></svg>
            </div>
            <div class="ht-content">
              <div class="ht-titulo ht-assin-titulo">Recebimento confirmado pelo solicitante</div>
              <div class="ht-meta">${fmtD(ev.assinado_em)}</div>
              ${ev.assinatura
                ? `<img src="${ev.assinatura}" alt="Assinatura" class="ht-assin-img">`
                : `<div class="ht-sem-assin">Confirmado sem desenho</div>`}
            </div>
          </div>`;
      }

      return '';
    }).join('');

    const overlay = document.createElement('div');
    overlay.id = 'hist-overlay';
    overlay.className = 'hist-overlay';
    overlay.innerHTML = `
      <div class="hist-modal">
        <div class="hist-header">
          <div class="hist-header-info">
            <div class="hist-titulo">Histórico completo</div>
            <div class="hist-sub">${c.nome}</div>
          </div>
          <button class="hist-fechar" id="hist-fechar" aria-label="Fechar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="hist-body">
          <div class="ht-timeline">${itensHtml}</div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.classList.add('open');

    const fechar = () => overlay.remove();
    document.getElementById('hist-fechar').addEventListener('click', fechar);
    overlay.addEventListener('click', e => { if (e.target === overlay) fechar(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { fechar(); document.removeEventListener('keydown', esc); }
    });
  }

  window.abrirHistoricoModal = renderOverlay;
})();
