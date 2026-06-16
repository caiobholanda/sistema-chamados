const clients = new Map(); // userId (number) → Set<res>
const admins  = new Set(); // res de TODOS os admins conectados (broadcast)

function subscribe(userId, res) {
  const id = Number(userId);
  if (!clients.has(id)) clients.set(id, new Set());
  clients.get(id).add(res);
}

function unsubscribe(userId, res) {
  const id = Number(userId);
  const set = clients.get(id);
  if (!set) return;
  set.delete(res);
  if (!set.size) clients.delete(id);
}

function notify(userId, event, data = {}) {
  const set = clients.get(Number(userId));
  if (!set || !set.size) return;
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  set.forEach(res => { try { res.write(msg); } catch {} });
}

function subscribeAdmin(res) { admins.add(res); }
function unsubscribeAdmin(res) { admins.delete(res); }
function notifyAllAdmins(event, data = {}) {
  if (!admins.size) return;
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  admins.forEach(res => { try { res.write(msg); } catch {} });
}

module.exports = { subscribe, unsubscribe, notify, subscribeAdmin, unsubscribeAdmin, notifyAllAdmins };
