/* Chat utils — compartilhado entre portal do usuário e painel admin.
   Centraliza render de mensagens, separadores de data, auto-link de URLs,
   botão flutuante "X novas", banner offline, notificações do navegador. */
(function (root) {
  'use strict';

  // CSS injetado: garante lado correto (eu à direita, outro à esquerda),
  // estilos de separadores, banner offline, botão de novas mensagens.
  if (!document.getElementById('chat-utils-style')) {
    const st = document.createElement('style');
    st.id = 'chat-utils-style';
    st.textContent = `
      /* Lado das mensagens — funciona com ou sem flex no container pai */
      .chat-messages { display: flex !important; flex-direction: column !important; gap: .5rem; align-items: stretch; }
      .chat-msg { max-width: 78%; display:flex; flex-direction:column; padding: .35rem .15rem; }
      .chat-msg.mine   { align-self: flex-end !important;   align-items: flex-end;   text-align: right; margin-left:auto; margin-right:0; }
      .chat-msg.theirs { align-self: flex-start !important; align-items: flex-start; text-align: left;  margin-right:auto; margin-left:0; }
      .chat-msg-author { font-size: .72rem; color: var(--text-muted, #6b7280); margin-bottom: .15rem; font-weight: 600; }
      .chat-msg-bubble {
        padding: .55rem .8rem; border-radius: 14px;
        font-size: .92rem; line-height: 1.4; word-break: break-word; white-space: pre-wrap;
        background: #f1f3f5; color: #1f2937;
        box-shadow: 0 1px 2px rgba(0,0,0,.04);
      }
      .chat-msg.mine .chat-msg-bubble {
        background: linear-gradient(180deg,#d8a93a,#bf9028);
        color: #fff;
        border-bottom-right-radius: 4px;
      }
      .chat-msg.theirs .chat-msg-bubble {
        border-bottom-left-radius: 4px;
      }
      .chat-msg-anexo-wrap { margin-top: .35rem; }
      .chat-msg-img, .chat-msg-video {
        max-width: 100%; max-height: 280px; border-radius: 8px;
        display: block; margin-top: .35rem; cursor: zoom-in;
      }
      .chat-msg-anexo {
        display:inline-flex; align-items:center; gap:.3rem;
        margin-top:.35rem; padding:.3rem .55rem;
        font-size:.82rem; text-decoration:none; color: inherit;
        background: rgba(255,255,255,.5); border-radius:6px;
      }
      .chat-msg.mine .chat-msg-anexo { background: rgba(255,255,255,.2); color:#fff; }
      .chat-msg-time { font-size: .68rem; color: var(--text-muted, #9ca3af); margin-top: .15rem; }
      .chat-link { color: inherit; text-decoration: underline; }
      .chat-msg.mine .chat-link { color: #fff; }

      .chat-sep-data {
        text-align: center; margin: .9rem 0 .5rem;
        position: relative;
      }
      .chat-sep-data::before {
        content:''; position:absolute; top:50%; left:0; right:0; height:1px;
        background: rgba(0,0,0,.08); z-index:0;
      }
      .chat-sep-data span {
        position: relative; z-index:1; background: var(--surface, #fff);
        padding: 0 .7rem; font-size: .72rem; color: var(--text-muted, #6b7280);
        font-weight: 600; letter-spacing: .02em; text-transform: uppercase;
      }

      .chat-btn-novas {
        position: absolute; right: 1rem; bottom: 4.2rem;
        background: var(--gold, #bf9a55); color: #fff; border: none;
        padding: .45rem .9rem; border-radius: 9999px;
        font-size: .8rem; font-weight: 600; cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,.18);
        z-index: 50; animation: chatBtnPop .25s ease;
      }
      @keyframes chatBtnPop { from { transform: translateY(8px); opacity:0; } to { transform:none; opacity:1; } }
      .chat-btn-novas:hover { filter: brightness(1.08); }

      #chat-offline-banner {
        position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
        background: #b91c1c; color: #fff; padding: .55rem 1rem;
        border-radius: 9999px; z-index: 99999;
        font-size: .85rem; font-weight: 600;
        display: inline-flex; align-items: center; gap: .5rem;
        box-shadow: 0 6px 18px rgba(0,0,0,.25);
      }
    `;
    document.head.appendChild(st);
  }

  const IMGS_EXT = ['jpg','jpeg','png','gif','webp','bmp','svg','heic','avif'];
  const VIDS_EXT = ['mp4','webm','mov','avi','mkv','wmv'];

  function chatEscape(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Detecta URLs (http/https/www) e troca por <a>. Roda DEPOIS do escape.
  function chatLinkify(escHtml) {
    return escHtml.replace(
      /(\bhttps?:\/\/[^\s<]+|\bwww\.[^\s<]+)/g,
      (url) => {
        const safe = url.replace(/[.,;:!?)]+$/, ''); // tira pontuação final
        const trailing = url.slice(safe.length);
        const href = safe.startsWith('http') ? safe : 'https://' + safe;
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="chat-link">${safe}</a>${trailing}`;
      }
    );
  }

  function _anexoHtml(anexoUrl, nome) {
    if (!nome) return '';
    const ext = String(nome).split('.').pop().toLowerCase();
    if (IMGS_EXT.includes(ext))
      return `<img class="lbx-img chat-msg-img" src="${anexoUrl}" alt="${chatEscape(nome)}" loading="lazy">`;
    if (VIDS_EXT.includes(ext))
      return `<video class="chat-msg-video" src="${anexoUrl}" controls preload="metadata"></video>`;
    return `<a class="chat-msg-anexo" href="${anexoUrl}" target="_blank" rel="noopener">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
      ${chatEscape(nome)}
    </a>`;
  }

  // Renderiza UMA mensagem como bubble único (texto+anexo juntos).
  function chatRenderMsg(m, opts) {
    const o = opts || {};
    const ehMinha = !!o.ehMinha;
    const anexoUrl = o.anexoUrl || '';
    const corpoTexto = m.mensagem ? chatLinkify(chatEscape(m.mensagem)) : '';
    const anexo = _anexoHtml(anexoUrl, m.chat_anexo_nome_original);
    const conteudo = (corpoTexto || anexo)
      ? `<div class="chat-msg-bubble">${corpoTexto}${corpoTexto && anexo ? '<div class="chat-msg-anexo-wrap">' + anexo + '</div>' : anexo}</div>`
      : '';
    return `<div class="chat-msg ${ehMinha ? 'mine' : 'theirs'}" data-msg-id="${m.id}" data-msg-iso="${chatEscape(m.criado_em || '')}">
      <div class="chat-msg-author">${chatEscape(m.autor_nome || '')}</div>
      ${conteudo}
      <div class="chat-msg-time">${chatEscape(o.horaTxt || '')}</div>
    </div>`;
  }

  // Retorna label de data ("Hoje", "Ontem" ou "dd/mm/yyyy") para a data
  // de uma mensagem. Compara em America/Fortaleza.
  function chatDateLabel(iso) {
    if (!iso) return '';
    const norm = iso.includes('T') ? iso : iso.replace(' ', 'T');
    const d = new Date(norm.endsWith('Z') ? norm : norm + 'Z');
    if (isNaN(d.getTime())) return '';
    const fmt = (date) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
    const hoje = fmt(new Date());
    const ontem = (() => { const x = new Date(); x.setDate(x.getDate() - 1); return fmt(x); })();
    const dia = fmt(d);
    if (dia === hoje) return 'Hoje';
    if (dia === ontem) return 'Ontem';
    return dia;
  }

  // Hora curta HH:MM para o rodapé da mensagem
  function chatHoraCurta(iso) {
    if (!iso) return '';
    const norm = iso.includes('T') ? iso : iso.replace(' ', 'T');
    const d = new Date(norm.endsWith('Z') ? norm : norm + 'Z');
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit' }).format(d);
  }

  // Após inserir novas mensagens, redistribui os separadores de data.
  function chatRedistribuirSeparadores(box) {
    if (!box) return;
    // Remove separadores antigos
    box.querySelectorAll('.chat-sep-data').forEach(el => el.remove());
    let ultimaLabel = '';
    const msgs = box.querySelectorAll('[data-msg-id]');
    msgs.forEach(msgEl => {
      const iso = msgEl.dataset.msgIso;
      const label = chatDateLabel(iso);
      if (label && label !== ultimaLabel) {
        const sep = document.createElement('div');
        sep.className = 'chat-sep-data';
        sep.innerHTML = '<span>' + chatEscape(label) + '</span>';
        msgEl.parentNode.insertBefore(sep, msgEl);
        ultimaLabel = label;
      }
    });
  }

  // Botão flutuante "↓ X novas mensagens".
  // chamado: chatBotaoNovas(box, qtd) — mostra/atualiza; chatBotaoNovas(box, 0) — esconde
  function chatBotaoNovas(box, qtd) {
    if (!box) return;
    let btn = box.parentElement?.querySelector('.chat-btn-novas');
    if (qtd <= 0) { if (btn) btn.remove(); return; }
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-btn-novas';
      btn.addEventListener('click', () => {
        box.scrollTop = box.scrollHeight;
      });
      // Posiciona absoluto relativo ao container
      const parent = box.parentElement;
      if (parent && getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      parent.appendChild(btn);
    }
    btn.innerHTML = `↓ ${qtd} nova${qtd === 1 ? '' : 's'} mensage${qtd === 1 ? 'm' : 'ns'}`;
  }

  // Banner global "Sem conexão". Reusa o div #chat-offline-banner.
  function chatBannerOffline(mostrar) {
    let el = document.getElementById('chat-offline-banner');
    if (!mostrar) { if (el) el.remove(); return; }
    if (el) return;
    el = document.createElement('div');
    el.id = 'chat-offline-banner';
    el.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg> Sem conexão. Tentando reconectar…';
    document.body.appendChild(el);
  }

  // Inicializa monitoramento de conexão e mostra/esconde banner.
  function chatMonitorOnline() {
    function update() { chatBannerOffline(!navigator.onLine); }
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  }

  // Notificação do navegador. Pede permissão na primeira vez.
  let _permissaoPedida = false;
  function chatPedirPermissaoNotif() {
    if (_permissaoPedida || !('Notification' in window)) return;
    _permissaoPedida = true;
    if (Notification.permission === 'default') {
      try { Notification.requestPermission().catch(() => {}); } catch {}
    }
  }
  function chatNotificar({ titulo, corpo, tag, onClick } = {}) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible' && document.hasFocus()) return; // não notifica se tá olhando
    try {
      const n = new Notification(titulo || 'Nova mensagem', {
        body: corpo || '',
        tag: tag || 'chat-msg',
        renotify: true,
        silent: false,
      });
      n.onclick = () => {
        window.focus();
        if (typeof onClick === 'function') try { onClick(); } catch {}
        n.close();
      };
      setTimeout(() => { try { n.close(); } catch {} }, 8000);
    } catch {}
  }

  // Helper: dado um array de mensagens já no DOM, conta quantas estão
  // depois do scroll atual (não foram vistas pelo user)
  function chatContarNaoVistas(box) {
    if (!box) return 0;
    const msgs = box.querySelectorAll('[data-msg-id]');
    if (!msgs.length) return 0;
    const bottomY = box.scrollTop + box.clientHeight;
    let count = 0;
    msgs.forEach(el => {
      if (el.offsetTop > bottomY - 20) count++;
    });
    return count;
  }

  root.ChatUtils = {
    IMGS_EXT, VIDS_EXT,
    chatEscape, chatLinkify, chatRenderMsg, chatDateLabel, chatHoraCurta,
    chatRedistribuirSeparadores, chatBotaoNovas,
    chatBannerOffline, chatMonitorOnline,
    chatPedirPermissaoNotif, chatNotificar,
    chatContarNaoVistas,
  };
})(window);
