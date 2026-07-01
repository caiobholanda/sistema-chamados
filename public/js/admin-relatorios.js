// ── Relatórios v2 — layout profissional ────────────────────
function _esc(s) {
  return (s ?? '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
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

// Carrega nomes legíveis das etiquetas dinâmicas
fetch('/api/etiquetas', { credentials: 'include' })
  .then(r => r.ok ? r.json() : [])
  .then(arr => { for (const e of arr) if (e.slug && !CAT_NOMES[e.slug]) CAT_NOMES[e.slug] = e.nome; })
  .catch(() => {});

function _catLabel(slug) {
  if (CAT_NOMES[slug]) return CAT_NOMES[slug];
  if (!slug) return 'Sem categoria';
  return slug.split('_').map(w => w ? w[0].toUpperCase() + w.slice(1) : '').join(' ');
}

let _adminLogadoId = null;

function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }

async function api(url, opts = {}) {
  const res = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opts });
  if (res.status === 401) { location.replace('/acesso-hub.html?next=' + encodeURIComponent(location.href)); throw new Error('401'); }
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
          top10Setores, porCategoria, tempoMedioRespostaSeg, sla, chamadosReabertos } = dados;
  const tendencia6m = padSerie12m(dados.tendencia6m, mes);
  const mesAntKey = mesAnterior(mes);
  const notaMesAntObj = tendencia6m.find(s => s.mes === mesAntKey) || { media: null, total: 0 };
  const anoAtual = mes.slice(0, 4);
  const mesesAno = tendencia6m.filter(s => s.mes.startsWith(anoAtual) && s.media != null);
  const notaAnoTotal = mesesAno.reduce((acc, s) => acc + s.total, 0);
  const notaAnoMedia = notaAnoTotal > 0
    ? mesesAno.reduce((acc, s) => acc + s.media * s.total, 0) / notaAnoTotal
    : null;

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
            <div class="chart-sub">Comparativo de notas · escala 1–10</div>
          </div>
          <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
            ${notaMedia.media ? `<span class="chart-pill ${notaMedia.media >= 8 ? 'good' : 'warn'}">${notaMedia.media.toFixed(1).replace('.', ',')} este mês</span>` : ''}
            <button type="button" class="btn btn-secondary btn-sm" id="btn-ver-avaliados" style="font-size:.68rem" title="Ver todos os chamados avaliados">Ver chamados avaliados</button>
          </div>
        </div>
        ${comparacaoNotasHtml(notaMedia, notaMesAntObj, notaAnoMedia, notaAnoTotal, mes)}
      </div>
    </div>

    <div class="rel-section-title">Distribuição <span class="right">por origem e tipo</span></div>
    <div class="rel-row r-3">
      <div class="chart-card">
        <div class="chart-head">
          <div class="chart-title-block">
            <div class="chart-title">Setores com mais chamados</div>
            <div class="chart-sub">Top 10 origens — onde a demanda é maior</div>
          </div>
        </div>
        ${setoresList(top10Setores)}
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

function comparacaoNotasHtml(notaMesAtual, notaMesAnt, notaAnoMedia, notaAnoTotal, mes) {
  function coluna(titulo, subtitulo, media, total, extra) {
    const vazio = media == null;
    const nota = vazio ? null : Math.round(media * 10) / 10;
    const pct = vazio ? 0 : (media / 10) * 100;
    const cor = vazio ? '#7A726A' : media >= 8 ? '#15803D' : media >= 6 ? '#D97706' : '#B45309';
    const barCor = vazio ? (isDark() ? '#2A3448' : '#E5DDD0') : cor;
    return `
      <div class="nota-col">
        <div class="nota-col-titulo">${titulo}</div>
        <div class="nota-col-sub">${subtitulo}</div>
        <div class="nota-col-num" style="color:${cor}">${vazio ? '—' : nota.toFixed(1).replace('.', ',')}</div>
        <div class="nota-bar-wrap">
          <div class="nota-bar-fill" style="width:${pct.toFixed(1)}%;background:${barCor}"></div>
        </div>
        <div class="nota-col-count">${total > 0 ? total + ' avaliaç' + (total !== 1 ? 'ões' : 'ão') : 'sem avaliações'}</div>
        ${extra || ''}
      </div>`;
  }

  const deltaMes = notaMesAtual.media != null && notaMesAnt.media != null
    ? notaMesAtual.media - notaMesAnt.media : null;
  const deltaAno = notaMesAtual.media != null && notaAnoMedia != null
    ? notaMesAtual.media - notaAnoMedia : null;

  function deltaTag(delta) {
    if (delta == null) return '';
    const abs = Math.abs(delta).toFixed(1);
    if (Math.abs(delta) < 0.05) return `<div class="nota-delta flat">— sem variação</div>`;
    const sinal = delta > 0 ? '▲ +' : '▼ ';
    const cls = delta > 0 ? 'up' : 'down';
    return `<div class="nota-delta ${cls}">${sinal}${abs} vs. anterior</div>`;
  }

  const colAtual = coluna('Este mês', nomeMes(mes), notaMesAtual.media, notaMesAtual.total || 0, deltaTag(deltaMes));
  const colAnt   = coluna('Mês anterior', nomeMes(mesAnterior(mes)), notaMesAnt.media, notaMesAnt.total || 0, '');
  const colAno   = coluna(`Média ${mes.slice(0, 4)}`, `Jan–${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(mes.slice(5,7),10)-1]} (ano atual)`, notaAnoMedia, notaAnoTotal, deltaTag(deltaAno));

  return `<div class="nota-comparativo">${colAtual}${colAnt}${colAno}</div>`;
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
        <div class="sector-name">${_esc(s.setor)}</div>
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
      <span class="leg-name">${_catLabel(c.categoria)}</span>
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
          <span ${semAtividade ? 'style="color:var(--text-muted)"' : ''}>${_esc(a.nome_completo)}</span>
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
      try { const me = await (await api('/api/admin/me')).json(); _adminLogadoId = me.id; window.adminInfo = me; } catch {}
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

  document.getElementById('cm-btn-fechar-modal').addEventListener('click', () => {
    if (typeof window.fecharChamadoModal === 'function') window.fecharChamadoModal();
  });

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

// ── Modal "Chamados avaliados" ─────────────────────────────
let _avalEscHandler = null;
let _avalBodyOverflow = '';
let _avalDados = [];

function _fmtDataHoraBR(s) {
  if (!s) return '—';
  const iso = s.includes('T') ? s : s.replace(' ', 'T');
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' });
}

function _fecharModalAvaliados() {
  const ov = document.getElementById('aval-overlay');
  if (ov) ov.remove();
  document.body.style.overflow = _avalBodyOverflow;
  if (_avalEscHandler) {
    document.removeEventListener('keydown', _avalEscHandler);
    _avalEscHandler = null;
  }
}

function _abrirChamadoDeRelatorio(id) {
  if (typeof window.abrirChamadoModal !== 'function') return;
  window._cmApi = api;
  const el = document.getElementById('cm-modal-overlay');
  if (el) document.body.appendChild(el);
  window.abrirChamadoModal(id);
}

function _renderOverlayAvaliados(innerHtml) {
  const ja = document.getElementById('aval-overlay');
  if (ja) ja.remove();
  const ov = document.createElement('div');
  ov.id = 'aval-overlay';
  ov.className = 'modal-overlay open';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', 'Chamados avaliados');
  ov.innerHTML = `<div class="modal" style="max-width:min(96vw,820px)" tabindex="-1">${innerHtml}</div>`;
  document.body.appendChild(ov);

  if (_avalEscHandler == null) {
    _avalBodyOverflow = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';
    _avalEscHandler = (e) => { if (e.key === 'Escape') _fecharModalAvaliados(); };
    document.addEventListener('keydown', _avalEscHandler);
  }

  ov.addEventListener('click', (e) => { if (e.target === ov) _fecharModalAvaliados(); });
  ov.querySelectorAll('[data-aval-close]').forEach(b => b.addEventListener('click', _fecharModalAvaliados));

  const focusEl = ov.querySelector('.modal');
  if (focusEl) focusEl.focus();
  return ov;
}

function _headerAvaliados(sub) {
  return `
    <div class="modal-header">
      <div>
        <h2 style="margin:0">Chamados avaliados</h2>
        <div style="font-size:.75rem;color:var(--text-muted);margin-top:.15rem">${_esc(sub || '')}</div>
      </div>
      <button type="button" class="modal-close" data-aval-close aria-label="Fechar">✕</button>
    </div>`;
}

function _cardAvaliado(c) {
  const nota = Number(c.nota);
  const corNota = nota >= 8 ? 'var(--success)' : nota >= 6 ? 'var(--warning)' : 'var(--danger)';
  const cat = c.servico_nome ? _esc(c.servico_nome) : _esc(_catLabel(c.categoria));
  const comentario = (c.comentario_avaliacao || '').trim();
  return `
    <div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:.75rem 1rem;background:var(--surface-2)">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:.75rem;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
          <button type="button" onclick="_abrirChamadoDeRelatorio(${c.id})" style="background:var(--gold-pale,rgba(156,88,67,.1));border:1px solid var(--gold);color:var(--gold);font-size:.88rem;font-weight:700;font-family:inherit;padding:.15rem .45rem;border-radius:var(--radius-sm);cursor:pointer;transition:background .15s">#${c.id}</button>
          <span style="color:var(--text);font-weight:600">${cat}</span>
        </div>
        <div style="font-weight:700;color:${corNota};font-size:1rem">${nota.toFixed(1).replace('.', ',')}<small style="color:var(--text-muted);font-weight:400">/10</small></div>
      </div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;font-size:.78rem;color:var(--text-secondary);margin-top:.35rem;align-items:center">
        <span>${_esc(c.nome || '—')}</span>
        <span style="color:var(--text-muted)">•</span>
        <span>${_esc(c.setor || '—')}</span>
        <span style="color:var(--text-muted)">•</span>
        <span>Concluído em ${_fmtDataHoraBR(c.concluido_em)}</span>
      </div>
      ${comentario ? `<div style="margin-top:.55rem;padding:.5rem .7rem;background:var(--surface);border-left:3px solid var(--gold);border-radius:var(--radius-sm);font-size:.82rem;color:var(--text);font-style:italic">“${_esc(comentario)}”</div>` : ''}
    </div>`;
}

function _renderShellAvaliados() {
  const total = _avalDados.length;
  const sub = total === 0
    ? 'Nenhum chamado concluído com avaliação'
    : `${total} chamado${total !== 1 ? 's' : ''} concluído${total !== 1 ? 's' : ''} com avaliação`;
  _renderOverlayAvaliados(`
    ${_headerAvaliados(sub)}
    <div class="modal-body" style="padding:0;display:flex;flex-direction:column;overflow:hidden">
      <div style="padding:.75rem 1.25rem;border-bottom:1px solid var(--border);background:var(--surface-2);display:flex;gap:.75rem;align-items:flex-end;flex-wrap:wrap">
        <div>
          <label for="aval-de" style="display:block;font-size:.68rem;color:var(--text-muted);font-weight:600;letter-spacing:.04em;text-transform:uppercase;margin-bottom:.2rem">De</label>
          <input type="date" id="aval-de" class="form-control" style="padding:.35rem .55rem;font-size:.82rem;width:auto">
        </div>
        <div>
          <label for="aval-ate" style="display:block;font-size:.68rem;color:var(--text-muted);font-weight:600;letter-spacing:.04em;text-transform:uppercase;margin-bottom:.2rem">Até</label>
          <input type="date" id="aval-ate" class="form-control" style="padding:.35rem .55rem;font-size:.82rem;width:auto">
        </div>
        <button type="button" id="aval-limpar" class="btn btn-secondary btn-sm" style="font-size:.68rem">Limpar filtro</button>
        <div id="aval-contagem" style="margin-left:auto;font-size:.78rem;color:var(--text-secondary);font-weight:600"></div>
      </div>
      <div id="aval-lista" style="padding:1rem 1.25rem;overflow-y:auto;flex:1"></div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" data-aval-close>Fechar</button>
    </div>
  `);

  const de = document.getElementById('aval-de');
  const ate = document.getElementById('aval-ate');
  const limpar = document.getElementById('aval-limpar');
  de.addEventListener('change', _atualizarListaAvaliados);
  ate.addEventListener('change', _atualizarListaAvaliados);
  limpar.addEventListener('click', () => {
    de.value = '';
    ate.value = '';
    _atualizarListaAvaliados();
  });

  _atualizarListaAvaliados();
}

function _atualizarListaAvaliados() {
  const deEl = document.getElementById('aval-de');
  const ateEl = document.getElementById('aval-ate');
  if (!deEl || !ateEl) return;
  const de = deEl.value;
  const ate = ateEl.value;

  let filtrado = _avalDados;
  if (de)  filtrado = filtrado.filter(c => (c.concluido_em || '').slice(0, 10) >= de);
  if (ate) filtrado = filtrado.filter(c => (c.concluido_em || '').slice(0, 10) <= ate);

  const contagem = document.getElementById('aval-contagem');
  const lista = document.getElementById('aval-lista');
  const totalFiltrado = filtrado.length;
  const totalGeral = _avalDados.length;
  const sufixoFiltro = (de || ate) ? ` de ${totalGeral}` : '';
  contagem.textContent = totalFiltrado === 0
    ? 'Nenhum chamado no filtro'
    : `${totalFiltrado} chamado${totalFiltrado !== 1 ? 's' : ''}${sufixoFiltro}`;

  if (totalFiltrado === 0) {
    lista.innerHTML = `<div class="chart-empty" style="padding:2rem">${(de || ate) ? 'Nenhum chamado avaliado no período selecionado.' : 'Nenhum chamado concluído com avaliação.'}</div>`;
    return;
  }

  const grupos = {};
  for (const c of filtrado) {
    const ym = (c.concluido_em || '').slice(0, 7) || 'sem-data';
    (grupos[ym] = grupos[ym] || []).push(c);
  }
  const chaves = Object.keys(grupos).sort().reverse();

  const bgMes = isDark() ? 'rgba(201,169,97,.14)' : 'var(--gold-pale)';
  lista.innerHTML = chaves.map(ym => `
    <div style="margin-bottom:1.25rem">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:.5rem;margin-bottom:.55rem;padding:.5rem .75rem;background:${bgMes};border-left:3px solid var(--gold);border-radius:var(--radius-sm)">
        <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:1.05rem;font-weight:600;color:var(--text);text-transform:capitalize;letter-spacing:.01em">${ym === 'sem-data' ? 'Sem data de conclusão' : _esc(nomeMes(ym))}</div>
        <span style="font-size:.7rem;color:var(--text-secondary);font-weight:700">${grupos[ym].length} chamado${grupos[ym].length !== 1 ? 's' : ''}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:.55rem">
        ${grupos[ym].map(_cardAvaliado).join('')}
      </div>
    </div>
  `).join('');
}

async function abrirModalAvaliados() {
  _renderOverlayAvaliados(`
    ${_headerAvaliados('Carregando…')}
    <div class="modal-body" style="padding:2rem"><div class="loading"><div class="spinner"></div></div></div>
  `);
  try {
    const r = await api('/api/admin/chamados');
    if (!r.ok) throw new Error('falha');
    const arr = await r.json();
    _avalDados = arr
      .filter(c => c.nota !== null && c.nota !== undefined && c.status === 'concluido')
      .sort((a, b) => (b.concluido_em || '').localeCompare(a.concluido_em || ''));
    _renderShellAvaliados();
    return;
  } catch (err) {
    if (err && err.message === '401') return;
    console.error(err);
    _renderOverlayAvaliados(`
      ${_headerAvaliados('Erro ao carregar')}
      <div class="modal-body" style="padding:1.5rem">
        <div class="alert alert-danger">Erro ao carregar chamados avaliados.</div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-aval-close>Fechar</button>
      </div>
    `);
  }
}

if (!window.__avalDelegado) {
  window.__avalDelegado = true;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('#btn-ver-avaliados');
    if (btn) abrirModalAvaliados();
  });
}
