/*
 * Extracao de equipamentos mencionados no chamado — 100% local.
 *
 * Substitui a versao que chamava a API da Anthropic. Funciona por dicionario:
 * uma lista de tipos de equipamento (com sinonimos e erros de escrita comuns)
 * e uma lista de locais do hotel. Para cada equipamento citado, procura o local
 * mais proximo na frase e monta o rotulo "Tipo Local".
 *
 * Vantagem colateral sobre a versao com IA: o rotulo sai sempre com a grafia
 * canonica ("Impressora Nutricao"), independentemente de como o usuario digitou.
 *
 * Limite conhecido: so reconhece o que esta nas listas abaixo. Equipamento novo
 * no hotel = adicionar uma linha em EQUIPAMENTOS. Local novo = uma linha em
 * LOCAIS. E o ponto de manutencao deste arquivo.
 */

// canonico -> variacoes aceitas na descricao (ja sem acento, minusculas)
const EQUIPAMENTOS = [
  ['Impressora',    ['impressora', 'impressoras', 'multifuncional', 'copiadora', 'xerox', 'impresora']],
  ['Scanner',       ['scanner', 'digitalizadora']],
  ['Computador',    ['computador', 'computadores', 'desktop', 'cpu', 'gabinete', 'micro', 'maquina']],
  ['Notebook',      ['notebook', 'notbook', 'laptop']],
  ['Monitor',       ['monitor', 'monitores', 'display']],
  ['TV',            ['tv', 'televisao', 'televisor', 'smart tv']],
  ['Projetor',      ['projetor', 'datashow', 'data show']],
  ['Telefone',      ['telefone', 'telefones', 'ramal', 'aparelho telefonico', 'interfone']],
  ['Headset',       ['headset', 'fone de ouvido']],
  ['Roteador',      ['roteador', 'switch', 'access point', 'modem']],
  ['Camera',        ['camera', 'cameras', 'cftv', 'dvr', 'nvr']],
  ['Tablet',        ['tablet', 'ipad']],
  ['Nobreak',       ['nobreak', 'no break', 'estabilizador']],
  ['Teclado',       ['teclado', 'teclados']],
  ['Mouse',         ['mouse']],
  ['Celular',       ['celular', 'smartphone', 'iphone']],
  ['Servidor',      ['servidor', 'servidores']],
  ['Catraca',       ['catraca', 'relogio de ponto', 'leitor biometrico']],
  ['PDV',           ['pdv', 'ponto de venda', 'terminal de venda']],
];

// canonico -> variacoes. Setores do hotel + locais genericos.
const LOCAIS = [
  ['Recepcao',              ['recepcao']],
  ['Governanca',            ['governanca']],
  ['Nutricao',              ['nutricao']],
  ['Cozinha',               ['cozinha']],
  ['Lavanderia',            ['lavanderia']],
  ['Manutencao',            ['manutencao']],
  ['Financeiro',            ['financeiro']],
  ['Controladoria',         ['controladoria']],
  ['Comercial',             ['comercial', 'vendas']],
  ['Reservas',              ['reservas']],
  ['Marketing',             ['marketing']],
  ['Juridico',              ['juridico']],
  ['Recursos Humanos',      ['recursos humanos', ' rh ', 'rh']],
  ['Tecnologia da Informacao', ['tecnologia da informacao', ' ti ']],
  ['Almoxarifado',          ['almoxarifado', 'compras', 'estoque']],
  ['Concierge',             ['concierge']],
  ['Portaria',              ['portaria', 'mensageria']],
  ['Estacionamento',        ['estacionamento']],
  ['Piscina',               ['piscina']],
  ['Fitness Center',        ['fitness', 'academia']],
  ['Spa',                   ['spa', 'occitane']],
  ['Banquetes',             ['banquetes']],
  ['Eventos',               ['eventos', 'convencoes']],
  ['Confeitaria',           ['confeitaria', 'padaria']],
  ['Lobby Bar',             ['lobby bar']],
  ['Lobby',                 ['lobby']],
  ['Bar Rooftop',           ['rooftop']],
  ['Restaurante Mangostin', ['mangostin']],
  ['Restaurante Mucuripe',  ['mucuripe']],
  ['Room Service',          ['room service']],
  ['Rouparia',              ['rouparia']],
  ['Seguranca',             ['seguranca']],
  ['Transportes',           ['transportes']],
  ['Gerencia Geral',        ['gerencia geral', 'gerencia']],
  ['Revenue Management',    ['revenue']],
  ['Play Gran',             ['play gran']],
  ['Sala de Reunioes',      ['sala de reunioes', 'sala de reuniao']],
  ['Auditorio',             ['auditorio']],
  ['CPD',                   ['cpd', 'datacenter', 'sala de servidores']],
];

const MAX_EQUIPAMENTOS = 10;
const JANELA_ANTES = 45;   // caracteres varridos antes da mencao
const JANELA_DEPOIS = 70;  // e depois — o local costuma vir logo em seguida

function normalizar(texto) {
  return ` ${(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

/** Troca cada local citado por espacos, preservando o comprimento do texto. */
function _mascararLocais(textoNorm) {
  let saida = textoNorm;
  for (const [, variacoes] of LOCAIS) {
    for (const variacao of variacoes) {
      const alvo = ` ${variacao.trim()} `;
      let idx = saida.indexOf(alvo);
      while (idx !== -1) {
        saida = saida.slice(0, idx + 1) + ' '.repeat(variacao.trim().length) + saida.slice(idx + 1 + variacao.trim().length);
        idx = saida.indexOf(alvo, idx + 1);
      }
    }
  }
  return saida;
}

/** Acha o local citado mais proximo da posicao do equipamento. */
function _localProximo(textoNorm, posicao) {
  const inicio = Math.max(0, posicao - JANELA_ANTES);
  const trecho = textoNorm.slice(inicio, posicao + JANELA_DEPOIS);

  let melhor = null;
  let melhorDistancia = Infinity;

  for (const [canonico, variacoes] of LOCAIS) {
    for (const variacao of variacoes) {
      const idx = trecho.indexOf(variacao);
      if (idx === -1) continue;
      const distancia = Math.abs(inicio + idx - posicao);
      if (distancia < melhorDistancia) {
        melhorDistancia = distancia;
        // Numero logo apos o local vira parte do rotulo ("Recepcao 02").
        const depois = trecho.slice(idx + variacao.length, idx + variacao.length + 6);
        const num = depois.match(/^\s*(\d{1,3})\b/);
        melhor = num ? `${canonico} ${num[1].padStart(2, '0')}` : canonico;
      }
    }
  }
  return melhor;
}

/**
 * @param {string} descricao Texto do chamado.
 * @returns {Promise<string[]>} Ex.: ["Impressora Nutricao", "Computador Recepcao 02"]
 */
async function extrairEquipamentos(descricao) {
  if (!descricao || typeof descricao !== 'string') return [];

  const textoNorm = normalizar(descricao);
  if (textoNorm.length < 4) return [];

  // Nome de local pode conter nome de equipamento ("sala de servidores"). Busca
  // o equipamento num texto com os locais apagados, para nao inventar um
  // "Servidor" a partir do nome da sala; as posicoes sao preservadas, entao a
  // proximidade continua sendo calculada sobre o texto original.
  const textoBusca = _mascararLocais(textoNorm);

  const encontrados = new Map(); // rotulo -> posicao (mantem ordem de mencao)

  for (const [canonico, variacoes] of EQUIPAMENTOS) {
    let posicaoTipo = -1;

    for (const variacao of variacoes) {
      // \b nao funciona bem apos normalizacao com espacos nas bordas; procura
      // a variacao cercada por espaco para nao casar dentro de outra palavra.
      const alvo = ` ${variacao} `;
      const idx = textoBusca.indexOf(alvo);
      if (idx !== -1 && (posicaoTipo === -1 || idx < posicaoTipo)) {
        posicaoTipo = idx + 1;
      }
    }

    if (posicaoTipo === -1) continue;

    const local = _localProximo(textoNorm, posicaoTipo);
    const rotulo = local ? `${canonico} ${local}` : canonico;
    if (!encontrados.has(rotulo)) encontrados.set(rotulo, posicaoTipo);
  }

  return [...encontrados.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, MAX_EQUIPAMENTOS)
    .map(([rotulo]) => rotulo);
}

module.exports = { extrairEquipamentos };
