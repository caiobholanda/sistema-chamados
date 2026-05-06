const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

const DB_PATH = path.join(__dirname, '..', 'data', 'chamados.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario TEXT UNIQUE NOT NULL,
      nome_completo TEXT NOT NULL,
      senha_hash TEXT NOT NULL,
      is_master INTEGER DEFAULT 0,
      ativo INTEGER DEFAULT 1,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chamados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER REFERENCES usuarios(id),
      nome TEXT NOT NULL,
      setor TEXT NOT NULL,
      ramal TEXT NOT NULL,
      descricao TEXT NOT NULL,
      anexo_path TEXT,
      anexo_nome_original TEXT,
      prioridade TEXT,
      status TEXT NOT NULL DEFAULT 'aberto',
      prazo DATETIME,
      admin_responsavel_id INTEGER REFERENCES admins(id),
      solucao TEXT,
      nota INTEGER,
      comentario_avaliacao TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME,
      concluido_em DATETIME
    );

    CREATE TABLE IF NOT EXISTS historico_chamados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chamado_id INTEGER NOT NULL REFERENCES chamados(id),
      admin_id INTEGER REFERENCES admins(id),
      acao TEXT NOT NULL,
      valor_anterior TEXT,
      valor_novo TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mensagens_chamado (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chamado_id INTEGER NOT NULL REFERENCES chamados(id),
      autor_tipo TEXT NOT NULL CHECK(autor_tipo IN ('usuario','admin')),
      autor_id INTEGER,
      autor_nome TEXT NOT NULL,
      mensagem TEXT NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS equipamentos_mencoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chamado_id INTEGER NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
      equipamento TEXT NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_eq_equipamento ON equipamentos_mencoes(equipamento);
  `);

  // Migrações de colunas em bancos existentes
  try { db.exec('ALTER TABLE chamados ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id)'); } catch {}
  try { db.exec('ALTER TABLE usuarios ADD COLUMN ativo INTEGER DEFAULT 1'); } catch {}
  try { db.exec('ALTER TABLE admins ADD COLUMN email TEXT'); } catch {}
  try { db.exec('ALTER TABLE chamados ADD COLUMN categoria TEXT'); } catch {}
  try { db.exec('ALTER TABLE usuarios ADD COLUMN senha_plain TEXT'); } catch {}
  try { db.exec('ALTER TABLE admins ADD COLUMN senha_plain TEXT'); } catch {}

  return db;
}

async function recuperarSenhasPlain() {
  const db = getDb();
  const senhasMaster = [
    process.env.ADMIN_MASTER_PASS,
    'Admin123!',
  ].filter(Boolean);

  const adminsNull = db.prepare('SELECT * FROM admins WHERE senha_plain IS NULL').all();
  for (const admin of adminsNull) {
    for (const senha of senhasMaster) {
      const ok = await bcrypt.compare(senha, admin.senha_hash);
      if (ok) {
        db.prepare('UPDATE admins SET senha_plain = ? WHERE id = ?').run(senha, admin.id);
        break;
      }
    }
  }

  const usuariosNull = db.prepare('SELECT * FROM usuarios WHERE senha_plain IS NULL').all();
  for (const u of usuariosNull) {
    for (const senha of senhasMaster) {
      const ok = await bcrypt.compare(senha, u.senha_hash);
      if (ok) {
        db.prepare('UPDATE usuarios SET senha_plain = ? WHERE id = ?').run(senha, u.id);
        break;
      }
    }
  }
}

async function criarAdminMasterSeNecessario() {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as cnt FROM admins').get();
  if (count.cnt > 0) return;

  const usuario = process.env.ADMIN_MASTER_USER || 'admin';
  const senha = process.env.ADMIN_MASTER_PASS || 'Admin123!';
  const nome = process.env.ADMIN_MASTER_NOME || 'Administrador Master';

  const hash = await bcrypt.hash(senha, 12);
  db.prepare(`
    INSERT INTO admins (usuario, nome_completo, senha_hash, senha_plain, is_master)
    VALUES (?, ?, ?, ?, 1)
  `).run(usuario, nome, hash, senha);

  console.log('='.repeat(60));
  console.log('ADMIN MASTER CRIADO (primeiro boot):');
  console.log(`  Usuário: ${usuario}`);
  console.log(`  Senha:   ${senha}`);
  console.log('TROQUE A SENHA APÓS O PRIMEIRO ACESSO!');
  console.log('='.repeat(60));
}

// ── Chamados ──────────────────────────────────────────────────

function inserirChamado(dados) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO chamados (usuario_id, nome, setor, ramal, descricao, anexo_path, anexo_nome_original, categoria)
    VALUES (@usuario_id, @nome, @setor, @ramal, @descricao, @anexo_path, @anexo_nome_original, @categoria)
  `);
  const result = stmt.run({ usuario_id: null, categoria: null, ...dados });
  return result.lastInsertRowid;
}

function deletarChamado(id) {
  const db = getDb();
  const chamado = buscarChamadoPorId(id);
  db.prepare('DELETE FROM mensagens_chamado WHERE chamado_id = ?').run(id);
  db.prepare('DELETE FROM historico_chamados WHERE chamado_id = ?').run(id);
  db.prepare('DELETE FROM chamados WHERE id = ?').run(id);
  return chamado;
}

function listarMensagensChamado(chamadoId) {
  return getDb().prepare(
    'SELECT * FROM mensagens_chamado WHERE chamado_id = ? ORDER BY criado_em ASC'
  ).all(chamadoId);
}

function criarMensagem({ chamado_id, autor_tipo, autor_id, autor_nome, mensagem }) {
  const result = getDb().prepare(`
    INSERT INTO mensagens_chamado (chamado_id, autor_tipo, autor_id, autor_nome, mensagem)
    VALUES (@chamado_id, @autor_tipo, @autor_id, @autor_nome, @mensagem)
  `).run({ chamado_id, autor_tipo, autor_id: autor_id || null, autor_nome, mensagem });
  return result.lastInsertRowid;
}

function buscarChamadoPorId(id) {
  return getDb().prepare('SELECT * FROM chamados WHERE id = ?').get(id);
}

function buscarHistoricoPrazos(chamadoId) {
  return getDb().prepare(`
    SELECT h.*, a.nome_completo as admin_nome
    FROM historico_chamados h
    LEFT JOIN admins a ON h.admin_id = a.id
    WHERE h.chamado_id = ? AND h.acao = 'prazo_alterado'
    ORDER BY h.timestamp ASC
  `).all(chamadoId);
}

function buscarHistoricoCompleto(chamadoId) {
  return getDb().prepare(`
    SELECT h.*, a.nome_completo as admin_nome
    FROM historico_chamados h
    LEFT JOIN admins a ON h.admin_id = a.id
    WHERE h.chamado_id = ?
    ORDER BY h.timestamp ASC
  `).all(chamadoId);
}

function listarChamadosAdmin(filtros = {}) {
  const db = getDb();
  let sql = `
    SELECT c.*, a.nome_completo as admin_nome
    FROM chamados c
    LEFT JOIN admins a ON c.admin_responsavel_id = a.id
    WHERE 1=1
  `;
  const params = [];

  if (filtros.status) {
    const statusList = filtros.status.split(',').map(s => s.trim()).filter(Boolean);
    if (statusList.length === 1) {
      sql += ' AND c.status = ?';
      params.push(statusList[0]);
    } else if (statusList.length > 1) {
      sql += ` AND c.status IN (${statusList.map(() => '?').join(',')})`;
      params.push(...statusList);
    }
  }
  if (filtros.setor) {
    sql += ' AND c.setor LIKE ?';
    params.push(`%${filtros.setor}%`);
  }
  if (filtros.admin_id) {
    sql += ' AND c.admin_responsavel_id = ?';
    params.push(filtros.admin_id);
  }
  if (filtros.prioridade) {
    if (filtros.prioridade === 'sem') {
      sql += ' AND c.prioridade IS NULL';
    } else {
      sql += ' AND c.prioridade = ?';
      params.push(filtros.prioridade);
    }
  }
  if (filtros.periodo_inicio) {
    sql += ' AND c.criado_em >= ?';
    params.push(filtros.periodo_inicio);
  }
  if (filtros.periodo_fim) {
    sql += ' AND c.criado_em <= ?';
    params.push(filtros.periodo_fim + ' 23:59:59');
  }

  // Ordenação: sem prioridade primeiro, depois urgente, alta, media, baixa; dentro do nível, mais antigos primeiro
  sql += `
    ORDER BY
      CASE WHEN c.prioridade IS NULL THEN 0 ELSE 1 END ASC,
      CASE
        WHEN c.prioridade = 'urgente' THEN 1
        WHEN c.prioridade = 'alta' THEN 2
        WHEN c.prioridade = 'media' THEN 3
        WHEN c.prioridade = 'baixa' THEN 4
        ELSE 5
      END ASC,
      CASE WHEN c.prazo IS NULL THEN 1 ELSE 0 END ASC,
      c.prazo ASC,
      c.criado_em ASC
  `;

  return db.prepare(sql).all(...params);
}

function atualizarPrioridade(id, prioridade, adminId) {
  const db = getDb();
  const chamado = buscarChamadoPorId(id);
  const anterior = chamado.prioridade;
  db.prepare(`UPDATE chamados SET prioridade = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`).run(prioridade, id);
  db.prepare(`
    INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
    VALUES (?, ?, 'prioridade_definida', ?, ?)
  `).run(id, adminId, anterior, prioridade);
}

function atualizarPrazo(id, prazo, adminId) {
  const db = getDb();
  const chamado = buscarChamadoPorId(id);
  const anterior = chamado.prazo;
  db.prepare(`UPDATE chamados SET prazo = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`).run(prazo, id);
  db.prepare(`
    INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
    VALUES (?, ?, 'prazo_alterado', ?, ?)
  `).run(id, adminId, anterior || null, prazo);
}

function atualizarCategoria(id, categoria, adminId) {
  const db = getDb();
  const chamado = buscarChamadoPorId(id);
  const anterior = chamado.categoria;
  db.prepare(`UPDATE chamados SET categoria = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`).run(categoria, id);
  db.prepare(`
    INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
    VALUES (?, ?, 'categoria_alterada', ?, ?)
  `).run(id, adminId, anterior || null, categoria);
}

function assumirChamado(id, adminId) {
  const db = getDb();
  const chamado = buscarChamadoPorId(id);
  db.prepare(`
    UPDATE chamados SET status = 'em_andamento', admin_responsavel_id = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?
  `).run(adminId, id);
  db.prepare(`
    INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
    VALUES (?, ?, 'assumido', ?, 'em_andamento')
  `).run(id, adminId, chamado.status);
}

function concluirChamado(id, solucao, adminId) {
  const db = getDb();
  const chamado = buscarChamadoPorId(id);
  db.prepare(`
    UPDATE chamados SET status = 'concluido', solucao = ?, atualizado_em = CURRENT_TIMESTAMP, concluido_em = CURRENT_TIMESTAMP WHERE id = ?
  `).run(solucao, id);
  db.prepare(`
    INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
    VALUES (?, ?, 'status_alterado', ?, 'concluido')
  `).run(id, adminId, chamado.status);
  db.prepare(`
    INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
    VALUES (?, ?, 'solucao_registrada', null, ?)
  `).run(id, adminId, solucao);
}

function encerrarChamado(id, motivo, adminId) {
  const db = getDb();
  const chamado = buscarChamadoPorId(id);
  db.prepare(`
    UPDATE chamados SET status = 'encerrado', solucao = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?
  `).run(motivo, id);
  db.prepare(`
    INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
    VALUES (?, ?, 'status_alterado', ?, 'encerrado')
  `).run(id, adminId, chamado.status);
}

function reabrirChamado(id, adminId) {
  const db = getDb();
  const chamado = buscarChamadoPorId(id);
  db.prepare(`
    UPDATE chamados SET status = 'aberto', solucao = NULL, concluido_em = NULL, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?
  `).run(id);
  db.prepare(`
    INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
    VALUES (?, ?, 'status_alterado', ?, 'aberto')
  `).run(id, adminId, chamado.status);
}

function avaliarChamado(id, nota, comentario) {
  getDb().prepare(`
    UPDATE chamados SET nota = ?, comentario_avaliacao = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?
  `).run(nota, comentario || null, id);
}

// ── Usuarios ──────────────────────────────────────────────────

function registrarUsuario(dados) {
  const result = getDb().prepare(`
    INSERT INTO usuarios (nome, email, senha_hash, senha_plain) VALUES (@nome, @email, @senha_hash, @senha_plain)
  `).run({ senha_plain: null, ...dados });
  return result.lastInsertRowid;
}

function buscarUsuarioPorEmail(email) {
  return getDb().prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
}

function buscarUsuarioPorId(id) {
  return getDb().prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
}

function listarUsuarios() {
  return getDb().prepare('SELECT id, nome, email, ativo, senha_plain, criado_em FROM usuarios ORDER BY criado_em DESC').all();
}

function atualizarUsuario(id, dados) {
  const campos = [];
  const values = [];
  if (dados.ativo !== undefined) { campos.push('ativo = ?'); values.push(dados.ativo); }
  if (dados.nome !== undefined) { campos.push('nome = ?'); values.push(dados.nome); }
  if (dados.email !== undefined) { campos.push('email = ?'); values.push(dados.email); }
  if (dados.senha_hash !== undefined) { campos.push('senha_hash = ?'); values.push(dados.senha_hash); }
  if (dados.senha_plain !== undefined) { campos.push('senha_plain = ?'); values.push(dados.senha_plain); }
  if (campos.length === 0) return;
  values.push(id);
  getDb().prepare(`UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`).run(...values);
}

function deletarUsuario(id) {
  const db = getDb();
  db.prepare('UPDATE chamados SET usuario_id = NULL WHERE usuario_id = ?').run(id);
  db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
}

function listarChamadosPorUsuario(usuario_id) {
  return getDb().prepare(`
    SELECT c.*, a.nome_completo as admin_nome
    FROM chamados c
    LEFT JOIN admins a ON c.admin_responsavel_id = a.id
    WHERE c.usuario_id = ?
    ORDER BY c.criado_em DESC
  `).all(usuario_id);
}

// ── Admins ────────────────────────────────────────────────────

function buscarAdminPorUsuario(usuario) {
  return getDb().prepare('SELECT * FROM admins WHERE usuario = ? AND ativo = 1').get(usuario);
}

function buscarAdminPorId(id) {
  return getDb().prepare('SELECT * FROM admins WHERE id = ?').get(id);
}

function buscarAdminPorEmail(email) {
  return getDb().prepare('SELECT * FROM admins WHERE email = ?').get(email);
}

function listarAdmins() {
  return getDb().prepare('SELECT id, usuario, nome_completo, email, is_master, ativo, senha_plain, criado_em FROM admins ORDER BY criado_em ASC').all();
}

function criarAdmin(dados) {
  const result = getDb().prepare(`
    INSERT INTO admins (usuario, nome_completo, email, senha_hash, senha_plain, is_master)
    VALUES (@usuario, @nome_completo, @email, @senha_hash, @senha_plain, @is_master)
  `).run({ senha_plain: null, ...dados });
  return result.lastInsertRowid;
}

function atualizarAdmin(id, dados) {
  const campos = [];
  const values = [];
  if (dados.nome_completo !== undefined) { campos.push('nome_completo = ?'); values.push(dados.nome_completo); }
  if (dados.email !== undefined) { campos.push('email = ?'); values.push(dados.email); }
  if (dados.senha_hash !== undefined) { campos.push('senha_hash = ?'); values.push(dados.senha_hash); }
  if (dados.senha_plain !== undefined) { campos.push('senha_plain = ?'); values.push(dados.senha_plain); }
  if (dados.ativo !== undefined) { campos.push('ativo = ?'); values.push(dados.ativo); }
  if (dados.is_master !== undefined) { campos.push('is_master = ?'); values.push(dados.is_master); }
  if (campos.length === 0) return;
  values.push(id);
  getDb().prepare(`UPDATE admins SET ${campos.join(', ')} WHERE id = ?`).run(...values);
}

function deletarAdmin(id) {
  const db = getDb();
  db.prepare('UPDATE chamados SET admin_responsavel_id = NULL WHERE admin_responsavel_id = ?').run(id);
  db.prepare('UPDATE historico_chamados SET admin_id = NULL WHERE admin_id = ?').run(id);
  db.prepare('DELETE FROM admins WHERE id = ?').run(id);
}

// ── Equipamentos ─────────────────────────────────────────────

function inserirMencoesEquipamentos(chamado_id, equipamentos) {
  const db = getDb();
  const stmt = db.prepare('INSERT INTO equipamentos_mencoes (chamado_id, equipamento) VALUES (?, ?)');
  const inserir = db.transaction((list) => {
    for (const eq of list) stmt.run(chamado_id, eq);
  });
  inserir(equipamentos);
}

function rankingEquipamentos({ limite = 20 } = {}) {
  return getDb().prepare(`
    SELECT
      em.equipamento,
      COUNT(*) AS vezes,
      MAX(c.criado_em) AS ultimo_chamado,
      GROUP_CONCAT(em.chamado_id ORDER BY em.chamado_id DESC) AS chamado_ids
    FROM equipamentos_mencoes em
    JOIN chamados c ON c.id = em.chamado_id
    GROUP BY em.equipamento
    ORDER BY vezes DESC, ultimo_chamado DESC
    LIMIT ?
  `).all(limite);
}

// ── Relatórios ────────────────────────────────────────────────

function relatorioMes(mes) {
  const db = getDb();
  const inicio = `${mes}-01`;
  const fim = `${mes}-31`;

  const volumeStatus = db.prepare(`
    SELECT status, COUNT(*) as total
    FROM chamados
    WHERE criado_em BETWEEN ? AND ?
    GROUP BY status
  `).all(inicio, fim + ' 23:59:59');

  const abertosUltimos12 = db.prepare(`
    SELECT strftime('%Y-%m', criado_em) as mes, COUNT(*) as total
    FROM chamados
    WHERE criado_em >= date(?, '-11 months')
    GROUP BY mes
    ORDER BY mes ASC
  `).all(inicio);

  const notaMedia = db.prepare(`
    SELECT AVG(nota) as media, COUNT(nota) as total
    FROM chamados
    WHERE concluido_em BETWEEN ? AND ? AND nota IS NOT NULL
  `).get(inicio, fim + ' 23:59:59');

  const tendencia6m = db.prepare(`
    SELECT strftime('%Y-%m', concluido_em) as mes, AVG(nota) as media
    FROM chamados
    WHERE concluido_em >= date(?, '-5 months') AND nota IS NOT NULL
    GROUP BY mes
    ORDER BY mes ASC
  `).all(inicio);

  const top5Setores = db.prepare(`
    SELECT setor, COUNT(*) as total
    FROM chamados
    WHERE criado_em BETWEEN ? AND ?
    GROUP BY setor
    ORDER BY total DESC
    LIMIT 5
  `).all(inicio, fim + ' 23:59:59');

  return { volumeStatus, abertosUltimos12, notaMedia, tendencia6m, top5Setores };
}

function rankingAdminsMes(mes) {
  const db = getDb();
  const inicio = `${mes}-01`;
  const fim = `${mes}-31`;

  return db.prepare(`
    SELECT
      a.id,
      a.nome_completo,
      COUNT(DISTINCT CASE WHEN h.valor_novo = 'concluido' THEN h.chamado_id END) AS concluidos,
      COUNT(DISTINCT CASE WHEN h.valor_novo = 'encerrado' THEN h.chamado_id END) AS encerrados,
      COUNT(DISTINCT h.chamado_id) AS total
    FROM admins a
    LEFT JOIN historico_chamados h
      ON h.admin_id = a.id
      AND h.acao = 'status_alterado'
      AND h.valor_novo IN ('concluido', 'encerrado')
      AND h.timestamp BETWEEN ? AND ?
    WHERE a.ativo = 1
    GROUP BY a.id, a.nome_completo
    ORDER BY total DESC, concluidos DESC, a.nome_completo ASC
  `).all(inicio, fim + ' 23:59:59');
}

function exportarCsvMes(mes) {
  const db = getDb();
  const inicio = `${mes}-01`;
  const fim = `${mes}-31`;
  return db.prepare(`
    SELECT c.*, a.nome_completo as admin_nome
    FROM chamados c
    LEFT JOIN admins a ON c.admin_responsavel_id = a.id
    WHERE c.criado_em BETWEEN ? AND ?
    ORDER BY c.id ASC
  `).all(inicio, fim + ' 23:59:59');
}

module.exports = {
  getDb,
  initDb,
  criarAdminMasterSeNecessario,
  recuperarSenhasPlain,
  inserirChamado,
  deletarChamado,
  buscarChamadoPorId,
  buscarHistoricoPrazos,
  buscarHistoricoCompleto,
  listarChamadosAdmin,
  atualizarPrioridade,
  atualizarPrazo,
  atualizarCategoria,
  assumirChamado,
  concluirChamado,
  encerrarChamado,
  reabrirChamado,
  avaliarChamado,
  registrarUsuario,
  buscarUsuarioPorEmail,
  buscarUsuarioPorId,
  listarUsuarios,
  atualizarUsuario,
  deletarUsuario,
  listarChamadosPorUsuario,
  buscarAdminPorUsuario,
  buscarAdminPorId,
  buscarAdminPorEmail,
  listarAdmins,
  criarAdmin,
  atualizarAdmin,
  deletarAdmin,
  relatorioMes,
  rankingAdminsMes,
  exportarCsvMes,
  listarMensagensChamado,
  criarMensagem,
  inserirMencoesEquipamentos,
  rankingEquipamentos,
};
