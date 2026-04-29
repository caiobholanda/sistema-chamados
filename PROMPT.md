[Cole este prompt no Claude Code aberto nesta pasta.]
PROMPT — Sistema de Chamados TI (Hotel Fortaleza)
CONTEXTO
Sou da equipe de TI de um hotel renomado em Fortaleza. Hoje não temos sistema para gerenciar chamados internos. Quero um sistema web simples, robusto e visualmente agradável, rodando na rede local, que permita: (1) qualquer colaborador abrir um chamado por formulário web, (2) a equipe de TI gerenciar os chamados num painel exclusivo com login, (3) os usuários avaliarem (1–10) o atendimento depois de concluído, (4) relatórios mensais para controle interno.
STACK OBRIGATÓRIA

Backend: Node.js + Express + SQLite (better-sqlite3).
Frontend: HTML5 + CSS3 + JavaScript vanilla. Responsivo (desktop e mobile).
Auth admin: bcrypt + JWT em cookie httpOnly (8h).
Upload: multer para arquivos.
Dependências: express, better-sqlite3, bcrypt, jsonwebtoken, cookie-parser, multer. Nada além.

ESTRUTURA DE PASTAS
sistema-chamados/
├── server.js
├── package.json
├── .env.example
├── .gitignore
├── data/
│   ├── chamados.db          (criado no primeiro boot)
│   └── uploads/             (anexos dos chamados)
├── public/
│   ├── index.html           (usuário: abrir + acompanhar)
│   ├── admin-login.html
│   ├── admin-painel.html
│   ├── admin-relatorios.html
│   ├── admin-usuarios.html  (só master)
│   ├── css/style.css
│   └── js/{usuario.js, admin-login.js, admin-painel.js, admin-relatorios.js, admin-usuarios.js}
├── src/
│   ├── db.js                (init e queries)
│   ├── auth.js              (middleware)
│   ├── upload.js            (config multer)
│   └── rotas/
│       ├── chamados.js
│       ├── admins.js
│       └── relatorios.js
├── scripts/seed.js          (5 chamados de exemplo, opcional)
└── README.md
MODELO DE DADOS (SQLite)
chamados
campotiporegrasidINTEGER PK AUTOINCREMENTnomeTEXT NOT NULL2–80 charssetorTEXT NOT NULL2–60 chars, texto livreramalTEXT NOT NULLregex ^\d{4}$ exatodescricaoTEXT NOT NULL10–2000 charsanexo_pathTEXTcaminho relativo do arquivo (opcional)anexo_nome_originalTEXTnome original do uploadprioridadeTEXTenum: null,baixa,media,alta,urgentestatusTEXT NOT NULL DEFAULT 'aberto'enum: aberto,em_andamento,concluido,encerradoprazoDATETIMEdata/hora limite (definida pelo admin, opcional)admin_responsavel_idINTEGER FK admins(id)solucaoTEXTpreenchida ao concluir/encerrarnotaINTEGER1–10, só após concluidocomentario_avaliacaoTEXTopcionalcriado_emDATETIME DEFAULT CURRENT_TIMESTAMPatualizado_emDATETIMEconcluido_emDATETIME
admins
campotiporegrasidINTEGER PK AUTOINCREMENTusuarioTEXT UNIQUE NOT NULLloginnome_completoTEXT NOT NULLsenha_hashTEXT NOT NULLbcryptis_masterINTEGER DEFAULT 01 = pode gerenciar adminsativoINTEGER DEFAULT 1soft deletecriado_emDATETIME DEFAULT CURRENT_TIMESTAMP
historico_chamados (auditoria)
campotiporegrasidINTEGER PK AUTOINCREMENTchamado_idINTEGER FK chamados(id)admin_idINTEGER FK admins(id)quem fez a açãoacaoTEXTprioridade_definida, status_alterado, prazo_alterado, solucao_registrada, assumidovalor_anteriorTEXTvalor_novoTEXTtimestampDATETIME DEFAULT CURRENT_TIMESTAMP
REGRAS DE NEGÓCIO
1. Abertura de chamado (usuário)

Formulário em index.html com: nome, setor, ramal, descrição, anexo (opcional).
Ramal: pattern="\d{4}", maxlength="4", minlength="4". Validar no backend também.
Anexo opcional: input type="file". Aceitar jpg/jpeg/png/pdf/txt/log/docx. Tamanho máx 10MB. Salvar em data/uploads/<id>__<nome-saneado>. Guardar anexo_path e anexo_nome_original na tabela.
Sanitizar nome do arquivo (remover acentos, espaços viram _, dropar caracteres perigosos).
Após enviar, mostrar tela com ID do chamado e link "Acompanhar este chamado".
Acompanhamento via /?chamado=<id> — sem login. Mostra status, prazo, anexo (se houver, link pra baixar).

2. Estados e fluxo
aberto ─[admin atribui prioridade/prazo]─> aberto
       └─[admin assume]─> em_andamento ─> concluido ─[usuário avalia 1-10]─> concluido (avaliado)
                                       └─> encerrado (cancelado, SEM avaliação)

Encerrado = cancelado. Não pede avaliação.
Concluído = resolvido. Avaliação 1–10 obrigatória pelo usuário.
Usuário só vê botão "Avaliar" quando status = concluido E nota IS NULL.
Não permitir transições inválidas (ex.: aberto → concluido direto bloqueado; passa por em_andamento).

3. Painel admin (admin-painel.html)

Lista ordenada: sem prioridade no topo (cinza), depois urgente (vermelho), alta (laranja), media (amarelo), baixa (verde). Dentro do mesmo nível, mais antigos primeiro.
Filtros: status, setor, admin responsável, período.
Modal/painel lateral ao clicar:

Dados completos + link de download do anexo se houver.
Dropdown Prioridade.
Campo Prazo (date+time picker). Admin pode definir e alterar depois.
Botões: Assumir → em_andamento. Concluir com campo solucao → concluido. Encerrar com campo motivo → encerrado.


Toda mudança grava em historico_chamados com valor_anterior e valor_novo.

4. Mudança de prazo (regra explícita)

Admin com painel aberto pode editar o prazo a qualquer momento.
Ao alterar:

Backend grava historico_chamados com acao = 'prazo_alterado', valor_anterior (ISO do prazo antigo, ou null), valor_novo (ISO do novo prazo), admin_id do logado.
Frontend mostra banner amarelo no card do chamado: "Prazo alterado em DD/MM/YYYY HH:mm por <nome_completo do admin>: <prazo anterior> → <novo prazo>".
Na tela pública de acompanhamento (/?chamado=<id>), exibir o histórico de prazos se houve mudança: "Prazo atual: X. Prazo anterior: Y (alterado por Z em DD/MM)".
Histórico completo de prazos disponível no detalhe do chamado para o admin.



5. Auth admin

Login em admin-login.html. Sem cadastro público.
JWT com sub: admin.id, is_master, expira em 8h. Cookie httpOnly + SameSite=Strict.
Middleware requireAdmin em /api/admin/*. Middleware requireMaster em rotas de gerenciamento de admins.
Setup inicial: ao primeiro boot, se não existir nenhum admin, criar admin master usando .env (ADMIN_MASTER_USER, ADMIN_MASTER_PASS, ADMIN_MASTER_NOME). Logar no console e instruir trocar a senha.
Master cria/desativa/remove admins comuns em admin-usuarios.html.

6. Avaliação (usuário)

Quando status = concluido e nota null: tela de acompanhamento mostra 10 estrelas (1–10) + textarea opcional comentario_avaliacao.
Submeter grava e bloqueia edição.

7. Relatórios (admin-relatorios.html)
Filtro principal: mês/ano (default mês atual). Cards e gráficos com Chart.js (CDN):

Volume por status no mês (cards): Abertos / Em andamento / Concluídos / Encerrados.
Total de chamados abertos por mês — barras dos últimos 12 meses.
Nota média de satisfação no mês (1–10) + tendência dos últimos 6 meses (linha).
Top 5 setores que mais abriram chamados no mês selecionado (barras horizontais).
Botão "Exportar CSV" do mês selecionado (todos os campos do chamado).

FRONTEND — REQUISITOS VISUAIS

Paleta sóbria + cores fortes só em status/prioridade:

Urgente #dc2626, Alta #ea580c, Média #ca8a04, Baixa #16a34a, Sem prioridade #64748b.


Mobile-first. Tipografia: Inter (CDN) ou system-ui.
Header com texto "TI — Hotel" e placeholder de logo (public/img/logo.png — coloco depois).
Acessibilidade: labels em todos inputs, foco visível, contraste WCAG AA.
Banner amarelo no card quando prazo foi alterado (regra 4).

ENDPOINTS
Públicos

POST /api/chamados — abrir chamado (multipart/form-data por causa do anexo).
GET /api/chamados/:id — consultar (sem auth). Retorna chamado + histórico de prazos (apenas as alterações de prazo).
POST /api/chamados/:id/avaliar — submeter nota 1–10 + comentário.
GET /api/chamados/:id/anexo — baixar anexo (se existir).

Admin (JWT)

POST /api/admin/login
POST /api/admin/logout
GET /api/admin/me
GET /api/admin/chamados — filtros ?status=&setor=&admin_id=&periodo_inicio=&periodo_fim=.
GET /api/admin/chamados/:id — detalhe + histórico completo.
PATCH /api/admin/chamados/:id/prioridade — body { prioridade }.
PATCH /api/admin/chamados/:id/prazo — body { prazo }. Grava histórico (regra 4).
PATCH /api/admin/chamados/:id/assumir — vira em_andamento.
PATCH /api/admin/chamados/:id/concluir — body { solucao }.
PATCH /api/admin/chamados/:id/encerrar — body { motivo }.
GET /api/admin/relatorios?mes=YYYY-MM.
GET /api/admin/relatorios/exportar?mes=YYYY-MM — CSV.

Master (JWT + is_master)

GET /api/admin/usuarios
POST /api/admin/usuarios — cria admin.
PATCH /api/admin/usuarios/:id — desativar/reativar/trocar senha.
DELETE /api/admin/usuarios/:id — soft delete.

VALIDAÇÕES (BACKEND, OBRIGATÓRIAS)

nome 2–80, setor 2–60, ramal regex ^\d{4}$, descricao 10–2000, prioridade enum válido ou null, status enum válido, nota integer 1–10.
Anexo: tipos permitidos (jpg/jpeg/png/pdf/txt/log/docx), até 10MB. Rejeitar com 400 e mensagem clara se violar.
Não permitir transições de status inválidas.
Sanitizar HTML em todos os campos texto.
Trim em todos campos texto.

ENTREGÁVEIS

Código rodando com npm install && npm start.
README.md com: instalar, criar .env (ADMIN_MASTER_USER, ADMIN_MASTER_PASS, ADMIN_MASTER_NOME, JWT_SECRET, PORT), backup do data/, rodar atrás de proxy reverso.
.env.example com todas as variáveis e comentários.
.gitignore excluindo node_modules/, data/*.db, data/uploads/*, .env.
scripts/seed.js (opcional) com 5 chamados em estados variados, 2 com anexos, 1 com prazo alterado.

CRITÉRIOS DE ACEITAÇÃO

 Usuário abre chamado com ramal de 4 dígitos. Bloqueia se diferente.
 Anexo opcional sobe e fica disponível pra download na tela de acompanhamento e no painel admin.
 Chamado aparece imediato no painel admin.
 Sem prioridade aparece sempre no topo.
 Admin consegue priorizar, definir prazo, alterar prazo (com banner mostrando admin + prazo anterior + prazo novo), assumir, concluir e encerrar.
 Histórico de prazo aparece na tela pública de acompanhamento quando houve alteração.
 Usuário só avalia (1–10) quando admin marca concluido. encerrado nunca pede avaliação.
 Relatório do mês traz: volume por status, abertos por mês (12m), nota média 1–10 + tendência 6m, top 5 setores.
 CSV exporta corretamente.
 Master cria outros admins. Admin comum não acessa admin-usuarios.html.
 JWT httpOnly, expira 8h.
 Banco e uploads persistem entre reinicializações.
 Funciona em Chrome/Edge atuais e em smartphone.

INSTRUÇÕES PARA O CLAUDE CODE

Crie package.json com as dependências exatas listadas.
Estrutura de pastas e arquivos na ordem: src/db.js → src/auth.js → src/upload.js → rotas → server.js → frontend (uma página por vez, testando).
better-sqlite3 síncrono. Multer com diskStorage.
Toda rota: validação → ação → log de histórico → resposta JSON.
Erros: try/catch retornando { erro: "mensagem" } com status HTTP coerente.
Não invente recursos não pedidos. Se algo for ambíguo, pergunte antes.
Ao terminar, rode o servidor, abra cada tela e me mostre prints/console comprovando que cada item dos critérios passa.

Pode começar.
