'use strict';
/**
 * Teste end-to-end do scheduler de chamados programados.
 * Uso: node scripts/test-programados.js
 * Valida: criação, execução, ultima_execucao, total_gerados, proxima_execucao futura.
 */

require('dotenv').config();
const path = require('path');
process.chdir(path.join(__dirname, '..'));

const { initDb, inserirChamadoProgramado, buscarProgramadoPorId, deletarChamadoProgramado, getProgramadosPendentes } = require('./src/db');
const { executarChamadosProgramados } = require('./src/scheduler');

const FORTALEZA_OFFSET_MS = -3 * 60 * 60 * 1000;
const ftzNow = () => new Date(Date.now() + FORTALEZA_OFFSET_MS);
const toIso = d => d.toISOString().replace('T', ' ').slice(0, 19);

async function main() {
  initDb();
  console.log('\n[Test] === Teste end-to-end de chamados programados ===\n');

  // Hora atual em Fortaleza (para referência no log)
  const ftz = ftzNow();
  const horaFtz = `${String(ftz.getUTCHours()).padStart(2,'0')}:${String(ftz.getUTCMinutes()).padStart(2,'0')}`;
  console.log(`[Test] Hora atual Fortaleza: ${horaFtz}`);
  console.log(`[Test] Hora atual UTC:       ${toIso(new Date())}`);

  // Cria agendamento com proxima_execucao 2 minutos no passado (imediatamente elegível)
  const proximaPassada = toIso(new Date(Date.now() - 2 * 60 * 1000));
  const progDef = {
    titulo:             'TEST_PROG_E2E',
    nome:               'Teste Automatizado',
    setor:              'TI',
    ramal:              null,
    descricao:          'Agendamento de teste criado pelo script test-programados.js.',
    categoria:          null,
    prioridade:         'normal',
    frequencia:         'diario',
    hora:               horaFtz,
    dia_semana:         null,
    dia_mes:            null,
    mes:                null,
    pular_feriados:     0,
    admin_responsavel_id: null,
    proxima_execucao:   proximaPassada,
  };

  console.log(`[Test] Criando agendamento com proxima_execucao=${proximaPassada}...`);
  const id = inserirChamadoProgramado(progDef);
  console.log(`[Test] Agendamento criado: id=${id}\n`);

  // Verifica elegibilidade
  const pendentes = getProgramadosPendentes();
  const estaElegivel = pendentes.some(p => p.id === id);
  if (!estaElegivel) {
    const agoraUtc = toIso(new Date());
    console.error(`[Test] FALHA: agendamento ${id} não está elegível.`);
    console.error(`       proxima_execucao=${proximaPassada}  agora_utc=${agoraUtc}`);
    deletarChamadoProgramado(id);
    process.exit(1);
  }
  console.log(`[Test] ✓ Agendamento elegível para execução (${pendentes.length} pendente(s) total)\n`);

  // Dispara o scheduler
  console.log('[Test] Disparando executarChamadosProgramados()...');
  const resultados = await executarChamadosProgramados();
  const meu = resultados.find(r => r.progId === id);
  if (!meu || !meu.ok) {
    console.error('[Test] FALHA: scheduler não gerou chamado para o agendamento de teste.');
    console.error('       resultado:', meu || '(nenhum resultado)');
    deletarChamadoProgramado(id);
    process.exit(1);
  }
  console.log(`\n[Test] ✓ Chamado #${meu.chamadoId} gerado\n`);

  // Verifica estado pós-execução
  const prog = buscarProgramadoPorId(id);
  let falhou = false;

  if (!prog.ultima_execucao) {
    console.error('[Test] FALHA: ultima_execucao é null após execução');
    falhou = true;
  } else {
    console.log(`[Test] ✓ ultima_execucao = ${prog.ultima_execucao}`);
  }

  if (prog.total_gerados < 1) {
    console.error(`[Test] FALHA: total_gerados = ${prog.total_gerados} (esperado >= 1)`);
    falhou = true;
  } else {
    console.log(`[Test] ✓ total_gerados = ${prog.total_gerados}`);
  }

  const agoraUtc = toIso(new Date());
  if (prog.proxima_execucao <= agoraUtc) {
    console.error(`[Test] FALHA: proxima_execucao ${prog.proxima_execucao} não está no futuro (agora=${agoraUtc})`);
    falhou = true;
  } else {
    // Converte proxima para Fortaleza para exibição
    const proxFtz = new Date(prog.proxima_execucao.replace(' ', 'T') + 'Z');
    const proxFtzStr = proxFtz.toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' });
    console.log(`[Test] ✓ proxima_execucao = ${prog.proxima_execucao} UTC (= ${proxFtzStr} Fortaleza)`);
  }

  // Limpa
  deletarChamadoProgramado(id);
  console.log('\n[Test] Agendamento de teste removido.');

  if (falhou) {
    console.error('\n[Test] === FALHOU ===\n');
    process.exit(1);
  } else {
    console.log('\n[Test] === PASSOU ✓ ===\n');
  }
}

main().catch(err => {
  console.error('[Test] Erro inesperado:', err);
  process.exit(1);
});
