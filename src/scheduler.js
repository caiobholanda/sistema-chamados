'use strict';

const { getProgramadosPendentes, registrarExecucaoProgramado, inserirChamado, buscarUsuarioPorId, inserirAnexoExtra, toggleChamadoProgramado } = require('./db');
const push = require('./push');
const { avancarCanonica, aplicarSkip, SENTINELA_DATA_UNICA_PASSADA } = require('./programados');

function _toISO(d) { return d.toISOString().replace('T', ' ').slice(0, 19); }

// Converte string 'YYYY-MM-DD HH:MM:SS' (UTC) salva no DB para Date UTC.
function _parseDbDate(s) {
  if (!s) return null;
  return new Date(s.replace(' ', 'T') + 'Z');
}

// Lock de processo: setInterval(cron, 60s) pode disparar antes do tick anterior
// terminar (push lento, banco lento, anexos grandes). Sem este flag, dois ticks
// concorrentes leem getProgramadosPendentes() antes do primeiro registrar a
// execucao -> chamado duplicado.
let _running = false;

async function executarChamadosProgramados() {
  if (_running) {
    console.log(`[Programados] ${new Date().toISOString()} — pulando tick: execucao anterior ainda em andamento`);
    return [];
  }
  _running = true;
  const now = new Date();
  const ts = now.toISOString();
  const resultados = [];
  try {
    const pendentes = getProgramadosPendentes();
    console.log(`[Programados] ${ts} — varredura: ${pendentes.length} pendente(s) (proxima_execucao <= now)`);
    for (const prog of pendentes) {
      try {
        // Ancora canonica: prefere coluna nova, fallback para proxima_execucao
        // (registros legados pre-migracao).
        const ancoraInicial = _parseDbDate(prog.proxima_canonica) || _parseDbDate(prog.proxima_execucao);

        let nome  = prog.nome;
        let setor = prog.setor;
        let ramal = prog.ramal || '';
        if (prog.usuario_id) {
          const u = buscarUsuarioPorId(prog.usuario_id);
          if (u && u.ativo) {
            nome = u.nome;
            setor = u.setor || prog.setor;
            if (!ramal && u.ramal) ramal = u.ramal;
          }
        }

        // data_unica: dispara 1 vez e desativa. Sem backfill (nao aplicavel).
        if (prog.frequencia === 'data_unica') {
          const chamadoId = _inserirChamadoComAnexos(prog, nome, setor, ramal, '[Automático]');
          const sentISO = _toISO(SENTINELA_DATA_UNICA_PASSADA);
          registrarExecucaoProgramado(prog.id, chamadoId, sentISO, sentISO);
          toggleChamadoProgramado(prog.id, 0);
          const msg = `Chamado #${chamadoId} criado automaticamente: "${prog.titulo}" (${setor})`;
          console.log(`[Programados] #${prog.id} ${msg} → CONCLUIDO (data_unica desativada)`);
          push.enviarParaTodos('📅 Chamado Programado', msg).catch(e => console.warn(`[Programados] push falhou: ${e.message}`));
          resultados.push({ ok: true, progId: prog.id, titulo: prog.titulo, chamadoId, slotsVencidos: 1, concluido: true });
          continue;
        }

        // Recorrente: conta slots vencidos avancando canonica ate > now.
        // Politica "1 catch-up + avancar p/ futuro": gera UM chamado mesmo que
        // haja N slots perdidos; descricao indica quantos slots foram pulados.
        let slotsVencidos = 0;
        let proxCanon = ancoraInicial;
        while (proxCanon && proxCanon <= now) {
          slotsVencidos++;
          proxCanon = avancarCanonica(prog, proxCanon);
          // Defesa contra loop infinito (nao deve acontecer com frequencias validas):
          if (slotsVencidos > 10000) {
            throw new Error(`Loop de backfill divergiu (>${slotsVencidos} iteracoes)`);
          }
        }

        const isCatchUp = slotsVencidos > 1;
        const prefixo = isCatchUp
          ? `[Automático CATCH-UP ${slotsVencidos}× pendentes desde ${_toISO(ancoraInicial)} UTC]`
          : '[Automático]';

        const chamadoId = _inserirChamadoComAnexos(prog, nome, setor, ramal, prefixo);
        const efetivaNext = aplicarSkip(proxCanon, prog.pular_feriados, prog.hora);
        registrarExecucaoProgramado(prog.id, chamadoId, _toISO(efetivaNext), _toISO(proxCanon));

        const msg = `Chamado #${chamadoId} criado automaticamente: "${prog.titulo}" (${setor})`;
        console.log(`[Programados] #${prog.id} ${msg} → slots vencidos=${slotsVencidos} (catchup=${isCatchUp}); proxima canonica=${_toISO(proxCanon)} efetiva=${_toISO(efetivaNext)}`);
        push.enviarParaTodos('📅 Chamado Programado', msg).catch(e => console.warn(`[Programados] push falhou: ${e.message}`));
        resultados.push({
          ok: true,
          progId: prog.id,
          titulo: prog.titulo,
          chamadoId,
          slotsVencidos,
          catchUp: isCatchUp,
          proximaCanonica: _toISO(proxCanon),
          proximaEfetiva: _toISO(efetivaNext),
        });
      } catch (err) {
        console.error(`[Programados] ERRO no agendamento #${prog.id} "${prog.titulo}":`, err.message);
        resultados.push({ ok: false, progId: prog.id, titulo: prog.titulo, erro: err.message });
      }
    }
    console.log(`[Programados] ${ts} — fim: gerados=${resultados.filter(r => r.ok).length} erros=${resultados.filter(r => !r.ok).length}`);
  } catch (err) {
    console.error('[Programados] ERRO geral na varredura:', err);
  } finally {
    _running = false;
  }
  return resultados;
}

// Cria o chamado e, se houver anexos no agendamento, replica-os.
function _inserirChamadoComAnexos(prog, nome, setor, ramal, prefixo) {
  const chamadoId = inserirChamado({
    usuario_id: prog.usuario_id || null,
    nome,
    setor,
    ramal,
    descricao: `${prefixo} ${prog.descricao}`,
    categoria: prog.categoria || null,
    aberto_por_admin_id: null,
    admin_responsavel_id: prog.admin_responsavel_id || null,
    anexo_path: null,
    anexo_nome_original: null,
    servico_id: null,
    servico_nome: null,
  });
  if (prog.anexos_json) {
    try {
      const anexos = JSON.parse(prog.anexos_json);
      for (const a of anexos) {
        inserirAnexoExtra({ chamado_id: chamadoId, path: a.path, nome_original: a.nome_original });
      }
    } catch (e) {
      console.warn(`[Programados] Erro ao inserir anexos para prog #${prog.id}:`, e.message);
    }
  }
  return chamadoId;
}

module.exports = { executarChamadosProgramados };
