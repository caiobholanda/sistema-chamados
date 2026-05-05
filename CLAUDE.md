# Sistema de Chamados — Gran Marquise TI

## O que é este projeto

Sistema interno de suporte de TI do Hotel Gran Marquise (Fortaleza). Usuários do hotel abrem chamados pelo portal; admins de TI gerenciam tudo pelo painel admin.

- **Stack:** Node.js + Express + better-sqlite3 + JWT (sem framework frontend)
- **Banco:** SQLite em `data/chamados.db`
- **Site em produção:** https://web-production-83b4ae.up.railway.app
- **Repositório:** https://github.com/caiobholanda/sistema-chamados

## Estrutura de arquivos

```
src/
  server.js          — entry point, monta rotas
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
  deploy.yml         — CI/CD: push em main → railway up → deploy automático
```

## Regras de negócio importantes

- **Domínio de e-mail obrigatório:** `@granmarquise.com.br` para admins e usuários
- **Hierarquia:** `is_master = 1` tem acesso total (incluindo gerenciar usuários); admin comum só gerencia chamados
- **Status dos chamados:** `aberto → em_andamento → concluido` ou `encerrado`; reabrir volta para `aberto`
- **Timezone:** America/Fortaleza (UTC-3) em todas as exibições de data
- **Senha forte:** mínimo 8 chars, maiúscula + minúscula + número + especial

## Deploy automático

Qualquer `git push origin main` dispara o GitHub Actions (`.github/workflows/deploy.yml`) que executa `railway up` via Railway CLI. O secret `RAILWAY_TOKEN` está configurado no GitHub.

## Mudanças recentes (sessão 05/05/2026)

### 1. Sub-tabs em "Meus Chamados" (`admin-painel`)
- A aba "Meus chamados" ganhou dois sub-tabs: **Abertos** e **Encerrados**
- Variável `subAbaMeusAtiva` controla o filtro de status
- Badges mostram contagens separadas
- Arquivos: `public/admin-painel.html`, `public/js/admin-painel.js`

### 2. Editar perfil de usuário do portal
- Botão **Editar** adicionado na tabela de usuários (seção "Usuários do Portal")
- Modal de edição com campos: nome, e-mail, senha
- A senha atual já aparece **visível** ao abrir o modal (campo `type="text"`)
- Botão olho (👁) para alternar visibilidade
- Arquivos: `public/admin-usuarios.html`, `public/js/admin-usuarios.js`

### 3. Senha visível ao editar admin
- Mesmo comportamento: ao clicar em "Editar" em um admin, a senha atual aparece visível
- Botão olho no campo de senha do modal de admin
- Arquivos: `public/admin-usuarios.html`, `public/js/admin-usuarios.js`

### 4. Coluna `senha_plain` no banco
- Adicionada em `usuarios` e `admins` via migração (`ALTER TABLE ... ADD COLUMN`)
- Salva o texto puro da senha ao criar ou alterar — permite exibir para o admin
- Usuários/admins criados antes dessa mudança terão `senha_plain = NULL`; passa a ser salvo na próxima troca de senha
- Arquivos: `src/db.js`, `src/rotas/admins.js`

### 5. API PATCH `/api/admin/portal-usuarios/:id` expandida
- Antes só aceitava `{ ativo }` (ativar/desativar)
- Agora também aceita `{ nome, email, senha }` para edição completa do perfil
- Arquivo: `src/rotas/admins.js`

### 6. Fix do pipeline de deploy
- O token Railway antigo havia expirado → deploy falhava com "Not Authorized"
- Reescrito o `deploy.yml` para usar `railway up --service <id> --detach` em vez da mutation GraphQL `environmentTriggersDeploy`
- Adicionado trigger `workflow_dispatch` para poder disparar manualmente
- Arquivo: `.github/workflows/deploy.yml`

## Como rodar localmente

```bash
git clone https://github.com/caiobholanda/sistema-chamados.git
cd sistema-chamados
npm install
```

Crie `.env` na raiz:
```
SESSION_SECRET=qualquer_string_secreta
PORT=3000
```

Inicie:
```bash
node src/server.js
```

Acesse: http://localhost:3000

Na primeira execução, um admin master é criado automaticamente (credenciais aparecem no terminal).

## Padrões do projeto

- Sem framework frontend — HTML/CSS/JS puro com fetch API
- CSS em variáveis CSS (`--gold`, `--navy`, `--border`, etc.) — ver início do `style.css`
- Classes CSS relevantes: `.tabs-bar / .tab-btn`, `.sub-tabs-bar / .sub-tab-btn`, `.modal-overlay / .modal`, `.badge-*`, `.btn-*`, `.form-control`, `.input-senha-wrap / .btn-eye`
- Todas as rotas admin exigem cookie JWT válido (`requireAdmin` ou `requireMaster`)
- `sanitizarTexto()` aplicado em todos os inputs de texto antes de salvar
