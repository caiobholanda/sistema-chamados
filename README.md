# Sistema de Chamados TI — Hotel Fortaleza

Sistema web para gerenciamento de chamados internos de TI. Roda na rede local.

## Instalação

```bash
cd sistema-chamados
npm install
```

## Configuração

Copie o arquivo de exemplo e preencha os valores:

```bash
cp .env.example .env
```

Edite o `.env`:

```env
PORT=3000
JWT_SECRET=gere-uma-chave-aleatoria-longa-aqui
ADMIN_MASTER_USER=admin
ADMIN_MASTER_PASS=SuaSenhaForte123!
ADMIN_MASTER_NOME=Administrador Master
```

> **Dica:** gere o `JWT_SECRET` com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Iniciando

```bash
npm start
```

No primeiro boot, se não existir nenhum admin, o sistema cria automaticamente o admin master com as credenciais do `.env` e exibe no console.

Acesse: `http://localhost:3000`

## Dados opcionais de exemplo

```bash
npm run seed
```

Cria 5 chamados em estados variados para testar o sistema.

## Estrutura

| Caminho | Descrição |
|---|---|
| `data/chamados.db` | Banco SQLite (criado no primeiro boot) |
| `data/uploads/` | Arquivos anexados aos chamados |
| `public/` | Frontend estático |
| `src/` | Lógica backend |

## Backup

Faça backup periódico de:
- `data/chamados.db`
- `data/uploads/`

## Rodando atrás de proxy reverso (Nginx)

```nginx
server {
    listen 80;
    server_name chamados.seuhotel.local;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 15M;
    }
}
```

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `PORT` | Não (padrão 3000) | Porta do servidor |
| `JWT_SECRET` | **Sim** | Chave secreta para JWT — nunca compartilhe |
| `ADMIN_MASTER_USER` | Não (padrão "admin") | Login do admin master inicial |
| `ADMIN_MASTER_PASS` | Não (padrão fraco) | Senha do admin master inicial — **troque!** |
| `ADMIN_MASTER_NOME` | Não | Nome completo do admin master |
