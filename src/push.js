const webpush = require('web-push');
const db = require('./db');

let initialized = false;
let _publicKey = null;

function getVapidKeys() {
  const d = db.getDb();
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  const row = d.prepare("SELECT valor FROM config WHERE chave = 'vapid_keys'").get();
  if (row) {
    const keys = JSON.parse(row.valor);
    console.log('='.repeat(72));
    console.log('[Push] VAPID keys carregadas do banco. Para nunca perder notificações,');
    console.log('[Push] defina estas variáveis de ambiente permanentes no Railway:');
    console.log('[Push]   VAPID_PUBLIC_KEY=' + keys.publicKey);
    console.log('[Push]   VAPID_PRIVATE_KEY=' + keys.privateKey);
    console.log('[Push]   VAPID_EMAIL=ti@granmarquise.com.br');
    console.log('='.repeat(72));
    return keys;
  }
  const keys = webpush.generateVAPIDKeys();
  d.prepare("INSERT OR REPLACE INTO config (chave, valor) VALUES ('vapid_keys', ?)").run(JSON.stringify(keys));
  console.log('='.repeat(72));
  console.log('[Push] NOVAS VAPID keys geradas! COPIE PARA O RAILWAY IMEDIATAMENTE:');
  console.log('[Push]   VAPID_PUBLIC_KEY=' + keys.publicKey);
  console.log('[Push]   VAPID_PRIVATE_KEY=' + keys.privateKey);
  console.log('[Push]   VAPID_EMAIL=ti@granmarquise.com.br');
  console.log('[Push] Sem isso, as notificações param a cada redeploy do banco.');
  console.log('='.repeat(72));
  return keys;
}

function init() {
  if (initialized) return;
  const keys = getVapidKeys();
  _publicKey = keys.publicKey;
  webpush.setVapidDetails(
    'mailto:' + (process.env.VAPID_EMAIL || 'ti@granmarquise.com.br'),
    keys.publicKey,
    keys.privateKey
  );
  initialized = true;
}

function getPublicKey() {
  if (!initialized) init();
  return _publicKey;
}

async function _enviar(sub, payload) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
  } catch (err) {
    // 404/410 = subscription expirou ou não existe mais
    // 401/403 = VAPID key não bate com a key usada na subscription (keys mudaram)
    if ([401, 403, 404, 410].includes(err.statusCode)) {
      db.getDb().prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint);
      console.log('[Push] Subscription removida (status ' + err.statusCode + '):', sub.endpoint?.slice(0, 60) + '...');
    } else {
      console.warn('[Push] Falha ao enviar (status ' + (err.statusCode || '?') + '):', err.message || err);
    }
  }
}

async function enviarParaAdmin(adminId, titulo, corpo, url) {
  if (!initialized) init();
  const subs = db.getDb().prepare('SELECT * FROM push_subscriptions WHERE admin_id = ?').all(adminId);
  for (const sub of subs) {
    const targetUrl = sub.is_mobile ? '/mobile' : (url || '/admin-painel.html');
    await _enviar(sub, { title: titulo, body: corpo, url: targetUrl });
  }
}

async function enviarParaTodos(titulo, corpo, url) {
  if (!initialized) init();
  const subs = db.getDb().prepare('SELECT * FROM push_subscriptions').all();
  for (const sub of subs) {
    const targetUrl = sub.is_mobile ? '/mobile' : (url || '/admin-painel.html');
    await _enviar(sub, { title: titulo, body: corpo, url: targetUrl });
  }
}

module.exports = { init, getPublicKey, enviarParaAdmin, enviarParaTodos };
