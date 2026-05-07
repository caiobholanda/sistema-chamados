// chamado-modal.js — modal de chamado reutilizável para qualquer página admin
// Requer: window.adminInfo (objeto do admin logado), window._cmApi (função fetch wrapper)
// Opcional: window._cmOnClose (callback chamado ao fechar o modal)

(function () {

const CATEGORIAS_MAP = {
  software:       { nome: 'Software',          cor: '#6366F1', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>' },
  hardware:       { nome: 'Hardware',          cor: '#0EA5E9', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 18v3M8 21h8"/></svg>' },
  impressora:     { nome: 'Impressora',        cor: '#8B5CF6', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>' },
  ramal:          { nome: 'Ramal',             cor: '#EC4899', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.47 2 2 0 0 1 3.6 2.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.12 6.12l1.83-1.83a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>' },
  nobreak:        { nome: 'Nobreak',           cor: '#F59E0B', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>' },
  monitor:        { nome: 'Monitor',           cor: '#0891B2', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>' },
  mouse:          { nome: 'Mouse',             cor: '#10B981', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="7"/><path d="M12 2v8M5 10h14"/></svg>' },
  teclado:        { nome: 'Teclado',           cor: '#EF4444', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6" y2="10"/><line x1="10" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="14" y2="10"/><line x1="18" y1="10" x2="18" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/></svg>' },
  rede:           { nome: 'Rede / Internet',   cor: '#059669', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' },
  acesso_senha:   { nome: 'Acesso / Senha',    cor: '#DC2626', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' },
  cameras:        { nome: 'Câmeras / CFTV',    cor: '#D97706', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>' },
  email:          { nome: 'E-mail',            cor: '#64748B', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>' },
  tv_projetor:    { nome: 'TV / Projetor',     cor: '#7C3AED', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>' },
  processo_compra:{ nome: 'Processo de Compra',cor: '#16A34A', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>' },
  outros:         { nome: 'Outros',            cor: '#6B7280', icone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>' },
};

const STATUS_LABELS = { aberto: 'Aberto', em_andamento: 'Em andamento', concluido: 'Concluído', encerrado: 'Encerrado' };
const PRIO_LABELS   = { urgente: 'Urgente', alta: 'Alta', media: 'Média', baixa: 'Baixa' };

let _chamadoAtual = null;
let _chatIv = null;

function _api(url, opts = {}) {
  const fn = window._cmApi;
  if (fn) return fn(url, opts);
  return fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
}

function _fmtData(d) {
  if (!d) return '—';
  const iso = d.includes('T') ? d : d.replace(' ', 'T');
  const date = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' });
}

function _badgeCategoria(cat) {
  if (!cat || !CATEGORIAS_MAP[cat]) return '';
  const { nome, cor, icone } = CATEGORIAS_MAP[cat];
  return `<span class="badge-categoria" style="--cat-cor:${cor}">${icone} ${nome}</span>`;
}

function _badgeStatus(s) {
  return `<span class="badge badge-${s}">${STATUS_LABELS[s] || s}</span>`;
}

function _badgePrio(p) {
  if (!p) return `<span class="badge badge-sem-prioridade">Sem prioridade</span>`;
  return `<span class="badge badge-${p}">${PRIO_LABELS[p]}</span>`;
}

function _estaAtrasado(c) {
  if (!c.prazo) return false;
  if (['concluido', 'encerrado'].includes(c.status)) return false;
  return new Date(c.prazo.replace(' ', 'T')) < new Date();
}

function _traduzirAcao(acao) {
  const t = {
    prioridade_definida: 'Prioridade definida',
    status_alterado: 'Status alterado',
    prazo_alterado: 'Prazo alterado',
    solucao_registrada: 'Solução registrada',
    assumido: 'Chamado assumido',
    transferido: 'Chamado transferido',
    categoria_alterada: 'Categoria alterada',
  };
  return t[acao] || acao;
}

async function _atualizarChat(id) {
  const box = document.getElementById('cm-chat-msgs');
  if (!box) return;
  const atFundo = box.scrollTop + box.clientHeight >= box.scrollHeight - 6;
  const anterior = +(box.dataset.cnt || 0);
  try {
    const r = await _api('/api/admin/chamados/' + id + '/mensagens?_t=' + Date.now());
    if (!r.ok) return;
    const msgs = await r.json();
    box.dataset.cnt = msgs.length;
    if (!msgs.length) {
      if (!box.querySelector('.chat-msg'))
        box.innerHTML = '<div class="chat-vazio">Nenhuma mensagem trocada ainda.</div>';
      return;
    }
    const adminInfo = window.adminInfo;
    box.innerHTML = msgs.map(m => {
      const mine = m.autor_tipo === 'admin';
      return `<div class="chat-msg ${mine ? 'mine' : 'theirs'}">
        <div class="chat-msg-author">${m.autor_nome}</div>
        <div class="chat-msg-bubble">${m.mensagem}</div>
        <div class="chat-msg-time">${_fmtData(m.criado_em)}</div>
      </div>`;
    }).join('');
    if (atFundo || anterior < msgs.length) box.scrollTop = box.scrollHeight;
  } catch {}
}

function _renderBody(c) {
  const adminInfo = window.adminInfo || {};
  const isAberto    = ['aberto', 'em_andamento'].includes(c.status);
  const podeAssumir = ['aberto', 'em_andamento'].includes(c.status);
  const podeConcluir= ['aberto', 'em_andamento'].includes(c.status);
  const podeReabrir = ['concluido', 'encerrado'].includes(c.status);
  const atrasado    = _estaAtrasado(c);

  const bannerAtraso = atrasado
    ? `<div class="banner-atraso"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> <strong>Chamado em atraso</strong> — prazo vencido em ${_fmtData(c.prazo)}</div>`
    : '';

  const historicoPrazos = (c.historico || []).filter(h => h.acao === 'prazo_alterado');
  const bannerPrazo = historicoPrazos.length > 0
    ? `<div class="banner-prazo"><strong>Prazo alterado ${historicoPrazos.length}x.</strong> Último por ${historicoPrazos[historicoPrazos.length-1].admin_nome || 'Admin'}: de "${historicoPrazos[historicoPrazos.length-1].valor_anterior ? _fmtData(historicoPrazos[historicoPrazos.length-1].valor_anterior) : 'sem prazo'}" para "${historicoPrazos[historicoPrazos.length-1].valor_novo ? _fmtData(historicoPrazos[historicoPrazos.length-1].valor_novo) : 'removido'}"</div>`
    : '';

  const historicoHtml = c.historico && c.historico.length > 0
    ? c.historico.map(h => `
        <div class="historico-item">
          <span class="historico-acao">${_traduzirAcao(h.acao)}</span>
          ${h.valor_anterior !== null ? ` <span class="text-muted">de "${h.valor_anterior || '—'}"</span>` : ''}
          ${h.valor_novo !== null ? ` <span class="text-muted">para "${h.valor_novo || '—'}"</span>` : ''}
          <div class="historico-meta">${h.admin_nome || 'Sistema'} · ${_fmtData(h.timestamp)}</div>
        </div>`).join('')
    : '<p class="text-muted" style="font-size:.85rem">Sem histórico.</p>';

  document.getElementById('cm-modal-title').innerHTML =
    `<span style="font-size:.82rem;font-weight:500;color:var(--text-muted);font-family:Inter,sans-serif">#${c.id}</span> ${_badgeStatus(c.status)} ${_badgeCategoria(c.categoria)}`;

  document.getElementById('cm-modal-body').innerHTML = `
    <div class="mv2">
      <div class="mv2-logo-bar">
        <img src="https://letsimage.s3.amazonaws.com/editor/granmarquise/imgs/1760033174793-hotelgranmarquise_pos_footer.png" alt="Gran Marquise" class="mv2-logo-img">
        <div class="mv2-logo-user">
          <div class="mv2-logo-user-nome">${c.nome}</div>
          <div class="mv2-logo-user-setor">
            <span>${c.usuario_setor || c.setor}</span>
            ${(c.usuario_ramal || c.ramal) ? `<span class="mv2-sep">·</span><span>Ramal ${c.usuario_ramal || c.ramal}</span>` : ''}
            ${c.prioridade ? `<span class="mv2-sep">·</span><span>${PRIO_LABELS[c.prioridade]}</span>` : ''}
          </div>
        </div>
        <div></div>
      </div>

      ${bannerAtraso}${bannerPrazo}

      <div class="mv2-layout">
        <div class="mv2-main">
          <div class="mv2-cards-row">
            <div class="mv2-card ${c.admin_nome ? 'mv2-card-ok' : 'mv2-card-vazio'}">
              <div class="mv2-card-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div>
                <div class="mv2-card-label">Administrador responsável</div>
                <div class="mv2-card-val">${c.admin_nome || 'Não atribuído'}</div>
              </div>
            </div>
            <div class="mv2-card">
              <div class="mv2-card-icon mv2-card-icon-neutral">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              </div>
              <div>
                <div class="mv2-card-label">Setor do chamado</div>
                <div class="mv2-card-val">${c.setor}</div>
              </div>
            </div>
          </div>

          <div class="mv2-ts-row">
            <div class="mv2-ts-chip">
              <span class="mv2-ts-label">Aberto em</span>
              <span class="mv2-ts-val">${_fmtData(c.criado_em)}</span>
            </div>
            ${c.prazo ? `<div class="mv2-ts-chip ${atrasado ? 'mv2-ts-danger' : 'mv2-ts-warn'}">
              <span class="mv2-ts-label">${atrasado ? '⚠ Prazo vencido' : 'Prazo'}</span>
              <span class="mv2-ts-val">${_fmtData(c.prazo)}</span>
            </div>` : ''}
            ${c.concluido_em ? `<div class="mv2-ts-chip mv2-ts-ok">
              <span class="mv2-ts-label">Concluído em</span>
              <span class="mv2-ts-val">${_fmtData(c.concluido_em)}</span>
            </div>` : ''}
          </div>

          <div class="mv2-cat-row">
            <span class="mv2-field-label">Categoria</span>
            ${_badgeCategoria(c.categoria) || '<span class="mv2-empty-text">Não classificado</span>'}
            <select class="form-control form-control-sm" id="cm-sel-categoria" style="flex:1;max-width:180px;margin-left:.25rem">
              ${Object.entries(CATEGORIAS_MAP).map(([id, cat]) => `<option value="${id}" ${c.categoria === id ? 'selected' : ''}>${cat.nome}</option>`).join('')}
            </select>
            <button class="btn btn-secondary btn-sm" id="cm-btn-salvar-categoria">Salvar</button>
          </div>

          <div class="mv2-section">
            <span class="mv2-field-label">Descrição do problema</span>
            <div class="mv2-desc">${c.descricao}</div>
          </div>

          ${c.anexo_nome_original ? `
            <a href="/api/chamados/${c.id}/anexo" class="mv2-anexo-btn" download>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              ${c.anexo_nome_original}
            </a>` : ''}

          ${c.solucao ? `
            <div class="mv2-solucao">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:#16a34a"><polyline points="20 6 9 17 4 12"/></svg>
              <div>
                <div class="mv2-field-label" style="color:#16a34a">Solução aplicada</div>
                <div style="font-size:.86rem;color:#166534;margin-top:.1rem">${c.solucao}</div>
              </div>
            </div>` : ''}

          ${c.nota !== null ? `
            <div class="mv2-avaliacao">
              <span style="font-size:1rem">⭐</span>
              <div>
                <div class="mv2-field-label">Avaliação do usuário</div>
                <div style="font-size:.86rem;font-weight:600;color:var(--text)">${c.nota}/10${c.comentario_avaliacao ? `<span style="font-weight:400;color:var(--text-muted)"> — ${c.comentario_avaliacao}</span>` : ''}</div>
              </div>
            </div>` : ''}

          ${c.assinado_em ? `
            <div class="mv2-assinatura-admin">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:#15803d;margin-top:.1rem"><polyline points="20 6 9 17 4 12"/></svg>
              <div>
                <div class="mv2-field-label" style="color:#15803d">Recebimento confirmado pelo solicitante</div>
                <div style="font-size:.79rem;color:var(--text-muted);margin:.15rem 0 .5rem">${_fmtData(c.assinado_em)}</div>
                ${c.assinatura ? `<img src="${c.assinatura}" alt="Assinatura do solicitante" class="assinatura-img-admin">` : ''}
              </div>
            </div>` : ''}
        </div>

        <div class="mv2-side">
          <div id="cm-msg-modal" style="margin-bottom:.4rem"></div>
          <div class="mv2-actions-card">
            <div class="mv2-side-title">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Gerenciar chamado
            </div>
            ${isAberto ? `
              <div class="mv2-ctrl-row">
                <span class="mv2-ctrl-lbl">Prioridade</span>
                <select class="form-control form-control-sm" id="cm-sel-prioridade" style="flex:1">
                  <option value="">Sem prioridade</option>
                  <option value="baixa"   ${c.prioridade==='baixa'  ?'selected':''}>Baixa</option>
                  <option value="media"   ${c.prioridade==='media'  ?'selected':''}>Média</option>
                  <option value="alta"    ${c.prioridade==='alta'   ?'selected':''}>Alta</option>
                  <option value="urgente" ${c.prioridade==='urgente'?'selected':''}>Urgente</option>
                </select>
                <button class="btn btn-secondary btn-sm" id="cm-btn-salvar-prio">Salvar</button>
              </div>
              <div class="mv2-ctrl-row">
                <span class="mv2-ctrl-lbl">Prazo</span>
                <input class="form-control form-control-sm" type="datetime-local" id="cm-input-prazo" value="${c.prazo ? c.prazo.replace(' ','T').slice(0,16) : ''}" style="flex:1">
                <button class="btn btn-secondary btn-sm" id="cm-btn-salvar-prazo">Salvar</button>
                ${c.prazo ? `<button class="btn btn-secondary btn-sm" id="cm-btn-remover-prazo" style="padding:.32rem .5rem">✕</button>` : ''}
              </div>
              <div class="mv2-action-btns">
                ${podeAssumir  ? `<button class="btn btn-primary btn-sm" id="cm-btn-assumir" style="flex:1">Assumir</button>` : ''}
                ${isAberto     ? `<button class="btn btn-secondary btn-sm" id="cm-btn-transferir" style="flex:1">Transferir</button>` : ''}
                ${podeConcluir ? `<button class="btn btn-success btn-sm" id="cm-btn-concluir" style="flex:1">Concluir</button>` : ''}
              </div>
              <div id="cm-area-transferir" style="display:none;margin-top:.6rem;padding-top:.6rem;border-top:1px solid var(--border)">
                <div class="form-group" style="margin-bottom:.4rem">
                  <label style="font-size:.8rem">Transferir para</label>
                  <select class="form-control form-control-sm" id="cm-sel-transferir-admin">
                    <option value="">Selecione um admin...</option>
                  </select>
                </div>
                <button class="btn btn-primary btn-sm" id="cm-btn-confirmar-transferir" style="width:100%">Confirmar transferência</button>
              </div>
              <div id="cm-area-concluir" style="display:none;margin-top:.6rem;padding-top:.6rem;border-top:1px solid var(--border)">
                <div class="form-group" style="margin-bottom:.4rem">
                  <label for="cm-txt-solucao" style="font-size:.8rem">Solução aplicada <span class="req">*</span></label>
                  <textarea class="form-control" id="cm-txt-solucao" rows="3" placeholder="Descreva a solução aplicada..."></textarea>
                </div>
                <button class="btn btn-success btn-sm" id="cm-btn-confirmar-concluir" style="width:100%">Confirmar conclusão</button>
              </div>
            ` : `
              <div style="padding:.2rem 0">
                ${podeReabrir ? `<button class="btn btn-secondary btn-sm" id="cm-btn-reabrir" style="width:100%">Reabrir chamado</button>` : '<p class="text-muted" style="font-size:.83rem;margin:0">Chamado encerrado.</p>'}
              </div>
            `}
          </div>
        </div>
      </div>

      <div class="mv2-fullrow">
        <details class="mv2-historico">
          <summary>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Histórico de ações
            <button class="btn btn-ghost btn-sm mv2-hist-completo-btn" id="cm-btn-hist-completo" onclick="event.stopPropagation()">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Ver histórico completo
            </button>
          </summary>
          <div class="mv2-historico-body">${historicoHtml}</div>
        </details>
        ${adminInfo.is_master ? `
        <div class="modal-danger-zone mv2-danger-compact">
          <div class="modal-danger-label">Zona de perigo</div>
          <button class="btn btn-danger btn-sm" id="cm-btn-deletar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Excluir chamado
          </button>
        </div>` : ''}
      </div>

      ${isAberto ? `
      <div class="mv2-chat-card mv2-chat-full">
        <div class="mv2-chat-head">
          <span class="mv2-chat-dot"></span>
          Conversa em tempo real
        </div>
        <div class="chat-messages mv2-chat-msgs" id="cm-chat-msgs" data-cnt="0">
          <div class="chat-vazio">Carregando...</div>
        </div>
        <form class="chat-input-row" id="cm-chat-form">
          <input type="text" class="chat-input" id="cm-chat-input" placeholder="Responder ao usuário..." maxlength="1000" autocomplete="off">
          <button type="submit" class="btn btn-primary btn-sm">Enviar</button>
        </form>
      </div>` : ''}
    </div>
  `;

  _setupEventos(c);
}

function _setupEventos(c) {
  const setMsg = (html) => {
    const el = document.getElementById('cm-msg-modal');
    if (el) el.innerHTML = html;
  };

  const q = (id) => document.getElementById(id);

  if (q('cm-btn-salvar-categoria')) {
    q('cm-btn-salvar-categoria').addEventListener('click', async () => {
      const cat = q('cm-sel-categoria').value;
      const r = await _api(`/api/admin/chamados/${c.id}/categoria`, { method: 'PATCH', body: JSON.stringify({ categoria: cat }) });
      const d = await r.json();
      setMsg(r.ok ? '<div class="alert alert-success">Categoria atualizada.</div>' : `<div class="alert alert-danger">${d.erro}</div>`);
      if (r.ok) setTimeout(() => window.abrirChamadoModal(c.id), 600);
    });
  }

  if (q('cm-btn-salvar-prio')) {
    q('cm-btn-salvar-prio').addEventListener('click', async () => {
      const prio = q('cm-sel-prioridade').value;
      const r = await _api(`/api/admin/chamados/${c.id}/prioridade`, { method: 'PATCH', body: JSON.stringify({ prioridade: prio || null }) });
      const d = await r.json();
      setMsg(r.ok ? '<div class="alert alert-success">Prioridade salva.</div>' : `<div class="alert alert-danger">${d.erro}</div>`);
      if (r.ok) setTimeout(() => window.abrirChamadoModal(c.id), 600);
    });
  }

  if (q('cm-btn-salvar-prazo')) {
    q('cm-btn-salvar-prazo').addEventListener('click', async () => {
      const prazo = q('cm-input-prazo').value;
      const r = await _api(`/api/admin/chamados/${c.id}/prazo`, { method: 'PATCH', body: JSON.stringify({ prazo: prazo || null }) });
      const d = await r.json();
      setMsg(r.ok ? '<div class="alert alert-success">Prazo atualizado.</div>' : `<div class="alert alert-danger">${d.erro}</div>`);
      if (r.ok) setTimeout(() => window.abrirChamadoModal(c.id), 600);
    });
  }

  if (q('cm-btn-remover-prazo')) {
    q('cm-btn-remover-prazo').addEventListener('click', async () => {
      const r = await _api(`/api/admin/chamados/${c.id}/prazo`, { method: 'PATCH', body: JSON.stringify({ prazo: null }) });
      const d = await r.json();
      setMsg(r.ok ? '<div class="alert alert-success">Prazo removido.</div>' : `<div class="alert alert-danger">${d.erro}</div>`);
      if (r.ok) setTimeout(() => window.abrirChamadoModal(c.id), 600);
    });
  }

  if (q('cm-btn-assumir')) {
    q('cm-btn-assumir').addEventListener('click', async () => {
      const r = await _api(`/api/admin/chamados/${c.id}/assumir`, { method: 'PATCH', body: JSON.stringify({}) });
      const d = await r.json();
      setMsg(r.ok ? '<div class="alert alert-success">Chamado assumido.</div>' : `<div class="alert alert-danger">${d.erro}</div>`);
      if (r.ok) setTimeout(() => window.abrirChamadoModal(c.id), 600);
    });
  }

  if (q('cm-btn-transferir')) {
    q('cm-btn-transferir').addEventListener('click', async () => {
      const area = q('cm-area-transferir');
      if (area.style.display === 'none') {
        area.style.display = 'block';
        const r = await _api('/api/admin/usuarios');
        if (r.ok) {
          const admins = await r.json();
          const adminInfo = window.adminInfo || {};
          const sel = q('cm-sel-transferir-admin');
          sel.innerHTML = '<option value="">Selecione um admin...</option>' +
            admins.filter(a => a.ativo && a.id !== adminInfo.id).map(a =>
              `<option value="${a.id}">${a.nome_completo}${a.is_master ? ' ★' : ''}</option>`
            ).join('');
        }
      } else {
        area.style.display = 'none';
      }
    });
  }

  if (q('cm-btn-confirmar-transferir')) {
    q('cm-btn-confirmar-transferir').addEventListener('click', async () => {
      const adminId = q('cm-sel-transferir-admin').value;
      if (!adminId) { setMsg('<div class="alert alert-danger">Selecione um admin.</div>'); return; }
      const r = await _api(`/api/admin/chamados/${c.id}/transferir`, { method: 'PATCH', body: JSON.stringify({ admin_id: parseInt(adminId) }) });
      const d = await r.json();
      setMsg(r.ok ? `<div class="alert alert-success">${d.mensagem}</div>` : `<div class="alert alert-danger">${d.erro}</div>`);
      if (r.ok) setTimeout(() => window.abrirChamadoModal(c.id), 700);
    });
  }

  if (q('cm-btn-concluir')) {
    q('cm-btn-concluir').addEventListener('click', () => {
      const area = q('cm-area-concluir');
      area.style.display = area.style.display === 'none' ? 'block' : 'none';
    });
  }

  if (q('cm-btn-confirmar-concluir')) {
    q('cm-btn-confirmar-concluir').addEventListener('click', async () => {
      const solucao = q('cm-txt-solucao').value.trim();
      const r = await _api(`/api/admin/chamados/${c.id}/concluir`, { method: 'PATCH', body: JSON.stringify({ solucao }) });
      const d = await r.json();
      setMsg(r.ok ? '<div class="alert alert-success">Chamado concluído.</div>' : `<div class="alert alert-danger">${d.erro}</div>`);
      if (r.ok) setTimeout(() => window.abrirChamadoModal(c.id), 700);
    });
  }

  if (q('cm-btn-reabrir')) {
    q('cm-btn-reabrir').addEventListener('click', async () => {
      if (!confirm('Reabrir o chamado? Ele voltará para o status "Aberto".')) return;
      const r = await _api(`/api/admin/chamados/${c.id}/reabrir`, { method: 'PATCH', body: JSON.stringify({}) });
      const d = await r.json();
      setMsg(r.ok ? '<div class="alert alert-success">Chamado reaberto.</div>' : `<div class="alert alert-danger">${d.erro}</div>`);
      if (r.ok) setTimeout(() => window.abrirChamadoModal(c.id), 600);
    });
  }

  if (q('cm-btn-deletar')) {
    q('cm-btn-deletar').addEventListener('click', async () => {
      if (!confirm('Excluir permanentemente este chamado? Esta ação não pode ser desfeita.')) return;
      const r = await _api(`/api/admin/chamados/${c.id}`, { method: 'DELETE' });
      const d = await r.json();
      if (r.ok) { window.fecharChamadoModal(); } else { setMsg(`<div class="alert alert-danger">${d.erro}</div>`); }
    });
  }

  if (q('cm-btn-hist-completo')) {
    q('cm-btn-hist-completo').addEventListener('click', () => window.abrirHistoricoModal(c));
  }

  const chatForm = q('cm-chat-form');
  if (chatForm) {
    _atualizarChat(c.id);
    _chatIv = setInterval(() => _atualizarChat(c.id), 3000);
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = q('cm-chat-input');
      const texto = input.value.trim();
      if (!texto) return;
      const btn = chatForm.querySelector('button');
      btn.disabled = true;
      try {
        const r = await _api(`/api/admin/chamados/${c.id}/mensagens`, { method: 'POST', body: JSON.stringify({ mensagem: texto }) });
        if (r.ok) { input.value = ''; await _atualizarChat(c.id); }
      } catch {}
      finally { btn.disabled = false; input.focus(); }
    });
  }
}

window.abrirChamadoModal = async function(id) {
  _chamadoAtual = null;
  if (_chatIv) { clearInterval(_chatIv); _chatIv = null; }
  const overlay = document.getElementById('cm-modal-overlay');
  document.getElementById('cm-modal-title').textContent = 'Chamado';
  document.getElementById('cm-modal-body').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  overlay.classList.add('open');

  try {
    const r = await _api(`/api/admin/chamados/${id}`);
    if (!r.ok) { document.getElementById('cm-modal-body').innerHTML = '<div class="alert alert-danger">Erro ao carregar.</div>'; return; }
    _chamadoAtual = await r.json();
    _renderBody(_chamadoAtual);
  } catch {}
};

window.fecharChamadoModal = function() {
  if (_chatIv) { clearInterval(_chatIv); _chatIv = null; }
  document.getElementById('cm-modal-overlay').classList.remove('open');
  _chamadoAtual = null;
  if (typeof window._cmOnClose === 'function') window._cmOnClose();
};

})();
