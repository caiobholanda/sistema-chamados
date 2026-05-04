// Classificador automático de chamados por categoria.
// Usa pontuação ponderada por palavras-chave: palavras mais longas valem mais
// (são mais específicas e menos propensas a colisão).

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
      'não abre', 'não inicia', 'configuração', 'atualizar', 'reinstalar',
    ],
  },
  {
    id: 'hardware',
    nome: 'Hardware',
    cor: '#0EA5E9',
    palavras: [
      'computador', 'monitor', 'teclado', 'mouse', 'notebook', 'desktop', 'pc',
      'não liga', 'desligando', 'processador', 'memória', 'hd', 'ssd', 'disco',
      'ventilador', 'superaquecendo', 'fonte', 'placa mãe', 'hardware', 'periférico',
      'tablet', 'equipamento danificado', 'máquina', 'bateria', 'carregador',
      'leitor de cartão', 'gabinete', 'cpu', 'sem imagem', 'tela quebrada',
    ],
  },
  {
    id: 'rede',
    nome: 'Rede / Internet',
    cor: '#10B981',
    palavras: [
      'internet', 'wifi', 'wi-fi', 'wireless', 'rede', 'sem acesso', 'conexão',
      'roteador', 'switch', 'ip', 'vpn', 'cabo de rede', 'ethernet', 'sem internet',
      'queda de rede', 'não conecta', 'ping', 'servidor', 'firewall', 'dhcp',
      'dns', 'acesso remoto', 'rdp', 'sem sinal de rede', 'lentidão de rede',
      'rede caiu', 'desconectando',
    ],
  },
  {
    id: 'cameras',
    nome: 'Câmeras / CFTV',
    cor: '#F59E0B',
    palavras: [
      'câmera', 'camera', 'cftv', 'nvr', 'dvr', 'gravação', 'câmera de segurança',
      'vigilância', 'monitoramento por câmera', 'câmera offline', 'não grava',
      'câmera apagada', 'câmera travada', 'câmera sem imagem', 'câmera fora',
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
    ],
  },
  {
    id: 'telefonia',
    nome: 'Telefonia',
    cor: '#EC4899',
    palavras: [
      'telefone', 'ramal', 'discagem', 'chamada', 'pabx', 'headset', 'telefonia',
      'ligação', 'sem tom', 'sem linha', 'voip', 'aparelho telefônico',
      'não disca', 'não recebe ligação', 'ramal mudo', 'central telefônica',
    ],
  },
  {
    id: 'acesso_senha',
    nome: 'Acesso / Senha',
    cor: '#EF4444',
    palavras: [
      'senha', 'acesso', 'login', 'bloqueado', 'permissão', 'credencial',
      'autenticação', 'não consigo entrar', 'não acessa', 'expirou',
      'resetar senha', 'redefinir senha', 'desbloquear conta', 'conta bloqueada',
      'sem permissão', 'conta expirada', 'usuário bloqueado',
    ],
  },
  {
    id: 'email',
    nome: 'E-mail',
    cor: '#64748B',
    palavras: [
      'email', 'e-mail', 'outlook', 'caixa de entrada', 'spam', 'correio',
      'webmail', 'não recebe email', 'não envia email', 'caixa cheia',
      'mensagem não entrega', 'gmail', 'hotmail', 'configurar email',
    ],
  },
  {
    id: 'cabos',
    nome: 'Cabos / Cabeamento',
    cor: '#78716C',
    palavras: [
      'cabo', 'cabeamento', 'fio', 'conector', 'hdmi', 'cabo usb', 'rj45',
      'extensão', 'régua', 'no-break', 'nobreak', 'estabilizador', 'adaptador',
      'hub usb', 'conversor', 'cabo danificado', 'cabo rompido', 'passagem de cabo',
    ],
  },
  {
    id: 'tv_projetor',
    nome: 'TV / Projetor',
    cor: '#0891B2',
    palavras: [
      'televisão', 'televisor', 'tv', 'projetor', 'datashow', 'tela de projeção',
      'display', 'apresentação projetor', 'sem sinal hdmi', 'controle remoto',
      'chromecast', 'apple tv', 'smartboard', 'lousa digital',
    ],
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
    let score = 0;
    for (const palavra of cat.palavras) {
      const p = normalizar(palavra);
      if (texto.includes(p)) {
        // palavras mais longas valem mais (mais específicas)
        score += Math.max(1, p.split(' ').length * 2);
      }
    }
    scores[cat.id] = score;
  }

  const melhor = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (!melhor || melhor[1] === 0) return null;

  return CATEGORIAS.find(c => c.id === melhor[0]);
}

module.exports = { classificar, CATEGORIAS };
