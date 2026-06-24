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

// Garante que dia_mes esteja dentro do ultimo dia do mes referenciado
// (ex: dia 31 em fevereiro vira o ultimo dia de fev).
function _clampDia(year, month0, diaAlvo) {
  const ultimo = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  return Math.min(diaAlvo, ultimo);
}

// Data sentinela para frequencia 'data_unica' apos ja ter sido executada
// (ano 9999). O cron compara proxima_execucao <= now; nunca vai pegar isso.
const SENTINELA_DATA_UNICA_PASSADA = new Date(Date.UTC(9999, 11, 31, 0, 0));

// ── Avanco CANONICO (sem skip de feriado) ────────────────────────────────────
// Retorna a proxima ocorrencia "ideal" do periodo, ignorando a regra de pular
// feriado/fim-de-semana. Esta data e' a ANCORA persistida em proxima_canonica
// para evitar drift cumulativo: o periodo seguinte sempre parte daqui, nunca
// da data efetivamente gerada (que pode ter sido empurrada por feriado).
//
// `ancoraCanonica` (UTC Date) = ocorrencia canonica anterior. Se null/undefined,
// calcula a PRIMEIRA ocorrencia a partir de agora.
function avancarCanonica(prog, ancoraCanonica = null) {
  const { frequencia, dia_semana, dia_mes, mes, hora, data_unica } = prog;
  const [hh, mm] = hora.split(':').map(Number);

  // data_unica: dispara uma vez. Se ja foi disparada, sentinela.
  if (frequencia === 'data_unica') {
    if (ancoraCanonica) return SENTINELA_DATA_UNICA_PASSADA;
    if (!data_unica || !/^\d{4}-\d{2}-\d{2}$/.test(data_unica)) {
      return SENTINELA_DATA_UNICA_PASSADA;
    }
    const [yy, mo, dd] = data_unica.split('-').map(Number);
    return _fromFtz(yy, mo - 1, dd, hh, mm);
  }

  if (ancoraCanonica) {
    const ftz = _toFtz(new Date(ancoraCanonica));
    const y = ftz.getUTCFullYear(), mo = ftz.getUTCMonth(), d = ftz.getUTCDate();
    switch (frequencia) {
      case 'diario':     return _fromFtz(y, mo, d + 1, hh, mm);
      case 'semanal':    return _fromFtz(y, mo, d + 7, hh, mm);
      case 'mensal':     return _fromFtz(y, mo + 1, _clampDia(y, mo + 1, dia_mes), hh, mm);
      case 'bimestral':  return _fromFtz(y, mo + 2, _clampDia(y, mo + 2, dia_mes), hh, mm);
      case 'trimestral': return _fromFtz(y, mo + 3, _clampDia(y, mo + 3, dia_mes), hh, mm);
      case 'semestral':  return _fromFtz(y, mo + 6, _clampDia(y, mo + 6, dia_mes), hh, mm);
      case 'anual':      return _fromFtz(y + 1, mes - 1, _clampDia(y + 1, mes - 1, dia_mes), hh, mm);
      default:           return _fromFtz(y, mo, d + 1, hh, mm);
    }
  }

  // Primeira vez: procura proxima ocorrencia a partir de agora.
  const nowUtc = new Date();
  const ftz = _toFtz(nowUtc);
  const y = ftz.getUTCFullYear(), mo = ftz.getUTCMonth(), d = ftz.getUTCDate();
  const dow = ftz.getUTCDay();

  switch (frequencia) {
    case 'diario': {
      let next = _fromFtz(y, mo, d, hh, mm);
      if (next <= nowUtc) next = _fromFtz(y, mo, d + 1, hh, mm);
      return next;
    }
    case 'semanal': {
      let diff = (dia_semana - dow + 7) % 7;
      if (diff === 0 && _fromFtz(y, mo, d, hh, mm) <= nowUtc) diff = 7;
      return _fromFtz(y, mo, d + diff, hh, mm);
    }
    case 'mensal':
    case 'bimestral':
    case 'trimestral':
    case 'semestral': {
      const add = { mensal: 1, bimestral: 2, trimestral: 3, semestral: 6 }[frequencia];
      let next = _fromFtz(y, mo, _clampDia(y, mo, dia_mes), hh, mm);
      if (next <= nowUtc) next = _fromFtz(y, mo + add, _clampDia(y, mo + add, dia_mes), hh, mm);
      return next;
    }
    case 'anual': {
      let next = _fromFtz(y, mes - 1, _clampDia(y, mes - 1, dia_mes), hh, mm);
      if (next <= nowUtc) next = _fromFtz(y + 1, mes - 1, _clampDia(y + 1, mes - 1, dia_mes), hh, mm);
      return next;
    }
    default:
      return _fromFtz(y, mo, d + 1, hh, mm);
  }
}

// ── Aplicacao do skip de feriado/fim-de-semana ───────────────────────────────
// Aplica a regra "pular feriados e fins de semana" sobre uma data canonica,
// preservando o horario HH:MM original. Se a regra estiver off (pular=0),
// retorna a propria data.
function aplicarSkip(dataCanonica, pular_feriados, hora) {
  if (!pular_feriados) return dataCanonica;
  // Sentinela 9999 nao precisa de skip.
  if (dataCanonica.getUTCFullYear() === 9999) return dataCanonica;
  const [hh, mm] = String(hora || '08:00').split(':').map(Number);
  const afterSkip = _proxDiaUtil(dataCanonica, true);
  const ftz = _toFtz(afterSkip);
  return _fromFtz(ftz.getUTCFullYear(), ftz.getUTCMonth(), ftz.getUTCDate(), hh, mm);
}

// ── API publica back-compat ──────────────────────────────────────────────────
// Mantem assinatura antiga: calcula canonica + aplica skip.
function calcularProxima(prog, afterExec = null) {
  const canon = avancarCanonica(prog, afterExec);
  return aplicarSkip(canon, prog.pular_feriados, prog.hora);
}

// Retorna array com as proximas N datas (UTC) de execucao EFETIVA.
// Itera pela CANONICA (nao pela efetiva) para nao acumular drift de feriado.
function proximasN(prog, n = 5) {
  if (prog.frequencia === 'data_unica') {
    return [calcularProxima(prog)];
  }
  const datas = [];
  let lastCanon = null;
  for (let i = 0; i < n; i++) {
    const canon = avancarCanonica(prog, lastCanon);
    datas.push(aplicarSkip(canon, prog.pular_feriados, prog.hora));
    lastCanon = canon;
  }
  return datas;
}

module.exports = {
  calcularProxima, proximasN, isFeriado,
  avancarCanonica, aplicarSkip,
  SENTINELA_DATA_UNICA_PASSADA,
};
