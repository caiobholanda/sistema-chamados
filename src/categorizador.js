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
      'acesso', 'login', 'senha', 'bloqueado', 'permissão', 'credencial',
      'autenticação', 'resetar senha', 'redefinir senha', 'conta bloqueada',
      'sem permissão', 'internet', 'wifi', 'wi-fi', 'rede', 'sem acesso',
      'conexão', 'sem internet', 'não conecta', 'email', 'e-mail',
      'caixa de entrada', 'não recebe email', 'configurar email',
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
      'scanner', 'digitalização',
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
      'telefonia', 'interfone',
    ],
  },
  {
    id: 'nobreak',
    nome: 'Nobreak',
    cor: '#F59E0B',
    palavras: [
      'nobreak', 'no-break', 'ups', 'estabilizador', 'energia', 'sem energia',
      'queda de energia', 'bateria nobreak', 'alarme nobreak', 'régua',
      'extensão', 'tomada', 'filtro de linha', 'oscilação',
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
      'segunda tela', 'tv',
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
