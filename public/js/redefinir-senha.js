(function () {
  'use strict';

  const token = new URLSearchParams(location.search).get('token');
  const msgEl = document.getElementById('msg-reset');
  const form = document.getElementById('form-reset');
  const btnSubmit = document.getElementById('btn-redefinir');

  if (!token) {
    form.style.display = 'none';
    msgEl.innerHTML = '<div class="alert alert-danger">Link inválido. <a href="/">Voltar ao login</a></div>';
  }

  /* ── Força da senha ── */
  const checks = {
    len:     s => s.length >= 8,
    upper:   s => /[A-Z]/.test(s),
    lower:   s => /[a-z]/.test(s),
    digit:   s => /[0-9]/.test(s),
    special: s => /[^A-Za-z0-9]/.test(s),
  };
  const cores = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

  function avaliarSenha(s) {
    const lis = document.querySelectorAll('#reqs-lista li');
    let ok = 0;
    lis.forEach(li => {
      const passa = checks[li.dataset.req](s);
      li.style.color = passa ? 'var(--success)' : '';
      li.style.fontWeight = passa ? '600' : '';
      if (passa) ok++;
    });
    const barra = document.getElementById('barra-forca');
    barra.style.width = (ok / 5 * 100) + '%';
    barra.style.background = cores[ok - 1] || '#E5DDD0';
    return ok === 5;
  }

  /* ── Validação em tempo real ── */
  const inpNova = document.getElementById('nova-senha');
  const inpConf = document.getElementById('conf-senha');
  const msgConf = document.getElementById('msg-conf');

  function validar() {
    const forte = avaliarSenha(inpNova.value);
    const igual = inpNova.value === inpConf.value;
    msgConf.style.display = inpConf.value && !igual ? 'block' : 'none';
    btnSubmit.disabled = !(forte && igual && inpConf.value);
  }

  inpNova.addEventListener('input', validar);
  inpConf.addEventListener('input', validar);

  /* ── Olhinho ── */
  function olhinho(btnId, inpEl) {
    document.getElementById(btnId).addEventListener('click', () => {
      inpEl.type = inpEl.type === 'password' ? 'text' : 'password';
    });
  }
  olhinho('btn-eye-nova', inpNova);
  olhinho('btn-eye-conf', inpConf);

  /* ── Submit ── */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Redefinindo...';
    msgEl.innerHTML = '';

    try {
      const r = await fetch('/api/usuarios/redefinir-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, senha: inpNova.value }),
      });
      const d = await r.json();

      if (r.ok) {
        form.style.display = 'none';
        msgEl.innerHTML = `
          <div class="alert alert-success" style="margin-bottom:1rem">${d.mensagem}</div>
          <a href="/" class="btn btn-primary btn-full">Ir para o login</a>`;
      } else {
        msgEl.innerHTML = `<div class="alert alert-danger">${d.erro}</div>`;
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Redefinir senha';
      }
    } catch {
      msgEl.innerHTML = '<div class="alert alert-danger">Erro de conexão. Tente novamente.</div>';
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Redefinir senha';
    }
  });
})();
