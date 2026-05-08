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

  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prazo_alertas (
      chamado_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (chamado_id, tipo)
    );
  `);

  try { db.exec('ALTER TABLE chamados ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id)'); } catch {}
  try { db.exec('ALTER TABLE usuarios ADD COLUMN ativo INTEGER DEFAULT 1'); } catch {}
  try { db.exec('ALTER TABLE admins ADD COLUMN email TEXT'); } catch {}
  try { db.exec('ALTER TABLE chamados ADD COLUMN categoria TEXT'); } catch {}
  try { db.exec('ALTER TABLE usuarios ADD COLUMN senha_plain TEXT'); } catch {}
  try { db.exec('ALTER TABLE admins ADD COLUMN senha_plain TEXT'); } catch {}
  try { db.exec('ALTER TABLE usuarios ADD COLUMN ramal TEXT'); } catch {}
  try { db.exec('ALTER TABLE usuarios ADD COLUMN setor TEXT'); } catch {}
  try { db.exec('ALTER TABLE chamados ADD COLUMN assinatura TEXT'); } catch {}
  try { db.exec('ALTER TABLE chamados ADD COLUMN assinado_em DATETIME'); } catch {}
  try { db.exec("ALTER TABLE estoque_itens ADD COLUMN observacao TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE estoque_itens ADD COLUMN especificacao TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE impressoras ADD COLUMN numero_serie TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE estoque_movimentacoes ADD COLUMN chamado_id INTEGER"); } catch {}
  // Fix model name for SELB 3Y24 (WF5890 → WF-C5890)
  try { db.exec("UPDATE impressoras SET nome = 'Epson WF-C5890' WHERE selb = '3Y24' AND nome = 'EPSON WF5890'"); } catch {}
  // Add ADE4 impressora if not yet registered
  try {
    if (!getDb().prepare("SELECT id FROM impressoras WHERE selb = 'ADE4'").get()) {
      getDb().prepare("INSERT INTO impressoras (nome, ip, selb, localizacao) VALUES ('RICOH SP 3710SF', '', 'ADE4', 'RECEPCAO')").run();
    }
  } catch {}
  // Preencher números de série a partir da planilha (só preenche se estiver vazio)
  try {
    const setNs = getDb().prepare("UPDATE impressoras SET numero_serie = ? WHERE selb = ? AND (numero_serie IS NULL OR numero_serie = '')");
    const nsMap = [
      ['X952018033',  '08MW'],
      ['CNCRQDM82V',  '2BL6'],
      ['32M00866',    '2EP1'],
      ['5171Z211150', '2EP2'],
      ['5171Z413875', '2EP3'],
      ['5171Z811579', '2EP4'],
      ['5171Z811752', '2EP5'],
      ['5851ZC10635', '2EP7'],
      ['T314QB00927', '2EQ4'],
      ['T333QB10405', '2EQ8'],
      ['5161Z412223', '2IY9'],
      ['5179Z410077', '2KA7'],
      ['5170Z710320', '2QC9'],
      ['XBJZ032892',  '3Y24'],
      ['5179ZB12118', 'ADE4'],
      ['5171ZA10686', 'JNI9'],
      ['5170Z411605', 'JPD3'],
      ['5170ZA10221', 'JST4'],
      ['X3B7006907',  'RFA2'],
    ];
    for (const [ns, selb] of nsMap) setNs.run(ns, selb);
  } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS assinaturas_historico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chamado_id INTEGER NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
      assinatura TEXT,
      assinado_em DATETIME,
      admin_id INTEGER REFERENCES admins(id),
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_assin_hist_chamado ON assinaturas_historico(chamado_id);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('estoque', 'inventario')),
      categoria TEXT,
      quantidade INTEGER DEFAULT 0,
      quantidade_minima INTEGER DEFAULT 0,
      localizacao TEXT,
      descricao TEXT,
      status TEXT DEFAULT 'disponivel',
      numero_serie TEXT,
      fabricante TEXT,
      modelo TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS inventario_micros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setor TEXT NOT NULL DEFAULT '',
      usuario TEXT NOT NULL DEFAULT '',
      processador TEXT DEFAULT '',
      memoria TEXT DEFAULT '',
      sistema_operacional TEXT DEFAULT '',
      hd_ssd TEXT DEFAULT '',
      office TEXT DEFAULT '',
      tag TEXT DEFAULT '',
      entradas_monitor TEXT DEFAULT '',
      modelo_monitor TEXT DEFAULT '',
      status TEXT DEFAULT '',
      hostname TEXT DEFAULT '',
      data_troca TEXT DEFAULT '',
      observacao TEXT DEFAULT '',
      atualizacao_win11 TEXT DEFAULT '',
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS estoque_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'outro',
      qtd_preto INTEGER DEFAULT 0,
      qtd_ciano INTEGER DEFAULT 0,
      qtd_magenta INTEGER DEFAULT 0,
      qtd_amarelo INTEGER DEFAULT 0,
      qtd_geral INTEGER DEFAULT 0,
      urgente INTEGER DEFAULT 0,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES estoque_itens(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      cor TEXT DEFAULT '',
      quantidade INTEGER NOT NULL DEFAULT 1,
      admin_nome TEXT DEFAULT '',
      observacao TEXT DEFAULT '',
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS impressoras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      ip TEXT DEFAULT '',
      selb TEXT DEFAULT '',
      localizacao TEXT DEFAULT '',
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_chamados_status ON chamados(status);
    CREATE INDEX IF NOT EXISTS idx_chamados_admin ON chamados(admin_responsavel_id);
    CREATE INDEX IF NOT EXISTS idx_chamados_usuario ON chamados(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_chamados_criado ON chamados(criado_em);
    CREATE INDEX IF NOT EXISTS idx_mensagens_chamado ON mensagens_chamado(chamado_id);
    CREATE INDEX IF NOT EXISTS idx_historico_chamado ON historico_chamados(chamado_id);
    CREATE INDEX IF NOT EXISTS idx_itens_tipo ON itens(tipo);
  `);

  seedInventario();
  seedEstoque();

  return db;
}

// ── Seed data ─────────────────────────────────────────────

const SEED_INVENTARIO = [
  ["ADM AEB","NATALIA","I5 8400","8GB","WIN 11","SSD 256","H & B 2019","","NOTEBOOK","DELL","","","","",""],
  ["ALMOXARIFADO","ADALBERTO","I5 12500","8GB","WIN 11","SSD 256","H & B 2021","2WJDYR2","VGA-D.P.","AOC","NOVO","ALMOXARIFADO-01","2024","",""],
  ["BANQUETES","VANDERLAN","I5 14500T","8GB","WIN 11","SSD 240","H & B 2024","","VGA-D.P.","DELL","NOVO","BANQUETES-10","ABRIL 2026","",""],
  ["BANQUETES","LENE","I5 8400","8GB","WIN 11","HD 1TB","H & B 2016","","VGA-HDMI","AOC","","BANQUETES-02","","TROCAR PARA SSD","CONCLUIDO"],
  ["BANQUETES","ANA PAULA","I5 8400","8GB","WIN 11","HD 1TB","H & B 2016","","VGA-DVI","","","BANQUETES-01","","TROCAR PARA SSD","CONCLUIDO"],
  ["ALMOXARIFADO","ISAAC","I5 14500T","8GB","WIN 11","SSD 240","H & B 2024","","VGA-D.P. / VGA-HDMI","DELL/LG","NOVO","SUPRIMENTOS-01","MARÇO 2026","",""],
  ["CONTROLADORIA","ERICA","I5 14500T","8GB","WIN 11","SSD 240","H & B 2024","","HDMI / VGA -D.P.","DELL / 3 TECH","NOVO","FATURAMENTO-01","MARÇO 2026","",""],
  ["BANQUETES","NATECIA","I5 13500","8GB","WIN 11","SSD 256","H & B 2024","","VGA","DELL","NOVO","MANUT-01","2025","",""],
  ["COZINHA","ERIKA","I5 14500T","8GB","WIN 11","SSD 240","H & B 2024","","VGA-D.P.","DELL","NOVO","ADMCOZ-01","ABRIL 2026","",""],
  ["GOVERNANCA","GOV 2","I5 8500","8GB","WIN 11","SSD 256","H & B 2019","","VGA-DVI (ADAPTADOR HDMI-VGA)","DELL","","GOVERNACA-02","","",""],
  ["GUEST","KAMILE","I5 14500T","8GB","WIN 11","SSD 240","H & B 2024","","HDMI / VGA","SOYO","NOVO","GUEST-01","MARÇO 2026","",""],
  ["RH","MIKA","I5 14500T","8GB","WIN 11","SSD 240","H & B 2024","","VGA / D.P","DELL","NOVO","QUALIDADE-01","ABRIL 2026","",""],
  ["BUSINESS","BUSINESS","I5 8400","8GB","WIN 11","SSD 256","H & B 2019","","AIO","DELL","","BUSINESS 1","","",""],
  ["BUSINESS","BUSINESS","I5 8400","8GB","WIN 11","SSD 256","H & B 2019","","AIO","DELL","","BUSINESS 2","","",""],
  ["SEGURANÇA","SEGURANCA","I5 8500","8GB","WIN 11","SSD 256","H & B 2019","","VGA-DVI-HDMI / VGA-D.P. (CABO DVI-HDMI)","LENOVO/ DELL","","PORT-SEG-01","ABRIL 2026","",""],
  ["COMERCIAL","ROGERIO","I5 13500","8GB","WIN 11","SSD 256","H & B 2021","HDZGX14","VGA-D.P. / VGA-DVI","DELL/SAMSUNG","NOVO","VENDAS-05","2023","",""],
  ["COMERCIAL","PATRICIA","I5 12800","8GB","WIN 11","SSD 120","H & B 2021","GHXG7W3","VGA-HDMI / VGA-D.P.","DELL/DELL","NOVO","VENDAS-010","2023","",""],
  ["SEGURANÇA","JUSSIEUDO","I5 10500","8GB","WIN 11","SSD 120","H & B 2021","","VGA / D.P","DELL","NOVO","SEGURANCA-01","ABRIL 2026","ANTIGO DO FELIPE",""],
  ["COMERCIAL","BRIELE","I5 12800","8GB","WIN 11","SSD 240","H & B 2021","HHXG7W3","VGA-D.P. / VGA-HDMI-DVI","DELL/SAMSUNG","NOVO","VENDAS-03","2023","","CONCLUIDO"],
  ["COZINHA","CHEF","I3 3240","8GB","WIN 8.1","500","H & B 2016","5F710Y1","VGA-D.P.","DELL","","COZINHA-01","","","NAO TROCAR"],
  ["COMPRAS","DANIELLE","I5 13500","8GB","WIN 11","SSD 256","H & B 2021","DDZGX14","VGA-HDMI / VGA-HDMI","DELL/GOLDENTEC","NOVO","COMPRAS-03","2024","",""],
  ["COMPRAS","JEFFERSON","I5 13500","8GB","WIN 11","SSD 256","H & B 2021","GDZGY14","VGA-HDMI / VGA-D.P.","DELL/GOLDENTEC","NOVO","C-COMPRAS-01","2023","",""],
  ["COMPRAS","CLAUDIANE","I5 12500","8GB","WIN 11","SSD 256","H & B 2021","FHXG7W3","VGA-D.P. / HDMI-VGA","DELL/AOC","NOVO","COMPRAS-02","2024","",""],
  ["CONCIERGE","RECEPCAO","I5 13500","8GB","WIN 11","SSD 256","H & B 2021","OKSSV44","AIO","DELL","NOVO","CONCIERGE-01","2024","",""],
  ["CONTROLADORIA","DRIELE","I5 10500","8GB","WIN 10","SSD 120","H & B 2021","HKJVZQ3","VGA-D.P.","DELL","NOVO","CONTROL-02","2023","","FORMATAR"],
  ["CONTROLADORIA","LETICIA","I5 13500","8GB","WIN 11","SSD 256","H & B 2024","9HV4874","VGA-D.P. / VGA-HDMI","DELL","NOVO","CONTROL-011","2025","",""],
  ["CONTROLADORIA","SILVIA","I5 14500T","8GB","WIN 11","SSD 240","H & B 2024","CDZGX14","VGA-D.P. / VGA-HDMI","DELL/GOLDENTEC","NOVO","CONTROL-04","ABRIL 2026","",""],
  ["CONTROLADORIA","GREGORE","I5 10500","8GB","WIN 11","SSD 256","H & B 2021","GKJVZQ3","VGA-D.P. / VGA-HDMI","DELL/DELL","NOVO","CONTROL-05","2024","","CONCLUIDO"],
  ["BANQUETES","MAIA","I3 3240","6GB","WIN 8","500","H & B 2013","","VGA","DELL","","BANQUETES-04","","",""],
  ["CONTROLADORIA","MANUEL","I5 12500","8GB","WIN 11","SSD 256","H & B 2021","5S4P4V4","VGA-HDMI","AOC","NOVO","CONTROL-03","2023","",""],
  ["BUSINESS","BUSINESS","I3 4150","4GB","WIN 8.1","500","","JS5FCP2","AIO","DELL","","BUSINESS 3","","",""],
  ["CONTROLADORIA","APRENDIZ","I3 3240","8GB","WIN 8.1","500","H & B 2013","B94SZ02","VGA-DVI","DELL","","CONTROL-10","","",""],
  ["CONTROLADORIA","FELIPE","I5 14500T","8GB","WIN 11","SSD 240","H & B 2024","","VGA-D.P. / VGA-HDMI","DELL/3M","NOVO","CONTROLE-01","MARÇO 2026","",""],
  ["CONTROLADORIA","APRENDIZ","I3 3240","6GB","WIN 8.1","500","H & B 2013","HD720Y1","VGA-DVI","DELL","","CONTROL-08","","",""],
  ["GOVERNANCA","ROUPARIA","I3 3240","6GB","WIN 8.1","1 TB","H & B 2013","B4XGJ82","VGA","DELL","","ROUPARIA-01","","",""],
  ["DIRETORIA","DIONISIO","I5 8400","8GB","WIN 11","HD 1TB","H & B 2021","","VGA-D.P.","DELL","","DIRETORIA","","TROCAR PARA SSD","CONCLUIDO"],
  ["EVENTOS SOCIAIS","PRISCILA","I5 12500","8GB","WIN 11","SSD0256","H & B 2021","2S4P4V3","VGA-D.P.","DELL","NOVO","GER-SOCIAIS-01","2023","",""],
  ["EVENTOS SOCIAIS","EDUARDA","I5 8400","8GB","WIN 11","HD 1TB","H & B 2016","2WTJYR2","VGA","SAMSUNG","","EVENTOS-02","2025","TROCAR PARA SSD","CONCLUIDO"],
  ["GER EVENTOS","CATARINA","I5 10500","8GB","WIN 11","SSD 256","H & B 2019","","NOTEBOOK","HP","","GER-EVENTOS-01","","",""],
  ["GERENCIA GERAL","PHILLIPE","I5 12500","8GB","WIN 11","SSD0256","H & B 2021","1S4P4V3","VGA-D.P.","DELL","NOVO","GER-GERAL-02","2023","",""],
  ["GER-RECEPÇÃO","MARIANA","I5 8500","8GB","WIN 11","SSD 256","H & B 2019","3FT87Z2","VGA-D.P. / VGA-DVI (ADAPTADOR HDMI-VGA)","DELL/LG","","GER-RECEPCAO-01","","","CONCLUIDO"],
  ["MANUTENÇÃO","OTRS","I3 4160","8GB","WIN 8.1","500","H & B 2013","","VGA","SAMSUNG","","PCM-ATEND-01","","",""],
  ["NUTRIÇÃO","ESTAGIARIOS","I3 4160","8GB","WIN 10","500","H & B 2016","","VGA","SAMSUNG","","NUTRICAO-03","","TROCAR PARA SSD",""],
  ["PISCINA","PISCINA","I3 7100","8GB","WIN 8.1","500","H & B 2016","","VGA -DVI","DELL","","PDV-PISCINA","","TROCAR PARA SSD",""],
  ["GOVERNANCA","PAULA","I5 10500","8GB","WIN 11","SSD 256","H & B 2021","4S4P4V3","VGA-D.P.","DELL","NOVO","GOVERNACA-01","2023","",""],
  ["GUEST","RODRIGO","I5 8400","8GB","WIN 11","1TB","H & B 2019","","VGA","DELL","","CENTRAL-02","","TROCAR PARA SSD",""],
  ["RESERVAS","APRENDIZ","I3 3240","6GB","WIN 8","500","H & B 2013","B57ZZX1","VGA","DELL","","RESERVAS-05","","",""],
  ["RH","RAQUEL","I5 14500T","16GB","WIN 11","SSD 240","H & B 2024","","NOTEBOOK","DELL","NOVO","PROCESSOS-01","MARÇO 2026","",""],
  ["MAITRE","CHAVES","I5 8400","8GB","WIN 11","SSD 256","H & B 2013","","VGA","DELL","","AEB-01","ABRIL 2026","ESTA COM SSD","CONCLUIDO"],
  ["MANGOSTIN","MANGOSTIN","I5 13500","8GB","WIN 11","SSD 256","H & B 2021","","AIO","DELL","NOVO","MANGOSTIN-001","2025","",""],
  ["MANUTENÇÃO","JESSICA","I5 13500","8GB","WIN 11","SSD 256","H & B 2024","","VGA-HDMI / VGA-HDMI","DELL","NOVO","GER-MANUT-01","2025","",""],
  ["MANUTENÇÃO","RENAN","I5 13500","8GB","WIN 11","SSD 256","H & B 2024","","VGA / HDMI","DELL/ LG","NOVO","MANUT-01","2025","",""],
  ["STEWARD","STEWARD","I3 3240","8GB","WIN 8.1","500","H & B 2013","","VGA","DELL","","STEWARD-01","","",""],
  ["MANUTENÇÃO","ANA","I5 12500","8GB","WIN 11","SSD0256","H & B 2021","","VGA-D.P. / VGA-HDMI","DELL","NOVO","","2023","MUDAR HOSTNAME",""],
  ["ALMOXARIFADO","ESTAGIARIOS","I3 7100","8GB","WIN 11","500","H & B 2016","","VGA-DVI","DELL","","ALMOX-02","","TROCAR PARA SSD","CONCLUIDO"],
  ["MESA VIP","RECEPCAO","I5 13500","8GB","WIN 11","SSD 256","H & B 2021","1Z143Z3","AIO","DELL","NOVO","MESAVIP-01","2023","",""],
  ["MUCURIPE","MUCURIPE","I5 8400","8GB","WIN 11","SSD256","H & B 2019","","AIO","DELL","","PDV-MUCURIPE","","","CONCLUIDO"],
  ["COMERCIAL","FARNEY","I3 7100","8GB","WIN 11","500","H & B 2016","5STMCK2","VGA-HDMI","AOC","","VENDAS-04","","TROCAR PARA SSD","CONCLUIDO"],
  ["NUTRIÇÃO","GLAUBER","I5 8400","8GB","WIN 11","HD 1TB","H & B 2021","","VGA-DVI","LG","","NUTRICAO-01","2025","TROCAR PARA SSD","CONCLUIDO"],
  ["OBRA","DIEGO","I5 8400","8GB","WIN 11","HD 1TB","H & B 2016","2XNGYR2","VGA-DVI","DELL","","MANUTENCAO-01","","TROCAR PARA SSD","CONCLUIDO"],
  ["OBRA","EDEN","I5 13500","8GB","WIN 11","SSD 256","H & B 2021","9DZGX14","VGA-D.P.","DELL","NOVO","ENGENHARIA-01","2024","",""],
  ["GOVERNANCA","GOV 1","I3 7100","8GB","WIN 11","500","H & B 2019","3FV27Z2","VGA-D.P.","DELL","","GOV-004","","TROCAR PARA SSD","CONCLUIDO"],
  ["PISCINA 2","PISCINA","I5 13500","8GB","WIN 11","SSD 256","H & B 2021","","AIO","DELL","NOVO","PDV-PISCINA-2","2024","",""],
  ["RECEPÇÃO 1","RECEPCAO","I5 10500","8GB","WIN 11","SSD 256","H & B 2021","","AIO","DELL","","RECEPCAO-01","","","CONCLUIDO"],
  ["RECEPÇÃO 2","RECEPCAO","I5 8400","8GB","WIN 11","SSD 256","H & B 2021","","AIO","DELL","","RECEPCAO-052","","","CONCLUIDO"],
  ["RECEPÇÃO 3","RECEPCAO","I5 10500","8GB","WIN 11","SSD 256","H & B 2016","","AIO","DELL","","RECEPCAO-02","","","CONCLUIDO"],
  ["RECEPÇÃO 4","RECEPCAO","I5 8400","8GB","WIN 11","SSD 256","H & B 2019","","AIO","DELL","","RECEPCAO-050","","","CONCLUIDO"],
  ["RECEPÇÃO 5","RECEPCAO","I5 8400","8GB","WIN 11","SSD 256","H & B 2019","","AIO","DELL","","RECEPCAO-030","","","CONCLUIDO"],
  ["RESERVAS","GABRIEL","I5 13500","8GB","WIN 11","SSD 256","H & B 2021","FDZGX14","VGA-D.P. / VGA-DVI","DELL/DELL","NOVO","RESERVAS-02","2023","",""],
  ["RESERVAS","ROSANA","I5 13500","8GB","WIN 11","SSD 256","H & B 2021","BDZGX14","VGA-D.P. / VGA","DELL/DELL","NOVO","RESERVAS-01","2024","",""],
  ["LOBBY BAR","LOBBY BAR","I3 7100","8GB","WIN 11","500","H & B 2016","JS5DMN2","AIO","DELL","","TIBKP-03","2025","TROCAR PARA SSD","CONCLUIDO"],
  ["RESERVAS","APRENDIZ","I3 3240","6GB","WIN 8.1 - 10","500","H & B 2013","FD45Z02","VGA-DVI / VGA","DELL","","RESERVAS-04","","","8.1 PARA WIN 10"],
  ["REVENUE","JULIA","I5 12800","8GB","WIN 11","SSD 120","H & B 2021","JHXG7W3","VGA-HDMI / VGA-D.P.","DELL/AOC","NOVO","REVENUE-01","2023","",""],
  ["SALA DE LEITURA 3","CLUBINHO","I3 3240","8GB","WIN 8.1","500","H & B 2013","","VGA-DVI","DELL","","","","MUDAR HOSTNAME",""],
  ["RH","SAYMON","I5 14500T","8GB","WIN 11","SSD 240","H & B 2024","","VGA /D.P.","DELL","NOVO","GESTAO-01","ABRIL 2026","",""],
  ["RH","THAIS","I5 13500","8GB","WIN 11","SSD 256","H & B 2024","354P4V3","VGA-DVI","DELL","NOVO","GP-02","2025","",""],
  ["TI","CAIO","I3 4160","8GB","WIN 8.1","500","H & B 2016","","VGA","DELL","","","","",""],
  ["RH","ALINE","I5 12500","8GB","WIN 11","SSD 256","H & B 2021","CB730Y1","VGA-HDMI","DELL","NOVO","GER-RH-01","2023","",""],
  ["BKP TI","","I3 4160","8GB","WIN 8.1","500","H & B 2016","","AIO","DELL","","","","MUDAR HOSTNAME","RECOLHIDO"],
  ["BKP AIO","BUSINESS","I3 7100","8GB","WIN 11","500","nao tem","","AIO","DELL","","BKP-05","","TROCAR PARA SSD","CONCLUIDO"],
  ["BKP AIO","BUSINESS","I3 7100","8GB","WIN 11","500","H & B 2016","","AIO","DELL","","TIBKP-04","2025","TROCAR PARA SSD","CONCLUIDO"],
  ["GERENCIA GERAL","THAIS","I5 13500","8GB","WIN 11","SSD 256","H & B 2024","59ZRB74","VGA-D.P. / VGA-HDMI-DVI","DELL/SAMSUNG","NOVO","GER-GERAL-02","2025","",""],
  ["SALA DE LEITURA 1","CLUBINHO","I3 3240","4GB","WIN 8.1","500","H & B 2013","","AIO","LG","","","","",""],
  ["SALA DE LEITURA 2","CLUBINHO","I3 3240","4GB","WIN 8.1","320","H & B 2013","","AIO","LG","","","","",""],
  ["SPA","SPA","I5 13500","8GB","WIN 11","SSD 256","H & B 2024","","AIO","DELL","NOVO","SPA-01","2025","",""],
  ["TI","MARCIO","I5 14500T","8GB","WIN 11","SSD 240","H & B 2024","","VGA- HDMI / VGA - DVI","LENOVO / AOC","NOVO","TI-02","MARÇO 2026","",""],
  ["TI","RICHARD","I7-1355U","16GB","WIN 11","SSD 256","H & B 2024","","NOTEBOOK","DELL","NOVO","TI-01","2025","",""],
  ["TOTEM BKP","ADMINISTRADOR","I3 3240","8GB","WIN 7","500","nao tem","","","","","T-BACKUP","","",""],
  ["TOTEM COBERTURA","ADMINISTRADOR","I5 14500T","8GB","WIN 11","SSD 240","nao tem","","TV 32","SAMSUNG","NOVO","T-COBERTURA","","",""],
  ["TOTEM MOVEL","ADMINISTRADOR","I3 3240","8GB","WIN 7","500","nao tem","","AIO","DELL","","T-MOVEL","","",""],
  ["TOTEM RECEPCAO","ADMINISTRADOR","I5 14500T","8GB","WIN 11","SSD 240","nao tem","","TV 43","LG","NOVO","T-RECEPCAO","MARÇO 2026","",""],
  ["TOTEM SPAZIO","ADMINISTRADOR","I5 14500T","8GB","WIN 11","SSD 240","nao tem","","TV 50","LG","NOVO","T-SPAZIO","MARÇO 2026","",""],
  ["MARKETING","MARKETING","Apple M4","16GB","macOS Air M4","SSD 256","nao tem","","MACBOOK","APPLE","NOVO","","MARÇO 2026","","USUARIO ADMIN"],
];

const SEED_ESTOQUE = [
  { nome: 'RICOH Aficio SP 3510/3500', tipo: 'toner_mono', qtd_preto: 4, urgente: 0 },
  { nome: 'RICOH SP 3710SF / 320F', tipo: 'toner_mono', qtd_preto: 5, urgente: 0 },
  { nome: 'Canon iR C3226', tipo: 'toner_color', qtd_preto: 2, qtd_ciano: 2, qtd_magenta: 1, qtd_amarelo: 1, urgente: 0 },
  { nome: 'Epson C5790', tipo: 'toner_color', qtd_preto: 0, qtd_ciano: 1, qtd_magenta: 2, qtd_amarelo: 2, urgente: 0 },
  { nome: 'Epson L6490', tipo: 'toner_color', qtd_preto: 0, qtd_ciano: 0, qtd_magenta: 0, qtd_amarelo: 0, urgente: 1 },
  { nome: 'HP M479fdw', tipo: 'toner_color', qtd_preto: 1, qtd_ciano: 1, qtd_magenta: 1, qtd_amarelo: 1, urgente: 0 },
  { nome: 'Epson C5890', tipo: 'toner_color', qtd_preto: 3, qtd_ciano: 3, qtd_magenta: 3, qtd_amarelo: 3, urgente: 0 },
  { nome: 'Resmas A4', tipo: 'resma', qtd_geral: 13, urgente: 0 },
];

const SEED_IMPRESSORAS = [
  { nome: 'RICOH Aficio SP 3710DN', ip: '10.1.7.17', selb: '2IY9', localizacao: 'GER-RECEPCAO' },
  { nome: 'RICOH SP 3710SF', ip: '10.1.7.87', selb: 'JPD3', localizacao: 'MANUTENCAO' },
  { nome: 'RICOH SP 3710SF', ip: '10.1.7.219', selb: '2EP2', localizacao: 'RECEPCAO' },
  { nome: 'Canon iR C3226', ip: '10.1.7.61', selb: '2EP1', localizacao: 'MARKETING' },
  { nome: 'RICOH M 320F', ip: '10.1.7.82', selb: '2EP7', localizacao: 'CONTROLADORIA' },
  { nome: 'RICOH SP 3710SF', ip: '10.1.7.16', selb: '2QC9', localizacao: 'ENGENHARIA' },
  { nome: 'EPSON COLOR A4 WF-C5790', ip: '10.1.7.158', selb: 'RFA2', localizacao: 'BANQUETES' },
  { nome: 'RICOH Aficio SP 3510DN', ip: '10.1.7.155', selb: '2EQ4', localizacao: 'SPA' },
  { nome: 'RICOH SP 3710SF', ip: '10.1.7.131', selb: 'JST4', localizacao: 'GUEST' },
  { nome: 'Epson WF-C5890', ip: '10.1.7.67', selb: '3Y24', localizacao: 'RH' },
  { nome: 'RICOH SP 3710SF', ip: '10.1.7.95', selb: '2KA7', localizacao: 'STEWARD' },
  { nome: 'HP M479FDW', ip: '10.1.7.19', selb: '2BL6', localizacao: 'EVENTOS-SOCIAIS' },
  { nome: 'RICOH SP 3710SF', ip: '10.1.7.40', selb: '2EP5', localizacao: 'GOVERNANCA' },
  { nome: 'RICOH SP 3710SF', ip: '10.1.7.213', selb: '2EP4', localizacao: 'COMPRAS' },
  { nome: 'RICOH Aficio SP 3510SF', ip: '10.1.7.21', selb: '2EQ8', localizacao: 'NUTRICAO' },
  { nome: 'RICOH SP 3710SF', ip: '10.1.7.219', selb: '2EP6', localizacao: 'RECEPCAOBKP' },
  { nome: 'RICOH SP 3710SF', ip: '10.1.7.107', selb: 'JNI9', localizacao: 'RESERVAS' },
  { nome: 'EPSON L6490', ip: '10.100.15.15', selb: '08MW', localizacao: 'BUSSINES' },
  { nome: 'RICOH SP 3710SF', ip: '10.1.7.53', selb: '2EP3', localizacao: 'COZINHA' },
  { nome: 'RICOH SP 3710SF', ip: '', selb: 'ADE4', localizacao: 'RECEPCAO' },
];

function seedInventario() {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as cnt FROM inventario_micros').get();
  if (count.cnt > 0) return;

  const stmt = db.prepare(`
    INSERT INTO inventario_micros
      (setor, usuario, processador, memoria, sistema_operacional, hd_ssd, office, tag,
       entradas_monitor, modelo_monitor, status, hostname, data_troca, observacao, atualizacao_win11)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const inserir = db.transaction((rows) => {
    for (const r of rows) stmt.run(...r);
  });
  inserir(SEED_INVENTARIO);
  console.log(`[DB] Inventário: ${SEED_INVENTARIO.length} registros de seed inseridos.`);
}

const SEED_PERIFERICOS = [
  { nome: 'Teclado com Fio',            qtd_geral: 11, observacao: '' },
  { nome: 'Teclado sem Fio',            qtd_geral:  0, observacao: '' },
  { nome: 'Mouse com Fio',              qtd_geral: 13, observacao: '' },
  { nome: 'Mouse sem Fio',              qtd_geral:  0, observacao: '' },
  { nome: 'Adaptador WiFi',             qtd_geral:  1, observacao: 'em uso Richard' },
  { nome: 'Adaptador de Rede',          qtd_geral:  1, observacao: 'em uso Marcio' },
  { nome: 'Monitor VGA',                qtd_geral:  1, observacao: 'VGA' },
  { nome: 'Monitor VGA-DVI',            qtd_geral:  0, observacao: 'VGA - DVI' },
  { nome: 'Monitor VGA-HDMI',           qtd_geral:  0, observacao: 'VGA - HDMI' },
  { nome: 'Monitor VGA-DisplayPort',    qtd_geral:  2, observacao: 'VGA - D.P.' },
  { nome: 'Memória 8GB DDR4 Note',      qtd_geral:  1, observacao: 'Compatível com notebooks DDR4 e All-in-One DDR4' },
  { nome: 'Memória 8GB DDR4',           qtd_geral:  0, observacao: '' },
  { nome: 'Memória 8GB DDR3',           qtd_geral:  0, observacao: '' },
  { nome: 'Memória 4GB DDR3',           qtd_geral:  0, observacao: '' },
  { nome: 'Memória 2GB DDR3',           qtd_geral:  0, observacao: '' },
  { nome: 'Processador Core i5 6ª Gen', qtd_geral:  1, observacao: 'Socket 1151' },
  { nome: 'Patch Cord Vermelho 1,5 m',  qtd_geral:  5, observacao: '' },
  { nome: 'Patch Cord Vermelho 2,5 m',  qtd_geral:  1, observacao: '' },
  { nome: 'Patch Cord Amarelo 1,5 m',   qtd_geral:  5, observacao: '' },
  { nome: 'Patch Cord Amarelo 2,5 m',   qtd_geral:  0, observacao: '' },
  { nome: 'Patch Cord Verde 1,5 m',     qtd_geral:  3, observacao: '' },
  { nome: 'Patch Cord Verde 2,5 m',     qtd_geral:  0, observacao: '' },
  { nome: 'Patch Cord Azul 1,5 m',      qtd_geral:  5, observacao: '' },
  { nome: 'Patch Cord Azul 2,5 m',      qtd_geral:  0, observacao: '' },
  { nome: 'Conector RJ45 Macho',        qtd_geral:  0, observacao: '' },
  { nome: 'Conector RJ45 Fêmea',        qtd_geral: 20, observacao: '' },
  { nome: 'Leitor NFC',                 qtd_geral:  2, observacao: '' },
  { nome: 'Headset com Fio',            qtd_geral:  0, observacao: 'Backup' },
  { nome: 'Headset sem Fio',            qtd_geral:  0, observacao: '' },
  { nome: 'Cabo HDMI 10 m',             qtd_geral:  1, observacao: 'Backup' },
  { nome: 'Cabo USB x USB',             qtd_geral:  1, observacao: '' },
  { nome: 'Caixinha de Som',            qtd_geral:  1, observacao: '' },
  { nome: 'Bateria 2032',               qtd_geral: 20, observacao: '' },
  { nome: 'Bateria 2025',               qtd_geral: 15, observacao: '' },
  { nome: 'Cabo DisplayPort',           qtd_geral:  0, observacao: '' },
];

const SEED_RESERVA = [
  { nome: 'Dell Novo',          qtd_geral:  1, especificacao: 'I5, 13ºG, 8GB, SSD240',       observacao: 'Mini PC de teste' },
  { nome: 'Dell Usado',         qtd_geral:  2, especificacao: 'I3, 8GB, 3ºG, HD500GB',        observacao: 'no bc AIO' },
  { nome: 'Dell Usado',         qtd_geral:  8, especificacao: 'I3, 6GB, 3ºG, HD500GB',        observacao: 'bkps' },
  { nome: 'Câmeras Usadas',     qtd_geral:  3, especificacao: '',                              observacao: '' },
  { nome: 'Câmeras Novas',      qtd_geral:  3, especificacao: '',                              observacao: '' },
  { nome: 'Switch Fortinet',    qtd_geral:  1, especificacao: '24P POE',                       observacao: '' },
  { nome: 'Switch HP',          qtd_geral:  5, especificacao: '',                              observacao: '' },
  { nome: 'Monitor 40"',        qtd_geral:  1, especificacao: '',                              observacao: 'Totem antigo Recepção, disponibilizado na Casa Amarela' },
  { nome: 'Nobreak Novo',       qtd_geral:  0, especificacao: '',                              observacao: '' },
  { nome: 'Nobreak Usado',      qtd_geral:  4, especificacao: '',                              observacao: '' },
  { nome: 'Impressora Térmica', qtd_geral:  2, especificacao: '',                              observacao: '' },
  { nome: 'AP Fortinet',        qtd_geral:  1, especificacao: '421E',                          observacao: '' },
  { nome: 'AP Fortinet',        qtd_geral:  2, especificacao: '221E',                          observacao: 'Backup' },
  { nome: 'Celulares',          qtd_geral:  2, especificacao: 'Samsung A32, Moto G35',         observacao: '' },
];

function seedEstoque() {
  const db = getDb();
  const countItens = db.prepare('SELECT COUNT(*) as cnt FROM estoque_itens').get();
  if (countItens.cnt === 0) {
    const stmtItem = db.prepare(`
      INSERT INTO estoque_itens (nome, tipo, qtd_preto, qtd_ciano, qtd_magenta, qtd_amarelo, qtd_geral, urgente)
      VALUES (@nome, @tipo, @qtd_preto, @qtd_ciano, @qtd_magenta, @qtd_amarelo, @qtd_geral, @urgente)
    `);
    const inserirItens = db.transaction((rows) => {
      for (const r of rows) {
        stmtItem.run({
          qtd_preto: 0, qtd_ciano: 0, qtd_magenta: 0, qtd_amarelo: 0, qtd_geral: 0,
          ...r,
        });
      }
    });
    inserirItens(SEED_ESTOQUE);
    console.log(`[DB] Estoque: ${SEED_ESTOQUE.length} itens de seed inseridos.`);
  }

  // Seed periféricos (tipo='periferico')
  const countPerif = db.prepare("SELECT COUNT(*) as cnt FROM estoque_itens WHERE tipo = 'periferico'").get();
  if (countPerif.cnt === 0) {
    const stmtPerif = db.prepare(`
      INSERT INTO estoque_itens (nome, tipo, qtd_geral, observacao) VALUES (@nome, 'periferico', @qtd_geral, @observacao)
    `);
    const inserirPerif = db.transaction((rows) => { for (const r of rows) stmtPerif.run(r); });
    inserirPerif(SEED_PERIFERICOS);
    console.log(`[DB] Periféricos: ${SEED_PERIFERICOS.length} itens de seed inseridos.`);
  }

  // Migration: split Mouse/Teclado/Headset into com fio / sem fio
  const splits = [
    { antigo: 'Mouse',           novo: 'Mouse com Fio',    semFio: 'Mouse sem Fio' },
    { antigo: 'Teclado',         novo: 'Teclado com Fio',  semFio: 'Teclado sem Fio' },
    { antigo: 'Headset Logitech',novo: 'Headset com Fio',  semFio: 'Headset sem Fio' },
  ];
  for (const s of splits) {
    const semFioExiste = db.prepare("SELECT id FROM estoque_itens WHERE nome = ? AND tipo = 'periferico'").get(s.semFio);
    if (!semFioExiste) {
      const antigo = db.prepare("SELECT id FROM estoque_itens WHERE nome = ? AND tipo = 'periferico'").get(s.antigo);
      if (antigo) db.prepare("UPDATE estoque_itens SET nome = ? WHERE id = ?").run(s.novo, antigo.id);
      db.prepare("INSERT INTO estoque_itens (nome, tipo, qtd_geral, observacao) VALUES (?, 'periferico', 0, '')").run(s.semFio);
    }
  }

  // Seed reserva (tipo='reserva')
  const countReserva = db.prepare("SELECT COUNT(*) as cnt FROM estoque_itens WHERE tipo = 'reserva'").get();
  if (countReserva.cnt === 0) {
    const stmtRes = db.prepare(`
      INSERT INTO estoque_itens (nome, tipo, qtd_geral, especificacao, observacao) VALUES (@nome, 'reserva', @qtd_geral, @especificacao, @observacao)
    `);
    const inserirRes = db.transaction((rows) => { for (const r of rows) stmtRes.run(r); });
    inserirRes(SEED_RESERVA);
    console.log(`[DB] Reserva: ${SEED_RESERVA.length} itens de seed inseridos.`);
  }

  const countImpressoras = db.prepare('SELECT COUNT(*) as cnt FROM impressoras').get();
  if (countImpressoras.cnt === 0) {
    const stmtImp = db.prepare(`
      INSERT INTO impressoras (nome, ip, selb, localizacao)
      VALUES (@nome, @ip, @selb, @localizacao)
    `);
    const inserirImpressoras = db.transaction((rows) => {
      for (const r of rows) stmtImp.run(r);
    });
    inserirImpressoras(SEED_IMPRESSORAS);
    console.log(`[DB] Impressoras: ${SEED_IMPRESSORAS.length} registros de seed inseridos.`);
  }
}

// ── Inventário de Micros ──────────────────────────────────

function listarInventario(filtros = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM inventario_micros WHERE 1=1';
  const params = [];
  if (filtros.setor) { sql += ' AND setor LIKE ?'; params.push(`%${filtros.setor}%`); }
  if (filtros.status) { sql += ' AND status LIKE ?'; params.push(`%${filtros.status}%`); }
  if (filtros.search) {
    sql += ' AND (setor LIKE ? OR usuario LIKE ? OR hostname LIKE ?)';
    const s = `%${filtros.search}%`;
    params.push(s, s, s);
  }
  sql += ' ORDER BY setor ASC, usuario ASC';
  return db.prepare(sql).all(...params);
}

function buscarInventarioPorId(id) {
  return getDb().prepare('SELECT * FROM inventario_micros WHERE id = ?').get(id);
}

function criarInventario(dados) {
  const result = getDb().prepare(`
    INSERT INTO inventario_micros
      (setor, usuario, processador, memoria, sistema_operacional, hd_ssd, office, tag,
       entradas_monitor, modelo_monitor, status, hostname, data_troca, observacao, atualizacao_win11)
    VALUES
      (@setor, @usuario, @processador, @memoria, @sistema_operacional, @hd_ssd, @office, @tag,
       @entradas_monitor, @modelo_monitor, @status, @hostname, @data_troca, @observacao, @atualizacao_win11)
  `).run({
    setor: '', usuario: '', processador: '', memoria: '', sistema_operacional: '',
    hd_ssd: '', office: '', tag: '', entradas_monitor: '', modelo_monitor: '',
    status: '', hostname: '', data_troca: '', observacao: '', atualizacao_win11: '',
    ...dados,
  });
  return result.lastInsertRowid;
}

function atualizarInventario(id, dados) {
  const campos = [];
  const values = [];
  const CAMPOS = ['setor','usuario','processador','memoria','sistema_operacional','hd_ssd','office','tag',
                  'entradas_monitor','modelo_monitor','status','hostname','data_troca','observacao','atualizacao_win11'];
  for (const campo of CAMPOS) {
    if (dados[campo] !== undefined) { campos.push(`${campo} = ?`); values.push(dados[campo]); }
  }
  if (campos.length === 0) return;
  campos.push('atualizado_em = CURRENT_TIMESTAMP');
  values.push(id);
  getDb().prepare(`UPDATE inventario_micros SET ${campos.join(', ')} WHERE id = ?`).run(...values);
}

function deletarInventario(id) {
  getDb().prepare('DELETE FROM inventario_micros WHERE id = ?').run(id);
}

// ── Estoque de Itens ──────────────────────────────────────

function listarEstoqueItens() {
  return getDb().prepare('SELECT * FROM estoque_itens ORDER BY nome ASC').all();
}

function buscarEstoqueItemPorId(id) {
  return getDb().prepare('SELECT * FROM estoque_itens WHERE id = ?').get(id);
}

function criarEstoqueItem(dados) {
  const result = getDb().prepare(`
    INSERT INTO estoque_itens (nome, tipo, qtd_preto, qtd_ciano, qtd_magenta, qtd_amarelo, qtd_geral, urgente, observacao, especificacao)
    VALUES (@nome, @tipo, @qtd_preto, @qtd_ciano, @qtd_magenta, @qtd_amarelo, @qtd_geral, @urgente, @observacao, @especificacao)
  `).run({
    tipo: 'outro', qtd_preto: 0, qtd_ciano: 0, qtd_magenta: 0, qtd_amarelo: 0, qtd_geral: 0, urgente: 0, observacao: '', especificacao: '',
    ...dados,
  });
  return result.lastInsertRowid;
}

function atualizarEstoqueItem(id, dados) {
  const campos = [];
  const values = [];
  if (dados.nome !== undefined)          { campos.push('nome = ?');          values.push(dados.nome); }
  if (dados.tipo !== undefined)          { campos.push('tipo = ?');          values.push(dados.tipo); }
  if (dados.urgente !== undefined)       { campos.push('urgente = ?');       values.push(dados.urgente); }
  if (dados.observacao !== undefined)    { campos.push('observacao = ?');    values.push(dados.observacao); }
  if (dados.especificacao !== undefined) { campos.push('especificacao = ?'); values.push(dados.especificacao); }
  if (campos.length === 0) return;
  campos.push('atualizado_em = CURRENT_TIMESTAMP');
  values.push(id);
  getDb().prepare(`UPDATE estoque_itens SET ${campos.join(', ')} WHERE id = ?`).run(...values);
}

function deletarEstoqueItem(id) {
  getDb().prepare('DELETE FROM estoque_itens WHERE id = ?').run(id);
}

function registrarMovimentacao(item_id, tipo, cor, quantidade, admin_nome, observacao, chamado_id) {
  const db = getDb();
  db.prepare(`
    INSERT INTO estoque_movimentacoes (item_id, tipo, cor, quantidade, admin_nome, observacao, chamado_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(item_id, tipo, cor || '', quantidade, admin_nome || '', observacao || '', chamado_id || null);

  // Update stock quantity
  const sinal = tipo === 'entrada' ? 1 : -1;
  const campo = cor && cor !== 'geral' ? `qtd_${cor}` : 'qtd_geral';
  db.prepare(`UPDATE estoque_itens SET ${campo} = ${campo} + ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(sinal * quantidade, item_id);
}

function listarMovimentacoes(item_id) {
  return getDb().prepare(`
    SELECT * FROM estoque_movimentacoes WHERE item_id = ? ORDER BY criado_em DESC
  `).all(item_id);
}

// ── Impressoras ───────────────────────────────────────────

function listarImpressoras() {
  return getDb().prepare('SELECT * FROM impressoras ORDER BY localizacao ASC, nome ASC').all();
}

function criarImpressora(dados) {
  const result = getDb().prepare(`
    INSERT INTO impressoras (nome, ip, selb, localizacao, numero_serie)
    VALUES (@nome, @ip, @selb, @localizacao, @numero_serie)
  `).run({ ip: '', selb: '', localizacao: '', numero_serie: '', ...dados });
  return result.lastInsertRowid;
}

function atualizarImpressora(id, dados) {
  const campos = [];
  const values = [];
  ['nome','ip','selb','localizacao','numero_serie'].forEach(f => {
    if (dados[f] !== undefined) { campos.push(`${f} = ?`); values.push(dados[f]); }
  });
  if (campos.length === 0) return;
  campos.push('atualizado_em = CURRENT_TIMESTAMP');
  values.push(id);
  getDb().prepare(`UPDATE impressoras SET ${campos.join(', ')} WHERE id = ?`).run(...values);
}

function deletarImpressora(id) {
  getDb().prepare('DELETE FROM impressoras WHERE id = ?').run(id);
}

function salvarPushSubscription(adminId, { endpoint, p256dh, auth }) {
  getDb().prepare(`
    INSERT OR REPLACE INTO push_subscriptions (admin_id, endpoint, p256dh, auth)
    VALUES (?, ?, ?, ?)
  `).run(adminId, endpoint, p256dh, auth);
}

function removerPushSubscription(adminId, endpoint) {
  getDb().prepare('DELETE FROM push_subscriptions WHERE admin_id = ? AND endpoint = ?').run(adminId, endpoint);
}

function getChamadosComPrazoPendente() {
  return getDb().prepare(`
    SELECT c.*, a.id as admin_id_resp
    FROM chamados c
    LEFT JOIN admins a ON c.admin_responsavel_id = a.id
    WHERE c.status IN ('aberto', 'em_andamento')
    AND c.prazo IS NOT NULL
  `).all();
}

function registrarAlertaPrazo(chamadoId, tipo) {
  try {
    getDb().prepare('INSERT INTO prazo_alertas (chamado_id, tipo) VALUES (?, ?)').run(chamadoId, tipo);
    return true;
  } catch { return false; }
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
  return getDb().prepare(`
    SELECT c.*, a.nome_completo as admin_nome,
           u.setor as usuario_setor, u.ramal as usuario_ramal
    FROM chamados c
    LEFT JOIN admins a ON c.admin_responsavel_id = a.id
    LEFT JOIN usuarios u ON c.usuario_id = u.id
    WHERE c.id = ?
  `).get(id);
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
    SELECT c.id, c.usuario_id, c.nome, c.setor, c.ramal, c.descricao,
           c.anexo_path, c.anexo_nome_original, c.prioridade, c.status,
           c.prazo, c.admin_responsavel_id, c.solucao, c.nota,
           c.comentario_avaliacao, c.criado_em, c.atualizado_em,
           c.concluido_em, c.categoria, c.assinado_em,
           a.nome_completo as admin_nome,
           u.setor as usuario_setor, u.ramal as usuario_ramal
    FROM chamados c
    LEFT JOIN admins a ON c.admin_responsavel_id = a.id
    LEFT JOIN usuarios u ON c.usuario_id = u.id
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
  if (chamado.status === 'aberto') {
    db.prepare(`
      UPDATE chamados SET status = 'em_andamento', admin_responsavel_id = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?
    `).run(adminId, id);
  } else {
    db.prepare(`
      UPDATE chamados SET admin_responsavel_id = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?
    `).run(adminId, id);
  }
  db.prepare(`
    INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
    VALUES (?, ?, 'assumido', ?, 'em_andamento')
  `).run(id, adminId, chamado.status);
}

function concluirChamado(id, solucao, adminId, assinatura = null) {
  const db = getDb();
  const chamado = buscarChamadoPorId(id);
  if (assinatura) {
    db.prepare(`
      UPDATE chamados SET status = 'concluido', solucao = ?, assinatura = ?, assinado_em = CURRENT_TIMESTAMP,
      atualizado_em = CURRENT_TIMESTAMP, concluido_em = CURRENT_TIMESTAMP WHERE id = ?
    `).run(solucao, assinatura, id);
    db.prepare(`
      INSERT INTO assinaturas_historico (chamado_id, assinatura, assinado_em, admin_id)
      VALUES (?, ?, CURRENT_TIMESTAMP, ?)
    `).run(id, assinatura, adminId);
  } else {
    db.prepare(`
      UPDATE chamados SET status = 'concluido', solucao = ?,
      atualizado_em = CURRENT_TIMESTAMP, concluido_em = CURRENT_TIMESTAMP WHERE id = ?
    `).run(solucao, id);
  }
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

function transferirChamado(id, adminId, novoAdminId, nomeNovoAdmin) {
  const db = getDb();
  const chamado = buscarChamadoPorId(id);
  const adminAnterior = chamado.admin_responsavel_id
    ? db.prepare('SELECT nome_completo FROM admins WHERE id = ?').get(chamado.admin_responsavel_id)
    : null;
  db.prepare(`
    UPDATE chamados SET admin_responsavel_id = ?, status = 'em_andamento', atualizado_em = CURRENT_TIMESTAMP WHERE id = ?
  `).run(novoAdminId, id);
  db.prepare(`
    INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
    VALUES (?, ?, 'transferido', ?, ?)
  `).run(id, adminId, adminAnterior ? adminAnterior.nome_completo : null, nomeNovoAdmin);
}

function reabrirChamado(id, adminId) {
  const db = getDb();
  const chamado = buscarChamadoPorId(id);
  if (chamado.nota !== null && chamado.nota !== undefined) {
    db.prepare(`
      INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
      VALUES (?, ?, 'avaliacao_registrada', ?, ?)
    `).run(id, null, String(chamado.nota), chamado.comentario_avaliacao || null);
  }
  // Safety net: preserve signature if not yet saved (e.g. signed before this deploy)
  if (chamado.assinado_em) {
    const jaSalva = db.prepare('SELECT id FROM assinaturas_historico WHERE chamado_id = ? AND assinado_em = ?').get(id, chamado.assinado_em);
    if (!jaSalva) {
      db.prepare(`INSERT INTO assinaturas_historico (chamado_id, assinatura, assinado_em, admin_id) VALUES (?, ?, ?, ?)`).run(id, chamado.assinatura, chamado.assinado_em, adminId);
    }
  }
  db.prepare(`
    UPDATE chamados SET status = 'aberto', solucao = NULL, concluido_em = NULL,
    assinatura = NULL, assinado_em = NULL, nota = NULL, comentario_avaliacao = NULL,
    atualizado_em = CURRENT_TIMESTAMP WHERE id = ?
  `).run(id);
  db.prepare(`
    INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
    VALUES (?, ?, 'status_alterado', ?, 'aberto')
  `).run(id, adminId, chamado.status);
}

function reabrirChamadoUsuario(id, novaDescricao) {
  const db = getDb();
  const chamado = buscarChamadoPorId(id);

  if (chamado.nota !== null && chamado.nota !== undefined) {
    db.prepare(`
      INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
      VALUES (?, NULL, 'avaliacao_registrada', ?, ?)
    `).run(id, String(chamado.nota), chamado.comentario_avaliacao || null);
  }

  if (chamado.assinado_em) {
    const jaSalva = db.prepare('SELECT id FROM assinaturas_historico WHERE chamado_id = ? AND assinado_em = ?').get(id, chamado.assinado_em);
    if (!jaSalva) {
      db.prepare(`INSERT INTO assinaturas_historico (chamado_id, assinatura, assinado_em, admin_id) VALUES (?, ?, ?, NULL)`).run(id, chamado.assinatura, chamado.assinado_em);
    }
  }

  db.prepare(`
    INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
    VALUES (?, NULL, 'descricao_alterada', ?, ?)
  `).run(id, chamado.descricao, novaDescricao);

  db.prepare(`
    UPDATE chamados SET status = 'aberto', solucao = NULL, concluido_em = NULL,
    assinatura = NULL, assinado_em = NULL, nota = NULL, comentario_avaliacao = NULL,
    descricao = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?
  `).run(novaDescricao, id);

  db.prepare(`
    INSERT INTO historico_chamados (chamado_id, admin_id, acao, valor_anterior, valor_novo)
    VALUES (?, NULL, 'status_alterado', ?, 'aberto')
  `).run(id, chamado.status);
}

function listarAssinaturasHistorico(chamadoId) {
  return getDb().prepare(`
    SELECT ah.*, a.nome_completo as admin_nome
    FROM assinaturas_historico ah
    LEFT JOIN admins a ON ah.admin_id = a.id
    WHERE ah.chamado_id = ?
    ORDER BY ah.criado_em ASC
  `).all(chamadoId);
}

function avaliarChamado(id, nota, comentario) {
  getDb().prepare(`
    UPDATE chamados SET nota = ?, comentario_avaliacao = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?
  `).run(nota, comentario || null, id);
}

function assinarChamado(id, assinatura) {
  const db = getDb();
  db.prepare(`
    UPDATE chamados SET assinatura = ?, assinado_em = CURRENT_TIMESTAMP, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?
  `).run(assinatura, id);
  db.prepare(`
    INSERT INTO assinaturas_historico (chamado_id, assinatura, assinado_em, admin_id)
    VALUES (?, ?, CURRENT_TIMESTAMP, NULL)
  `).run(id, assinatura);
}



function registrarUsuario(dados) {
  const result = getDb().prepare(`
    INSERT INTO usuarios (nome, email, senha_hash, senha_plain, ramal, setor)
    VALUES (@nome, @email, @senha_hash, @senha_plain, @ramal, @setor)
  `).run({ senha_plain: null, ramal: null, setor: null, ...dados });
  return result.lastInsertRowid;
}

function buscarUsuarioPorEmail(email) {
  return getDb().prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
}

function buscarUsuarioPorId(id) {
  return getDb().prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
}

function listarUsuarios() {
  return getDb().prepare('SELECT id, nome, email, ativo, senha_plain, ramal, setor, criado_em FROM usuarios ORDER BY criado_em DESC').all();
}

function atualizarUsuario(id, dados) {
  const campos = [];
  const values = [];
  if (dados.ativo !== undefined) { campos.push('ativo = ?'); values.push(dados.ativo); }
  if (dados.nome !== undefined) { campos.push('nome = ?'); values.push(dados.nome); }
  if (dados.email !== undefined) { campos.push('email = ?'); values.push(dados.email); }
  if (dados.senha_hash !== undefined) { campos.push('senha_hash = ?'); values.push(dados.senha_hash); }
  if (dados.senha_plain !== undefined) { campos.push('senha_plain = ?'); values.push(dados.senha_plain); }
  if (dados.ramal !== undefined) { campos.push('ramal = ?'); values.push(dados.ramal); }
  if (dados.setor !== undefined) { campos.push('setor = ?'); values.push(dados.setor); }
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
    SELECT c.id, c.usuario_id, c.nome, c.setor, c.ramal, c.descricao,
           c.anexo_path, c.anexo_nome_original, c.prioridade, c.status,
           c.prazo, c.admin_responsavel_id, c.solucao, c.nota,
           c.comentario_avaliacao, c.criado_em, c.atualizado_em,
           c.concluido_em, c.categoria, c.assinado_em,
           a.nome_completo as admin_nome
    FROM chamados c
    LEFT JOIN admins a ON c.admin_responsavel_id = a.id
    WHERE c.usuario_id = ?
    ORDER BY c.criado_em DESC
  `).all(usuario_id);
}



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



function listarItens(tipo) {
  return getDb().prepare('SELECT * FROM itens WHERE tipo = ? ORDER BY nome ASC').all(tipo);
}

function buscarItemPorId(id) {
  return getDb().prepare('SELECT * FROM itens WHERE id = ?').get(id);
}

function criarItem(dados) {
  const result = getDb().prepare(`
    INSERT INTO itens (nome, tipo, categoria, quantidade, quantidade_minima, localizacao, descricao, status, numero_serie, fabricante, modelo)
    VALUES (@nome, @tipo, @categoria, @quantidade, @quantidade_minima, @localizacao, @descricao, @status, @numero_serie, @fabricante, @modelo)
  `).run({
    categoria: null, quantidade: 0, quantidade_minima: 0, localizacao: null,
    descricao: null, status: 'disponivel', numero_serie: null, fabricante: null, modelo: null,
    ...dados,
  });
  return result.lastInsertRowid;
}

function atualizarItem(id, dados) {
  const campos = [];
  const values = [];
  const CAMPOS = ['nome', 'tipo', 'categoria', 'quantidade', 'quantidade_minima', 'localizacao', 'descricao', 'status', 'numero_serie', 'fabricante', 'modelo'];
  for (const campo of CAMPOS) {
    if (dados[campo] !== undefined) { campos.push(`${campo} = ?`); values.push(dados[campo]); }
  }
  if (campos.length === 0) return;
  campos.push('atualizado_em = CURRENT_TIMESTAMP');
  values.push(id);
  getDb().prepare(`UPDATE itens SET ${campos.join(', ')} WHERE id = ?`).run(...values);
}

function deletarItem(id) {
  getDb().prepare('DELETE FROM itens WHERE id = ?').run(id);
}

function listarChamadosProcessoCompra({ apenasAbertos = false } = {}) {
  const cond = apenasAbertos ? `AND c.status IN ('aberto', 'em_andamento')` : '';
  return getDb().prepare(`
    SELECT c.id, c.usuario_id, c.nome, c.setor, c.ramal, c.descricao,
           c.prioridade, c.status, c.prazo, c.admin_responsavel_id,
           c.solucao, c.criado_em, c.atualizado_em, c.concluido_em,
           c.categoria, c.assinado_em,
           a.nome_completo as admin_nome
    FROM chamados c
    LEFT JOIN admins a ON c.admin_responsavel_id = a.id
    WHERE c.categoria = 'processo_compra' ${cond}
    ORDER BY
      CASE WHEN c.status IN ('aberto','em_andamento') THEN 0 ELSE 1 END ASC,
      c.criado_em DESC
  `).all();
}

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

function prazo2DiasUteis() {
  const fortaleza = new Date(Date.now() - 3 * 60 * 60 * 1000);
  let current = new Date(Date.UTC(fortaleza.getUTCFullYear(), fortaleza.getUTCMonth(), fortaleza.getUTCDate(), 12));
  let diasUteis = 0;
  while (diasUteis < 2) {
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    const dow = current.getUTCDay();
    if (dow !== 0 && dow !== 6) diasUteis++;
  }
  return new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate(), 21)).toISOString().replace('T', ' ').substring(0, 19);
}

module.exports = {
  getDb,
  initDb,
  criarAdminMasterSeNecessario,
  recuperarSenhasPlain,
  inserirChamado,
  transferirChamado,
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
  reabrirChamadoUsuario,
  avaliarChamado,
  assinarChamado,
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
  salvarPushSubscription,
  removerPushSubscription,
  getChamadosComPrazoPendente,
  registrarAlertaPrazo,
  listarItens,
  buscarItemPorId,
  criarItem,
  atualizarItem,
  deletarItem,
  listarChamadosProcessoCompra,
  listarAssinaturasHistorico,
  listarInventario,
  buscarInventarioPorId,
  criarInventario,
  atualizarInventario,
  deletarInventario,
  listarEstoqueItens,
  buscarEstoqueItemPorId,
  criarEstoqueItem,
  atualizarEstoqueItem,
  deletarEstoqueItem,
  registrarMovimentacao,
  listarMovimentacoes,
  listarImpressoras,
  criarImpressora,
  atualizarImpressora,
  deletarImpressora,
  prazo2DiasUteis,
};
