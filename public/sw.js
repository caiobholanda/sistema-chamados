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
