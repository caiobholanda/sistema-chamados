# Finalizar migração Railway → Fly.io

**Leia este arquivo inteiro antes de começar.**

## Contexto

- Railway (origem): https://web-production-83b4ae.up.railway.app
- Fly.io (destino): https://sistema-chamados-granmarquise.fly.dev
- Repositório: https://github.com/caiobholanda/sistema-chamados
- Chave de exportação: `gM3f9xK7vQ2pL8nR4wE6`

### O que já foi feito
- Deploy do app no Fly.io ✅
- Uploads (fotos, vídeos, PDFs — 414MB) migrados ✅
- Banco de dados (SQLite) — **FALTA** ❌

### Por que o banco ainda não migrou
O código correto (com endpoint `/api/export/puxar-db` e correção do bug WAL do SQLite) está
no repositório (src/rotas/exportar.js) mas o Fly.io ainda está rodando uma versão antiga.
É necessário fazer um novo deploy antes de migrar o banco.

---

## Passo 1 — Deploy novo no Fly.io via GitHub Actions

1. Acesse: https://github.com/caiobholanda/sistema-chamados/actions/workflows/fly-deploy.yml
2. Clique no botão **"Run workflow"** (canto direito) → **"Run workflow"**
3. Aguarde o workflow ficar verde (✓) — leva ~5-10 minutos
4. Se falhar, veja o log de erro e avise

---

## Passo 2 — Confirmar que o novo endpoint está ativo

Execute no PowerShell (ou peça ao Claude para executar):

```powershell
Invoke-RestMethod -Uri "https://sistema-chamados-granmarquise.fly.dev/api/export/puxar-db?key=gM3f9xK7vQ2pL8nR4wE6" -Method POST
```

**Resposta esperada:** `{ ok: true, msg: "Download do banco iniciado em background" }`

Se retornar `Cannot POST /api/export/puxar-db` → o deploy não incluiu o código novo.
Aguarde 2 minutos e tente novamente. Se persistir, vá para o **Plano B** abaixo.

---

## Passo 3 — Aguardar e verificar

Aguarde 40 segundos e então teste o login:

```powershell
Start-Sleep -Seconds 40
$login = Invoke-RestMethod `
  -Uri "https://sistema-chamados-granmarquise.fly.dev/api/admin/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"estagio.ti@granmarquise.com.br","senha":"Gran@2007"}'
Write-Host "Login OK: $($login.nome)"
```

**O banco Railway tem:** 4 admins, 21 chamados, 54 usuários.
Se o login funcionar, a migração foi bem-sucedida. Pule para o **Passo 4**.

Se falhar (senha errada ou erro), o banco ainda está errado — vá para o **Plano B**.

---

## Plano B — Migração manual do banco (se puxar-db não funcionar)

### B1. Baixar o banco do Railway localmente

```powershell
Invoke-WebRequest `
  -Uri "https://web-production-83b4ae.up.railway.app/api/export/db?key=gM3f9xK7vQ2pL8nR4wE6" `
  -OutFile "C:\Temp\chamados_railway.db"

# Confirmar tamanho (deve ser ~424KB ou maior)
(Get-Item "C:\Temp\chamados_railway.db").Length / 1KB
```

### B2. Enviar o banco para o Fly.io

**IMPORTANTE:** O deploy novo (Passo 1) deve ter sido feito antes deste passo — o código novo
já deleta o WAL antes de substituir o banco.

```powershell
$r = Invoke-RestMethod `
  -Uri "https://sistema-chamados-granmarquise.fly.dev/api/export/import-db?key=gM3f9xK7vQ2pL8nR4wE6" `
  -Method POST `
  -InFile "C:\Temp\chamados_railway.db" `
  -ContentType "application/octet-stream" `
  -TimeoutSec 60
Write-Host "Importado: $($r.bytes) bytes"
```

**Resposta esperada:** `{ ok: true, bytes: 434176 }` (ou similar)

### B3. Aguardar e verificar novamente

```powershell
Start-Sleep -Seconds 40
$login = Invoke-RestMethod `
  -Uri "https://sistema-chamados-granmarquise.fly.dev/api/admin/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"estagio.ti@granmarquise.com.br","senha":"Gran@2007"}'
Write-Host "Login OK: $($login.nome)"
```

---

## Passo 4 — Teste final completo

Abra no navegador: https://sistema-chamados-granmarquise.fly.dev/admin-login.html

- Email: `estagio.ti@granmarquise.com.br`
- Senha: `Gran@2007`

Verifique:
- [ ] Login funciona
- [ ] Chamados aparecem (devem ter ~21 chamados)
- [ ] Usuários aparecem (~54 usuários)
- [ ] Fotos/anexos dos chamados abrem corretamente (uploads migrados)
- [ ] Admins aparecem (devem ter 4 admins)

---

## Informações técnicas para o Claude

Se o Claude precisar de contexto adicional:

- flyctl está instalado em `C:\Users\estagio.ti\fly\flyctl.exe` na máquina original
- Na máquina nova pode não ter flyctl — NÃO É NECESSÁRIO para os passos acima
- O volume Fly.io se chama `data` e é montado em `/app/data`
- O banco em produção fica em `/app/data/chamados.db`
- O endpoint `puxar-db` faz o Fly.io baixar o banco diretamente do Railway (sem passar pela máquina local)
- O endpoint `import-db` aceita o banco enviado pela máquina local via POST
- Após importar o banco, o app reinicia sozinho em 200ms via `process.exit(0)`
- Se o SQLite WAL (`chamados.db-wal`) existir no momento do restart, o SQLite sobrescreve o banco novo — por isso o código deleta o WAL antes de renomear o arquivo
- O app Fly.io pode estar em modo "auto-stop" (hiberna sem requisições) — a primeira requisição o acorda em ~5-10 segundos

## Credenciais e links úteis

| Item | Valor |
|------|-------|
| Fly.io app | https://sistema-chamados-granmarquise.fly.dev |
| Railway (origem) | https://web-production-83b4ae.up.railway.app |
| GitHub Actions | https://github.com/caiobholanda/sistema-chamados/actions/workflows/fly-deploy.yml |
| Admin email | estagio.ti@granmarquise.com.br |
| Admin senha | Gran@2007 |
| Export key | gM3f9xK7vQ2pL8nR4wE6 |
