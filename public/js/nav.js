/* Aplica tema salvo antes de renderizar (evita flash) */
(function () {
  if (localStorage.getItem('admin-theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();

/* Bloqueia o scroll da página quando qualquer modal/popup estiver aberto */
(function lockBodyScroll() {
  var attrObs = new MutationObserver(sincronizar);

  function ehOverlay(el) {
    return el && el.nodeType === 1 && el.id && el.id.indexOf('overlay') !== -1;
  }

  function sincronizar() {
    var aberto = Array.from(document.body.children).some(function (el) {
      if (!ehOverlay(el)) return false;
      return window.getComputedStyle(el).display !== 'none';
    });
    document.documentElement.classList.toggle('modal-aberto', aberto);
  }

  /* Observa filhos diretos do body (modais dinâmicos que são append/remove) */
  new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (ehOverlay(node)) {
          attrObs.observe(node, { attributes: true, attributeFilter: ['class', 'style'] });
        }
      });
    });
    sincronizar();
  }).observe(document.body, { childList: true });

  /* Observa modais já presentes no DOM (toggled via .open ou style.display) */
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[id*="overlay"]').forEach(function (el) {
      attrObs.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
    });
    sincronizar();
  });
})();

(function () {
  const path = window.location.pathname;

  function link(href, label) {
    return `<a href="${href}"${path === href ? ' class="ativo"' : ''}>${label}</a>`;
  }

  let html = link('/admin-painel.html', 'Chamados');

  // Botao "Usuarios" removido: gerenciamento de contas migrou para o Hub
  // (engrenagem -> aba Contas em hub-granmarquise.fly.dev).

  html += link('/admin-relatorios.html', 'Relatórios');

  const adminDropdownPages = ['/admin-itens.html', '/admin-contatos.html', '/admin-sugestoes.html', '/admin-servicos.html', '/admin-programados.html'];
  const adminAtivo = adminDropdownPages.includes(path);
  html += `<div class="nav-dropdown" id="nav-admin-dropdown">
    <button class="nav-dropdown-trigger${adminAtivo ? ' ativo' : ''}" id="nav-admin-trigger">
      Administração <span class="nav-dropdown-arrow">▼</span><span id="nav-admin-badge" style="display:none;background:#e53e3e;color:#fff;border-radius:50%;font-size:.65rem;font-weight:700;padding:1px 5px;margin-left:.35rem;vertical-align:middle;line-height:1.4"></span>
    </button>
    <div class="nav-dropdown-menu">
      <a href="/admin-itens.html"${path === '/admin-itens.html' ? ' class="ativo"' : ''}>Itens</a>
      <a href="/admin-contatos.html"${path === '/admin-contatos.html' ? ' class="ativo"' : ''}>Contatos</a>
      <a href="/admin-sugestoes.html"${path === '/admin-sugestoes.html' ? ' class="ativo"' : ''}>Sugestões <span id="nav-sug-badge" style="display:none;background:#e53e3e;color:#fff;border-radius:50%;font-size:.65rem;font-weight:700;padding:1px 5px;margin-left:.25rem;vertical-align:middle;line-height:1.4"></span></a>
      <a href="/admin-servicos.html"${path === '/admin-servicos.html' ? ' class="ativo"' : ''}>Etiquetas</a>
      <a href="/admin-programados.html"${path === '/admin-programados.html' ? ' class="ativo"' : ''}>Programados</a>
    </div>
  </div>`;

  if (path === '/admin-painel.html') {
    html += '<button id="btn-notificacoes" class="btn btn-ghost btn-sm" title="Ativar notificações" style="margin-left:.5rem;font-size:1rem;padding:.3rem .5rem">🔔</button>';
  }

  // Padrao Gran Marquise: data + hora no header de TODOS os sistemas do Hub.
  // Formato DD/MM/AAAA · HH:MM, timezone America/Fortaleza, atualiza a cada 30s.
  // Cor: o header tem fundo navy escuro em AMBOS os temas (var(--navy)) — usar
  // var(--text-secondary) ficava invisivel no modo claro. rgba(255,255,255,.82)
  // mantem legibilidade em ambos os temas, alinhado com header nav a:hover.
  html += `<span id="gm-datahora" style="margin-left:.6rem;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:.72rem;letter-spacing:.05em;color:rgba(255,255,255,.82);font-variant-numeric:tabular-nums;white-space:nowrap" title="Horário de Fortaleza">--/--/---- · --:--</span>`;
  html += `<button id="btn-theme" class="btn btn-ghost btn-sm" title="Alternar modo claro/escuro" style="margin-left:.25rem;padding:.3rem .45rem;font-size:1rem;line-height:1">
    <svg id="icon-sun" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
    <svg id="icon-moon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
  </button>`;
  // Botao "Sair" — encerra sessao do chamados e volta para o Hub.
  html += `<button id="btn-sair-hub" class="btn btn-ghost btn-sm" title="Sair e voltar ao Hub" style="margin-left:.5rem;display:inline-flex;align-items:center;gap:6px;padding:.3rem .7rem;font-size:.78rem;line-height:1">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
    Sair
  </button>`;
  const nav = document.querySelector('header nav');
  if (nav) nav.innerHTML = html;

  document.addEventListener('DOMContentLoaded', function () {
    function _syncThemeIcon() {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      const sun = document.getElementById('icon-sun');
      const moon = document.getElementById('icon-moon');
      if (sun) sun.style.display = dark ? '' : 'none';
      if (moon) moon.style.display = dark ? 'none' : '';
    }
    _syncThemeIcon();

    const btnTheme = document.getElementById('btn-theme');
    if (btnTheme) {
      btnTheme.addEventListener('click', function () {
        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (dark) {
          document.documentElement.removeAttribute('data-theme');
          localStorage.setItem('admin-theme', 'light');
        } else {
          document.documentElement.setAttribute('data-theme', 'dark');
          localStorage.setItem('admin-theme', 'dark');
        }
        _syncThemeIcon();
      });
    }

    // Relogio do header — atualiza a cada 30s (Fortaleza).
    (function gmRelogio() {
      const el = document.getElementById('gm-datahora');
      if (!el) return;
      function tick() {
        const d = new Date();
        const data = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza', day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
        const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit' }).format(d);
        el.textContent = data + ' · ' + hora;
      }
      tick();
      setInterval(tick, 30 * 1000);
    })();

    // Botao Sair: chama logout do chamados (limpa cookie token) e redireciona
    // ao Hub. fetch keepalive para nao precisar await antes do redirect.
    const btnSair = document.getElementById('btn-sair-hub');
    if (btnSair) {
      btnSair.addEventListener('click', function () {
        try {
          fetch('/api/admin/logout', { method: 'POST', credentials: 'include', keepalive: true }).catch(() => {});
        } catch {}
        // ?logout=1&from=chamados permite ao Hub registrar este logout na
        // jornada do usuario (logs_admins/logs_usuarios via /api/hub-log).
        window.location.href = 'https://hub-granmarquise.fly.dev/?logout=1&from=chamados';
      });
    }

    // (Aba "Usuários" desativada — gerenciamento ficou no Hub.)

    const dropdown = document.getElementById('nav-admin-dropdown');
    const trigger = document.getElementById('nav-admin-trigger');
    if (!dropdown || !trigger) return;

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    document.addEventListener('click', function () {
      dropdown.classList.remove('open');
    });

    function _atualizarBadgeSug(n) {
      const b1 = document.getElementById('nav-admin-badge');
      const b2 = document.getElementById('nav-sug-badge');
      if (b1) { b1.textContent = n; b1.style.display = n ? '' : 'none'; }
      if (b2) { b2.textContent = n; b2.style.display = n ? '' : 'none'; }
    }

    async function _buscarContadoresSug() {
      try {
        const r = await fetch('/api/sugestoes/admin/contadores', { credentials: 'include' });
        if (r.ok) { const d = await r.json(); _atualizarBadgeSug(d.nao_vistas || 0); }
      } catch {}
    }

    window._navBadgeSugRefresh = _buscarContadoresSug;
    _buscarContadoresSug();
    const _sugInterval = setInterval(_buscarContadoresSug, 15000);
    window.addEventListener('beforeunload', () => clearInterval(_sugInterval), { once: true });
  });
})();
