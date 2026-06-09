'use strict';

const { getProgramadosPendentes, registrarExecucaoProgramado, inserirChamado, buscarUsuarioPorId, inserirAnexoExtra, getDb } = require('./db');
const push = require('./push');
const { calcularProxima } = require('./programados');

async function executarChamadosProgramados() {
  const ts = new Date().toISOString();
  const resultados = [];
  try {
    const pendentes = getProgramadosPendentes();
    console.log(`[Programados] ${ts} — varredura: ${pendentes.length} elegível(is)`);
    for (const prog of pendentes) {
      try {
        let nome  = prog.nome;
        let setor = prog.setor;

        if (prog.usuario_id) {
          const u = buscarUsuarioPorId(prog.usuario_id);
          if (u && u.ativo) { nome = u.nome; setor = u.setor || prog.setor; }
        }

        const chamadoId = inserirChamado({
          usuario_id: prog.usuario_id || null,
          nome,
          setor,
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

        if (prog.anexos_json) {
          try {
            const anexos = JSON.parse(prog.anexos_json);
            for (const a of anexos) {
              const anexoId = inserirAnexoExtra({ chamado_id: chamadoId, path: a.path, nome_original: a.nome_original });
              void anexoId;
            }
          } catch (e) {
            console.warn(`[Programados] Erro ao inserir anexos para #${prog.id}:`, e.message);
          }
        }

        const proxima = calcularProxima(prog, new Date());
        const proximaISO = proxima.toISOString().replace('T', ' ').slice(0, 19);
        registrarExecucaoProgramado(prog.id, chamadoId, proximaISO);
        const msg = `Chamado #${chamadoId} criado automaticamente: "${prog.titulo}" (${setor})`;
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
