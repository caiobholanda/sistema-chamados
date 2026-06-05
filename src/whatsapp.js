'use strict';

// ── Mensagens por locale (tom de hotel de luxo) ────────────────────────────────
const MESSAGES = {
  'pt-BR': "Olá, {{nome}}! Aqui é o Spa L'Occitane do Hotel Gran Marquise. Antes do seu tratamento, pedimos que preencha este formulário rápido e confidencial: {{link}}. Ele garante um atendimento seguro e personalizado. Obrigado!",
  'pt-PT': "Olá, {{nome}}! Fala o Spa L'Occitane do Hotel Gran Marquise. Antes do seu tratamento, pedimos que preencha este breve formulário confidencial: {{link}}. Garante um atendimento seguro e personalizado. Obrigado!",
  en:      "Hello, {{nome}}! This is the L'Occitane Spa at Hotel Gran Marquise. Before your treatment, please fill out this short, confidential form: {{link}}. It helps us provide a safe, personalized experience. Thank you!",
  fr:      "Bonjour {{nome}} ! Ici le Spa L'Occitane de l'Hôtel Gran Marquise. Avant votre soin, merci de remplir ce court formulaire confidentiel : {{link}}. Il nous permet de vous offrir une expérience sûre et personnalisée. Merci !",
  es:      "¡Hola, {{nome}}! Le saluda el Spa L'Occitane del Hotel Gran Marquise. Antes de su tratamiento, complete este breve formulario confidencial: {{link}}. Nos ayuda a brindarle una experiencia segura y personalizada. ¡Gracias!",
  it:      "Salve {{nome}}! Siamo la Spa L'Occitane dell'Hotel Gran Marquise. Prima del Suo trattamento, La preghiamo di compilare questo breve modulo riservato: {{link}}. Ci aiuta a offrirLe un'esperienza sicura e personalizzata. Grazie!",
  de:      "Guten Tag {{nome}}! Hier ist das L'Occitane Spa im Hotel Gran Marquise. Bitte füllen Sie vor Ihrer Behandlung dieses kurze, vertrauliche Formular aus: {{link}}. So können wir Ihnen eine sichere und persönliche Behandlung bieten. Vielen Dank!",
};

// Nomes dos templates aprovados — configurar via env vars quando a API real for ativada
// TODO: criar e aprovar esses templates no Meta Business Manager antes de ativar a API
const TEMPLATE_NAMES = {
  'pt-BR': process.env.WA_TEMPLATE_PT_BR || 'spa_pre_tratamento_pt_br',
  'pt-PT': process.env.WA_TEMPLATE_PT_PT || 'spa_pre_tratamento_pt_pt',
  en:      process.env.WA_TEMPLATE_EN    || 'spa_pre_tratamento_en',
  fr:      process.env.WA_TEMPLATE_FR    || 'spa_pre_tratamento_fr',
  es:      process.env.WA_TEMPLATE_ES    || 'spa_pre_tratamento_es',
  it:      process.env.WA_TEMPLATE_IT    || 'spa_pre_tratamento_it',
  de:      process.env.WA_TEMPLATE_DE    || 'spa_pre_tratamento_de',
};

const WA_LANG_CODES = {
  'pt-BR': 'pt_BR', 'pt-PT': 'pt_PT',
  en: 'en', fr: 'fr', es: 'es', it: 'it', de: 'de',
};

function buildMessage(locale, nome, link) {
  const tpl = MESSAGES[locale] || MESSAGES.en;
  return tpl.replace('{{nome}}', nome).replace('{{link}}', link);
}

/**
 * Envia formulário pré-tratamento via WhatsApp.
 *
 * Env vars necessárias para a API real (Meta Cloud API):
 *   WHATSAPP_API_TOKEN      — token de acesso permanente
 *   WHATSAPP_PHONE_NUMBER_ID — ID do número de telefone no Meta
 *   WA_TEMPLATE_PT_BR, WA_TEMPLATE_EN, … — nome de cada template aprovado
 *   BASE_URL                — URL pública do sistema (ex.: https://sistema-chamados-granmarquise.fly.dev)
 *
 * Sem as vars acima, opera em modo FALLBACK: gera um link wa.me com a mensagem
 * pré-preenchida. O admin abre o link manualmente e pressiona "Enviar" no WhatsApp Web.
 *
 * @returns {{ fallback: boolean, waUrl?: string }}
 */
async function enviarWhatsApp({ telefone, locale, urlFormulario, nomeCliente }) {
  const apiToken      = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!apiToken || !phoneNumberId) {
    // ── MODO FALLBACK ──────────────────────────────────────────────────────────
    // TODO: quando os templates forem aprovados no Meta, remover este bloco e
    //       configurar WHATSAPP_API_TOKEN + WHATSAPP_PHONE_NUMBER_ID no Fly.io
    const msg   = buildMessage(locale, nomeCliente, urlFormulario);
    const phone = telefone.replace(/\D/g, '');
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    console.log(`[WhatsApp FALLBACK] Locale=${locale} Para=${telefone} URL=${urlFormulario}`);
    return { fallback: true, waUrl };
  }

  // ── API REAL (Meta Cloud API v19.0) ────────────────────────────────────────
  // Requer Node.js 18+ para fetch nativo. Se necessário, instalar node-fetch.
  const resp = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: telefone,
        type: 'template',
        template: {
          name: TEMPLATE_NAMES[locale] || TEMPLATE_NAMES.en,
          language: { code: WA_LANG_CODES[locale] || 'pt_BR' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: nomeCliente },
                { type: 'text', text: urlFormulario },
              ],
            },
          ],
        },
      }),
    }
  );

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error?.message || `WhatsApp API error ${resp.status}`);
  }

  return { fallback: false };
}

module.exports = { enviarWhatsApp };
