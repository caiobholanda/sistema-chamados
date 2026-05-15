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

  if (path === '/admin-usuarios.html') {
    html += '<a href="/admin-usuarios.html" class="ativo">Usuários</a>';
  } else {
    html += '<span id="nav-usuarios-wrap"></span>';
  }

  html += link('/admin-relatorios.html', 'Relatórios');
  html += link('/admin-itens.html', 'Itens');

  if (path === '/admin-painel.html') {
    html += '<button id="btn-notificacoes" class="btn btn-ghost btn-sm" title="Ativar notificações" style="margin-left:.5rem;font-size:1rem;padding:.3rem .5rem">🔔</button>';
  }

  html += '<button id="btn-logout" class="btn btn-ghost btn-sm" style="margin-left:.5rem">Sair</button>';

  const nav = document.querySelector('header nav');
  if (nav) nav.innerHTML = html;
})();
