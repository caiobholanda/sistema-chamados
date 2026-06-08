const clients = new Map(); // userId (number) → Set<res>

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

module.exports = { subscribe, unsubscribe, notify };
