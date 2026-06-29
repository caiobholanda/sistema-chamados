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
  // Apply stored theme on nav load
  try {
    var storedTheme = localStorage.getItem('gm-theme') || 'light';
    document.documentElement.setAttribute('data-theme', storedTheme);
  } catch (e) {}

  const path = window.location.pathname;

  function link(href, label) {
    return `<a href="${href}"${path === href ? ' class="ativo"' : ''}>${label}</a>`;
  }

  let html = link('/admin-painel.html', 'Chamados');

  if (path === '/admin-usuarios.html') {
    html += '<a href="/admin-usuarios.html" class="ativo">Usuários</a>';
  } else {
    html += '<span id="nav-usuarios-wrap"></span>';
  }

  html += link('/admin-relatorios.html', 'Relatórios');

  const adminDropdownPages = ['/admin-itens.html', '/admin-contatos.html', '/admin-sugestoes.html'];
  const adminAtivo = adminDropdownPages.includes(path);
  html += `<div class="nav-dropdown" id="nav-admin-dropdown">
    <button class="nav-dropdown-trigger${adminAtivo ? ' ativo' : ''}" id="nav-admin-trigger">
      Administração <span class="nav-dropdown-arrow">▼</span><span id="nav-admin-badge" style="display:none;background:#e53e3e;color:#fff;border-radius:50%;font-size:.65rem;font-weight:700;padding:1px 5px;margin-left:.35rem;vertical-align:middle;line-height:1.4"></span>
    </button>
    <div class="nav-dropdown-menu">
      <a href="/admin-itens.html"${path === '/admin-itens.html' ? ' class="ativo"' : ''}>Itens</a>
      <a href="/admin-contatos.html"${path === '/admin-contatos.html' ? ' class="ativo"' : ''}>Contatos</a>
      <a href="/admin-sugestoes.html"${path === '/admin-sugestoes.html' ? ' class="ativo"' : ''}>Sugestões <span id="nav-sug-badge" style="display:none;background:#e53e3e;color:#fff;border-radius:50%;font-size:.65rem;font-weight:700;padding:1px 5px;margin-left:.25rem;vertical-align:middle;line-height:1.4"></span></a>
    </div>
  </div>`;

  if (path === '/admin-painel.html') {
    html += '<button id="btn-notificacoes" class="btn btn-ghost btn-sm" title="Ativar notificações" style="margin-left:.5rem;font-size:1rem;padding:.3rem .5rem">🔔</button>';
  }

  // Theme toggle
  var themeBtn = document.createElement('button');
  themeBtn.className = 'nav-icon-btn theme-toggle-btn';
  themeBtn.title = 'Alternar tema';
  themeBtn.setAttribute('aria-label', 'Alternar modo claro/escuro');
  (function updateThemeIcon() {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeBtn.innerHTML = isDark
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  })();
  themeBtn.addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('gm-theme', next); } catch (e) {}
    (function updateThemeIcon() {
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      themeBtn.innerHTML = isDark
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    })();
  });

  html += '<button id="btn-logout" class="btn btn-ghost btn-sm" style="margin-left:.5rem">Sair</button>';

  const nav = document.querySelector('header nav');
  if (nav) {
    nav.innerHTML = html;
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) nav.insertBefore(themeBtn, logoutBtn);
    else nav.appendChild(themeBtn);
  }

  document.addEventListener('DOMContentLoaded', function () {
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
    setInterval(_buscarContadoresSug, 15000);
  });
})();
