'use strict';

// ── Cálculo de Páscoa (Meeus/Jones/Butcher) ──────────────────────────────────
function calcularPascoa(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// ── Feriados (nacional + CE + Fortaleza) ─────────────────────────────────────
const FERIADOS_FIXOS = [[1,1],[21,4],[1,5],[7,9],[12,10],[2,11],[15,11],[25,12]];
const FERIADOS_CE    = [[19,3],[24,6]]; // São José, São João

function isFeriado(date) {
  const d = date.getDate(), m = date.getMonth() + 1, y = date.getFullYear();
  if (FERIADOS_FIXOS.some(([fd,fm]) => fd===d && fm===m)) return true;
  if (FERIADOS_CE.some(([fd,fm])    => fd===d && fm===m)) return true;

  const pascoa   = calcularPascoa(y);
  const variaveis = [
    offset(pascoa, -48), // Carnaval 2ª
    offset(pascoa, -47), // Carnaval 3ª
    offset(pascoa,  -2), // Sexta-feira Santa
    offset(pascoa,  60), // Corpus Christi
  ];
  return variaveis.some(h => h.getDate()===d && h.getMonth()+1===m);
}

function offset(base, dias) {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

function proxDiaUtil(date, pularFeriados) {
  const d = new Date(date);
  while (d.getDay()===0 || d.getDay()===6 || (pularFeriados && isFeriado(d))) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

// ── Cálculo da próxima execução ───────────────────────────────────────────────
// Se `afterExec` for fornecido, avança a partir dessa data (pós-execução).
// Caso contrário, calcula a partir de agora (primeira vez).
function calcularProxima(prog, afterExec = null) {
  const { frequencia, dia_semana, dia_mes, mes, hora, pular_feriados } = prog;
  const [hh, mm] = hora.split(':').map(Number);

  let next;

  if (afterExec) {
    // Pós-execução: simplesmente adiciona o intervalo
    next = new Date(afterExec);
    switch (frequencia) {
      case 'diario':     next.setDate(next.getDate() + 1);          break;
      case 'semanal':    next.setDate(next.getDate() + 7);          break;
      case 'mensal':     next.setMonth(next.getMonth() + 1);        break;
      case 'bimestral':  next.setMonth(next.getMonth() + 2);        break;
      case 'trimestral': next.setMonth(next.getMonth() + 3);        break;
      case 'semestral':  next.setMonth(next.getMonth() + 6);        break;
      case 'anual':      next.setFullYear(next.getFullYear() + 1);  break;
    }
    next.setHours(hh, mm, 0, 0);
  } else {
    // Primeira vez: achar a próxima ocorrência a partir de agora
    const now = new Date();
    switch (frequencia) {
      case 'diario': {
        next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
        if (next <= now) next.setDate(next.getDate() + 1);
        break;
      }
      case 'semanal': {
        next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
        let diff = (dia_semana - now.getDay() + 7) % 7;
        if (diff === 0 && next <= now) diff = 7;
        next.setDate(next.getDate() + diff);
        break;
      }
      case 'mensal':
      case 'bimestral':
      case 'trimestral':
      case 'semestral': {
        const add = { mensal:1, bimestral:2, trimestral:3, semestral:6 }[frequencia];
        next = new Date(now.getFullYear(), now.getMonth(), dia_mes, hh, mm, 0, 0);
        if (next <= now) next = new Date(now.getFullYear(), now.getMonth() + add, dia_mes, hh, mm, 0, 0);
        break;
      }
      case 'anual': {
        next = new Date(now.getFullYear(), mes - 1, dia_mes, hh, mm, 0, 0);
        if (next <= now) next = new Date(now.getFullYear() + 1, mes - 1, dia_mes, hh, mm, 0, 0);
        break;
      }
    }
  }

  // Ajusta para dia útil se necessário
  if (pular_feriados) {
    next = proxDiaUtil(next, true);
    next.setHours(hh, mm, 0, 0);
  }

  return next;
}

// Retorna array com as próximas N datas de execução (para preview no frontend)
function proximasN(prog, n = 5) {
  const datas = [];
  let last = null;
  for (let i = 0; i < n; i++) {
    const d = calcularProxima(prog, last);
    datas.push(d);
    last = d;
  }
  return datas;
}

module.exports = { calcularProxima, proximasN, isFeriado };
