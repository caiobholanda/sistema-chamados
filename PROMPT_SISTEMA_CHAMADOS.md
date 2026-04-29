# PROMPT — Sistema de Chamados TI (Hotel Fortaleza)

> Cole este prompt inteiro no Claude Code dentro de uma pasta vazia chamada `sistema-chamados/`.

---

## CONTEXTO

Sou da equipe de TI de um hotel renomado em Fortaleza. Hoje não temos sistema para gerenciar chamados internos. Quero um sistema web simples, robusto e visualmente agradável, rodando na rede local do hotel, que permita:

1. Qualquer colaborador abrir um chamado por um formulário web.
2. A equipe de TI (admins) gerenciar os chamados num painel exclusivo com login.
3. Os usuários avaliarem (1–10) o atendimento depois de concluído.
4. Relatórios mensais para controle interno.

## STACK OBRIGATÓRIA

- **Backend**: Node.js + Express + SQLite (banco em arquivo único `data/chamados.db`).
- **Frontend**: HTML5 + CSS3 + JavaScript vanilla (sem frameworks). Layout responsivo (desktop e mobile).
- **Auth admin**: bcrypt para senhas + JWT em cookie httpOnly.
- **Validação**: tanto frontend quanto backend.
- **Sem dependências exóticas**: só `express`, `better-sqlite3`, `bcrypt`, `jsonwebtoken`, `cookie-parser`.

## ESTRUTURA DE PASTAS

```
sistema-chamados/
├── server.js                  # entry point Node
├── package.json
├── data/
│   └── chamados.db            # SQLite (criado no primeiro boot)
├── public/
│   ├── index.html             # tela do usuário (abrir chamado + acompanhar)
│   ├── admin-login.html       # login admin
│   ├── admin-painel.html      # painel de chamados (admins logados)
│   ├── admin-relatorios.html  # relatórios mensais
│   ├── css/style.css
│   └── js/
│       ├── usuario.js
│       ├── admin-login.js
│       ├── admin-painel.js
│       └── admin-relatorios.js
├── src/
│   ├── db.js                  # init e queries
│   ├── auth.js                # middleware de auth admin
│   └── rotas/
│       ├── chamados.js        # CRUD de chamados
│       ├── admins.js          # CRUD de admins (só master)
│       └── relatorios.js      # agregações
└── README.md                  # como rodar, criar admin master, backup
```

## MODELO DE DADOS (SQLite)

### Tabela `chamados`
| Campo | Tipo | Regras |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| nome | TEXT NOT NULL | nome de quem abriu |
| setor | TEXT NOT NULL | texto livre |
| ramal | TEXT NOT NULL | exatamente 4 dígitos numéricos (validar regex `^\d{4}$`) |
| descricao | TEXT NOT NULL | mín 10 caracteres |
| prioridade | TEXT | enum: `null`, `baixa`, `media`, `alta`, `urgente` |
| status | TEXT NOT NULL DEFAULT 'aberto' | enum: `aberto`, `em_andamento`, `concluido`, `encerrado` |
| admin_responsavel_id | INTEGER FK admins(id) | quem assumiu |
| solucao | TEXT | descrição da solução (preenchida ao concluir/encerrar) |
| nota | INTEGER | 1–10, só preenchida pelo usuário após `concluido` |
| comentario_avaliacao | TEXT | opcional |
| criado_em | DATETIME DEFAULT CURRENT_TIMESTAMP | |
| atualizado_em | DATETIME | |
| concluido_em | DATETIME | timestamp da mudança para concluido/encerrado |

### Tabela `admins`
| Campo | Tipo | Regras |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| usuario | TEXT UNIQUE NOT NULL | login |
| nome_completo | TEXT NOT NULL | |
| senha_hash | TEXT NOT NULL | bcrypt |
| is_master | INTEGER DEFAULT 0 | 1 = pode criar/remover outros admins |
| ativo | INTEGER DEFAULT 1 | soft delete |
| criado_em | DATETIME DEFAULT CURRENT_TIMESTAMP | |

### Tabela `historico_chamados`
| Campo | Tipo | Regras |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| chamado_id | INTEGER FK chamados(id) | |
| admin_id | INTEGER FK admins(id) | quem fez a ação |
| acao | TEXT | ex: `prioridade_definida`, `status_alterado`, `solucao_registrada` |
| valor_anterior | TEXT | |
| valor_novo | TEXT | |
| timestamp | DATETIME DEFAULT CURRENT_TIMESTAMP | |

## REGRAS DE NEGÓCIO

### 1. Abertura de chamado (usuário comum)
- Formulário em `index.html` com campos: nome, setor, ramal, descrição.
- **Ramal**: input com `pattern="\d{4}"`, `maxlength="4"`, `minlength="4"`. Bloquear submit se não bater. Validar de novo no backend.
- Após enviar, mostrar tela de confirmação com o **ID do chamado** e link "Acompanhar este chamado".
- Acompanhamento via URL `/?chamado=<id>` — mostra status atual sem precisar de login.

### 2. Estados e fluxo
```
aberto ──[admin atribui prioridade]──> aberto (com prioridade)
       └─[admin assume]─> em_andamento ──> concluido ──[usuário avalia]──> concluido (avaliado)
                                       └─> encerrado (cancelado, sem avaliação)
```
- **Encerrado** = cancelado (chamado duplicado, sem fundamento, etc). NÃO pede avaliação.
- **Concluído** = problema resolvido. Sistema obriga a avaliação 1–10 do usuário.
- Usuário só vê o botão "Avaliar" quando o status estiver em `concluido` E `nota` for null.

### 3. Painel admin (`admin-painel.html`)
- Lista de chamados, ordenação default:
  1. **Sem prioridade** sempre no topo (cor cinza).
  2. Depois `urgente` (vermelho), `alta` (laranja), `media` (amarelo), `baixa` (verde).
  3. Dentro do mesmo nível, mais antigos primeiro.
- Filtros: por status, por setor, por admin responsável, por período.
- Ao clicar no chamado abre modal/painel lateral com:
  - Dados completos.
  - Dropdown para definir prioridade.
  - Botões: "Assumir" (vira `em_andamento` com `admin_responsavel_id` = eu).
  - Campo "Solução" + botão "Concluir" (vira `concluido`).
  - Botão "Encerrar" + campo motivo (vira `encerrado`).
- Toda ação grava linha em `historico_chamados`.

### 4. Auth admin
- Login em `admin-login.html`. Sem cadastro público.
- Backend gera JWT com `sub: admin.id`, `is_master`. Cookie httpOnly + SameSite=Strict, expira em 8h.
- Middleware `requireAdmin` em todas rotas `/api/admin/*`.
- Middleware `requireMaster` em rotas de gerenciamento de admins.
- Setup inicial: ao primeiro boot, se não existe nenhum admin, criar **admin master** com credenciais lidas de `.env` (`ADMIN_MASTER_USER` e `ADMIN_MASTER_PASS`). Logar no console as credenciais e instruir trocar.
- Master cria/remove/desativa admins comuns em uma página `admin-usuarios.html`.

### 5. Avaliação (usuário)
- Quando status = `concluido` e `nota` null: tela de acompanhamento mostra 10 ícones de estrela (1–10) + textarea opcional.
- Submeter grava `nota` e `comentario_avaliacao`.
- Não pode editar depois de salvar.

### 6. Relatórios (`admin-relatorios.html`)
Filtro principal: **mês/ano** (default: mês atual). Cards e gráficos:

1. **Volume por status no mês** (cards com contadores):
   - Abertos / Em andamento / Concluídos / Encerrados.
2. **Total de chamados abertos por mês** (gráfico de barras dos últimos 12 meses) — usar Chart.js (CDN).
3. **Nota média de satisfação no mês** (1–10) + tendência dos últimos 6 meses.
4. **Top 5 setores que mais abriram chamados** (no mês selecionado, com contagem).
5. **Botão "Exportar CSV"** do mês selecionado.

## FRONTEND — REQUISITOS VISUAIS

- Paleta sóbria + cores fortes só em status/prioridade:
  - Urgente: `#dc2626` (vermelho)
  - Alta: `#ea580c` (laranja)
  - Média: `#ca8a04` (amarelo)
  - Baixa: `#16a34a` (verde)
  - Sem prioridade: `#64748b` (cinza)
- Responsivo (mobile first).
- Tipografia: system-ui ou Inter via CDN.
- Identidade do hotel: deixar um header com o texto **"TI — Hotel"** e espaço pra logo (placeholder `public/img/logo.png` — eu coloco depois).
- Acessibilidade: labels em todos os inputs, foco visível, contraste WCAG AA.

## ENDPOINTS (API)

### Públicos
- `POST /api/chamados` — abrir chamado (valida campos)
- `GET /api/chamados/:id` — consultar status (sem auth)
- `POST /api/chamados/:id/avaliar` — submeter nota (só se status=concluido e nota=null)

### Admin (requer JWT)
- `POST /api/admin/login` — autenticar
- `POST /api/admin/logout` — limpar cookie
- `GET /api/admin/me` — dados do admin logado
- `GET /api/admin/chamados` — listar com filtros (`?status=&setor=&periodo=`)
- `PATCH /api/admin/chamados/:id/prioridade` — definir/alterar prioridade
- `PATCH /api/admin/chamados/:id/assumir` — vira em_andamento
- `PATCH /api/admin/chamados/:id/concluir` — body: `{ solucao }`
- `PATCH /api/admin/chamados/:id/encerrar` — body: `{ motivo }`
- `GET /api/admin/relatorios?mes=YYYY-MM` — agregados do mês

### Master (requer JWT + is_master)
- `GET /api/admin/usuarios` — listar admins
- `POST /api/admin/usuarios` — criar admin
- `PATCH /api/admin/usuarios/:id` — desativar/reativar
- `DELETE /api/admin/usuarios/:id` — soft delete

## VALIDAÇÕES (BACKEND, OBRIGATÓRIAS)

- `nome`: 2–80 chars, trim.
- `setor`: 2–60 chars, trim.
- `ramal`: regex `^\d{4}$` exato.
- `descricao`: 10–2000 chars.
- `prioridade`: enum válido ou null.
- `status`: enum válido. Não permitir transições inválidas (ex.: não pode ir de `aberto` direto pra `concluido` — tem que passar por `em_andamento`).
- `nota`: integer 1–10.
- Sanitizar HTML em todos campos texto (escapar `<>&"'`).

## ENTREGÁVEIS

1. Todo o código rodando com `npm install && npm start`.
2. `README.md` com:
   - Como instalar e rodar.
   - Como criar o `.env` com `ADMIN_MASTER_USER` e `ADMIN_MASTER_PASS`.
   - Como fazer backup do `data/chamados.db`.
   - Como rodar em produção atrás de um proxy reverso.
3. Script `scripts/seed.js` (opcional) que insere 5 chamados de exemplo em estados variados pra testar a interface.
4. Um `.gitignore` excluindo `node_modules/`, `data/*.db`, `.env`.

## CRITÉRIOS DE ACEITAÇÃO

- [ ] Usuário consegue abrir chamado com ramal de 4 dígitos. Bloqueia se não tiver 4 dígitos.
- [ ] Chamado aparece no painel admin imediatamente.
- [ ] Admin consegue priorizar, assumir, concluir e encerrar.
- [ ] Sem-prioridade aparece sempre no topo.
- [ ] Usuário só pode avaliar quando o admin marca `concluido`.
- [ ] Encerrado nunca pede avaliação.
- [ ] Relatório do mês traz volume por status, nota média 1–10, abertos por mês (12m), top 5 setores.
- [ ] Master cria outros admins. Admin comum não consegue acessar a tela de usuários.
- [ ] Cookie JWT é httpOnly, expira em 8h.
- [ ] Funciona em Chrome/Edge mais recentes e em smartphone.
- [ ] Banco persiste entre reinicializações do servidor.

## INSTRUÇÕES PARA O CLAUDE CODE

1. Crie o `package.json` primeiro com as dependências exatas listadas.
2. Crie a estrutura de pastas e arquivos em ordem: `src/db.js` → `src/auth.js` → rotas → `server.js` → frontend.
3. Para cada rota, escreva o handler + validação + log de histórico.
4. No frontend, faça uma página por vez e teste cada fluxo antes de seguir.
5. Use `better-sqlite3` (síncrono, mais simples).
6. Trate erros com `try/catch` e retorne JSON `{ erro: "mensagem" }` com status HTTP coerente.
7. **Não invente recursos não pedidos.** Se algo for ambíguo, pergunte antes.
8. Ao terminar, rode o servidor, abra cada tela e me mostre screenshots ou o output do console comprovando que tudo funciona.

**Pronto. Pode começar.**
