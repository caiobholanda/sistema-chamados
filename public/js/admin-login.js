// Redireciona se já autenticado
fetch('/api/admin/me').then(r => {
  if (r.ok) location.replace('/admin-painel.html');
}).catch(() => {});

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg');
  const btn = document.getElementById('btn-login');
  msg.innerHTML = '';
  btn.disabled = true;
  btn.textContent = 'Entrando...';

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: document.getElementById('usuario').value.trim(),
        senha: document.getElementById('senha').value,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      msg.innerHTML = `<div class="alert alert-danger">${data.erro || 'Erro ao fazer login.'}</div>`;
      return;
    }
    location.replace('/admin-painel.html');
  } catch {
    msg.innerHTML = '<div class="alert alert-danger">Erro de conexão.</div>';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});
