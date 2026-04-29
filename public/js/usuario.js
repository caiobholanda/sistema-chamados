const app = document.getElementById('app');

function fmtData(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function badgeStatus(s) {
  const labels = { aberto: 'Aberto', em_andamento: 'Em andamento', concluido: 'Concluído', encerrado: 'Encerrado' };
  return `<span class="badge badge-${s}">${labels[s] || s}</span>`;
}

// ── Roteamento simples ─────────────────────────────────────────
const params = new URLSearchParams(location.search);
const chamadoId = params.get('chamado');

if (chamadoId) {
  renderAcompanhamento(chamadoId);
} else {
  renderFormulario();
}

// ── Formulário de abertura ─────────────────────────────────────
function renderFormulario() {
  app.innerHTML = `
    <div class="card" style="max-width:640px;margin:0 auto">
      <h2 style="margin-bottom:1.5rem;font-size:1.3rem">Abrir Chamado de TI</h2>
      <div id="msg-form"></div>
      <form id="form-chamado" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label for="nome">Nome <span class="req" aria-hidden="true">*</span></label>
            <input class="form-control" type="text" id="nome" name="nome" required minlength="2" maxlength="80" placeholder="Seu nome completo" autocomplete="name">
          </div>
          <div class="form-group">
            <label for="ramal">Ramal <span class="req" aria-hidden="true">*</span></label>
            <input class="form-control" type="text" id="ramal" name="ramal" required pattern="\\d{4}" minlength="4" maxlength="4" placeholder="0000" inputmode="numeric">
            <p class="form-hint">Exatamente 4 dígitos</p>
          </div>
        </div>
        <div class="form-group">
          <label for="setor">Setor <span class="req" aria-hidden="true">*</span></label>
          <input class="form-control" type="text" id="setor" name="setor" required minlength="2" maxlength="60" placeholder="Ex: Recepção, Governança, Restaurante...">
        </div>
        <div class="form-group">
          <label for="descricao">Descrição do problema <span class="req" aria-hidden="true">*</span></label>
          <textarea class="form-control" id="descricao" name="descricao" required minlength="10" maxlength="2000" placeholder="Descreva o problema com o máximo de detalhes..."></textarea>
          <p class="form-hint" id="desc-counter">0/2000 caracteres</p>
        </div>
        <div class="form-group">
          <label for="anexo">Anexo (opcional)</label>
          <input class="form-control" type="file" id="anexo" name="anexo" accept=".jpg,.jpeg,.png,.pdf,.txt,.log,.docx">
          <p class="form-hint">Formatos aceitos: jpg, png, pdf, txt, log, docx — máx. 10 MB</p>
        </div>
        <button type="submit" class="btn btn-primary btn-full" id="btn-enviar">Enviar Chamado</button>
      </form>
    </div>
  `;

  const descricao = document.getElementById('descricao');
  const counter = document.getElementById('desc-counter');
  descricao.addEventListener('input', () => {
    counter.textContent = `${descricao.value.length}/2000 caracteres`;
  });

  document.getElementById('form-chamado').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('msg-form');
    const btn = document.getElementById('btn-enviar');
    msg.innerHTML = '';

    const form = e.target;
    const ramal = form.ramal.value.trim();
    if (!/^\d{4}$/.test(ramal)) {
      msg.innerHTML = '<div class="alert alert-danger">Ramal deve ter exatamente 4 dígitos numéricos.</div>';
      form.ramal.focus();
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
      const fd = new FormData(form);
      const res = await fetch('/api/chamados', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        msg.innerHTML = `<div class="alert alert-danger">${data.erro || 'Erro ao enviar chamado.'}</div>`;
        return;
      }
      renderSucesso(data.id);
    } catch {
      msg.innerHTML = '<div class="alert alert-danger">Erro de conexão. Tente novamente.</div>';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Enviar Chamado';
    }
  });
}

// ── Tela de sucesso ────────────────────────────────────────────
function renderSucesso(id) {
  app.innerHTML = `
    <div class="card text-center" style="max-width:520px;margin:0 auto">
      <div style="font-size:3rem;margin-bottom:1rem">✅</div>
      <h2 style="margin-bottom:.5rem">Chamado aberto com sucesso!</h2>
      <p class="text-muted mb-2">Anote o número do seu chamado para acompanhamento:</p>
      <div style="font-size:2.5rem;font-weight:700;color:var(--primary);margin:.75rem 0">#${id}</div>
      <div class="flex gap-2 mt-2" style="justify-content:center;flex-wrap:wrap">
        <a href="/?chamado=${id}" class="btn btn-primary">Acompanhar este chamado</a>
        <a href="/" class="btn btn-secondary">Abrir novo chamado</a>
      </div>
    </div>
  `;
}

// ── Acompanhamento ─────────────────────────────────────────────
async function renderAcompanhamento(id) {
  app.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const res = await fetch(`/api/chamados/${id}`);
    if (res.status === 404) {
      app.innerHTML = `<div class="card text-center" style="max-width:520px;margin:0 auto">
        <p class="text-muted">Chamado <strong>#${id}</strong> não encontrado.</p>
        <a href="/" class="btn btn-secondary mt-2">Voltar</a>
      </div>`;
      return;
    }
    const c = await res.json();
    renderDetalhe(c);
  } catch {
    app.innerHTML = '<div class="alert alert-danger">Erro ao carregar chamado.</div>';
  }
}

function renderDetalhe(c) {
  const prazoHistHtml = c.historicoPrazos && c.historicoPrazos.length > 0
    ? `<div class="banner-prazo mt-1">
        <strong>⚠️ Prazo foi alterado:</strong>
        ${c.historicoPrazos.map((h, i) => {
          const ant = h.valor_anterior ? fmtData(h.valor_anterior) : 'sem prazo';
          const nov = h.valor_novo ? fmtData(h.valor_novo) : 'removido';
          return `Prazo anterior: ${ant} → ${nov} (alterado por <strong>${h.admin_nome || 'Admin'}</strong> em ${fmtData(h.timestamp)})`;
        }).join('<br>')}
       </div>` : '';

  const avaliacaoHtml = () => {
    if (c.status !== 'concluido') return '';
    if (c.nota !== null) {
      return `<div class="alert alert-success mt-2">
        <strong>Avaliação registrada:</strong> ${c.nota}/10
        ${c.comentario_avaliacao ? `<br><em>${c.comentario_avaliacao}</em>` : ''}
      </div>`;
    }
    return `
      <hr>
      <h3 style="margin-bottom:.75rem;font-size:1rem">Avaliar atendimento</h3>
      <div id="msg-avaliacao"></div>
      <form id="form-avaliacao">
        <div class="form-group">
          <label>Nota (1 a 10) <span class="req" aria-hidden="true">*</span></label>
          <div class="stars" role="group" aria-label="Nota de 1 a 10" id="stars-container">
            ${Array.from({length:10},(_,i)=>`<button type="button" class="star-btn" data-nota="${i+1}" aria-label="Nota ${i+1}">${i+1}</button>`).join('')}
          </div>
          <input type="hidden" id="nota-valor" name="nota" value="">
        </div>
        <div class="form-group">
          <label for="comentario">Comentário (opcional)</label>
          <textarea class="form-control" id="comentario" name="comentario_avaliacao" maxlength="500" placeholder="Conte como foi o atendimento..."></textarea>
        </div>
        <button type="submit" class="btn btn-primary" id="btn-avaliar">Enviar avaliação</button>
      </form>`;
  };

  app.innerHTML = `
    <div style="max-width:640px;margin:0 auto">
      <div class="flex-between mb-2 flex-wrap gap-1">
        <a href="/" class="btn btn-secondary btn-sm">← Novo chamado</a>
        <span class="text-muted" style="font-size:.85rem">Chamado #${c.id}</span>
      </div>
      <div class="card">
        <div class="flex-between flex-wrap gap-1 mb-1">
          ${badgeStatus(c.status)}
          ${c.prioridade ? `<span class="badge badge-${c.prioridade}">${c.prioridade.charAt(0).toUpperCase()+c.prioridade.slice(1)}</span>` : ''}
        </div>
        ${prazoHistHtml}
        <div style="display:grid;gap:.6rem;margin-top:.75rem">
          <div><span class="text-muted" style="font-size:.8rem">Solicitante</span><br><strong>${c.nome}</strong></div>
          <div><span class="text-muted" style="font-size:.8rem">Setor / Ramal</span><br>${c.setor} — ${c.ramal}</div>
          <div><span class="text-muted" style="font-size:.8rem">Aberto em</span><br>${fmtData(c.criado_em)}</div>
          ${c.prazo ? `<div><span class="text-muted" style="font-size:.8rem">Prazo</span><br>${fmtData(c.prazo)}</div>` : ''}
          <div><span class="text-muted" style="font-size:.8rem">Descrição</span><br>${c.descricao}</div>
          ${c.anexo_nome_original ? `<div><span class="text-muted" style="font-size:.8rem">Anexo</span><br>
            <a href="/api/chamados/${c.id}/anexo" class="btn btn-secondary btn-sm" download>⬇ ${c.anexo_nome_original}</a></div>` : ''}
          ${c.solucao ? `<div><span class="text-muted" style="font-size:.8rem">Solução registrada</span><br>${c.solucao}</div>` : ''}
        </div>
        ${avaliacaoHtml()}
      </div>
    </div>
  `;

  // Stars interaction
  const stars = document.querySelectorAll('.star-btn');
  const notaInput = document.getElementById('nota-valor');
  stars.forEach(btn => {
    btn.addEventListener('click', () => {
      const nota = btn.dataset.nota;
      notaInput.value = nota;
      stars.forEach(b => b.classList.toggle('ativo', parseInt(b.dataset.nota) <= parseInt(nota)));
    });
  });

  const formAv = document.getElementById('form-avaliacao');
  if (formAv) {
    formAv.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('msg-avaliacao');
      const nota = document.getElementById('nota-valor').value;
      if (!nota) {
        msg.innerHTML = '<div class="alert alert-danger">Selecione uma nota.</div>';
        return;
      }
      const btn = document.getElementById('btn-avaliar');
      btn.disabled = true;
      btn.textContent = 'Enviando...';
      try {
        const body = new FormData(e.target);
        const res = await fetch(`/api/chamados/${c.id}/avaliar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nota: parseInt(nota), comentario_avaliacao: body.get('comentario_avaliacao') }),
        });
        const data = await res.json();
        if (!res.ok) {
          msg.innerHTML = `<div class="alert alert-danger">${data.erro}</div>`;
          return;
        }
        renderAcompanhamento(c.id);
      } catch {
        msg.innerHTML = '<div class="alert alert-danger">Erro ao enviar avaliação.</div>';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar avaliação';
      }
    });
  }
}
