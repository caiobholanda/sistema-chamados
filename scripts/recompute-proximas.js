#!/usr/bin/env node
/**
 * Backfill de chamados_programados.proxima_canonica / proxima_execucao
 * para registros LEGADOS que foram gravados com a logica antiga do cron
 * (que usava `new Date()` como ancora -> pulava 1 slot).
 *
 * Estrategia: para cada agendamento ativo recorrente com ultima_execucao
 * definida, deriva a canonica anterior alinhada ao schedule (dia_semana /
 * dia_mes / hora) e avanca um periodo para obter a nova proxima.
 *
 * Uso:
 *   node scripts/recompute-proximas.js              # dry-run (default)
 *   node scripts/recompute-proximas.js --apply      # aplica
 */

'use strict';

const db = require('../src/db');
const { avancarCanonica, aplicarSkip, derivarCanonicaAnterior } = require('../src/programados');

const APPLY = process.argv.includes('--apply');

function toISO(d) { return d.toISOString().replace('T', ' ').slice(0, 19); }

db.initDb();
const D = db.getDb();

console.log('═══ Backfill chamados_programados.proxima_canonica/proxima_execucao ═══');
console.log('Modo:', APPLY ? 'APLICANDO' : 'DRY-RUN (passe --apply para aplicar)');
console.log('');

const linhas = D.prepare(`
  SELECT * FROM chamados_programados
  WHERE ativo = 1 AND ultima_execucao IS NOT NULL AND frequencia != 'data_unica'
`).all();

console.log(`Total elegivel: ${linhas.length} (ativo + tem ultima_execucao + recorrente)`);
console.log('');

const alteracoes = [];
for (const prog of linhas) {
  try {
    const ultimaUtc = new Date(prog.ultima_execucao.replace(' ', 'T') + 'Z');
    const canonicaAnt = derivarCanonicaAnterior(prog, ultimaUtc);
    if (!canonicaAnt) {
      alteracoes.push({ id: prog.id, titulo: prog.titulo, erro: 'canonica anterior nao derivavel' });
      continue;
    }
    const novaCanon = avancarCanonica(prog, canonicaAnt);
    const novaEfetiva = aplicarSkip(novaCanon, prog.pular_feriados, prog.hora);
    const novaCanonISO = toISO(novaCanon);
    const novaEfetISO = toISO(novaEfetiva);
    const canonAtualEfetiva = prog.proxima_canonica || prog.proxima_execucao;
    if (novaEfetISO !== prog.proxima_execucao || novaCanonISO !== canonAtualEfetiva) {
      alteracoes.push({
        id: prog.id, titulo: prog.titulo, frequencia: prog.frequencia,
        dia_semana: prog.dia_semana, dia_mes: prog.dia_mes, hora: prog.hora,
        ultima_execucao: prog.ultima_execucao,
        canonica_derivada: toISO(canonicaAnt),
        proxima_execucao_antes: prog.proxima_execucao,
        proxima_execucao_depois: novaEfetISO,
        proxima_canonica_antes: prog.proxima_canonica,
        proxima_canonica_depois: novaCanonISO,
      });
    }
  } catch (e) {
    alteracoes.push({ id: prog.id, titulo: prog.titulo, erro: e.message });
  }
}

const validos = alteracoes.filter(a => !a.erro);
const erros = alteracoes.filter(a => a.erro);

console.log(`Alteracoes propostas: ${validos.length}`);
console.log(`Erros: ${erros.length}`);
console.log('');

if (validos.length) {
  console.log('--- DIFF ---');
  for (const a of validos) {
    console.log(`#${a.id} [${a.frequencia}] "${a.titulo}"`);
    console.log(`  schedule: ${a.frequencia === 'semanal' ? `dia_semana=${a.dia_semana} ` : ''}${a.dia_mes ? `dia_mes=${a.dia_mes} ` : ''}hora=${a.hora}`);
    console.log(`  ultima_execucao:  ${a.ultima_execucao} UTC`);
    console.log(`  canonica derivada: ${a.canonica_derivada} UTC`);
    console.log(`  proxima_canonica:  ${a.proxima_canonica_antes ?? '(null)'} -> ${a.proxima_canonica_depois}`);
    console.log(`  proxima_execucao:  ${a.proxima_execucao_antes} -> ${a.proxima_execucao_depois}`);
    console.log('');
  }
}

if (erros.length) {
  console.log('--- ERROS ---');
  for (const e of erros) console.log(`#${e.id} "${e.titulo}": ${e.erro}`);
  console.log('');
}

if (APPLY && validos.length) {
  const stmt = D.prepare('UPDATE chamados_programados SET proxima_canonica = ?, proxima_execucao = ? WHERE id = ?');
  const tx = D.transaction(() => {
    for (const a of validos) stmt.run(a.proxima_canonica_depois, a.proxima_execucao_depois, a.id);
  });
  tx.immediate();
  console.log(`✓ APLICADO: ${validos.length} agendamento(s) atualizado(s).`);
} else if (!APPLY) {
  console.log('Dry-run apenas. Re-execute com --apply para aplicar.');
}
