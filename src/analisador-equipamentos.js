const Anthropic = require('@anthropic-ai/sdk');

let client = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;
    client = new Anthropic({ apiKey });
  }
  return client;
}

async function extrairEquipamentos(descricao) {
  const ai = getClient();
  if (!ai) return [];

  try {
    const msg = await ai.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Analise a descrição de chamado de suporte de TI abaixo e extraia APENAS equipamentos ou máquinas físicas específicas mencionadas (ex: impressora, computador, monitor, TV, projetor, telefone, roteador, câmera, notebook).

Regras:
- Inclua o nome do equipamento e a localização/identificação se mencionada (ex: "Impressora Nutrição", "Computador Recepção 02", "Monitor Sala de Reuniões")
- Se nenhuma localização for citada, use apenas o tipo (ex: "Impressora", "Computador")
- Ignore problemas de software puro (senha, sistema, internet sem equipamento específico)
- Responda SOMENTE com um array JSON de strings. Sem explicações.

Descrição: "${descricao.replace(/"/g, "'")}"

Resposta (apenas o array JSON):`,
        },
      ],
    });

    const texto = msg.content[0]?.text?.trim() || '[]';
    const match = texto.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const lista = JSON.parse(match[0]);
    if (!Array.isArray(lista)) return [];

    return lista
      .filter(e => typeof e === 'string' && e.trim().length > 0)
      .map(e => e.trim())
      .slice(0, 10);
  } catch (err) {
    console.error('[analisador-equipamentos] erro:', err.message);
    return [];
  }
}

module.exports = { extrairEquipamentos };
