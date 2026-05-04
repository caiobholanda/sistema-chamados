# Links do Sistema de Chamados — Gran Marquise

## Repositório no GitHub
https://github.com/caiobholanda/sistema-chamados

## Como rodar em qualquer máquina

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
SESSION_SECRET=uma_chave_secreta_qualquer
PORT=3000
```

Depois inicie o servidor:
```bash
node src/server.js
```

Acesse no navegador: http://localhost:3000
