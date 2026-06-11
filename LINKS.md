# Links do Sistema de Chamados — Gran Marquise

## Acesso online (qualquer máquina, sem instalar nada)
https://sistema-chamados-granmarquise.fly.dev

## Repositório no GitHub
https://github.com/caiobholanda/sistema-chamados

## Como rodar localmente

### Requisitos
- Node.js instalado (https://nodejs.org)

### Passos
```bash
git clone https://github.com/caiobholanda/sistema-chamados.git
cd sistema-chamados
npm install
```

Crie um arquivo `.env` na raiz com:
```
PORT=3000
JWT_SECRET=<gere com: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
EXPORT_KEY=<gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
ADMIN_MASTER_PASS=<senha forte para o admin master no primeiro boot>
ADMIN_MASTER_USER=admin
ADMIN_MASTER_NOME=Administrador Master
```

Depois inicie o servidor:
```bash
node server.js
```

Acesse no navegador: http://localhost:3000

> Em produção, defina os secrets via `fly secrets set` em vez do `.env`.
