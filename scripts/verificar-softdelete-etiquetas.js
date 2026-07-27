'use strict';
// Verificacao das funcoes de soft-delete de etiquetas (desativar/reativar).
// Roda contra um SQLite EM MEMORIA (nao toca o banco real). As funcoes reais
// de src/db.js aceitam um handle `dbh` opcional exatamente para permitir isto.
//
//   node scripts/verificar-softdelete-etiquetas.js

const Database = require('better-sqlite3');
const { desativarEtiqueta, reativarEtiqueta } = require('../src/db');

let falhas = 0;
function ok(cond, msg) {
  if (cond) { console.log('  ✓', msg); }
  else { console.error('  ✗ FALHOU:', msg); falhas++; }
}

function novoDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE etiquetas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      nome TEXT NOT NULL,
      descricao TEXT,
      parent_slug TEXT,
      cor TEXT DEFAULT '#6B7280',
      sistema INTEGER DEFAULT 0,
      ativo INTEGER DEFAULT 1,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      parent_slug_original TEXT,
      desativado_em DATETIME
    );
  `);
  return db;
}
function ins(db, slug, parent) {
  db.prepare('INSERT INTO etiquetas (slug, nome, parent_slug, ativo) VALUES (?, ?, ?, 1)').run(slug, slug.toUpperCase(), parent);
  return db.prepare('SELECT id FROM etiquetas WHERE slug = ?').get(slug).id;
}
const get = (db, slug) => db.prepare('SELECT * FROM etiquetas WHERE slug = ?').get(slug);
function semCiclo(db) {
  const rows = db.prepare('SELECT slug, parent_slug FROM etiquetas').all();
  const by = new Map(rows.map(r => [r.slug, r.parent_slug]));
  for (const r of rows) {
    let cur = r.parent_slug, guard = 0, seen = new Set([r.slug]);
    while (cur && guard++ < 10000) {
      if (seen.has(cur)) return false;
      seen.add(cur); cur = by.get(cur) || null;
    }
  }
  return true;
}

// ── Cenario A: desativar folha (sem filhos) e reativar ──
(() => {
  console.log('A) desativar folha + reativar');
  const db = novoDb();
  const idL = ins(db, 'l', null);
  desativarEtiqueta(idL, db);
  let l = get(db, 'l');
  ok(l.ativo === 0, 'folha fica inativa');
  ok(l.desativado_em != null, 'desativado_em preenchido');
  reativarEtiqueta(idL, db);
  l = get(db, 'l');
  ok(l.ativo === 1 && l.desativado_em == null, 'folha volta ativa');
  ok(l.parent_slug == null && l.parent_slug_original == null, 'folha continua raiz, sem marcador');
  ok(semCiclo(db), 'sem ciclo');
})();

// ── Cenario B: desativar pai com filhos + reativar restaurando hierarquia ──
(() => {
  console.log('B) A>B>C: desativar B, filhos sobem; reativar restaura');
  const db = novoDb();
  ins(db, 'a', null);
  const idB = ins(db, 'b', 'a');
  ins(db, 'c', 'b');
  desativarEtiqueta(idB, db);
  let b = get(db, 'b'), c = get(db, 'c');
  ok(b.ativo === 0, 'B inativa');
  ok(b.parent_slug_original === 'a', 'B guarda seu pai original (a)');
  ok(c.ativo === 1 && c.parent_slug === 'a', 'C (ativo) sobe para o avo A');
  ok(c.parent_slug_original === 'b', 'C guarda B como pai original');
  reativarEtiqueta(idB, db);
  b = get(db, 'b'); c = get(db, 'c');
  ok(b.ativo === 1 && b.parent_slug === 'a', 'B volta ativa sob A');
  ok(b.parent_slug_original == null, 'marcador de B limpo');
  ok(c.parent_slug === 'b' && c.parent_slug_original == null, 'C volta para baixo de B');
  ok(semCiclo(db), 'sem ciclo');
})();

// ── Cenario C: reativar quando o pai original sumiu ──
(() => {
  console.log('C) pai original removido -> fallback seguro');
  const db = novoDb();
  ins(db, 'a', null);
  const idB = ins(db, 'b', 'a');
  desativarEtiqueta(idB, db); // B guarda original 'a'
  db.prepare('DELETE FROM etiquetas WHERE slug = ?').run('a'); // A some
  reativarEtiqueta(idB, db);
  const b = get(db, 'b');
  ok(b.ativo === 1, 'B reativa mesmo sem o pai original');
  ok(b.parent_slug_original == null, 'marcador limpo');
  ok(semCiclo(db), 'sem ciclo (nao aponta para pai inexistente de forma circular)');
})();

// ── Cenario D: desativar -> reativar -> desativar em sequencia ──
(() => {
  console.log('D) sequencia desativar/reativar/desativar');
  const db = novoDb();
  ins(db, 'a', null);
  const idB = ins(db, 'b', 'a');
  desativarEtiqueta(idB, db);
  reativarEtiqueta(idB, db);
  ok(get(db, 'b').ativo === 1 && get(db, 'b').parent_slug === 'a', 'apos ciclo, B ativa sob A');
  const r2 = desativarEtiqueta(idB, db);
  ok(r2 === true && get(db, 'b').ativo === 0, 'desativa de novo com sucesso');
  ok(desativarEtiqueta(idB, db) === false, 'desativar ja-inativa retorna false (idempotente)');
  ok(semCiclo(db), 'sem ciclo');
})();

// ── Cenario E/F: aninhado A>B>C, desativa B depois A, reativa A depois B ──
(() => {
  console.log('F) aninhado: desativa B e A; reativa A e B restaura A>B>C');
  const db = novoDb();
  ins(db, 'a', null);
  const idB = ins(db, 'b', 'a');
  const idC = ins(db, 'c', 'b');
  const idA = db.prepare('SELECT id FROM etiquetas WHERE slug=?').get('a').id;
  desativarEtiqueta(idB, db); // C -> a, C.orig=b ; B.orig=a
  desativarEtiqueta(idA, db); // C(ativo, filho de a) -> raiz ; C.orig continua 'b' (nao sobrescreve)
  let c = get(db, 'c');
  ok(c.parent_slug == null, 'C sobe para raiz apos A desativar');
  ok(c.parent_slug_original === 'b', 'C preserva pai original mais profundo (b), nao sobrescreve com a');
  reativarEtiqueta(idA, db); // A volta raiz; A nao tem filhos com orig=a agora
  reativarEtiqueta(idB, db); // B volta sob A; C (orig=b) volta sob B
  const a = get(db, 'a'); const b = get(db, 'b'); c = get(db, 'c');
  ok(a.ativo === 1 && a.parent_slug == null, 'A raiz ativa');
  ok(b.ativo === 1 && b.parent_slug === 'a', 'B sob A');
  ok(c.parent_slug === 'b' && c.parent_slug_original == null, 'C sob B (hierarquia original restaurada)');
  ok(semCiclo(db), 'sem ciclo');
})();

// ── Cenario G: restauracao encadeada (reativar filho com pai ainda inativo) ──
(() => {
  console.log('G) A>B: desativa A e B; reativa B (A inativa) e depois A -> B re-adotada sob A');
  const db = novoDb();
  const idA = ins(db, 'a', null);
  const idB = ins(db, 'b', 'a');
  desativarEtiqueta(idA, db); // B sobe para raiz, B.orig='a'; A inativa
  desativarEtiqueta(idB, db); // B inativa, B.orig continua 'a'
  reativarEtiqueta(idB, db);  // A ainda inativa -> mantem B na raiz E preserva o marcador
  let b = get(db, 'b');
  ok(b.ativo === 1 && b.parent_slug == null, 'B reativa na raiz (pai original A ainda inativo)');
  ok(b.parent_slug_original === 'a', 'marcador de B preservado para readocao futura');
  reativarEtiqueta(idA, db);  // A volta -> re-adota B (orig='a')
  const a = get(db, 'a'); b = get(db, 'b');
  ok(a.ativo === 1, 'A reativa');
  ok(b.parent_slug === 'a' && b.parent_slug_original == null, 'B re-adotada sob A (hierarquia encadeada restaurada)');
  ok(semCiclo(db), 'sem ciclo');
})();

console.log(falhas === 0 ? '\nTODOS OS CENARIOS PASSARAM ✅' : `\n${falhas} ASSERCAO(OES) FALHARAM ❌`);
process.exit(falhas === 0 ? 0 : 1);
