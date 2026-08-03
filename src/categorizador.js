const CATEGORIAS = [
  {
    id: 'software',
    nome: 'Software',
    cor: '#6366F1',
    palavras: [
      'sistema', 'programa', 'aplicativo', 'software', 'windows', 'atualização',
      'instalar', 'instalação', 'desinstalar', 'travando', 'travado', 'lentidão',
      'tela azul', 'licença', 'antivírus', 'vírus', 'malware', 'driver', 'chrome',
      'firefox', 'excel', 'word', 'office', 'teams', 'zoom', 'navegador', 'browser',
      'adobe', 'outlook', 'sistema operacional', 'crash', 'erro no sistema',
      'não abre', 'não inicia', 'atualizar', 'reinstalar', 'configuração do sistema',
      'totvs', 'protheus', 'fluig', 'rm totvs', 'microsoft', 'azure', 'office 365',
      'google', 'gmail', 'workspace', 'google meet', 'google drive', 'whatsapp',
      'sap', 'oracle', 'salesforce', 'slack', 'dropbox', 'onedrive', 'sharepoint',
    ],
  },
  {
    id: 'hardware',
    nome: 'Hardware',
    cor: '#0EA5E9',
    palavras: [
      'computador', 'notebook', 'desktop', 'pc', 'não liga', 'desligando',
      'processador', 'memória', 'hd', 'ssd', 'disco', 'ventilador',
      'superaquecendo', 'fonte', 'placa mãe', 'hardware', 'periférico',
      'tablet', 'equipamento danificado', 'máquina', 'bateria', 'carregador',
      'leitor de cartão', 'gabinete', 'cpu', 'reiniciando',
    ],
  },
  {
    id: 'impressora',
    nome: 'Impressora',
    cor: '#8B5CF6',
    palavras: [
      'impressora', 'impressão', 'imprimir', 'papel', 'cartucho', 'toner',
      'xerox', 'copiadora', 'digitalizar', 'fax', 'papel atolado', 'não imprime',
      'impressora offline', 'fila de impressão', 'driver de impressora',
      'scanner', 'digitalização', 'multifuncional',
    ],
  },
  {
    id: 'ramal',
    nome: 'Ramal',
    cor: '#EC4899',
    palavras: [
      'ramal', 'telefone', 'discagem', 'chamada', 'pabx', 'headset',
      'ligação', 'sem tom', 'sem linha', 'voip', 'aparelho telefônico',
      'não disca', 'não recebe ligação', 'ramal mudo', 'central telefônica',
      'telefonia', 'interfone', 'ramal não funciona', 'telefone não funciona',
    ],
  },
  {
    id: 'nobreak',
    nome: 'Nobreak',
    cor: '#F59E0B',
    palavras: [
      'nobreak', 'no-break', 'ups', 'estabilizador', 'energia', 'sem energia',
      'queda de energia', 'bateria nobreak', 'alarme nobreak', 'régua',
      'extensão elétrica', 'tomada', 'filtro de linha', 'oscilação de energia',
    ],
  },
  {
    id: 'monitor',
    nome: 'Monitor',
    cor: '#0891B2',
    palavras: [
      'monitor', 'tela', 'display', 'sem imagem', 'sem sinal', 'hdmi',
      'tela piscando', 'tela apagada', 'brilho', 'resolução', 'tela quebrada',
      'listras na tela', 'tela escura', 'monitor não liga', 'segundo monitor',
      'segunda tela',
    ],
  },
  {
    id: 'projetor',
    nome: 'Projetor',
    cor: '#8B5CF6',
    palavras: [
      'projetor', 'datashow', 'apresentação projetor', 'projetando', 'projeção',
      'tela de projeção', 'epson projetor', 'benq projetor', 'projetor apagado',
      'projetor não liga', 'projetor sem imagem', 'projetor sem sinal',
      'projetor piscando', 'lâmpada do projetor', 'projetor da sala',
    ],
  },
  {
    id: 'mouse',
    nome: 'Mouse',
    cor: '#10B981',
    palavras: [
      'mouse', 'cursor', 'clique', 'botão do mouse', 'scroll', 'roda do mouse',
      'mouse travado', 'mouse não funciona', 'ponteiro', 'mouse sem fio',
      'mousepad', 'mouse pad', 'click', 'duplo clique',
    ],
  },
  {
    id: 'teclado',
    nome: 'Teclado',
    cor: '#EF4444',
    palavras: [
      'teclado', 'tecla', 'digitar', 'não digita', 'teclado não funciona',
      'tecla travada', 'letra errada', 'acento', 'numlock', 'teclado sem fio',
      'teclado bluetooth', 'teclado usb', 'tecla quebrada', 'teclado molhado',
    ],
  },
  {
    id: 'rede',
    nome: 'Rede / Internet',
    cor: '#059669',
    palavras: [
      'internet', 'wifi', 'wi-fi', 'wireless', 'rede', 'sem acesso à internet',
      'conexão', 'roteador', 'switch', 'ip', 'vpn', 'cabo de rede', 'ethernet',
      'sem internet', 'queda de rede', 'não conecta na rede', 'ping',
      'servidor', 'firewall', 'dhcp', 'dns', 'acesso remoto', 'rdp',
      'sem sinal de rede', 'lentidão de rede', 'rede caiu', 'desconectando',
      'cabo rj45', 'rede sem fio',
    ],
  },
  {
    id: 'acesso_senha',
    nome: 'Acesso / Senha',
    cor: '#DC2626',
    palavras: [
      'senha', 'login', 'bloqueado', 'permissão', 'credencial',
      'autenticação', 'não consigo entrar', 'não acessa', 'expirou',
      'resetar senha', 'redefinir senha', 'desbloquear conta', 'conta bloqueada',
      'sem permissão', 'conta expirada', 'usuário bloqueado', 'acesso negado',
      'esqueci a senha', 'trocar senha', 'nova senha', 'perfil bloqueado',
    ],
  },
  {
    id: 'cameras',
    nome: 'Câmeras / CFTV',
    cor: '#D97706',
    palavras: [
      'câmera', 'camera', 'cftv', 'nvr', 'dvr', 'gravação', 'câmera de segurança',
      'vigilância', 'monitoramento por câmera', 'câmera offline', 'não grava',
      'câmera apagada', 'câmera travada', 'câmera sem imagem', 'câmera fora',
      'imagem da câmera', 'sistema de câmeras', 'circuito fechado',
    ],
  },
  {
    id: 'email',
    nome: 'E-mail',
    cor: '#64748B',
    palavras: [
      'email', 'e-mail', 'caixa de entrada', 'spam', 'correio',
      'webmail', 'não recebe email', 'não envia email', 'caixa cheia',
      'mensagem não entrega', 'configurar email', 'conta de email',
      'assinatura de email', 'email corporativo', 'pasta de email',
    ],
  },
  {
    id: 'tv_projetor',
    nome: 'TV',
    cor: '#7C3AED',
    palavras: [
      'televisão', 'televisor', 'tv da sala', 'smartboard', 'lousa digital',
      'apresentação', 'sem sinal hdmi', 'controle remoto',
      'chromecast', 'apple tv', 'tv corporativa', 'display da sala',
    ],
  },
  {
    id: 'tablet',
    nome: 'Tablet',
    cor: '#0284C7',
    palavras: [
      'tablet', 'ipad', 'galaxy tab', 'surface', 'tablet não liga',
      'tablet travado', 'tela do tablet', 'tablet sem acesso', 'tablet quebrado',
      'tablet corporativo', 'tablet da recepção', 'tablet de atendimento',
    ],
  },
  {
    id: 'celular',
    nome: 'Celular',
    cor: '#15803D',
    palavras: [
      'celular', 'smartphone', 'iphone', 'android', 'telefone celular',
      'celular corporativo', 'celular da empresa', 'celular não liga',
      'celular travado', 'celular sem sinal', 'celular quebrado',
      'aplicativo celular', 'whatsapp', 'celular sem internet',
      'chip', 'sim card', 'linha corporativa',
    ],
  },
  {
    id: 'processo_compra',
    nome: 'Processo de Compra',
    cor: '#16A34A',
    palavras: [
      'comprar', 'compra', 'adquirir', 'aquisição', 'orçamento', 'fornecedor',
      'nota fiscal', 'pedido de compra', 'processo de compra', 'cotação',
      'licitação', 'requisição de compra', 'solicitar compra', 'necessidade de compra',
      'sem estoque', 'estoque esgotado', 'produto novo', 'equipamento novo',
      'substituição', 'nova aquisição', 'orçar', 'cotar', 'compra urgente',
      'novo equipamento', 'novo notebook', 'nova impressora', 'novo computador',
      'precisamos comprar', 'precisa comprar', 'compra de material', 'compra necessária',
    ],
  },
  {
    id: 'thex_pos',
    nome: 'THEX POS (TOTVS)',
    cor: '#E11D48',
    palavras: [
      'thex pos', 'pdv', 'ponto de venda', 'totvs pos', 'pos totvs',
      'fechamento de caixa', 'abertura de caixa', 'sangria', 'suprimento caixa',
      'terminal de venda', 'tef', 'caixa do restaurante', 'caixa do bar',
      'cupom fiscal', 'sat fiscal', 'nfce', 'nota do caixa', 'caixa totvs',
      'integração pos', 'pos não abre', 'caixa não abre',
    ],
  },
  {
    id: 'thex_pms',
    nome: 'THEX PMS (TOTVS)',
    cor: '#2563EB',
    palavras: [
      'thex pms', 'pms', 'property management', 'sistema da recepção',
      'reserva', 'check-in', 'check in', 'checkout', 'check-out', 'check out',
      'diária', 'hospedagem', 'hóspede', 'recepção totvs', 'front office',
      'totvs pms', 'bloqueio de quarto', 'ocupação', 'disponibilidade',
      'tarifa', 'reserva de quarto', 'sistema hoteleiro', 'folio',
      'conta do hóspede', 'lançamento na conta', 'cancelar reserva',
    ],
  },
  {
    id: 'modulo_eventos',
    nome: 'Módulo Eventos',
    cor: '#7C3AED',
    palavras: [
      'módulo eventos', 'evento totvs', 'banquete', 'salão de eventos',
      'reserva de salão', 'contrato de evento', 'buffet', 'espaço para evento',
      'reserva do salão', 'evento no sistema', 'lançar evento',
      'cadastrar evento', 'pacote de evento', 'coffee break', 'cerimonial',
    ],
  },
  {
    id: 'modulo_cp',
    nome: 'Módulo Contas a Pagar',
    cor: '#DC2626',
    palavras: [
      'contas a pagar', 'módulo contas a pagar', 'pagar fornecedor',
      'duplicata a pagar', 'boleto a pagar', 'vencimento a pagar',
      'lançar pagamento', 'nota fiscal de entrada', 'aprovação de pagamento',
      'pagamento vencido', 'baixa de pagamento', 'programação de pagamento',
      'borderô', 'cp totvs',
    ],
  },
  {
    id: 'modulo_cr',
    nome: 'Módulo Contas a Receber',
    cor: '#059669',
    palavras: [
      'contas a receber', 'módulo contas a receber', 'recebimento',
      'duplicata a receber', 'boleto a receber', 'baixa de recebimento',
      'cobrança', 'inadimplência', 'título a receber', 'lançar recebimento',
      'cliente inadimplente', 'cr totvs', 'fatura a receber',
    ],
  },
  {
    id: 'modulo_rad',
    nome: 'Módulo RAD',
    cor: '#9333EA',
    palavras: [
      'rad', 'módulo rad', 'rad totvs', 'relatório totvs', 'relatório personalizado',
      'customização totvs', 'layout totvs', 'ponto de entrada',
      'script totvs', 'tlpp', 'advpl', 'customização de relatório',
      'relatório customizado', 'gerador de relatório totvs',
    ],
  },
  {
    id: 'modulo_fiscal',
    nome: 'Módulo Fiscal Flex',
    cor: '#B45309',
    palavras: [
      'fiscal', 'módulo fiscal', 'fiscal flex', 'nota fiscal eletrônica',
      'nf-e', 'nfe', 'sped', 'obrigação fiscal', 'danfe', 'xml fiscal',
      'tributário', 'tributação', 'icms', 'pis', 'cofins',
      'escrituração fiscal', 'apuração fiscal', 'sefaz', 'rejeição fiscal',
      'nfse', 'nota de serviço', 'cupom eletrônico',
    ],
  },
  {
    id: 'modulo_contab',
    nome: 'Módulo Contabilidade',
    cor: '#0369A1',
    palavras: [
      'contabilidade', 'módulo contabilidade', 'lançamento contábil',
      'balancete', 'balanço patrimonial', 'plano de contas',
      'conta contábil', 'integração contábil', 'centro de custo',
      'dre', 'demonstrativo contábil', 'apuração de resultado',
      'fechamento contábil', 'conciliação contábil', 'razão contábil',
    ],
  },
  {
    id: 'modulo_compras',
    nome: 'Módulo Compras',
    cor: '#15803D',
    palavras: [
      'módulo compras', 'compras totvs', 'pedido de compra totvs',
      'solicitação de compra totvs', 'ordem de compra totvs',
      'cotação totvs', 'cotação no sistema', 'aprovação de compra',
      'licitação totvs', 'requisição de compra totvs', 'emitir pedido de compra',
    ],
  },
  {
    id: 'modulo_almox',
    nome: 'Módulo Almoxarifado',
    cor: '#92400E',
    palavras: [
      'almoxarifado', 'módulo almoxarifado', 'almoxarifado totvs',
      'requisição de material', 'saída de estoque totvs', 'entrada de estoque totvs',
      'movimentação de estoque totvs', 'saldo de estoque', 'estoque totvs',
      'inventário totvs', 'contagem de estoque', 'transferência de material',
      'kardex', 'ficha de estoque',
    ],
  },
  {
    id: 'modulo_caf',
    nome: 'Módulo CAF',
    cor: '#6D28D9',
    palavras: [
      'caf', 'módulo caf', 'caf totvs', 'ativo fixo', 'ativos fixos',
      'patrimônio', 'bem patrimonial', 'depreciação', 'amortização',
      'tombamento', 'inventário patrimonial', 'número patrimonial',
      'baixa de ativo', 'transferência patrimonial', 'imobilizado',
    ],
  },
  {
    id: 'modulo_cfinan',
    nome: 'Módulo CFINAN',
    cor: '#1D4ED8',
    palavras: [
      'cfinan', 'módulo cfinan', 'cfinan totvs', 'controle financeiro totvs',
      'fluxo de caixa totvs', 'movimento financeiro', 'extrato financeiro totvs',
      'previsão financeira', 'conciliação bancária totvs', 'lançamento financeiro totvs',
      'saldo financeiro', 'banco totvs', 'conta corrente totvs',
    ],
  },
  {
    id: 'modulo_fatura',
    nome: 'Módulo Fatura',
    cor: '#BE185D',
    palavras: [
      'módulo fatura', 'faturamento totvs', 'emitir nota', 'emitir fatura',
      'faturar hóspede', 'nota fiscal de saída', 'fatura do hóspede',
      'fatura corporativa', 'emissão de nota fiscal', 'fatura de hotel',
      'nota de hospedagem', 'faturar reserva', 'faturamento',
    ],
  },
  {
    id: 'app_comanda',
    nome: 'App Comanda Eletrônica',
    cor: '#C2410C',
    palavras: [
      'comanda eletrônica', 'app comanda', 'totvs comanda', 'comanda digital',
      'comanda não abre', 'comanda não sincroniza', 'app do garçom',
      'pedido na mesa', 'tablet do restaurante', 'tablet do garçom',
      'app do restaurante', 'lançar pedido', 'comanda mobile',
    ],
  },
  {
    id: 'app_governanca',
    nome: 'App Minha Governança',
    cor: '#0E7490',
    palavras: [
      'minha governança', 'app governança', 'app da governanta',
      'app da camareira', 'governança totvs', 'quarto pronto no app',
      'status do quarto no app', 'limpeza no app', 'quarto inspecionado',
      'app de governança', 'camareira app', 'governanta app',
      'bloqueio de uh', 'inspeção de quarto app',
    ],
  },
  {
    id: 'letsbook',
    nome: 'LetsBook (PMWEB)',
    cor: '#4338CA',
    palavras: [
      'letsbook', 'pmweb', 'motor de reservas', 'booking engine',
      'reserva online', 'site de reservas', 'reserva pelo site',
      'integração ota', 'channel manager', 'tarifa online',
      'disponibilidade online', 'reserva direta', 'plataforma de reservas',
    ],
  },
  {
    id: 'urmobo',
    nome: 'URMOBO (MDM)',
    cor: '#374151',
    palavras: [
      'urmobo', 'mdm', 'gerenciamento de dispositivo', 'mobile device management',
      'dispositivo bloqueado mdm', 'app bloqueado mdm', 'celular bloqueado corporativo',
      'dispositivo não gerenciado', 'política de dispositivo',
      'instalar app corporativo', 'configurar mdm', 'gerenciar celular corporativo',
    ],
  },
  {
    id: 'cardapio_digital',
    nome: 'Cardápio Digital',
    cor: '#D97706',
    palavras: [
      'cardápio digital', 'qr code cardápio', 'qrcode cardápio', 'menu digital',
      'cardápio online', 'link do cardápio', 'cardápio qr', 'menu qrcode',
      'cardápio não abre', 'atualizar cardápio', 'cardápio desatualizado',
      'código qr do cardápio', 'menu do restaurante digital',
    ],
  },
  {
    id: 'central_ti',
    nome: 'Central de Serviços TI',
    cor: '#6B7280',
    palavras: [
      'central de serviços', 'service desk', 'help desk', 'solicitação ti',
      'suporte ti', 'central ti', 'atendimento ti', 'serviço de ti',
      'infra ti', 'infraestrutura ti', 'solicitação de serviço ti',
      'serviço técnico ti',
    ],
  },
  {
    id: 'outros',
    nome: 'Outros',
    cor: '#6B7280',
    palavras: [],
  },
];

function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s]/g, ' ');
}

const _STOP = new Set([
  'para','com','que','nao','mais','como','uma','num','nos','das','dos','pelo','pela',
  'esse','esta','isso','seu','sua','ser','ter','foi','tem','ele','ela','eles','elas',
  'meu','minha','de','da','do','em','na','no','e','o','a','os','as','me','se','ao',
  'por','ou','um','mas','ja','bem','muito','pode','aqui','ali','la','esta','este',
  'quando','onde','qual','quem','isso','isto','aquilo','esse','essa','esses','essas',
]);

function classificar(descricao) {
  const texto = normalizar(descricao || '');
  const scores = {};
  for (const cat of CATEGORIAS) {
    if (cat.id === 'outros') continue;
    let score = 0;
    for (const palavra of cat.palavras) {
      const p = normalizar(palavra);
      if (texto.includes(p)) score += Math.max(1, p.split(' ').length * 2);
    }
    scores[cat.id] = score;
  }
  const melhor = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (!melhor || melhor[1] === 0) return null;
  return CATEGORIAS.find(c => c.id === melhor[0]);
}

function _carregarEtiquetasDinamicas() {
  try { return require('./db').listarEtiquetas(); } catch { return []; }
}

function _chamadosCategorizados(limite = 400) {
  try {
    return require('./db').getDb().prepare(`
      SELECT descricao, categoria
      FROM chamados
      WHERE categoria IS NOT NULL AND categoria != '' AND descricao IS NOT NULL AND descricao != ''
      ORDER BY criado_em DESC LIMIT ?
    `).all(limite);
  } catch { return []; }
}

/* ─────────────────────────────────────────────────────────────────────────
 * Classificador local (TF-IDF + k vizinhos mais próximos)
 *
 * Substitui a chamada de IA que existia aqui. Três decisões de projeto,
 * todas ditadas pelos dados reais deste helpdesk:
 *
 * 1. IDF: termos raros e discriminativos ("toner", "pabx", "sangria") pesam
 *    mais que termos onipresentes ("sistema", "computador").
 * 2. O corpus mistura chamados já categorizados COM um pseudo-documento por
 *    etiqueta (nome + descrição + palavras-chave). Etiqueta recém-criada ou
 *    com pouco histórico compete desde o primeiro chamado, e o ruído das
 *    descrições ("Chamados sobre...", "TOTVS") se auto-corrige pelo IDF,
 *    porque esses termos aparecem em dezenas de documentos.
 * 3. O vocabulário deste hotel é cheio de siglas curtas (RAD, PMS, POS, CAF,
 *    TEF, CP, CR, W8...) que um corte por tamanho descartaria — justamente
 *    os termos que decidem a etiqueta. A allowlist de termos curtos é
 *    extraída automaticamente dos nomes/slugs das etiquetas.
 * ───────────────────────────────────────────────────────────────────────── */

// Calibrados por backtest leave-one-out nos 876 chamados reais (2026-08-03):
// K=40/conf=0.18 maximizou o acerto do pipeline completo (59,6%), contra
// 39,5% do motor anterior. Se recalibrar, rode o backtest de novo — não
// ajuste no olho.
const _MIN_HISTORICO = 8;   // abaixo disso (e sem etiquetas) não há base
const _K_VIZINHOS = 40;
const _MIN_CONFIANCA = 0.18;
const _PESO_DOC_ETIQUETA = 1.15; // pseudo-doc de etiqueta vale um pouco mais
const _BONUS_NOME_ETIQUETA = 0.9; // nome da etiqueta citado textualmente

// Setores do hotel. Aparecem o tempo todo nas descrições ("impressora da
// nutrição", "telefone da governança") mas indicam ONDE está o problema, não
// QUAL é — se entrarem no cálculo, um chamado de telefone acaba classificado
// como impressora só porque as duas mencionam o mesmo setor.
const _LOCAIS_BRUTOS = [
  'banquetes', 'rooftop', 'comercial', 'vendas', 'compras', 'almoxarifado',
  'concierge', 'confeitaria', 'padaria', 'controladoria', 'cozinha',
  'estacionamento', 'eventos', 'convencoes', 'financeiro', 'fitness',
  'gerencia', 'governanca', 'juridico', 'lavanderia', 'lobby', 'marketing',
  'mensageria', 'portaria', 'nutricao', 'piscina', 'recepcao', 'recursos',
  'humanos', 'reservas', 'restaurante', 'mangostin', 'mucuripe', 'revenue',
  'management', 'rouparia', 'seguranca', 'occitane', 'transportes',
  'andar', 'sala', 'setor', 'departamento', 'apartamento', 'quarto', 'hotel',
];

// Rede de segurança: se um termo de setor também for palavra-chave de alguma
// categoria, ele volta a contar — a categoria tem prioridade sobre o local.
const _LOCAIS = (() => {
  const vocabCategorias = new Set();
  for (const cat of CATEGORIAS) {
    for (const palavra of cat.palavras) {
      for (const termo of normalizar(palavra).split(/\s+/)) {
        if (termo) vocabCategorias.add(termo);
      }
    }
  }
  return new Set(_LOCAIS_BRUTOS.filter(l => !vocabCategorias.has(l)));
})();

// Termos curtos (2-3 letras) que fazem parte do vocabulário do domínio.
// Vêm dos nomes/slugs das etiquetas e das palavras-chave estáticas, então
// etiqueta nova com sigla nova entra sozinha na allowlist.
function _vocabCurto(dinamicas) {
  const vocab = new Set();
  const coletar = texto => {
    for (const t of normalizar(texto || '').split(/[\s_]+/)) {
      if (t.length >= 2 && t.length <= 3 && !_STOP.has(t)) vocab.add(t);
    }
  };
  for (const et of dinamicas) { coletar(et.nome); coletar(et.slug); }
  for (const cat of CATEGORIAS) for (const p of cat.palavras) coletar(p);
  return vocab;
}

// Termos que a equipe usa ao TESTAR o sistema, não ao relatar um problema.
// Sem isto o classificador aprende que "teste" significa "outros" — foi
// exatamente o que aconteceu: dos 69 chamados com "teste" na descrição, 30
// estavam rotulados como 'outros', e a palavra (rara, logo de IDF alto)
// passava a dominar termos reais como "impressora".
const _RUIDO_PREFIXOS = ['test', 'xxx', 'asdf', 'qwer', 'aaaa', 'lorem'];

function _ehRuido(termo) {
  return _RUIDO_PREFIXOS.some(p => termo.startsWith(p));
}

function _tokensClassificador(texto, vocabCurto) {
  const brutos = normalizar(texto).split(/\s+/).filter(Boolean);
  const uni = [];
  for (const t of brutos) {
    if (_LOCAIS.has(t) || _STOP.has(t) || _ehRuido(t)) continue;
    if (t.length >= 4 || (vocabCurto && vocabCurto.has(t))) {
      // Radical pragmático: tira o plural e trunca em 6 caracteres. Junta as
      // variações do português ("aprovar/aprovação/aprovações" → "aprova",
      // "mudo/mudos" → "mudo", "impressora/impressão" → "impres") sem
      // carregar um stemmer de verdade.
      const semPlural = t.length >= 5 && t.endsWith('s') ? t.slice(0, -1) : t;
      uni.push(semPlural.length > 6 ? semPlural.slice(0, 6) : semPlural);
    }
  }
  // Bigramas capturam frases que decidem sozinhas ("nota fiscal",
  // "contas pagar", "fechamento caixa") — o IDF alto deles faz o resto.
  const saida = uni.slice();
  for (let i = 0; i < uni.length - 1; i++) saida.push(uni[i] + '§' + uni[i + 1]);
  return saida;
}

function _vetorTfIdf(tokens, idf, idfPadrao) {
  const freq = new Map();
  for (const termo of tokens) freq.set(termo, (freq.get(termo) || 0) + 1);

  const vetor = new Map();
  let soma = 0;
  for (const [termo, n] of freq) {
    // Termo ausente do corpus entra com IDF máximo: não casa com ninguém,
    // mas conta na norma — descrição cheia de termo desconhecido resulta em
    // similaridade baixa e cai no fallback, em vez de num palpite forçado.
    const peso = (1 + Math.log(n)) * (idf.has(termo) ? idf.get(termo) : idfPadrao);
    vetor.set(termo, peso);
    soma += peso * peso;
  }

  const norma = Math.sqrt(soma);
  if (!norma) return null;
  for (const [termo, peso] of vetor) vetor.set(termo, peso / norma);
  return vetor;
}

// Corpus tokenizado + vetores prontos. Reconstruir a cada chamado seria
// desperdício; o cache invalida quando muda a contagem de chamados/etiquetas
// e expira por tempo (recategorizar um chamado antigo não muda a contagem —
// sem o TTL, o cache nunca veria a correção).
const _CORPUS_TTL_MS = 2 * 60 * 1000;
let _corpusCache = null;

function _resetCorpusCache() { _corpusCache = null; }

function _construirCorpus(historico, dinamicas) {
  const chave = `${historico.length}:${dinamicas.length}`;
  if (_corpusCache && _corpusCache.chave === chave && (Date.now() - _corpusCache.em) < _CORPUS_TTL_MS) {
    return _corpusCache;
  }

  const vocabCurto = _vocabCurto(dinamicas);
  const docs = [];

  for (const c of historico) {
    const tokens = _tokensClassificador(c.descricao, vocabCurto);
    // Chamado sem conteúdo informativo (descrição só com ruído, ex.: "teste
    // do teste mais teste") não ensina nada — só empurra a categoria em que
    // foi despejado. Fica de fora do treino.
    const unigramas = tokens.filter(t => !t.includes('§'));
    if (unigramas.length < 2) continue;
    docs.push({ id: c.categoria, peso: 1, tokens });
  }
  for (const et of dinamicas) {
    // Nome entra 2x (é o sinal mais forte) + descrição + palavras estáticas
    // da categoria correspondente, quando existir.
    const estatica = CATEGORIAS.find(c => c.id === et.slug);
    const texto = [et.nome, et.nome, et.descricao || '', estatica ? estatica.palavras.join(' ') : ''].join(' ');
    docs.push({ id: et.slug, peso: _PESO_DOC_ETIQUETA, tokens: _tokensClassificador(texto, vocabCurto) });
  }

  const freqDoc = new Map();
  for (const d of docs) {
    for (const termo of new Set(d.tokens)) freqDoc.set(termo, (freqDoc.get(termo) || 0) + 1);
  }
  const idf = new Map();
  for (const [termo, n] of freqDoc) idf.set(termo, Math.log(1 + docs.length / n));
  const idfPadrao = Math.log(1 + docs.length);

  for (const d of docs) d.vetor = _vetorTfIdf(d.tokens, idf, idfPadrao);

  _corpusCache = { chave, em: Date.now(), docs, idf, idfPadrao, vocabCurto, dinamicas };
  return _corpusCache;
}

function _classificarPorVizinhos(descricao, historico, dinamicas = []) {
  if (!Array.isArray(historico)) return null;
  if (historico.length < _MIN_HISTORICO && dinamicas.length === 0) return null;

  const corpus = _construirCorpus(historico, dinamicas);
  const alvo = _vetorTfIdf(_tokensClassificador(descricao, corpus.vocabCurto), corpus.idf, corpus.idfPadrao);
  if (!alvo) return null;

  const vizinhos = [];
  for (const d of corpus.docs) {
    if (!d.vetor) continue;
    let sim = 0;
    for (const [termo, peso] of alvo) {
      const outro = d.vetor.get(termo);
      if (outro) sim += peso * outro;
    }
    if (sim > 0) vizinhos.push({ id: d.id, sim: sim * d.peso });
  }
  if (!vizinhos.length) return null;

  vizinhos.sort((a, b) => b.sim - a.sim);

  const votos = {};
  for (const v of vizinhos.slice(0, _K_VIZINHOS)) {
    votos[v.id] = (votos[v.id] || 0) + v.sim;
  }

  // Citação textual do nome da etiqueta é o sinal mais confiável que existe:
  // "erro no radzap" tem que ir para radzap, com ou sem histórico.
  const textoNorm = ` ${normalizar(descricao).replace(/\s+/g, ' ').trim()} `;
  for (const et of corpus.dinamicas) {
    const nome = normalizar(et.nome).replace(/\s+/g, ' ').trim();
    if (nome.length >= 3 && textoNorm.includes(` ${nome} `)) {
      votos[et.slug] = (votos[et.slug] || 0) + _BONUS_NOME_ETIQUETA;
    }
  }

  const ranking = Object.entries(votos).sort((a, b) => b[1] - a[1]);
  const [melhor, peso] = ranking[0];
  if (peso < _MIN_CONFIANCA) return null;
  return melhor;
}

async function classificarInteligente(descricao) {
  if (!descricao?.trim()) return CATEGORIAS.find(c => c.id === 'outros');

  const dinamicas = _carregarEtiquetasDinamicas();
  const historico = _chamadosCategorizados(900);
  const textoNorm = normalizar(descricao);

  function resolverCategoria(id) {
    const et = dinamicas.find(e => e.slug === id);
    if (et) return { id: et.slug, nome: et.nome, cor: et.cor || '#6B7280' };
    const est = CATEGORIAS.find(c => c.id === id);
    if (est) return est;
    return null;
  }

  // Rastro da decisão. Sem isto, uma classificação errada em produção é
  // indistinguível de uma falha silenciosa (banco vazio, exceção engolida) —
  // as duas terminam em 'outros'. Aparece nos logs do Fly.
  const _trilha = (origem, resultado) => {
    console.log(`[categorizador] ${origem} -> ${resultado} | historico=${historico.length} etiquetas=${dinamicas.length} | "${descricao.slice(0, 60)}"`);
  };

  // 1. Motor principal: TF-IDF + kNN sobre chamados + etiquetas.
  try {
    const previsto = _classificarPorVizinhos(descricao, historico, dinamicas);
    if (previsto) {
      const cat = resolverCategoria(previsto);
      if (cat) { _trilha('motor', cat.id); return cat; }
      _trilha('motor-nao-resolvido', previsto);
    }
  } catch (err) {
    console.error('[categorizador] ERRO no motor:', err.message);
  }

  // 2. Fallback: keyword scoring nas listas estáticas curadas — cobre o caso
  //    de banco recém-instalado, sem histórico nem etiquetas dinâmicas.
  const kwScores = {};
  for (const cat of CATEGORIAS) {
    if (cat.id === 'outros') continue;
    let score = 0;
    for (const palavra of cat.palavras) {
      const p = normalizar(palavra);
      if (textoNorm.includes(p)) score += Math.max(1, p.split(' ').length * 2);
    }
    if (score > 0) kwScores[cat.id] = score;
  }
  const melhorKw = Object.entries(kwScores).sort((a, b) => b[1] - a[1])[0];
  if (melhorKw) {
    const cat = resolverCategoria(melhorKw[0]);
    if (cat) { _trilha('fallback-keyword', cat.id); return cat; }
  }

  _trilha('ultimo-recurso', 'outros');
  return CATEGORIAS.find(c => c.id === 'outros');
}

// _classificarPorVizinhos é exportado para permitir teste isolado do
// classificador sem precisar subir o banco.
// _classificarPorVizinhos e _resetCorpusCache são exportados para os testes
// (o reset garante que cada caso de teste parte de corpus limpo).
module.exports = { classificar, classificarInteligente, CATEGORIAS, _classificarPorVizinhos, _resetCorpusCache };
