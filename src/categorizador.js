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
      'segunda tela', 'projetor', 'datashow', 'apresentação projetor',
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
    nome: 'TV / Projetor',
    cor: '#7C3AED',
    palavras: [
      'televisão', 'televisor', 'tv da sala', 'smartboard', 'lousa digital',
      'tela de projeção', 'apresentação', 'sem sinal hdmi', 'controle remoto',
      'chromecast', 'apple tv', 'tv corporativa', 'display da sala',
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
  if (!melhor || melhor[1] === 0) {
    return CATEGORIAS.find(c => c.id === 'outros');
  }

  return CATEGORIAS.find(c => c.id === melhor[0]);
}

module.exports = { classificar, CATEGORIAS };
