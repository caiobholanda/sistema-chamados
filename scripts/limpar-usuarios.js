const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data', 'chamados.db'));

const usuarios = db.prepare('SELECT id, nome, email FROM usuarios').all();
console.log(`Encontrados ${usuarios.length} usuário(s):`);
usuarios.forEach(u => console.log(`  [${u.id}] ${u.nome} — ${u.email}`));

if (usuarios.length === 0) {
  console.log('Nenhum usuário para remover.');
  process.exit(0);
}

db.prepare('UPDATE chamados SET usuario_id = NULL WHERE usuario_id IS NOT NULL').run();
const result = db.prepare('DELETE FROM usuarios').run();

console.log(`\n${result.changes} usuário(s) excluído(s). Chamados preservados.`);
db.close();
