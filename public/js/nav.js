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
  html += link('/admin-inventario.html', 'Inventário');
  html += link('/admin-estoque.html', 'Estoque');

  if (path === '/admin-painel.html') {
    html += '<button id="btn-notificacoes" class="btn btn-ghost btn-sm" title="Ativar notificações" style="margin-left:.5rem;font-size:1rem;padding:.3rem .5rem">🔔</button>';
  }

  html += '<button id="btn-logout" class="btn btn-ghost btn-sm" style="margin-left:.5rem">Sair</button>';

  const nav = document.querySelector('header nav');
  if (nav) nav.innerHTML = html;
})();
