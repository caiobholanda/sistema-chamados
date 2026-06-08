'use strict';

const { getProgramadosPendentes, registrarExecucaoProgramado, inserirChamado } = require('./db');
const push = require('./push');
const { calcularProxima } = require('./programados');

// Retorna array de resultados para uso em diagnóstico/debug
async function executarChamadosProgramados() {
  const ts = new Date().toISOString();
  const resultados = [];
  try {
    const pendentes = getProgramadosPendentes();
    console.log(`[Programados] ${ts} — varredura: ${pendentes.length} elegível(is)`);
    for (const prog of pendentes) {
      try {
        const chamadoId = inserirChamado({
          nome: prog.nome,
          setor: prog.setor,
          ramal: prog.ramal || null,
          descricao: `[Automático] ${prog.descricao}`,
          categoria: prog.categoria || null,
          aberto_por_admin_id: null,
          admin_responsavel_id: prog.admin_responsavel_id || null,
          anexo_path: null,
          anexo_nome_original: null,
          servico_id: null,
          servico_nome: null,
        });
        const proxima = calcularProxima(prog, new Date());
        const proximaISO = proxima.toISOString().replace('T', ' ').slice(0, 19);
        registrarExecucaoProgramado(prog.id, chamadoId, proximaISO);
        const msg = `Chamado #${chamadoId} criado automaticamente: "${prog.titulo}" (${prog.setor})`;
        console.log(`[Programados] ${msg} → próxima: ${proximaISO}`);
        push.enviarParaTodos('📅 Chamado Programado', msg).catch(() => {});
        resultados.push({ ok: true, progId: prog.id, titulo: prog.titulo, chamadoId, proximaISO });
      } catch (err) {
        console.error(`[Programados] ERRO no agendamento #${prog.id} "${prog.titulo}":`, err.message);
        resultados.push({ ok: false, progId: prog.id, titulo: prog.titulo, erro: err.message });
      }
    }
  } catch (err) {
    console.error('[Programados] ERRO geral na varredura:', err);
  }
  return resultados;
}

module.exports = { executarChamadosProgramados };
