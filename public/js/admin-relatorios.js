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
    const r = await api(`/api/admin/relatorios?mes=${mes}`);
    if (!r.ok) { conteudo.innerHTML = '<div class="alert alert-danger">Erro ao carregar.</div>'; return; }
    renderRelatorio(await r.json(), mes);
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

// ── Paleta consistente com o design system ───────────────────────
const COR = {
  aberto:    '#0052CC',
  andamento: '#6554C0',
  concluido: '#00875A',
  encerrado: '#6B778C',
  primary:   '#0062B1',
  accent:    '#F97316',
  warning:   '#FF8B00',
};

function renderRelatorio(d, mes) {
  const aberto    = cnt(d.volumeStatus, 'aberto');
  const andamento = cnt(d.volumeStatus, 'em_andamento');
  const concluido = cnt(d.volumeStatus, 'concluido');
  const encerrado = cnt(d.volumeStatus, 'encerrado');
  const total     = aberto + andamento + concluido + encerrado;
  const resolvidos = concluido + encerrado;
  const taxaResolucao = total > 0 ? Math.round((resolvidos / total) * 100) : 0;
  const notaMedia = d.notaMedia && d.notaMedia.media ? +d.notaMedia.media.toFixed(1) : null;
  const totalAval  = d.notaMedia ? d.notaMedia.total : 0;
  const semDados   = total === 0 && d.abertosUltimos12.length === 0;

  const conteudo = document.getElementById('conteudo');

  if (semDados) {
    conteudo.innerHTML = `
      <div class="relat-empty">
        <div class="relat-empty-icon">📊</div>
        <div class="relat-empty-title">Nenhum dado encontrado</div>
        <div class="relat-empty-sub">Não há chamados registrados em <strong>${nomeMes(mes)}</strong>.<br>Selecione outro mês ou aguarde novos chamados.</div>
      </div>`;
    return;
  }

  conteudo.innerHTML = `
    <!-- Título do período -->
    <div class="relat-periodo">
      <div class="relat-periodo-label">Período analisado</div>
      <div class="relat-periodo-mes">${nomeMes(mes)}</div>
    </div>

    <!-- ── Seção 1: Visão Geral ── -->
    <div class="relat-section-title">
      <span class="relat-section-icon">📊</span> Visão Geral do Mês
    </div>
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
      <div class="relat-kpi">
        <div class="relat-kpi-value" style="color:var(--cor-encerrado)">${encerrado}</div>
        <div class="relat-kpi-label">Encerrados</div>
        <div class="relat-kpi-desc">finalizados sem solução</div>
      </div>
    </div>

    <!-- ── Linha métricas compostas ── -->
    <div class="relat-metrics">
      <div class="relat-metric">
        <div class="relat-metric-circle" style="--pct:${taxaResolucao}%;--cor:${taxaResolucao >= 70 ? '#00875A' : taxaResolucao >= 40 ? '#FF8B00' : '#DE350B'}">
          <span>${taxaResolucao}%</span>
        </div>
        <div>
          <div class="relat-metric-label">Taxa de resolução</div>
          <div class="relat-metric-sub">${resolvidos} de ${total} chamados finalizados</div>
        </div>
      </div>
      <div class="relat-metric">
        <div class="relat-metric-circle" style="--pct:${notaMedia ? (notaMedia/10)*100 : 0}%;--cor:${notaMedia >= 7 ? '#00875A' : notaMedia >= 5 ? '#FF8B00' : '#DE350B'}">
          <span>${notaMedia !== null ? notaMedia : '—'}</span>
        </div>
        <div>
          <div class="relat-metric-label">Nota média de satisfação</div>
          <div class="relat-metric-sub">${totalAval} avaliação${totalAval !== 1 ? 'ões' : ''} recebida${totalAval !== 1 ? 's' : ''}</div>
        </div>
      </div>
    </div>

    <!-- ── Seção 2: Histórico ── -->
    <div class="relat-section-title">
      <span class="relat-section-icon">📈</span> Histórico de Volume
    </div>
    <div class="card relat-chart-card">
      <div class="relat-chart-header">
        <div>
          <div class="relat-chart-title">Chamados abertos por mês</div>
          <div class="relat-chart-sub">Últimos 12 meses — evolução do volume de solicitações</div>
        </div>
      </div>
      <canvas id="grafico-abertos" height="160"></canvas>
    </div>

    <!-- ── Seção 3: Satisfação ── -->
    <div class="relat-section-title">
      <span class="relat-section-icon">⭐</span> Satisfação dos Usuários
    </div>
    <div class="card relat-chart-card">
      <div class="relat-chart-header">
        <div>
          <div class="relat-chart-title">Nota média de atendimento</div>
          <div class="relat-chart-sub">Últimos 6 meses — tendência da satisfação (escala 0–10)</div>
        </div>
        ${notaMedia !== null ? `
        <div class="relat-chart-badge ${notaMedia >= 7 ? 'badge-ok' : notaMedia >= 5 ? 'badge-med' : 'badge-low'}">
          ${notaMedia >= 7 ? '😊 Boa' : notaMedia >= 5 ? '😐 Regular' : '😟 Baixa'}
        </div>` : ''}
      </div>
      ${d.tendencia6m.length === 0
        ? `<div class="relat-chart-empty">Sem avaliações registradas no período</div>`
        : `<canvas id="grafico-tendencia" height="160"></canvas>`
      }
    </div>

    <!-- ── Seção 4: Setores ── -->
    <div class="relat-section-title">
      <span class="relat-section-icon">🏢</span> Chamados por Setor
    </div>
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
  `;

  // Configurações globais Chart.js
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = '#5E6C84';
  Chart.defaults.plugins.legend.display = false;

  const gridStyle = { color: '#DFE1E6', drawBorder: false };

  // Gráfico 1 — Volume histórico
  graficos.push(new Chart(document.getElementById('grafico-abertos'), {
    type: 'bar',
    data: {
      labels: d.abertosUltimos12.map(i => fmtMesAbrev(i.mes)),
      datasets: [{
        data: d.abertosUltimos12.map(i => i.total),
        backgroundColor: d.abertosUltimos12.map((i, idx) =>
          i.mes === mes ? COR.primary : '#DEEBFF'
        ),
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => {
              const mesStr = d.abertosUltimos12[items[0].dataIndex].mes;
              return nomeMes(mesStr);
            },
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

  // Gráfico 2 — Tendência de nota
  if (d.tendencia6m.length > 0) {
    graficos.push(new Chart(document.getElementById('grafico-tendencia'), {
      type: 'line',
      data: {
        labels: d.tendencia6m.map(i => fmtMesAbrev(i.mes)),
        datasets: [{
          data: d.tendencia6m.map(i => i.media ? +i.media.toFixed(1) : null),
          borderColor: COR.warning,
          backgroundColor: 'rgba(255,139,0,.08)',
          tension: .4,
          fill: true,
          pointRadius: 6,
          pointBackgroundColor: COR.warning,
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
            min: 0,
            max: 10,
            ticks: {
              callback: (v) => v % 2 === 0 ? v : '',
              stepSize: 2,
            },
          },
        },
      },
    }));
  }

  // Gráfico 3 — Top setores
  if (d.top5Setores.length > 0) {
    const cores = ['#0062B1', '#0284C7', '#0369A1', '#075985', '#0C4A6E'];
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
