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
  if (row) return JSON.parse(row.valor);
  const keys = webpush.generateVAPIDKeys();
  d.prepare("INSERT OR REPLACE INTO config (chave, valor) VALUES ('vapid_keys', ?)").run(JSON.stringify(keys));
  console.log('[Push] VAPID keys gerados. Para produção, defina VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY nas variáveis de ambiente.');
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
    if (err.statusCode === 410 || err.statusCode === 404) {
      db.getDb().prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint);
    }
  }
}

async function enviarParaAdmin(adminId, titulo, corpo, url) {
  if (!initialized) init();
  const subs = db.getDb().prepare('SELECT * FROM push_subscriptions WHERE admin_id = ?').all(adminId);
  for (const sub of subs) await _enviar(sub, { title: titulo, body: corpo, url: url || '/admin-painel.html' });
}

async function enviarParaTodos(titulo, corpo, url) {
  if (!initialized) init();
  const subs = db.getDb().prepare('SELECT * FROM push_subscriptions').all();
  for (const sub of subs) await _enviar(sub, { title: titulo, body: corpo, url: url || '/admin-painel.html' });
}

module.exports = { init, getPublicKey, enviarParaAdmin, enviarParaTodos };
