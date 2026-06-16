#!/usr/bin/env node
/**
 * Backfill de chamados.usuario_id NULL. Tenta resolver pelo nome
 * (case-insensitive) na tabela usuarios. Quando match único, atualiza.
 *
 * Uso:
 *   node scripts/backfill-usuario-id.js              # dry-run
 *   node scripts/backfill-usuario-id.js --apply      # aplica
 */

const db = require('../src/db');
const APPLY = process.argv.includes('--apply');

db.initDb();
const D = db.getDb();

const orfaos = D.prepare(`
  SELECT id, nome, setor, ramal
  FROM chamados
  WHERE usuario_id IS NULL
`).all();

console.log('═══ Backfill chamados.usuario_id ═══');
console.log('Modo:', APPLY ? 'APLICANDO' : 'DRY-RUN');
console.log('Total órfãos:', orfaos.length);

let resolvidos = 0, ambiguos = 0, naoEncontrados = 0;
for (const c of orfaos) {
  if (!c.nome) { naoEncontrados++; continue; }
  // Tenta match estrito por nome + setor primeiro
  let matches = [];
  if (c.setor) {
    matches = D.prepare(
      'SELECT id, nome FROM usuarios WHERE LOWER(nome)=LOWER(?) AND LOWER(setor)=LOWER(?) AND ativo=1'
    ).all(c.nome, c.setor);
  }
  if (!matches.length) {
    matches = D.prepare(
      'SELECT id, nome FROM usuarios WHERE LOWER(nome)=LOWER(?) AND ativo=1'
    ).all(c.nome);
  }
  if (matches.length === 1) {
    const u = matches[0];
    console.log(`  ✓ chamado #${c.id} "${c.nome}" → user id=${u.id}`);
    if (APPLY) {
      D.prepare('UPDATE chamados SET usuario_id = ? WHERE id = ?').run(u.id, c.id);
    }
    resolvidos++;
  } else if (matches.length > 1) {
    console.log(`  ⚠ chamado #${c.id} "${c.nome}" AMBÍGUO (${matches.length} matches)`);
    ambiguos++;
  } else {
    naoEncontrados++;
  }
}

console.log('\nResumo:');
console.log('  resolvidos......:', resolvidos);
console.log('  ambíguos (skip).:', ambiguos);
console.log('  sem match.......:', naoEncontrados);
if (!APPLY) console.log('\n▶ Para aplicar: node scripts/backfill-usuario-id.js --apply');
