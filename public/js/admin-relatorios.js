// ── Relatórios v2 — layout profissional ────────────────────
const MESES_LABEL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const CAT_COLORS = {
  software: '#6366F1', hardware: '#0EA5E9', impressora: '#8B5CF6',
  ramal: '#EC4899', nobreak: '#A16207', monitor: '#0891B2', mouse: '#65A30D',
  teclado: '#7C2D12', rede: '#059669', acesso_senha: '#BE185D',
  cameras: '#D97706', email: '#1D4ED8', tv_projetor: '#7E22CE',
  projetor: '#9333EA', tablet: '#0D9488', celular: '#0891B2',
  processo_compra: '#854D0E', outros: '#6B7280',
};
const CAT_NOMES = {
  software: 'Software', hardware: 'Hardware', impressora: 'Impressora',
  ramal: 'Ramal', nobreak: 'Nobreak', monitor: 'Monitor', mouse: 'Mouse',
  teclado: 'Teclado', rede: 'Rede / Internet', acesso_senha: 'Acesso / Senha',
  cameras: 'Câmeras / CFTV', email: 'E-mail', tv_projetor: 'TV',
  projetor: 'Projetor', tablet: 'Tablet', celular: 'Celular',
  processo_compra: 'Processo de Compra', outros: 'Outros',
};

let _adminLogadoId = null;

function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }

async function api(url, opts = {}) {
  const res = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opts });
  if (res.status === 401) { location.replace('/admin-login.html'); throw new Error('401'); }
  return res;
}

function fmtTempo(seg) {
  if (seg == null || isNaN(seg)) return '—';
  const s = Math.max(0, Math.round(seg));
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  const mr = m % 60;
  if (h < 24) return `${h}h ${mr > 0 ? mr + 'm' : ''}`.trim();
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function fmtPct(v, casas = 1) {
  if (v == null || isNaN(v)) return '—';
  return (v * 100).toFixed(casas).replace('.', ',') + '%';
}

function fmtDelta(atual, anterior) {
  if (anterior == null || anterior === 0) {
    if (atual === 0) return { txt: '— sem dados', cls: 'flat' };
    return { txt: '▲ novo', cls: 'up' };
  }
  const delta = (atual - anterior) / anterior;
  if (Math.abs(delta) < 0.01) return { txt: '— sem variação', cls: 'flat' };
  const sinal = delta > 0 ? '▲ +' : '▼ ';
  return { txt: sinal + (delta * 100).toFixed(1).replace('.', ',') + '%', cls: delta > 0 ? 'up' : 'down' };
}

function nomeMes(yyyymm) {
  if (!yyyymm) return '';
  const [y, m] = yyyymm.split('-');
  return `${MESES_LABEL[parseInt(m, 10) - 1]} de ${y}`;
}

function mesAnterior(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
}

function mesProximo(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 7);
}

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ── Render ─────────────────────────────────────────────────
function padSerie12m(serie, mesAtual) {
  const map = {};
  for (const s of serie) map[s.mes] = s;
  const result = [];
  for (let i = 11; i >= 0; i--) {
    const [y, m] = mesAtual.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1, 1));
    d.setUTCMonth(d.getUTCMonth() - i);
    const key = d.toISOString().slice(0, 7);
    result.push(map[key] || { mes: key, media: null, total: 0 });
  }
  return result;
}

function renderConteudo(dados, ranking, mes) {
  const { volumeStatus, totalMes, totalMesAnt, abertosUltimos12, notaMedia,
          top5Setores, porCategoria, tempoMedioRespostaSeg, sla, chamadosReabertos } = dados;
  const tendencia6m = padSerie12m(dados.tendencia6m, mes);

  const cnt = (s) => (volumeStatus.find(r => r.status === s)?.total || 0);
  const emAberto  = cnt('aberto') + cnt('aguardando_compra') + cnt('aguardando_chegar');
  const andamento = cnt('em_andamento');
  const concluidos = cnt('concluido') + cnt('encerrado');
  const taxaResol   = totalMes > 0 ? concluidos / totalMes : 0;

  const deltaTotal = fmtDelta(totalMes, totalMesAnt);
  const slaPct = sla.totalComPrazo > 0 ? sla.dentroPrazo / sla.totalComPrazo : null;

  document.getElementById('compare-info').style.display = '';
  document.getElementById('compare-mes').textContent = nomeMes(mesAnterior(mes));
  document.getElementById('page-subtitle').textContent = `Indicadores de desempenho do suporte de TI · ${nomeMes(mes)}`;

  const sparkPath = sparklinePath(abertosUltimos12);

  document.getElementById('conteudo').innerHTML = `
    <div class="rel-hero">
      <div class="kpi kpi-primary">
        <div class="kpi-key"><span class="kpi-dot"></span> Total de chamados</div>
        <div class="kpi-val">${totalMes}</div>
        <div class="kpi-sub">registrados · vs. ${totalMesAnt} no mês anterior</div>
        <span class="kpi-delta ${deltaTotal.cls}">${deltaTotal.txt}</span>
        <svg class="kpi-spark" viewBox="0 0 240 56" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="sparkGold" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="#D4AF37" stop-opacity=".45"/>
              <stop offset="100%" stop-color="#D4AF37" stop-opacity="0"/>
            </linearGradient>
          </defs>
          ${sparkPath ? `
            <path d="${sparkPath.area}" fill="url(#sparkGold)"/>
            <path d="${sparkPath.line}" fill="none" stroke="#D4AF37" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
          ` : ''}
        </svg>
      </div>
      <div class="kpi">
        <div class="kpi-key"><span class="kpi-dot" style="background:#1D4ED8"></span> Em aberto</div>
        <div class="kpi-val" style="color:${isDark() ? '#93c5fd' : '#1D4ED8'}">${emAberto}</div>
        <div class="kpi-sub">aguardando atendimento</div>
      </div>
      <div class="kpi">
        <div class="kpi-key"><span class="kpi-dot" style="background:#15803D"></span> Concluídos</div>
        <div class="kpi-val" style="color:${isDark() ? '#86efac' : '#15803D'}">${concluidos}</div>
        <div class="kpi-sub">resolvidos no período</div>
      </div>
      <div class="kpi">
        <div class="kpi-key"><span class="kpi-dot" style="background:#D97706"></span> Reabertos</div>
        <div class="kpi-val" style="color:#D97706">${chamadosReabertos || 0}</div>
        <div class="kpi-sub">chamados reabertos no período</div>
      </div>
    </div>

    <div class="meta-strip">
      ${metaCard('Taxa de resolução', fmtPct(taxaResol, 0), `${concluidos} de ${totalMes} finalizados`, '#15803D', taxaResol)}
      ${metaCard('Tempo médio de resposta', fmtTempo(tempoMedioRespostaSeg), 'da abertura à primeira resposta', '#D4AF37', 0)}
      ${slaPct != null ? metaCard('SLA cumprido', fmtPct(slaPct, 0), `${sla.dentroPrazo} de ${sla.totalComPrazo} concluídos dentro do prazo`, slaPct >= 0.9 ? '#15803D' : '#B45309', slaPct) : ''}
    </div>

    <div class="rel-section-title">Tendências <span class="right">últimos 12 meses</span></div>
    <div class="rel-row r-2">
      <div class="chart-card">
        <div class="chart-head">
          <div class="chart-title-block">
            <div class="chart-title">Volume de chamados</div>
            <div class="chart-sub">${abertosUltimos12.length} meses · destaque no mês atual</div>
          </div>
          <span class="chart-pill ${deltaTotal.cls === 'up' ? 'warn' : 'ok'}">${deltaTotal.txt} vs. mês anterior</span>
        </div>
        ${barChartSvg(abertosUltimos12, mes)}
      </div>

      <div class="chart-card">
        <div class="chart-head">
          <div class="chart-title-block">
            <div class="chart-title">Satisfação dos usuários</div>
            <div class="chart-sub">Nota média (1–10) nos últimos 12 meses</div>
          </div>
          ${notaMedia.media ? `<span class="chart-pill ${notaMedia.media >= 8 ? 'ok' : 'warn'}">${notaMedia.media.toFixed(1).replace('.', ',')} no mês</span>` : ''}
        </div>
        ${lineChartSvg(tendencia6m, mes)}
        <div class="chart-legend">
          <span class="leg"><span class="leg-swatch" style="background:#15803D"></span> Nota média</span>
          <span class="leg" style="margin-left:auto;color:var(--text-secondary)">
            <strong style="color:var(--text)">${notaMedia.total || 0}</strong> &nbsp;avaliações recebidas no período
          </span>
        </div>
      </div>
    </div>

    <div class="rel-section-title">Distribuição <span class="right">por origem e tipo</span></div>
    <div class="rel-row r-3">
      <div class="chart-card">
        <div class="chart-head">
          <div class="chart-title-block">
            <div class="chart-title">Setores com mais chamados</div>
            <div class="chart-sub">Top 5 origens — onde a demanda é maior</div>
          </div>
        </div>
        ${setoresList(top5Setores)}
      </div>

      <div class="chart-card">
        <div class="chart-head">
          <div class="chart-title-block">
            <div class="chart-title">Por categoria</div>
            <div class="chart-sub">Tipo de problema do mês</div>
          </div>
        </div>
        ${donutCategorias(porCategoria, totalMes)}
      </div>
    </div>

    <div class="rel-section-title">Ranking de atendimento <span class="right">admins que mais resolveram no mês</span></div>
    <div class="chart-card" style="padding: 0">
      <div class="rank-grid">
        <div class="rank-head">
          <div>#</div>
          <div>Responsável</div>
          <div style="text-align:right">Concluídos</div>
          <div style="text-align:right">Tempo médio</div>
          <div style="text-align:right">Nota média</div>
        </div>
        ${rankingRows(ranking)}
      </div>
    </div>
  `;
}

function metaCard(key, num, sub, cor, ringPct) {
  const dash = 138.23;
  const off = dash - dash * Math.min(1, Math.max(0, ringPct || 0));
  return `
    <div class="meta">
      <div>
        <div class="meta-key">${key}</div>
        <div class="meta-num">${num}</div>
        <div class="meta-sub">${sub}</div>
      </div>
      <svg class="meta-ring" viewBox="0 0 52 52" aria-hidden="true">
        <circle cx="26" cy="26" r="22" fill="none" stroke="${isDark() ? '#2A3448' : '#E5DDD0'}" stroke-width="5"/>
        <circle cx="26" cy="26" r="22" fill="none" stroke="${cor}" stroke-width="5"
                stroke-dasharray="${dash}" stroke-dashoffset="${off.toFixed(2)}"
                stroke-linecap="round" transform="rotate(-90 26 26)"/>
      </svg>
    </div>`;
}

function sparklinePath(serie) {
  if (!serie || serie.length < 2) return null;
  const vals = serie.map(s => s.total);
  const max = Math.max(...vals, 1);
  const w = 240, h = 50;
  const stepX = w / (serie.length - 1);
  const pts = vals.map((v, i) => [i * stepX, h - (v / max) * (h - 8) - 4]);
  const line = 'M' + pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' L');
  const area = line + ` L${w.toFixed(1)},56 L0,56 Z`;
  return { line, area };
}

function barChartSvg(serie, mesAtivo) {
  if (!serie.length) return '<div class="chart-empty">Sem dados</div>';
  const vals = serie.map(s => s.total);
  const max = Math.max(...vals, 4);
  const yStep = max <= 5 ? 1 : max <= 20 ? 5 : max <= 50 ? 10 : max <= 100 ? 25 : 50;
  const yMax = Math.ceil(max / yStep) * yStep;
  const w = 600, h = 240;
  const chartH = 170, chartTop = 40, chartLeft = 40, chartRight = 590;
  const cw = chartRight - chartLeft;
  const barW = Math.min(36, (cw / serie.length) * 0.7);
  const slot = cw / serie.length;
  const bars = serie.map((s, i) => {
    const isActive = s.mes === mesAtivo;
    const isLastHalf = i >= serie.length / 2;
    const fill = isActive ? 'url(#barGold)' : isLastHalf ? '#C4A96E' : '#E8D4A8';
    const barH = (s.total / yMax) * chartH;
    const x = chartLeft + i * slot + (slot - barW) / 2;
    const y = chartTop + chartH - barH;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${fill}" rx="2"/>${
      isActive ? `<text x="${(x + barW/2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="${isDark() ? '#E2D9CE' : '#1C1C1C'}" font-family="Inter, sans-serif">${s.total}</text>` : ''
    }`;
  }).join('');
  const xLabels = serie.map((s, i) => {
    const [, mm] = s.mes.split('-');
    const label = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][parseInt(mm,10)-1];
    const x = chartLeft + i * slot + slot/2;
    const active = s.mes === mesAtivo;
    const _tc = isDark() ? '#E2D9CE' : '#1C1C1C';
    const _tm = isDark() ? '#6B7F96' : '#7A726A';
    return `<text x="${x.toFixed(1)}" y="226" text-anchor="middle" font-size="10" font-family="Inter, sans-serif" fill="${active ? _tc : _tm}" font-weight="${active ? '700' : '400'}">${label}</text>`;
  }).join('');
  const _grid = isDark() ? '#2A3448' : '#E5DDD0';
  const _axis = isDark() ? '#6B7F96' : '#7A726A';
  return `
    <svg class="chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="barGold" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#D4AF37"/>
          <stop offset="100%" stop-color="#B8960C"/>
        </linearGradient>
      </defs>
      <g stroke="${_grid}" stroke-dasharray="2 4">
        ${[0, 0.25, 0.5, 0.75, 1].map(p => `<line x1="${chartLeft}" y1="${(chartTop + p * chartH).toFixed(1)}" x2="${chartRight}" y2="${(chartTop + p * chartH).toFixed(1)}"/>`).join('')}
      </g>
      <g fill="${_axis}" font-size="10" font-family="Inter, sans-serif" text-anchor="end">
        ${[0, 0.25, 0.5, 0.75, 1].map(p => `<text x="32" y="${(chartTop + p * chartH + 4).toFixed(1)}">${Math.round(yMax - p * yMax)}</text>`).join('')}
      </g>
      ${bars}
      ${xLabels}
    </svg>`;
}

function lineChartSvg(serie, mesAtivo) {
  if (!serie.some(s => s.media != null)) return '<div class="chart-empty">Nenhuma avaliação no período</div>';
  const w = 600, h = 240;
  const chartH = 170, chartTop = 30, chartLeft = 40, chartRight = 580;
  const cw = chartRight - chartLeft;
  const stepX = serie.length > 1 ? cw / (serie.length - 1) : 0;
  const _grid2 = isDark() ? '#2A3448' : '#E5DDD0';
  const _axis2 = isDark() ? '#6B7F96' : '#7A726A';
  const _markerInact = isDark() ? '#1A2230' : '#fff';
  const pts = serie.map((s, i) => {
    const x = chartLeft + (serie.length === 1 ? cw / 2 : i * stepX);
    const y = s.media != null ? chartTop + chartH - (s.media / 10) * chartH : null;
    return [x, y, s];
  });

  // Linha segmentada — quebra onde não há dados
  let lineD = '', inSeg = false;
  for (const [x, y] of pts) {
    if (y == null) { inSeg = false; continue; }
    lineD += inSeg ? ` L${x.toFixed(1)},${y.toFixed(1)}` : `M${x.toFixed(1)},${y.toFixed(1)}`;
    inSeg = true;
  }

  // Área de preenchimento usando apenas pontos com dados
  const withData = pts.filter(([, y]) => y != null);
  const areaD = withData.length >= 2
    ? 'M' + withData.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L')
      + ` L${withData[withData.length-1][0].toFixed(1)},${(chartTop + chartH).toFixed(1)}`
      + ` L${withData[0][0].toFixed(1)},${(chartTop + chartH).toFixed(1)} Z`
    : '';

  const markers = pts.map(([x, y, s]) => {
    if (y == null) return '';
    const active = s.mes === mesAtivo;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${active ? 5 : 4}" fill="${active ? '#15803D' : _markerInact}" stroke="#15803D" stroke-width="2"/>`;
  }).join('');

  const xLabels = pts.map(([x, , s]) => {
    const [, mm] = s.mes.split('-');
    const label = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][parseInt(mm,10)-1];
    const active = s.mes === mesAtivo;
    const _tc2 = isDark() ? '#E2D9CE' : '#1C1C1C';
    const _tm2 = isDark() ? '#6B7F96' : '#7A726A';
    return `<text x="${x.toFixed(1)}" y="226" text-anchor="middle" font-size="10" font-family="Inter, sans-serif" fill="${active ? _tc2 : _tm2}" font-weight="${active ? '700' : '400'}">${label}</text>`;
  }).join('');

  // Tooltip do último ponto com dados
  const last = withData[withData.length - 1];
  const tooltipEl = last
    ? `<rect x="${(last[0] - 25).toFixed(1)}" y="${(last[1] - 22).toFixed(1)}" width="50" height="20" rx="2" fill="#15803D"/>
       <text x="${last[0].toFixed(1)}" y="${(last[1] - 8).toFixed(1)}" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="Inter, sans-serif">${last[2].media.toFixed(1).replace('.', ',')}</text>`
    : '';

  return `
    <svg class="chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="satFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#15803D" stop-opacity=".24"/>
          <stop offset="100%" stop-color="#15803D" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <g stroke="${_grid2}" stroke-dasharray="2 4">
        ${[0, 0.25, 0.5, 0.75, 1].map(p => `<line x1="${chartLeft}" y1="${(chartTop + p * chartH).toFixed(1)}" x2="${chartRight}" y2="${(chartTop + p * chartH).toFixed(1)}"/>`).join('')}
      </g>
      <g fill="${_axis2}" font-size="10" font-family="Inter, sans-serif" text-anchor="end">
        ${[10, 8, 6, 4, 2].map((n, i) => `<text x="32" y="${(chartTop + (i / 4) * chartH + 4).toFixed(1)}">${n}</text>`).join('')}
      </g>
      ${areaD ? `<path d="${areaD}" fill="url(#satFill)"/>` : ''}
      <path d="${lineD}" fill="none" stroke="#15803D" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      ${markers}
      ${tooltipEl}
      ${xLabels}
    </svg>`;
}

function setoresList(setores) {
  if (!setores.length) return '<div class="chart-empty">Sem dados no período</div>';
  const maxT = Math.max(...setores.map(s => s.total), 1);
  return '<div class="sector-list">' + setores.map((s, i) => `
    <div class="sector-row ${i === 0 ? 'top' : ''}">
      <div class="sector-rank">${i + 1}</div>
      <div class="sector-body">
        <div class="sector-name">${s.setor}</div>
        <div class="sector-bar"><div class="sector-fill" style="width:${(s.total / maxT * 100).toFixed(0)}%"></div></div>
      </div>
      <div class="sector-count">${s.total}${i === 0 ? ' <small>chamados</small>' : ''}</div>
    </div>
  `).join('') + '</div>';
}

function donutCategorias(cats, total) {
  if (!cats.length || total === 0) return '<div class="chart-empty">Sem dados</div>';
  const r = 58;
  const C = 2 * Math.PI * r;
  let offset = 0;
  const segs = cats.map(c => {
    const len = (c.total / total) * C;
    const seg = `<circle cx="80" cy="80" r="${r}" stroke="${CAT_COLORS[c.categoria] || CAT_COLORS.outros}" stroke-dasharray="${len.toFixed(1)} ${(C - len).toFixed(1)}" stroke-dashoffset="${(-offset).toFixed(1)}"/>`;
    offset += len;
    return seg;
  }).join('');
  const legend = cats.map(c => {
    const pct = ((c.total / total) * 100).toFixed(0);
    return `<div class="leg">
      <span class="leg-sw" style="background:${CAT_COLORS[c.categoria] || CAT_COLORS.outros}"></span>
      <span class="leg-name">${CAT_NOMES[c.categoria] || c.categoria}</span>
      <span class="leg-count">${c.total}</span>
      <span class="leg-pct">${pct}%</span>
    </div>`;
  }).join('');
  return `
    <div class="donut-wrap">
      <svg viewBox="0 0 160 160" aria-label="Distribuição por categoria">
        <g fill="none" stroke-width="22"><circle cx="80" cy="80" r="${r}" stroke="#E5DDD0"/></g>
        <g fill="none" stroke-width="22" transform="rotate(-90 80 80)">${segs}</g>
        <text x="80" y="74" font-size="10" fill="#7A726A" letter-spacing="1" text-anchor="middle">TOTAL</text>
        <text x="80" y="100" font-size="26" text-anchor="middle" font-weight="700">${total}</text>
      </svg>
      <div class="donut-legend">${legend}</div>
    </div>`;
}

function rankingRows(ranking) {
  if (!ranking.length) return '<div class="chart-empty" style="padding:1.5rem">Nenhum admin com atividade no período</div>';
  const ordenado = [...ranking].sort((a, b) => (b.concluidos + b.encerrados) - (a.concluidos + a.encerrados));
  return ordenado.map((a, i) => {
    const tot = a.concluidos + a.encerrados;
    const medal = i === 0 && tot > 0 ? 'gold' : i === 1 && tot > 0 ? 'silver' : i === 2 && tot > 0 ? 'bronze' : 'plain';
    const isVoce = _adminLogadoId && Number(a.id) === Number(_adminLogadoId);
    const iniciais = (a.nome_completo || '?').split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
    const semAtividade = tot === 0;
    const notaTxt = a.nota_media != null
      ? `<span style="color:${a.nota_media >= 8 ? 'var(--success)' : a.nota_media >= 6 ? 'var(--warning)' : 'var(--danger)'};font-weight:600">${a.nota_media.toFixed(1).replace('.', ',')}</span><small style="color:var(--text-muted);font-weight:400">/10</small>`
      : '<span class="muted">—</span>';
    const extraClass = [isVoce ? 'you' : '', i === 0 && tot > 0 ? 'rank-first' : ''].filter(Boolean).join(' ');
    return `
      <div class="rank-row ${extraClass}" style="animation-delay:${i * 55}ms">
        <div class="rank-pos"><div class="rank-medal ${medal}">${i + 1}</div></div>
        <div class="rank-name">
          <div class="rank-avatar" ${semAtividade ? 'style="background:var(--bg);color:var(--text-muted);border-color:var(--border)"' : ''}>${iniciais}</div>
          <span ${semAtividade ? 'style="color:var(--text-muted)"' : ''}>${a.nome_completo}</span>
          ${isVoce ? '<span class="rank-you-tag">Você</span>' : ''}
        </div>
        <div class="rank-num ${semAtividade ? 'muted' : ''}" style="justify-content:flex-end">${tot}</div>
        <div class="rank-num muted" style="justify-content:flex-end">${fmtTempo(a.tempo_medio_seg)}</div>
        <div class="rank-num" style="justify-content:flex-end;gap:.2rem;align-items:baseline">${notaTxt}</div>
      </div>`;
  }).join('');
}

// ── Carregamento ───────────────────────────────────────────
async function carregar(mes) {
  document.getElementById('label-mes').textContent = nomeMes(mes);
  document.getElementById('sel-mes').value = mes;
  document.getElementById('conteudo').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const [r1, r2] = await Promise.all([
      api(`/api/admin/relatorios?mes=${mes}`),
      api(`/api/admin/relatorios/ranking?mes=${mes}`),
    ]);
    if (_adminLogadoId == null) {
      try { const me = await (await api('/api/admin/me')).json(); _adminLogadoId = me.id; } catch {}
    }
    if (!r1.ok || !r2.ok) throw new Error('falha');
    const dados = await r1.json();
    const ranking = await r2.json();
    renderConteudo(dados, ranking, mes);
  } catch (err) {
    console.error(err);
    document.getElementById('conteudo').innerHTML = '<div class="alert alert-danger">Erro ao carregar relatório.</div>';
  }
}

// ── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  let mes = mesAtual();
  document.getElementById('sel-mes').max = mes;

  document.getElementById('btn-mes-anterior').addEventListener('click', () => { mes = mesAnterior(mes); carregar(mes); });
  document.getElementById('btn-mes-proximo').addEventListener('click', () => {
    const prox = mesProximo(mes);
    if (prox > mesAtual()) return;
    mes = prox;
    carregar(mes);
  });
  document.getElementById('btn-mes-atual').addEventListener('click', () => { mes = mesAtual(); carregar(mes); });
  document.getElementById('sel-mes').addEventListener('change', (e) => {
    if (e.target.value) { mes = e.target.value; carregar(mes); }
  });
  document.querySelector('label.picker').addEventListener('click', () => {
    document.getElementById('sel-mes').showPicker?.();
  });

  carregar(mes);
});
