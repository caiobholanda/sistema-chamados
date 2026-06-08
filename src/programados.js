'use strict';

// America/Fortaleza = UTC-3, sem horário de verão (extinto em 2019)
const FORTALEZA_OFFSET_MS = -3 * 60 * 60 * 1000;

// Retorna um Date em que getUTC* reflete o horário local de Fortaleza
function _toFtz(utcDate) {
  return new Date(utcDate.getTime() + FORTALEZA_OFFSET_MS);
}

// Constrói um Date UTC a partir de componentes locais de Fortaleza
// Fortaleza = UTC-3 → UTC = local + 3h
function _fromFtz(year, month0, day, hour, minute) {
  return new Date(Date.UTC(year, month0, day, hour + 3, minute));
}

// ── Páscoa (Meeus/Jones/Butcher) ─────────────────────────────────────────────
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
  return _fromFtz(year, month - 1, day, 0, 0);
}

// ── Feriados (nacional + CE + Fortaleza) ─────────────────────────────────────
const FERIADOS_FIXOS = [[1,1],[21,4],[1,5],[7,9],[12,10],[2,11],[15,11],[25,12]];
const FERIADOS_CE    = [[19,3],[24,6]]; // São José, São João

function isFeriado(utcDate) {
  const ftz = _toFtz(utcDate);
  const d = ftz.getUTCDate(), m = ftz.getUTCMonth() + 1, y = ftz.getUTCFullYear();
  if (FERIADOS_FIXOS.some(([fd,fm]) => fd === d && fm === m)) return true;
  if (FERIADOS_CE.some(([fd,fm])    => fd === d && fm === m)) return true;
  const pascoa = calcularPascoa(y);
  const variaveis = [
    _offsetDia(pascoa, -48), // Carnaval 2ª
    _offsetDia(pascoa, -47), // Carnaval 3ª
    _offsetDia(pascoa,  -2), // Sexta Santa
    _offsetDia(pascoa,  60), // Corpus Christi
  ];
  return variaveis.some(h => {
    const hFtz = _toFtz(h);
    return hFtz.getUTCDate() === d && hFtz.getUTCMonth() + 1 === m;
  });
}

function _offsetDia(utcDate, dias) {
  const d = new Date(utcDate);
  d.setUTCDate(d.getUTCDate() + dias);
  return d;
}

function _proxDiaUtil(utcDate, pularFeriados) {
  const d = new Date(utcDate);
  while (true) {
    const dow = _toFtz(d).getUTCDay();
    if (dow !== 0 && dow !== 6 && (!pularFeriados || !isFeriado(d))) break;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

// ── Cálculo da próxima execução ───────────────────────────────────────────────
// `hora` em `prog` é horário LOCAL de Fortaleza (ex: '12:00').
// `afterExec` (se fornecido) é um Date UTC da última execução.
// Retorna um Date UTC.
function calcularProxima(prog, afterExec = null) {
  const { frequencia, dia_semana, dia_mes, mes, hora, pular_feriados } = prog;
  const [hh, mm] = hora.split(':').map(Number);

  let next;

  if (afterExec) {
    // Pós-execução: avança a partir da data de execução (em espaço Fortaleza)
    const ftz = _toFtz(new Date(afterExec));
    const y = ftz.getUTCFullYear(), mo = ftz.getUTCMonth(), d = ftz.getUTCDate();
    switch (frequencia) {
      case 'diario':     next = _fromFtz(y, mo, d + 1, hh, mm);   break;
      case 'semanal':    next = _fromFtz(y, mo, d + 7, hh, mm);   break;
      case 'mensal':     next = _fromFtz(y, mo + 1, d, hh, mm);   break;
      case 'bimestral':  next = _fromFtz(y, mo + 2, d, hh, mm);   break;
      case 'trimestral': next = _fromFtz(y, mo + 3, d, hh, mm);   break;
      case 'semestral':  next = _fromFtz(y, mo + 6, d, hh, mm);   break;
      case 'anual':      next = _fromFtz(y + 1, mo, d, hh, mm);   break;
      default:           next = _fromFtz(y, mo, d + 1, hh, mm);
    }
  } else {
    // Primeira vez: encontrar próxima ocorrência a partir de agora
    const nowUtc = new Date();
    const ftz = _toFtz(nowUtc);
    const y = ftz.getUTCFullYear(), mo = ftz.getUTCMonth(), d = ftz.getUTCDate();
    const dow = ftz.getUTCDay();

    switch (frequencia) {
      case 'diario': {
        next = _fromFtz(y, mo, d, hh, mm);
        if (next <= nowUtc) next = _fromFtz(y, mo, d + 1, hh, mm);
        break;
      }
      case 'semanal': {
        let diff = (dia_semana - dow + 7) % 7;
        if (diff === 0 && _fromFtz(y, mo, d, hh, mm) <= nowUtc) diff = 7;
        next = _fromFtz(y, mo, d + diff, hh, mm);
        break;
      }
      case 'mensal':
      case 'bimestral':
      case 'trimestral':
      case 'semestral': {
        const add = { mensal: 1, bimestral: 2, trimestral: 3, semestral: 6 }[frequencia];
        next = _fromFtz(y, mo, dia_mes, hh, mm);
        if (next <= nowUtc) next = _fromFtz(y, mo + add, dia_mes, hh, mm);
        break;
      }
      case 'anual': {
        next = _fromFtz(y, mes - 1, dia_mes, hh, mm);
        if (next <= nowUtc) next = _fromFtz(y + 1, mes - 1, dia_mes, hh, mm);
        break;
      }
      default:
        next = _fromFtz(y, mo, d + 1, hh, mm);
    }
  }

  if (pular_feriados) {
    const afterSkip = _proxDiaUtil(next, true);
    // Re-aplica o horário no fuso Fortaleza após o possível avanço de dias
    const ftz = _toFtz(afterSkip);
    next = _fromFtz(ftz.getUTCFullYear(), ftz.getUTCMonth(), ftz.getUTCDate(), hh, mm);
  }

  return next;
}

// Retorna array com as próximas N datas (UTC) de execução
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
