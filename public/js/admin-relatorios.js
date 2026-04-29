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

  const mesInput = document.getElementById('sel-mes');
  mesInput.value = new Date().toISOString().slice(0, 7);
  await carregarRelatorio();
})();

document.getElementById('btn-logout').addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST' });
  location.replace('/admin-login.html');
});

document.getElementById('btn-carregar').addEventListener('click', carregarRelatorio);

document.getElementById('btn-exportar').addEventListener('click', () => {
  const mes = document.getElementById('sel-mes').value;
  window.location.href = `/api/admin/relatorios/exportar?mes=${mes}`;
});

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
    const dados = await r.json();
    renderRelatorio(dados, mes);
  } catch (err) {
    if (err.message !== '401')
      conteudo.innerHTML = '<div class="alert alert-danger">Erro ao carregar relatório.</div>';
  }
}

function getStatusCount(arr, status) {
  const item = arr.find(i => i.status === status);
  return item ? item.total : 0;
}

function renderRelatorio(dados, mes) {
  const [ano, m] = mes.split('-');
  const nomeMes = new Date(ano, m - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const notaMedia = dados.notaMedia && dados.notaMedia.media ? dados.notaMedia.media.toFixed(1) : '—';

  const conteudo = document.getElementById('conteudo');
  conteudo.innerHTML = `
    <h2 style="margin-bottom:1rem;font-size:1.1rem">Relatório — ${nomeMes.charAt(0).toUpperCase()+nomeMes.slice(1)}</h2>

    <!-- Cards de volume -->
    <div class="relat-cards">
      <div class="relat-card">
        <div class="numero" style="color:var(--cor-aberto)">${getStatusCount(dados.volumeStatus,'aberto')}</div>
        <div class="label">Abertos</div>
      </div>
      <div class="relat-card">
        <div class="numero" style="color:var(--cor-andamento)">${getStatusCount(dados.volumeStatus,'em_andamento')}</div>
        <div class="label">Em andamento</div>
      </div>
      <div class="relat-card">
        <div class="numero" style="color:var(--cor-concluido)">${getStatusCount(dados.volumeStatus,'concluido')}</div>
        <div class="label">Concluídos</div>
      </div>
      <div class="relat-card">
        <div class="numero" style="color:var(--cor-encerrado)">${getStatusCount(dados.volumeStatus,'encerrado')}</div>
        <div class="label">Encerrados</div>
      </div>
      <div class="relat-card">
        <div class="numero" style="color:var(--cor-media)">${notaMedia}</div>
        <div class="label">Nota média (${dados.notaMedia && dados.notaMedia.total ? dados.notaMedia.total : 0} aval.)</div>
      </div>
    </div>

    <!-- Gráficos -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem">
      <div class="card"><canvas id="grafico-abertos" height="220"></canvas></div>
      <div class="card"><canvas id="grafico-tendencia" height="220"></canvas></div>
    </div>
    <div class="card"><canvas id="grafico-setores" height="200"></canvas></div>
  `;

  // Abertos por mês (últimos 12)
  const mesesAbertos = dados.abertosUltimos12.map(i => {
    const [a, mm] = i.mes.split('-');
    return new Date(a, mm - 1, 1).toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
  });
  graficos.push(new Chart(document.getElementById('grafico-abertos'), {
    type: 'bar',
    data: {
      labels: mesesAbertos,
      datasets: [{ label: 'Chamados abertos', data: dados.abertosUltimos12.map(i => i.total), backgroundColor: '#3b82f6bb', borderRadius: 6 }],
    },
    options: { plugins: { legend: { display: false }, title: { display: true, text: 'Chamados abertos — últimos 12 meses' } }, responsive: true },
  }));

  // Tendência de nota média (6m)
  const mesesTend = dados.tendencia6m.map(i => {
    const [a, mm] = i.mes.split('-');
    return new Date(a, mm - 1, 1).toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
  });
  graficos.push(new Chart(document.getElementById('grafico-tendencia'), {
    type: 'line',
    data: {
      labels: mesesTend,
      datasets: [{ label: 'Nota média', data: dados.tendencia6m.map(i => i.media ? +i.media.toFixed(2) : null), borderColor: '#ca8a04', backgroundColor: '#ca8a0422', tension: .4, fill: true, pointRadius: 5 }],
    },
    options: { plugins: { title: { display: true, text: 'Nota média de satisfação — 6 meses' } }, responsive: true, scales: { y: { min: 0, max: 10 } } },
  }));

  // Top 5 setores
  graficos.push(new Chart(document.getElementById('grafico-setores'), {
    type: 'bar',
    data: {
      labels: dados.top5Setores.map(i => i.setor),
      datasets: [{ label: 'Chamados', data: dados.top5Setores.map(i => i.total), backgroundColor: '#8b5cf6bb', borderRadius: 6 }],
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false }, title: { display: true, text: 'Top 5 setores com mais chamados no mês' } },
      responsive: true,
    },
  }));
}
