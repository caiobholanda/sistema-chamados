# Sistema de Chamados — Gran Marquise TI

## O que é este projeto

Sistema interno de suporte de TI do Hotel Gran Marquise (Fortaleza). Usuários do hotel abrem chamados pelo portal; admins de TI gerenciam tudo pelo painel admin.

- **Stack:** Node.js + Express + better-sqlite3 + JWT (sem framework frontend)
- **Banco:** SQLite em `data/chamados.db`
- **Site em produção:** https://sistema-chamados-granmarquise.fly.dev
- **Repositório:** https://github.com/caiobholanda/sistema-chamados

## Estrutura de arquivos

```
server.js            — entry point na raiz, monta rotas
src/
  db.js              — todas as queries SQLite
  auth.js            — middleware JWT (requireAdmin, requireMaster)
  rotas/
    admins.js        — todas as rotas /api/admin/*
    usuarios.js      — rotas do portal do usuário
    chamados.js      — abertura de chamados públicos
public/
  admin-painel.html + js/admin-painel.js     — painel principal de chamados
  admin-usuarios.html + js/admin-usuarios.js — gerenciamento de admins e usuários
  admin-relatorios.html                      — relatórios e gráficos
  admin-login.html + js/admin-login.js       — login admin (por e-mail)
  index.html + js/usuario.js                 — portal do usuário
  css/style.css                              — único arquivo de estilos
data/
  chamados.db        — banco SQLite (não commitado, gerado na primeira execução)
.github/workflows/
  fly-deploy.yml     — CI/CD: push em main → flyctl deploy → deploy automático
```

## Regras de negócio importantes

- **Domínio de e-mail obrigatório:** `@granmarquise.com.br` para admins e usuários
- **Hierarquia:** `is_master = 1` tem acesso total (incluindo gerenciar usuários); admin comum só gerencia chamados
- **Status dos chamados:** `aberto → em_andamento → concluido` ou `encerrado`; reabrir volta para `aberto`
- **Timezone:** America/Fortaleza (UTC-3) em todas as exibições de data
- **Senha forte:** mínimo 8 chars, maiúscula + minúscula + número + especial

## Deploy automático

Qualquer `git push origin main` dispara o GitHub Actions (`.github/workflows/fly-deploy.yml`) que executa `flyctl deploy` via Fly.io CLI. O secret `FLY_API_TOKEN` está configurado no GitHub.

## Como rodar localmente

```bash
git clone https://github.com/caiobholanda/sistema-chamados.git
cd sistema-chamados
npm install
```

Crie `.env` na raiz:
```
PORT=3000
JWT_SECRET=<gere com: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
EXPORT_KEY=<gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
ADMIN_MASTER_PASS=<senha forte para o admin master no primeiro boot>
ADMIN_MASTER_USER=admin
ADMIN_MASTER_NOME=Administrador Master
```
Em produção, defina os secrets via `fly secrets set` em vez do `.env`.

Inicie:
```bash
node server.js
```

Acesse: http://localhost:3000

Na primeira execução, um admin master é criado automaticamente (credenciais aparecem no terminal).

## Padrões do projeto

- Sem framework frontend — HTML/CSS/JS puro com fetch API
- CSS em variáveis CSS (`--gold`, `--navy`, `--border`, etc.) — ver início do `style.css`
- Classes CSS relevantes: `.tabs-bar / .tab-btn`, `.sub-tabs-bar / .sub-tab-btn`, `.modal-overlay / .modal`, `.badge-*`, `.btn-*`, `.form-control`, `.input-senha-wrap / .btn-eye`
- Todas as rotas admin exigem cookie JWT válido (`requireAdmin` ou `requireMaster`)
- `sanitizarTexto()` aplicado em todos os inputs de texto antes de salvar

## Economia de tokens

- **Modelo padrão:** `claude-sonnet-4-6` (configurado em `.claude/settings.json`)
- **`/compact` ao atingir ~60%** do contexto — não esperar 95%
- **`/clear`** ao trocar de tarefa não relacionada; use `/rename` antes para poder retomar
- **Modo plano** (`Shift+Tab`) antes de tarefas complexas — planejar antes de executar
- **Leitura pontual** — referencie `src/db.js:linha` em vez de reler arquivos inteiros
- Para investigar onde algo está implementado, use o subagente `investigador`
