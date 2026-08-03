/*
 * Testes dos classificadores locais que substituiram as chamadas de IA.
 *
 * Rodar: npm test
 *
 * Se um dia a categorizacao comecar a errar, e aqui que se ajusta: adicione o
 * caso real que errou e mexa nos pesos/listas ate passar.
 */

const test = require('node:test');
const assert = require('node:assert');

const { _classificarPorVizinhos } = require('../src/categorizador');
const { extrairEquipamentos } = require('../src/analisador-equipamentos');

// Histórico mínimo representativo. O classificador real usa os 400 chamados
// mais recentes do banco; aqui basta amostra suficiente para exercitar a lógica.
const HISTORICO = [
  ['impressora', 'A impressora da recepcao esta atolando papel toda hora'],
  ['impressora', 'Preciso trocar o toner da multifuncional do financeiro'],
  ['impressora', 'Impressora da nutricao aparece offline na fila de impressao'],
  ['impressora', 'Nao consigo digitalizar documento no scanner da governanca'],
  ['impressora', 'A copiadora do comercial esta com risco nas copias'],
  ['ramal', 'O ramal 2145 esta sem tom de discagem'],
  ['ramal', 'Telefone da portaria nao recebe ligacao externa'],
  ['ramal', 'Headset do call center parou de funcionar, sem audio'],
  ['ramal', 'Central pabx caiu, todos os ramais mudos'],
  ['nobreak', 'O nobreak da sala de servidores esta apitando sem parar'],
  ['nobreak', 'Estabilizador da recepcao desligou com a queda de energia'],
  ['nobreak', 'Bateria do no-break precisa ser trocada, alarme constante'],
  ['monitor', 'Monitor da reserva ficou sem imagem, cabo hdmi solto'],
  ['monitor', 'Tela do computador do rh esta piscando muito'],
  ['monitor', 'Segundo monitor do marketing nao liga'],
  ['software', 'O sistema totvs protheus nao abre, da erro na inicializacao'],
  ['software', 'Preciso instalar o office no notebook novo do juridico'],
  ['software', 'Excel travando ao abrir planilha grande de custos'],
  ['software', 'Outlook nao sincroniza email desde ontem'],
  ['hardware', 'O computador da cozinha nao liga de jeito nenhum'],
  ['hardware', 'Notebook superaquecendo e desligando sozinho'],
  ['hardware', 'Preciso trocar o ssd do desktop do estoque'],
].map(([categoria, descricao]) => ({ categoria, descricao }));

test('categorizador local: acerta a categoria por similaridade com o histórico', () => {
  const casos = [
    ['impressora', 'A impressora do estoque nao imprime, parece falta de toner'],
    ['impressora', 'Papel atolado na multifuncional do rh'],
    ['ramal', 'Ramal da cozinha esta sem linha, nao disca'],
    ['nobreak', 'Nobreak do cpd apitando depois da oscilacao de energia'],
    ['monitor', 'A tela do monitor da recepcao ficou preta sem sinal'],
    ['software', 'O protheus deu erro e nao inicia'],
    ['hardware', 'Desktop do financeiro nao liga, sem nenhuma luz'],
  ];
  for (const [esperado, descricao] of casos) {
    assert.strictEqual(_classificarPorVizinhos(descricao, HISTORICO), esperado, descricao);
  }
});

test('categorizador local: nome de setor não decide a categoria', () => {
  // "governanca" aparece num chamado de impressora do histórico. O assunto
  // aqui é telefone — o setor não pode puxar a classificação.
  assert.strictEqual(
    _classificarPorVizinhos('O telefone da governanca esta mudo', HISTORICO),
    'ramal',
  );
});

test('categorizador local: devolve null quando não há base para decidir', () => {
  // Histórico pequeno demais.
  assert.strictEqual(_classificarPorVizinhos('impressora', HISTORICO.slice(0, 3)), null);
  // Texto sem nenhuma relação com o histórico.
  assert.strictEqual(_classificarPorVizinhos('xyzzy plugh frobnicate', HISTORICO), null);
  // Entrada inválida.
  assert.strictEqual(_classificarPorVizinhos('teste', null), null);
});

test('extração de equipamentos: identifica tipo e local', async () => {
  assert.deepStrictEqual(
    await extrairEquipamentos('A impressora da Nutrição está atolando papel'),
    ['Impressora Nutricao'],
  );
  assert.deepStrictEqual(
    await extrairEquipamentos('O computador da recepção 02 não liga'),
    ['Computador Recepcao 02'],
  );
  // Sinônimo ("multifuncional") normaliza para o nome canônico.
  assert.deepStrictEqual(
    await extrairEquipamentos('Preciso trocar o toner da multifuncional do RH'),
    ['Impressora Recursos Humanos'],
  );
});

test('extração de equipamentos: múltiplos equipamentos na mesma descrição', async () => {
  assert.deepStrictEqual(
    await extrairEquipamentos('Monitor da sala de reuniões sem imagem e o projetor também não liga'),
    ['Monitor Sala de Reunioes', 'Projetor Sala de Reunioes'],
  );
});

test('extração de equipamentos: nome do local não vira equipamento', async () => {
  // "sala de servidores" não pode gerar um equipamento "Servidor".
  assert.deepStrictEqual(
    await extrairEquipamentos('Nobreak da sala de servidores apitando'),
    ['Nobreak CPD'],
  );
});

test('extração de equipamentos: devolve vazio quando não há equipamento físico', async () => {
  assert.deepStrictEqual(await extrairEquipamentos('Esqueci minha senha do sistema'), []);
  assert.deepStrictEqual(await extrairEquipamentos('A internet do hotel está lenta'), []);
  assert.deepStrictEqual(await extrairEquipamentos(''), []);
  assert.deepStrictEqual(await extrairEquipamentos(null), []);
});
