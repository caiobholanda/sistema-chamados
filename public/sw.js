// Ativa imediatamente sem esperar abas fecharem
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'Chamados TI', body: 'Nova notificação', url: '/admin-painel.html' };

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      const focused = windowClients.some(c => c.focused);

      // Sempre envia mensagem para clients abertos (para o toast in-app)
      windowClients.forEach(c => c.postMessage({ type: 'notif', title: data.title, body: data.body, url: data.url }));

      // Notificação nativa só se nenhuma aba estiver em foco
      if (!focused) {
        return self.registration.showNotification(data.title, {
          body: data.body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          data: { url: data.url || '/admin-painel.html' },
          requireInteraction: false,
          vibrate: [200, 100, 200],
        });
      }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/admin-painel.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('/admin') && 'focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// Quando o browser rotaciona a subscription automaticamente, atualiza o servidor
self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil((async () => {
    try {
      // Tenta reusar a mesma chave da subscription antiga
      const oldKey = event.oldSubscription
        ? event.oldSubscription.options.applicationServerKey
        : null;

      let newSub;
      if (oldKey) {
        newSub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: oldKey,
        });
      } else {
        // Busca a chave atual do servidor
        const r = await fetch('/api/admin/push/vapid-public-key', { credentials: 'same-origin' });
        if (!r.ok) return;
        const { publicKey } = await r.json();
        const padding = '='.repeat((4 - publicKey.length % 4) % 4);
        const raw = atob((publicKey + padding).replace(/-/g, '+').replace(/_/g, '/'));
        const appKey = Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
        newSub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appKey,
        });
      }

      // Salva nova subscription no servidor
      await fetch('/api/admin/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(newSub.toJSON()),
      });
    } catch (err) {
      console.error('[SW] pushsubscriptionchange falhou:', err);
    }
  })());
});
