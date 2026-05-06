let graficos = [];

async function api(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (res.status === 401) { location.replace('/admin-login.html'); throw new Error('401'); }
  return res;
}

(async () => {
  const r = await api('/api/admin/me');
  if (!r.ok) { location.replace('/admin-login.html'); return; }
  const admin = await r.json();
  if (admin.is_master) {
    document.getElementById('nav-usuarios-wrap').innerHTML = '<a href="/admin-usuarios.html">Usuários</a>';
  }
  document.getElementById('sel-mes').value = new Date().toISOString().slice(0, 7);
  await carregarRelatorio();
})();

document.getElementById('btn-logout').addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST' });
  location.replace('/admin-login.html');
});
document.getElementById('btn-carregar').addEventListener('click', carregarRelatorio);

async function carregarRelatorio() {
  const mes = document.getElementById('sel-mes').value;
  if (!mes) return;
  const conteudo = document.getElementById('conteudo');
  conteudo.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  graficos.forEach(g => g.destroy());
  graficos = [];
  try {
    const [r, rRanking] = await Promise.all([
      api(`/api/admin/relatorios?mes=${mes}`),
      api(`/api/admin/relatorios/ranking?mes=${mes}`),
    ]);
    if (!r.ok) { conteudo.innerHTML = '<div class="alert alert-danger">Erro ao carregar.</div>'; return; }
    const ranking = rRanking.ok ? await rRanking.json() : [];
    renderRelatorio(await r.json(), mes, ranking);
  } catch (err) {
    if (err.message !== '401')
      conteudo.innerHTML = '<div class="alert alert-danger">Erro ao carregar relatório.</div>';
  }
}

function cnt(arr, status) {
  return (arr.find(i => i.status === status) || {}).total || 0;
}

function nomeMes(mes) {
  const [a, m] = mes.split('-');
  const n = new Date(a, m - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  return n.charAt(0).toUpperCase() + n.slice(1);
}

function fmtMesAbrev(mesStr) {
  const [a, m] = mesStr.split('-');
  return new Date(a, m - 1, 1).toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
}

const COR = {
  gold:      '#C5A55A',
  goldDark:  '#A88742',
  goldPale:  'rgba(197,165,90,.15)',
  navy:      '#0D1B2A',
  aberto:    '#1D4ED8',
  andamento: '#7C3AED',
  concluido: '#15803D',
  encerrado: '#6B7280',
  gridLine:  '#E5DDD0',
  textMuted: '#7A726A',
};

function renderRanking(ranking) {
  if (!ranking || ranking.length === 0) {
    return '<div class="relat-chart-empty">Nenhum admin cadastrado.</div>';
  }

  const maxTotal = ranking[0].total || 1;
  const comAtividade = ranking.filter(a => a.total > 0);

  let podioHtml = '';
  if (comAtividade.length >= 2) {
    const top = comAtividade.slice(0, 3);
    const ordem  = top.length >= 3 ? [top[1], top[0], top[2]] : [top[1], top[0]];
    const emojis = top.length >= 3 ? ['🥈', '🥇', '🥉'] : ['🥈', '🥇'];
    const cls    = top.length >= 3 ? ['rank-2', 'rank-1', 'rank-3'] : ['rank-2', 'rank-1'];
    podioHtml = `<div class="ranking-podio">${ordem.map((a, i) => `
      <div class="ranking-podio-item ${cls[i]}">
        <div class="ranking-podio-medal">${emojis[i]}</div>
        <div class="ranking-podio-nome">${a.nome_completo}</div>
        <div class="ranking-podio-num">${a.total}</div>
        <div class="ranking-podio-label">resolvido${a.total !== 1 ? 's' : ''}</div>
        <div class="ranking-podio-detalhe">${a.concluidos + (a.encerrados || 0)} concluído${(a.concluidos + (a.encerrados || 0)) !== 1 ? 's' : ''}</div>
      </div>`).join('')}</div>`;
  } else if (comAtividade.length === 1) {
    const a = comAtividade[0];
    podioHtml = `<div class="ranking-podio"><div class="ranking-podio-item rank-1">
      <div class="ranking-podio-medal">🥇</div>
      <div class="ranking-podio-nome">${a.nome_completo}</div>
      <div class="ranking-podio-num">${a.total}</div>
      <div class="ranking-podio-label">resolvido${a.total !== 1 ? 's' : ''}</div>
      <div class="ranking-podio-detalhe">${a.concluidos} concluído${a.concluidos !== 1 ? 's' : ''} · ${a.encerrados} encerrado${a.encerrados !== 1 ? 's' : ''}</div>
    </div></div>`;
  }

  const linhas = ranking.map((a, idx) => {
    const pos = idx + 1;
    const pct = maxTotal > 0 ? Math.round((a.total / maxTotal) * 100) : 0;
    const medalha = pos <= 3 && a.total > 0 ? ['🥇', '🥈', '🥉'][pos - 1] : pos;
    return `<tr class="${a.total === 0 ? 'ranking-zero' : ''}">
      <td><span class="ranking-pos">${medalha}</span></td>
      <td><strong>${a.nome_completo}</strong></td>
      <td style="color:var(--success);font-weight:600">${a.concluidos + (a.encerrados || 0)}</td>
      <td><strong>${a.total}</strong></td>
      <td><div class="ranking-bar-wrap"><div class="ranking-bar" style="width:${pct}%"></div></div></td>
    </tr>`;
  }).join('');

  return `${podioHtml}
    <div class="ranking-table-wrap">
      <table class="ranking-table">
        <thead><tr>
          <th>#</th><th>Responsável</th>
          <th>Concluídos</th><th>Total</th>
          <th style="width:100px"></th>
        </tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;
}

function renderRelatorio(d, mes, ranking) {
  const aberto    = cnt(d.volumeStatus, 'aberto');
  const andamento = cnt(d.volumeStatus, 'em_andamento');
  const concluido  = cnt(d.volumeStatus, 'concluido') + cnt(d.volumeStatus, 'encerrado');
  const total      = aberto + andamento + concluido;
  const resolvidos = concluido;
  const taxaResolucao = total > 0 ? Math.round((resolvidos / total) * 100) : 0;
  const notaMedia = d.notaMedia && d.notaMedia.media ? +d.notaMedia.media.toFixed(1) : null;
  const totalAval  = d.notaMedia ? d.notaMedia.total : 0;
  const semDados   = total === 0 && d.abertosUltimos12.length === 0;

  const conteudo = document.getElementById('conteudo');

  if (semDados) {
    conteudo.innerHTML = `
      <div class="relat-empty">
        <div class="relat-empty-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
          </svg>
        </div>
        <div class="relat-empty-title">Nenhum dado encontrado</div>
        <div class="relat-empty-sub">Não há chamados registrados em <strong>${nomeMes(mes)}</strong>.<br>Selecione outro período ou aguarde novos chamados.</div>
      </div>`;
    return;
  }

  conteudo.innerHTML = `
    <div class="relat-periodo">
      <div class="relat-periodo-label">Período analisado</div>
      <div class="relat-periodo-mes">${nomeMes(mes)}</div>
    </div>

    <div class="relat-section-title">Visão Geral do Mês</div>
    <div class="relat-kpis">
      <div class="relat-kpi relat-kpi-primary">
        <div class="relat-kpi-value">${total}</div>
        <div class="relat-kpi-label">Total de chamados</div>
        <div class="relat-kpi-desc">registrados no período</div>
      </div>
      <div class="relat-kpi">
        <div class="relat-kpi-value" style="color:var(--cor-aberto)">${aberto}</div>
        <div class="relat-kpi-label">Em aberto</div>
        <div class="relat-kpi-desc">aguardando atendimento</div>
      </div>
      <div class="relat-kpi">
        <div class="relat-kpi-value" style="color:var(--cor-andamento)">${andamento}</div>
        <div class="relat-kpi-label">Em andamento</div>
        <div class="relat-kpi-desc">sendo atendidos agora</div>
      </div>
      <div class="relat-kpi">
        <div class="relat-kpi-value" style="color:var(--cor-concluido)">${concluido}</div>
        <div class="relat-kpi-label">Concluídos</div>
        <div class="relat-kpi-desc">resolvidos com solução</div>
      </div>
    </div>

    <div class="relat-metrics">
      <div class="relat-metric">
        <div class="relat-metric-circle" style="--pct:${taxaResolucao}%;--cor:${taxaResolucao >= 70 ? '#15803D' : taxaResolucao >= 40 ? '#B45309' : '#B91C1C'}">
          <span>${taxaResolucao}%</span>
        </div>
        <div>
          <div class="relat-metric-label">Taxa de resolução</div>
          <div class="relat-metric-sub">${resolvidos} de ${total} chamados finalizados</div>
        </div>
      </div>
      <div class="relat-metric">
        <div class="relat-metric-circle" style="--pct:${notaMedia ? (notaMedia/10)*100 : 0}%;--cor:${notaMedia >= 7 ? '#15803D' : notaMedia >= 5 ? '#B45309' : '#B91C1C'}">
          <span>${notaMedia !== null ? notaMedia : '—'}</span>
        </div>
        <div>
          <div class="relat-metric-label">Nota média de satisfação</div>
          <div class="relat-metric-sub">${totalAval} avaliação${totalAval !== 1 ? 'ões' : ''} recebida${totalAval !== 1 ? 's' : ''}</div>
        </div>
      </div>
    </div>

    <div class="relat-section-title">Histórico de Volume</div>
    <div class="card relat-chart-card">
      <div class="relat-chart-header">
        <div>
          <div class="relat-chart-title">Chamados abertos por mês</div>
          <div class="relat-chart-sub">Últimos 12 meses — evolução do volume de solicitações</div>
        </div>
      </div>
      <canvas id="grafico-abertos" height="160"></canvas>
    </div>

    <div class="relat-section-title">Satisfação dos Usuários</div>
    <div class="card relat-chart-card">
      <div class="relat-chart-header">
        <div>
          <div class="relat-chart-title">Nota média de atendimento</div>
          <div class="relat-chart-sub">Últimos 6 meses — tendência da satisfação (escala 0–10)</div>
        </div>
        ${notaMedia !== null ? `
        <div class="relat-chart-badge ${notaMedia >= 7 ? 'badge-ok' : notaMedia >= 5 ? 'badge-med' : 'badge-low'}">
          ${notaMedia >= 7 ? 'Boa' : notaMedia >= 5 ? 'Regular' : 'Baixa'}
        </div>` : ''}
      </div>
      ${d.tendencia6m.length === 0
        ? `<div class="relat-chart-empty">Sem avaliações registradas no período</div>`
        : `<canvas id="grafico-tendencia" height="160"></canvas>`
      }
    </div>

    <div class="relat-section-title">Chamados por Setor</div>
    <div class="card relat-chart-card">
      <div class="relat-chart-header">
        <div>
          <div class="relat-chart-title">Setores com mais chamados</div>
          <div class="relat-chart-sub">Top 5 setores no mês — identifique onde a demanda é maior</div>
        </div>
      </div>
      ${d.top5Setores.length === 0
        ? `<div class="relat-chart-empty">Nenhum dado de setor disponível</div>`
        : `<canvas id="grafico-setores" height="${Math.max(140, d.top5Setores.length * 44)}"></canvas>`
      }
    </div>

    <div class="relat-section-title">Ranking de Atendimento</div>
    <div class="card relat-chart-card">
      <div class="relat-chart-header">
        <div>
          <div class="relat-chart-title">Admins que mais resolveram chamados</div>
          <div class="relat-chart-sub">Contagem de chamados concluídos no mês por responsável</div>
        </div>
      </div>
      ${renderRanking(ranking)}
    </div>
  `;

  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = COR.textMuted;
  Chart.defaults.plugins.legend.display = false;

  const gridStyle = { color: COR.gridLine, drawBorder: false };

  graficos.push(new Chart(document.getElementById('grafico-abertos'), {
    type: 'bar',
    data: {
      labels: d.abertosUltimos12.map(i => fmtMesAbrev(i.mes)),
      datasets: [{
        data: d.abertosUltimos12.map(i => i.total),
        backgroundColor: d.abertosUltimos12.map(i => i.mes === mes ? COR.gold : COR.goldPale),
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => nomeMes(d.abertosUltimos12[items[0].dataIndex].mes),
            label: (item) => ` ${item.raw} chamado${item.raw !== 1 ? 's' : ''} aberto${item.raw !== 1 ? 's' : ''}`,
          },
        },
      },
      scales: {
        x: { grid: gridStyle, ticks: { maxRotation: 0 } },
        y: { grid: gridStyle, beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  }));

  if (d.tendencia6m.length > 0) {
    graficos.push(new Chart(document.getElementById('grafico-tendencia'), {
      type: 'line',
      data: {
        labels: d.tendencia6m.map(i => fmtMesAbrev(i.mes)),
        datasets: [{
          data: d.tendencia6m.map(i => i.media ? +i.media.toFixed(1) : null),
          borderColor: COR.gold,
          backgroundColor: COR.goldPale,
          tension: .4,
          fill: true,
          pointRadius: 6,
          pointBackgroundColor: COR.gold,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          spanGaps: true,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: (item) => item.raw !== null ? ` Nota: ${item.raw}/10` : ' Sem dados',
            },
          },
        },
        scales: {
          x: { grid: gridStyle },
          y: {
            grid: gridStyle,
            min: 0, max: 10,
            ticks: { callback: (v) => v % 2 === 0 ? v : '', stepSize: 2 },
          },
        },
      },
    }));
  }

  if (d.top5Setores.length > 0) {
    const cores = [COR.gold, COR.goldDark, '#8B6B2E', '#6B5022', '#4A3818'];
    graficos.push(new Chart(document.getElementById('grafico-setores'), {
      type: 'bar',
      data: {
        labels: d.top5Setores.map(i => i.setor),
        datasets: [{
          data: d.top5Setores.map(i => i.total),
          backgroundColor: cores,
          borderRadius: 4,
          borderSkipped: false,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.raw} chamado${item.raw !== 1 ? 's' : ''}`,
            },
          },
        },
        scales: {
          x: { grid: gridStyle, beginAtZero: true, ticks: { precision: 0 } },
          y: { grid: { display: false } },
        },
      },
    }));
  }
}
