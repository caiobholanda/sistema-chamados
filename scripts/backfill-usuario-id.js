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
const exemplosFalha = [];
for (const c of orfaos) {
  if (!c.nome) { naoEncontrados++; continue; }
  let matches = [];

  // 1) Match por RAMAL (mais confiável quando preenchido)
  if (c.ramal && String(c.ramal).trim()) {
    matches = D.prepare('SELECT id, nome FROM usuarios WHERE ramal=? AND ativo=1').all(String(c.ramal).trim());
  }

  // 2) Match exato por nome + setor
  if (!matches.length && c.setor) {
    matches = D.prepare(
      'SELECT id, nome FROM usuarios WHERE LOWER(nome)=LOWER(?) AND LOWER(setor)=LOWER(?) AND ativo=1'
    ).all(c.nome, c.setor);
  }

  // 3) Match exato por nome
  if (!matches.length) {
    matches = D.prepare(
      'SELECT id, nome FROM usuarios WHERE LOWER(nome)=LOWER(?) AND ativo=1'
    ).all(c.nome);
  }

  // 4) Match parcial: nome do chamado CONTÉM nome do usuário OU vice-versa
  //    Cobre casos "Caio Barsi" no chamado vs "Usuário Caio Barsi de Holanda" no cadastro.
  if (!matches.length) {
    const nomeNorm = c.nome.toLowerCase().trim();
    matches = D.prepare(`
      SELECT id, nome FROM usuarios
      WHERE ativo=1
        AND (LOWER(nome) LIKE ? OR ? LIKE '%' || LOWER(nome) || '%')
    `).all('%' + nomeNorm + '%', nomeNorm);
  }

  if (matches.length === 1) {
    const u = matches[0];
    console.log(`  ✓ chamado #${c.id} "${c.nome}" → user id=${u.id} (${u.nome})`);
    if (APPLY) {
      D.prepare('UPDATE chamados SET usuario_id = ? WHERE id = ?').run(u.id, c.id);
    }
    resolvidos++;
  } else if (matches.length > 1) {
    console.log(`  ⚠ chamado #${c.id} "${c.nome}" AMBÍGUO (${matches.length}): ${matches.map(m => m.nome).slice(0, 3).join(' | ')}`);
    ambiguos++;
  } else {
    naoEncontrados++;
    if (exemplosFalha.length < 5) exemplosFalha.push({ id: c.id, nome: c.nome, setor: c.setor, ramal: c.ramal });
  }
}
if (exemplosFalha.length) {
  console.log('\nExemplos sem match:');
  exemplosFalha.forEach(e => console.log('  -', JSON.stringify(e)));
}

console.log('\nResumo:');
console.log('  resolvidos......:', resolvidos);
console.log('  ambíguos (skip).:', ambiguos);
console.log('  sem match.......:', naoEncontrados);
if (!APPLY) console.log('\n▶ Para aplicar: node scripts/backfill-usuario-id.js --apply');
