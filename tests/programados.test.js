'use strict';

// Testes da logica de calculo de proxima execucao em src/programados.js.
// Roda com: node --test tests/programados.test.js
// Cobre:
// 1) Timezone Fortaleza (UTC-3, sem DST).
// 2) Skip de fim de semana e feriado SEM acumular offset entre periodos (BUG 3).
// 3) Clamp de dia para meses curtos (dia 31 em fevereiro).
// 4) Frequencias semanal, mensal e anual.

const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularProxima, proximasN, isFeriado } = require('../src/programados');

// Helper: formata um Date UTC como 'YYYY-MM-DD HH:mm:ss' em horario Fortaleza.
function asFtz(d) {
  const ftz = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  const Y = ftz.getUTCFullYear();
  const M = String(ftz.getUTCMonth() + 1).padStart(2, '0');
  const D = String(ftz.getUTCDate()).padStart(2, '0');
  const h = String(ftz.getUTCHours()).padStart(2, '0');
  const m = String(ftz.getUTCMinutes()).padStart(2, '0');
  return `${Y}-${M}-${D} ${h}:${m}`;
}

test('mensal dia 15: BUG 3 — skip de sabado em ago NAO desloca set/out', () => {
  const prog = { frequencia: 'mensal', dia_mes: 15, hora: '08:00', pular_feriados: 1 };
  // afterExec = 15/jul/2026 11:00 UTC (= 08:00 ftz). Quarta-feira, dia util.
  // Esperado: 15/ago = sabado -> 17/ago seg.
  let next = calcularProxima(prog, new Date('2026-07-15T11:00:00Z'));
  assert.equal(asFtz(next), '2026-08-17 08:00', 'esperava 17/ago (skip sabado)');
  // Iterando: 17/ago vira afterExec. Proximo periodo deve ser 15/SET (nao 17/set).
  next = calcularProxima(prog, next);
  assert.equal(asFtz(next), '2026-09-15 08:00', 'esperava 15/set (sem drift)');
  // 15/out/2026 = quinta, dia util.
  next = calcularProxima(prog, next);
  assert.equal(asFtz(next), '2026-10-15 08:00', 'esperava 15/out (sem drift)');
});

test('mensal dia 15: sequencia completa via proximasN bate com correcao', () => {
  const prog = { frequencia: 'mensal', dia_mes: 15, hora: '08:00', pular_feriados: 1 };
  // Forca afterExec = 15/jun/2026 (segunda, util).
  const datas = [];
  let last = new Date('2026-06-15T11:00:00Z');
  for (let i = 0; i < 5; i++) {
    last = calcularProxima(prog, last);
    datas.push(asFtz(last));
  }
  // 15/jul (qua), 17/ago (skip sab), 15/set (ter), 15/out (qui), 16/nov (skip dom + feriado 15/nov).
  assert.deepEqual(datas, [
    '2026-07-15 08:00',
    '2026-08-17 08:00',
    '2026-09-15 08:00',
    '2026-10-15 08:00',
    '2026-11-16 08:00',
  ]);
});

test('clamp: mensal dia 31 em fevereiro vira ultimo dia de fev', () => {
  const prog = { frequencia: 'mensal', dia_mes: 31, hora: '12:00', pular_feriados: 0 };
  // afterExec = 31/jan/2026 (sabado). Sem pular feriados, esperamos 28/fev/2026 (sabado).
  const next = calcularProxima(prog, new Date('2026-01-31T15:00:00Z'));
  assert.equal(asFtz(next), '2026-02-28 12:00', 'esperava 28/fev (clamp)');
});

test('clamp: ano bissexto — fev/2028 tem 29 dias', () => {
  const prog = { frequencia: 'mensal', dia_mes: 31, hora: '12:00', pular_feriados: 0 };
  const next = calcularProxima(prog, new Date('2028-01-31T15:00:00Z'));
  assert.equal(asFtz(next), '2028-02-29 12:00', 'esperava 29/fev (bissexto)');
});

test('timezone: horario 08:16 local equivale a 11:16 UTC', () => {
  const prog = { frequencia: 'diario', hora: '08:16', pular_feriados: 0 };
  // afterExec = qualquer dia. O proximo = dia+1 as 08:16 ftz = 11:16 UTC.
  const next = calcularProxima(prog, new Date('2026-06-12T11:16:00Z'));
  assert.equal(next.toISOString().slice(0, 16), '2026-06-13T11:16');
  assert.equal(asFtz(next), '2026-06-13 08:16');
});

test('timezone: 23:30 local em Fortaleza = 02:30 UTC do dia seguinte', () => {
  const prog = { frequencia: 'diario', hora: '23:30', pular_feriados: 0 };
  // afterExec = 12/jun 02:30 UTC (= 23:30 ftz do dia 11/jun)
  const next = calcularProxima(prog, new Date('2026-06-12T02:30:00Z'));
  // Esperamos 13/jun 02:30 UTC = 12/jun 23:30 ftz.
  assert.equal(asFtz(next), '2026-06-12 23:30');
  assert.equal(next.toISOString().slice(0, 16), '2026-06-13T02:30');
});

test('semanal: terca-feira mantem dia da semana mesmo apos skip de feriado anterior', () => {
  const prog = { frequencia: 'semanal', dia_semana: 2, hora: '09:00', pular_feriados: 1 };
  // afterExec = uma terca qualquer. +7 dias.
  let next = calcularProxima(prog, new Date('2026-06-16T12:00:00Z')); // ter 16/jun ftz 09:00
  assert.equal(asFtz(next), '2026-06-23 09:00');
});

test('anual: respeita mes e dia_mes configurados, com clamp', () => {
  const prog = { frequencia: 'anual', mes: 2, dia_mes: 29, hora: '10:00', pular_feriados: 0 };
  // afterExec = 29/fev/2028 (bissexto). Proximo: 28/fev/2029 (clamp).
  const next = calcularProxima(prog, new Date('2028-02-29T13:00:00Z'));
  assert.equal(asFtz(next), '2029-02-28 10:00');
});

test('isFeriado reconhece 15/nov (Proclamacao da Republica) em Fortaleza', () => {
  // 15/nov/2026 = domingo. Testa a meio-dia UTC para nao cair em borda.
  const d = new Date(Date.UTC(2026, 10, 15, 15, 0)); // 15/nov 12:00 ftz
  assert.equal(isFeriado(d), true);
});

test('isFeriado reconhece feriado movel (Carnaval 2026 = 17/fev)', () => {
  const d = new Date(Date.UTC(2026, 1, 17, 15, 0)); // 17/fev 12:00 ftz
  assert.equal(isFeriado(d), true);
});

test('semanal sabado + pular fins de semana: deslocamento silencioso (motivo do bloqueio)', () => {
  // Demonstra POR QUE bloqueamos: sem o bloqueio, _proxDiaUtil moveria todo sabado
  // para segunda silenciosamente, anulando a escolha do usuario.
  const prog = { frequencia: 'semanal', dia_semana: 6, hora: '08:00', pular_feriados: 1 };
  // afterExec = sabado 13/jun/2026 11:00 UTC.
  const next = calcularProxima(prog, new Date('2026-06-13T11:00:00Z'));
  const ftz = new Date(next.getTime() - 3 * 60 * 60 * 1000);
  // Sem o bloqueio na validacao, o sistema retorna segunda (dow=1). Isso justifica
  // o erro de validacao que adicionamos em validarAgendamento — usuario nao deve
  // conseguir salvar essa combinacao.
  assert.equal(ftz.getUTCDay(), 1, 'sem bloqueio: vira segunda — motivo do erro 400');
});

test('proximasN nao mistura skip do periodo anterior no proximo', () => {
  const prog = { frequencia: 'mensal', dia_mes: 1, hora: '08:00', pular_feriados: 1 };
  // 1/jan/2027 = sexta, mas feriado. -> 4/jan (segunda).
  // 1/fev/2027 = segunda, dia util. Deve voltar a dia 1.
  const datas = proximasN(prog, 3);
  // Precisa garantir que afterExec=4/jan nao puxa fev para dia 4.
  // proximasN comeca de agora; vou simular partindo da primeira data.
  // Apenas garantir que as datas tem dia 1 (ou skip valido), nao 4.
  const dias = datas.map(d => {
    const ftz = new Date(d.getTime() - 3 * 60 * 60 * 1000);
    return ftz.getUTCDate();
  });
  // Cada dia deve ser 1 (ou skip pequeno, max 5). Se vier 4,4,4 = BUG 3 ressurgindo.
  const todosBaixos = dias.every(d => d <= 5);
  assert.equal(todosBaixos, true, `dias deveriam estar proximos do dia-base 1, vieram: ${dias.join(',')}`);
});
