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
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s]/g, ' ');
}

function classificar(descricao) {
  const texto = normalizar(descricao || '');
  const scores = {};

  for (const cat of CATEGORIAS) {
    if (cat.id === 'outros') continue;
    let score = 0;
    for (const palavra of cat.palavras) {
      const p = normalizar(palavra);
      if (texto.includes(p)) {
        score += Math.max(1, p.split(' ').length * 2);
      }
    }
    scores[cat.id] = score;
  }

  const melhor = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (!melhor || melhor[1] === 0) return null;
  return CATEGORIAS.find(c => c.id === melhor[0]);
}

const _idsValidos = CATEGORIAS.filter(c => c.id !== 'outros').map(c => c.id);
const _nomesValidos = CATEGORIAS.filter(c => c.id !== 'outros').map(c => `${c.id} (${c.nome})`).join(', ');

function _carregarEtiquetasDinamicas() {
  try {
    return require('./db').listarEtiquetas();
  } catch { return []; }
}

async function classificarInteligente(descricao) {
  // 1. Tenta por keywords estáticos
  const porKeyword = classificar(descricao);
  if (porKeyword) return porKeyword;

  // 2. Etiquetas dinâmicas: matching por palavras da descrição
  const dinamicas = _carregarEtiquetasDinamicas();
  if (dinamicas.length) {
    const texto = normalizar(descricao || '');
    const stop = new Set(['para','com','que','não','mais','como','uma','num','nos','das','dos','pelo','pela','esse','esta','esta','isso','isto','seu','sua','ser','ter','foi','tem','ele','ela','eles','elas']);
    let melhorScore = 0, melhor = null;
    for (const et of dinamicas) {
      if (!et.descricao) continue;
      const palavras = normalizar(et.descricao).split(/\s+/).filter(w => w.length >= 4 && !stop.has(w));
      let score = 0;
      for (const p of palavras) { if (texto.includes(p)) score += Math.max(1, Math.floor(p.length / 4)); }
      if (score > melhorScore) { melhorScore = score; melhor = et; }
    }
    if (melhor && melhorScore >= 2) return { id: melhor.slug, nome: melhor.nome, cor: melhor.cor };
  }

  // 3. Fallback: IA com categorias estáticas + dinâmicas
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return CATEGORIAS.find(c => c.id === 'outros');

    const ai = new Anthropic({ apiKey });

    let opcoesIA = _nomesValidos;
    const idsExtras = [];
    if (dinamicas.length) {
      const extras = dinamicas.map(e => {
        idsExtras.push(e.slug);
        const desc = e.descricao ? ': ' + e.descricao.slice(0, 100) : '';
        return `${e.slug} (${e.nome}${desc})`;
      }).join(', ');
      opcoesIA += ', ' + extras;
    }

    const msg = await ai.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 30,
      messages: [{
        role: 'user',
        content: `Classifique este chamado de suporte de TI em UMA das categorias abaixo. Responda APENAS com o id da categoria, sem explicação.

Categorias disponíveis: ${opcoesIA}

Chamado: "${descricao.replace(/"/g, "'").slice(0, 500)}"

Resposta (apenas o id):`,
      }],
    });

    const id = msg.content[0]?.text?.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (_idsValidos.includes(id)) return CATEGORIAS.find(c => c.id === id);
    if (idsExtras.includes(id)) {
      const et = dinamicas.find(e => e.slug === id);
      if (et) return { id: et.slug, nome: et.nome, cor: et.cor };
    }
  } catch (err) {
    console.error('[categorizador-ia] erro:', err.message);
  }

  // 4. Último recurso: outros
  return CATEGORIAS.find(c => c.id === 'outros');
}

module.exports = { classificar, classificarInteligente, CATEGORIAS };
