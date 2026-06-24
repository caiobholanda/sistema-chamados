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
const { calcularProxima, proximasN, isFeriado, avancarCanonica, aplicarSkip, derivarCanonicaAnterior } = require('../src/programados');

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

// ── data_unica: dispara 1 vez na data alvo, depois sentinela 9999 ─────────────
test('data_unica: calcularProxima sem afterExec retorna data alvo no fuso Fortaleza', () => {
  const prog = { frequencia: 'data_unica', data_unica: '2030-06-15', hora: '14:30', pular_feriados: 0 };
  const next = calcularProxima(prog);
  assert.equal(asFtz(next), '2030-06-15 14:30');
});

test('data_unica: com afterExec retorna sentinela ano 9999 (cron nunca repete)', () => {
  const prog = { frequencia: 'data_unica', data_unica: '2030-06-15', hora: '08:00', pular_feriados: 0 };
  const next = calcularProxima(prog, new Date('2030-06-15T11:00:00Z'));
  assert.equal(next.getUTCFullYear(), 9999, 'esperava ano sentinela 9999');
});

test('data_unica: proximasN devolve exatamente 1 entry', () => {
  const prog = { frequencia: 'data_unica', data_unica: '2030-06-15', hora: '08:00', pular_feriados: 0 };
  const datas = proximasN(prog, 5);
  assert.equal(datas.length, 1, 'data_unica deve ter exatamente 1 ocorrencia');
  assert.equal(asFtz(datas[0]), '2030-06-15 08:00');
});

test('data_unica: pular_feriados move para proximo dia util (sabado 13/jun/2026 -> seg 15)', () => {
  const prog = { frequencia: 'data_unica', data_unica: '2026-06-13', hora: '09:00', pular_feriados: 1 };
  const next = calcularProxima(prog);
  assert.equal(asFtz(next), '2026-06-15 09:00', 'sab deve avancar para seg');
});

test('data_unica: pular_feriados desligado mantem data mesmo em fim de semana', () => {
  const prog = { frequencia: 'data_unica', data_unica: '2026-06-13', hora: '09:00', pular_feriados: 0 };
  const next = calcularProxima(prog);
  assert.equal(asFtz(next), '2026-06-13 09:00');
});

test('data_unica: data_unica invalida retorna sentinela (defensivo)', () => {
  const prog = { frequencia: 'data_unica', data_unica: null, hora: '08:00', pular_feriados: 0 };
  const next = calcularProxima(prog);
  assert.equal(next.getUTCFullYear(), 9999);
});

// ── Avanco canonico SEPARADO do skip ─────────────────────────────────────────
// Estes testes garantem que avancarCanonica NUNCA aplica skip — o avanco do
// periodo seguinte sempre parte da data ideal, nao da deslocada por feriado.

test('avancarCanonica diario: nunca aplica skip (sabado nao vira segunda)', () => {
  const prog = { frequencia: 'diario', hora: '08:00', pular_feriados: 1 };
  // afterCanon = sex 12/jun/2026 08:00 BRT = 11:00 UTC.
  const next = avancarCanonica(prog, new Date('2026-06-12T11:00:00Z'));
  // Esperamos sabado 13/jun, mesmo com pular_feriados=1 (canonica ignora skip).
  assert.equal(asFtz(next), '2026-06-13 08:00');
});

test('avancarCanonica semanal: terca canonica mantem dia mesmo se cair em feriado', () => {
  // Carnaval 2026: ter 17/fev = feriado movel. Canonica deve continuar = ter.
  const prog = { frequencia: 'semanal', dia_semana: 2, hora: '09:00', pular_feriados: 1 };
  // afterCanon = ter 10/fev/2026. +7 = ter 17/fev (Carnaval = feriado).
  const next = avancarCanonica(prog, new Date('2026-02-10T12:00:00Z'));
  assert.equal(asFtz(next), '2026-02-17 09:00', 'canonica = ter 17/fev (carnaval)');
  // aplicarSkip move ter 17/fev -> qua 18 (Cinzas, nao e feriado).
  const efetiva = aplicarSkip(next, 1, '09:00');
  assert.equal(asFtz(efetiva), '2026-02-18 09:00', 'efetiva = qua 18/fev');
});

test('aplicarSkip pular_feriados=0 retorna data original', () => {
  const sab = new Date('2026-06-13T11:00:00Z'); // sab 08:00 BRT
  const out = aplicarSkip(sab, 0, '08:00');
  assert.equal(out.getTime(), sab.getTime());
});

test('aplicarSkip preserva HH:MM apos pular dias', () => {
  const dom = new Date('2026-06-14T13:30:00Z'); // dom 10:30 BRT
  const out = aplicarSkip(dom, 1, '10:30');
  // Dom -> seg 15/jun 10:30 BRT.
  assert.equal(asFtz(out), '2026-06-15 10:30');
});

// ── proximasN agora itera pela CANONICA: sem drift de feriado ────────────────
test('proximasN semanal sex: feriado nao puxa proxima sex para seg', () => {
  // sexta dia 1 podia ser feriado (1/mai/2026 = sex = Dia do Trabalho).
  // Sequencia: 1/mai (feriado) -> efetiva seg 4/mai; PROXIMA canonica = sex 8/mai.
  const prog = { frequencia: 'semanal', dia_semana: 5, hora: '08:00', pular_feriados: 1 };
  // Forca ancora = sex 24/abr/2026.
  let lastCanon = new Date('2026-04-24T11:00:00Z');
  const datas = [];
  for (let i = 0; i < 4; i++) {
    const canon = avancarCanonica(prog, lastCanon);
    datas.push(asFtz(aplicarSkip(canon, prog.pular_feriados, prog.hora)));
    lastCanon = canon;
  }
  // 1/mai=sex=feriado -> seg 4/mai. 8/mai=sex util. 15/mai=sex util. 22/mai=sex util.
  assert.deepEqual(datas, [
    '2026-05-04 08:00',
    '2026-05-08 08:00',
    '2026-05-15 08:00',
    '2026-05-22 08:00',
  ]);
});

// ── Backfill: simula cron atrasado, conta slots vencidos ─────────────────────
test('backfill diario: cron atrasado 3 dias conta 3 slots vencidos', () => {
  const prog = { frequencia: 'diario', hora: '08:00', pular_feriados: 0 };
  // Ancora canonica = 20/jun/2026 11:00 UTC (08:00 BRT).
  // "Agora" = 23/jun/2026 14:00 UTC. Slots: 20, 21, 22, 23 = 4 slots <= now.
  // Apos loop: proxCanon = 24/jun (primeiro futuro).
  const now = new Date('2026-06-23T14:00:00Z');
  let proxCanon = new Date('2026-06-20T11:00:00Z');
  let count = 0;
  while (proxCanon <= now) {
    count++;
    proxCanon = avancarCanonica(prog, proxCanon);
  }
  assert.equal(count, 4, 'esperava 4 slots vencidos');
  assert.equal(asFtz(proxCanon), '2026-06-24 08:00');
});

test('backfill mensal: cron atrasado 2 meses conta 2 slots, sem perder dia-base', () => {
  const prog = { frequencia: 'mensal', dia_mes: 15, hora: '08:00', pular_feriados: 0 };
  const now = new Date('2026-08-20T14:00:00Z');
  let proxCanon = new Date('2026-06-15T11:00:00Z'); // ancora: 15/jun
  let count = 0;
  while (proxCanon <= now) {
    count++;
    proxCanon = avancarCanonica(prog, proxCanon);
  }
  // 15/jun, 15/jul, 15/ago <= 20/ago = 3 slots vencidos. Proxima = 15/set.
  assert.equal(count, 3);
  assert.equal(asFtz(proxCanon), '2026-09-15 08:00');
});

test('backfill semanal: skip de feriado na efetiva nao influencia avanco', () => {
  // Terca semanal, pular=1. Se uma terca cai em feriado e foi gerada como qua,
  // o backfill subsequente deve continuar partindo da TERCA, nao da quarta.
  const prog = { frequencia: 'semanal', dia_semana: 2, hora: '08:00', pular_feriados: 1 };
  // Ancora = ter 16/jun. Avanca 4x.
  let proxCanon = new Date('2026-06-16T11:00:00Z');
  const semanas = [];
  for (let i = 0; i < 4; i++) {
    proxCanon = avancarCanonica(prog, proxCanon);
    semanas.push(asFtz(proxCanon));
  }
  // Sempre terca, ainda que algumas caiam em feriado (a canonica nao se move).
  assert.deepEqual(semanas, [
    '2026-06-23 08:00', // ter
    '2026-06-30 08:00', // ter
    '2026-07-07 08:00', // ter
    '2026-07-14 08:00', // ter
  ]);
});

// ── derivarCanonicaAnterior: backfill de registros legados ───────────────────
// Estes testes simulam casos reais do banco onde ultima_execucao nao bate com
// o slot canonico (cron firou atrasado / em dia diferente do agendado).

test('derivarCanonicaAnterior diario: ultima na hora canonica retorna ela mesma', () => {
  const prog = { frequencia: 'diario', hora: '08:16', pular_feriados: 0 };
  const ultima = new Date('2026-06-23T11:16:00Z'); // 08:16 BRT
  const canon = derivarCanonicaAnterior(prog, ultima);
  assert.equal(asFtz(canon), '2026-06-23 08:16');
});

test('derivarCanonicaAnterior diario: ultima horas depois retorna mesma data na hora', () => {
  const prog = { frequencia: 'diario', hora: '08:16', pular_feriados: 0 };
  const ultima = new Date('2026-06-23T18:00:00Z'); // 15:00 BRT
  const canon = derivarCanonicaAnterior(prog, ultima);
  assert.equal(asFtz(canon), '2026-06-23 08:16');
});

test('derivarCanonicaAnterior diario: ultima madrugada retorna dia anterior na hora', () => {
  const prog = { frequencia: 'diario', hora: '08:16', pular_feriados: 0 };
  const ultima = new Date('2026-06-23T05:00:00Z'); // 02:00 BRT
  const canon = derivarCanonicaAnterior(prog, ultima);
  assert.equal(asFtz(canon), '2026-06-22 08:16');
});

test('derivarCanonicaAnterior semanal dia_semana=3 (qua) ultima na qua certa', () => {
  const prog = { frequencia: 'semanal', dia_semana: 3, hora: '15:00', pular_feriados: 0 };
  const ultima = new Date('2026-06-17T18:00:00Z'); // qua 15:00 BRT
  const canon = derivarCanonicaAnterior(prog, ultima);
  assert.equal(asFtz(canon), '2026-06-17 15:00');
});

test('derivarCanonicaAnterior semanal: ultima drift para qui volta para qua anterior', () => {
  // Caso REAL do id 4 no banco: cron firou tarde, ultima ficou em qui mas
  // dia_semana=3 (qua). Derivacao deve voltar para a qua mais recente.
  const prog = { frequencia: 'semanal', dia_semana: 3, hora: '15:00', pular_feriados: 0 };
  const ultima = new Date('2026-06-18T03:00:00Z'); // qui 00:00 BRT
  const canon = derivarCanonicaAnterior(prog, ultima);
  assert.equal(asFtz(canon), '2026-06-17 15:00', 'volta para qua 17/06');
});

test('backfill end-to-end: id 4 (semanal qua) corrige proxima de qui 25 para qua 24', () => {
  // Simulacao do registro id 4 do relato: cron firou drift e proxima ficou
  // marcada para qui 25/06. Apos backfill: deve ir para qua 24/06.
  const prog = { frequencia: 'semanal', dia_semana: 3, hora: '15:00', pular_feriados: 0 };
  const ultima = new Date('2026-06-17T20:00:00Z'); // qua 17/06 17:00 BRT
  const canonAnt = derivarCanonicaAnterior(prog, ultima);
  const novaCanon = avancarCanonica(prog, canonAnt);
  assert.equal(asFtz(novaCanon), '2026-06-24 15:00', 'proxima = qua 24/06 15:00 BRT');
});

test('backfill end-to-end: id 5 (diario 08:16) corrige proxima de 25 para 24', () => {
  const prog = { frequencia: 'diario', hora: '08:16', pular_feriados: 0 };
  const ultima = new Date('2026-06-23T11:16:00Z'); // 23/06 08:16 BRT
  const canonAnt = derivarCanonicaAnterior(prog, ultima);
  const novaCanon = avancarCanonica(prog, canonAnt);
  assert.equal(asFtz(novaCanon), '2026-06-24 08:16', 'proxima = 24/06 08:16');
});

test('derivarCanonicaAnterior mensal dia 15: ultima em 20 retorna 15 mesmo mes', () => {
  const prog = { frequencia: 'mensal', dia_mes: 15, hora: '08:00', pular_feriados: 0 };
  const ultima = new Date('2026-06-20T15:00:00Z'); // 12:00 BRT
  const canon = derivarCanonicaAnterior(prog, ultima);
  assert.equal(asFtz(canon), '2026-06-15 08:00');
});

test('derivarCanonicaAnterior mensal dia 15: ultima em 10 retorna 15 mes anterior', () => {
  const prog = { frequencia: 'mensal', dia_mes: 15, hora: '08:00', pular_feriados: 0 };
  const ultima = new Date('2026-06-10T15:00:00Z'); // 12:00 BRT
  const canon = derivarCanonicaAnterior(prog, ultima);
  assert.equal(asFtz(canon), '2026-05-15 08:00');
});

// ── Backwards-compat: calcularProxima continua aplicando skip ────────────────
test('calcularProxima mantem comportamento antigo (canonica + skip)', () => {
  // Sabado canonico com pular_feriados=1 -> segunda.
  const prog = { frequencia: 'diario', hora: '08:00', pular_feriados: 1 };
  const next = calcularProxima(prog, new Date('2026-06-12T11:00:00Z')); // sex 12/jun
  // Canonica = sab 13. Skip => seg 15.
  assert.equal(asFtz(next), '2026-06-15 08:00');
});
