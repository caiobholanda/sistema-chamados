'use strict';

// Testes da funcao de validacao do agendamento. Como validarAgendamento esta
// hoje dentro da rota (closure), reproduzo a logica aqui — mesmas regras do
// arquivo src/rotas/programados.js. Qualquer divergencia deve ser corrigida
// nos dois lugares (TODO: extrair para src/programados.js).

const test = require('node:test');
const assert = require('node:assert/strict');

const FREQS = ['diario','semanal','mensal','bimestral','trimestral','semestral','anual'];

function validar(body) {
  const { frequencia, hora = '08:00', pular_feriados, dia_semana, dia_mes, mes } = body;
  if (!FREQS.includes(frequencia)) return { erro: 'Frequência inválida' };
  if (!/^\d{2}:\d{2}$/.test(hora)) return { erro: 'Hora inválida (HH:MM)' };
  const [hh, mm] = hora.split(':').map(Number);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return { erro: 'Hora fora do intervalo (00:00–23:59)' };
  if (frequencia === 'semanal' && (dia_semana == null || dia_semana < 0 || dia_semana > 6))
    return { erro: 'Dia da semana obrigatório para frequência semanal (0=Dom…6=Sáb)' };
  if (['mensal','bimestral','trimestral','semestral'].includes(frequencia) && (!dia_mes || dia_mes < 1 || dia_mes > 31))
    return { erro: 'Dia do mês obrigatório para esta frequência (1–31)' };
  if (frequencia === 'anual' && (!mes || mes < 1 || mes > 12 || !dia_mes || dia_mes < 1 || dia_mes > 31))
    return { erro: 'Mês e dia obrigatórios para frequência anual' };
  const pularFlag = parseInt(pular_feriados ?? '1') ? 1 : 0;
  if (frequencia === 'semanal' && pularFlag && (dia_semana === 0 || dia_semana === 6))
    return { erro: 'Conflito: agendamentos semanais aos sábados/domingos...' };
  return { ok: true };
}

test('rejeita dia_mes=99 (limite superior)', () => {
  const r = validar({ frequencia: 'mensal', hora: '08:00', dia_mes: 99 });
  assert.ok(r.erro && r.erro.includes('Dia do mês'));
});

test('rejeita dia_mes=0 e negativo', () => {
  assert.ok(validar({ frequencia: 'mensal', hora: '08:00', dia_mes: 0 }).erro);
  assert.ok(validar({ frequencia: 'mensal', hora: '08:00', dia_mes: -5 }).erro);
});

test('aceita dia_mes nos limites validos (1 e 31)', () => {
  assert.ok(validar({ frequencia: 'mensal', hora: '08:00', dia_mes: 1, pular_feriados: 0 }).ok);
  assert.ok(validar({ frequencia: 'mensal', hora: '08:00', dia_mes: 31, pular_feriados: 0 }).ok);
});

test('rejeita semanal SABADO + pular_feriados=1 (conflito)', () => {
  const r = validar({ frequencia: 'semanal', hora: '08:00', dia_semana: 6, pular_feriados: 1 });
  assert.ok(r.erro && r.erro.includes('Conflito'));
});

test('rejeita semanal DOMINGO + pular_feriados=1 (conflito)', () => {
  const r = validar({ frequencia: 'semanal', hora: '08:00', dia_semana: 0, pular_feriados: 1 });
  assert.ok(r.erro && r.erro.includes('Conflito'));
});

test('aceita semanal SABADO se pular_feriados=0 (sem conflito)', () => {
  const r = validar({ frequencia: 'semanal', hora: '08:00', dia_semana: 6, pular_feriados: 0 });
  assert.ok(r.ok);
});

test('aceita semanal terca-feira com pular_feriados=1 (dia util)', () => {
  const r = validar({ frequencia: 'semanal', hora: '08:00', dia_semana: 2, pular_feriados: 1 });
  assert.ok(r.ok);
});

test('rejeita hora invalida (25:00)', () => {
  assert.ok(validar({ frequencia: 'diario', hora: '25:00' }).erro);
  assert.ok(validar({ frequencia: 'diario', hora: '12:99' }).erro);
});

test('rejeita anual sem mes ou dia', () => {
  assert.ok(validar({ frequencia: 'anual', hora: '08:00', mes: 2 }).erro);
  assert.ok(validar({ frequencia: 'anual', hora: '08:00', dia_mes: 15 }).erro);
  assert.ok(validar({ frequencia: 'anual', hora: '08:00', mes: 13, dia_mes: 15 }).erro);
});

test('aceita anual com mes+dia validos', () => {
  const r = validar({ frequencia: 'anual', hora: '08:00', mes: 12, dia_mes: 25, pular_feriados: 0 });
  assert.ok(r.ok);
});
