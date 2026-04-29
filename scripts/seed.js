require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { initDb, getDb, criarAdminMasterSeNecessario, inserirChamado } = require('../src/db');

async function seed() {
  initDb();
  await criarAdminMasterSeNecessario();
  const db = getDb();

  const admin = db.prepare("SELECT id FROM admins WHERE is_master = 1 LIMIT 1").get();
  if (!admin) { console.log('Nenhum admin encontrado. Crie o .env e rode npm start antes.'); process.exit(1); }
  const adminId = admin.id;

  const agora = new Date();
  function dt(deltaDias) {
    const d = new Date(agora);
    d.setDate(d.getDate() + deltaDias);
    return d.toISOString().replace('T', ' ').slice(0, 19);
  }

  // 1. Aberto sem prioridade
  const id1 = inserirChamado({ nome: 'Maria Silva', setor: 'Recepção', ramal: '1001', descricao: 'Computador da recepção não liga desde ontem de manhã. Já tentei religar mas nada acontece.', anexo_path: null, anexo_nome_original: null });

  // 2. Em andamento com prioridade urgente e prazo alterado
  const id2 = inserirChamado({ nome: 'João Santos', setor: 'Governança', ramal: '2034', descricao: 'Sistema de controle de lavanderia parou de funcionar. Estamos sem controle dos itens desde hoje cedo.', anexo_path: null, anexo_nome_original: null });
  db.prepare("UPDATE chamados SET prioridade='urgente', status='em_andamento', admin_responsavel_id=?, atualizado_em=CURRENT_TIMESTAMP WHERE id=?").run(adminId, id2);
  const prazoAntigo = dt(1);
  const prazoNovo = dt(2);
  db.prepare("UPDATE chamados SET prazo=? WHERE id=?").run(prazoNovo, id2);
  db.prepare("INSERT INTO historico_chamados (chamado_id,admin_id,acao,valor_anterior,valor_novo) VALUES (?,?,'prazo_alterado',?,?)").run(id2, adminId, prazoAntigo, prazoNovo);
  db.prepare("INSERT INTO historico_chamados (chamado_id,admin_id,acao,valor_anterior,valor_novo) VALUES (?,?,'assumido','aberto','em_andamento')").run(id2, adminId);

  // 3. Concluído aguardando avaliação
  const id3 = inserirChamado({ nome: 'Ana Costa', setor: 'Restaurante', ramal: '3012', descricao: 'Impressora da cozinha não imprime os pedidos. O papel acaba mas as comandas não saem.', anexo_path: null, anexo_nome_original: null });
  db.prepare("UPDATE chamados SET prioridade='alta', status='concluido', admin_responsavel_id=?, solucao='Impressora reinicializada e driver reinstalado. Testada com sucesso.', atualizado_em=CURRENT_TIMESTAMP, concluido_em=CURRENT_TIMESTAMP WHERE id=?").run(adminId, id3);

  // 4. Concluído e avaliado
  const id4 = inserirChamado({ nome: 'Carlos Mendes', setor: 'Financeiro', ramal: '4056', descricao: 'Não consigo acessar o sistema financeiro. Aparece erro de autenticação ao tentar fazer login mesmo com a senha correta.', anexo_path: null, anexo_nome_original: null });
  db.prepare("UPDATE chamados SET prioridade='media', status='concluido', admin_responsavel_id=?, solucao='Senha resetada e cache de sessão limpo. Usuário conseguiu acessar normalmente.', nota=9, comentario_avaliacao='Atendimento muito rápido e eficiente!', atualizado_em=CURRENT_TIMESTAMP, concluido_em=CURRENT_TIMESTAMP WHERE id=?").run(adminId, id4);

  // 5. Encerrado
  const id5 = inserirChamado({ nome: 'Fernanda Lima', setor: 'RH', ramal: '5023', descricao: 'Teclado com algumas teclas não funcionando. As letras A, S e D não respondem ao pressionar.', anexo_path: null, anexo_nome_original: null });
  db.prepare("UPDATE chamados SET prioridade='baixa', status='encerrado', admin_responsavel_id=?, solucao='Chamado encerrado pois o colaborador recebeu teclado reserva e não há peça para conserto imediato.', atualizado_em=CURRENT_TIMESTAMP WHERE id=?").run(adminId, id5);

  console.log(`✅ Seed concluído! ${[id1,id2,id3,id4,id5].length} chamados criados (IDs: ${id1}, ${id2}, ${id3}, ${id4}, ${id5})`);
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
