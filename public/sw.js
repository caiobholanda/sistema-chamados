// Ativa imediatamente sem esperar abas fecharem
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'Chamados TI', body: 'Nova notificação', url: '/admin-painel.html' };
  // tag agrupa notificações do mesmo tipo — evita empilhamento sem perder nenhuma
  const tag = data.tag || (data.title || 'chamados-ti').slice(0, 64);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Sempre envia postMessage para o toast in-app (quando a aba está aberta)
      windowClients.forEach(c => c.postMessage({ type: 'notif', title: data.title, body: data.body, url: data.url }));

      // Sempre mostra notificação nativa — não depende de foco (evita perda silenciosa)
      // renotify:true garante som/vibração mesmo que a tag já exista
      return self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag,
        renotify: true,
        data: { url: data.url || '/admin-painel.html' },
        requireInteraction: false,
        vibrate: [200, 100, 200],
      });
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/admin-painel.html';
  const isMobileUrl = url.includes('/mobile');
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (list) => {
      // 1ª tentativa: focar uma janela que combine com o destino (mobile↔mobile, admin↔admin)
      for (const c of list) {
        const cIsMobile = c.url.includes('/mobile');
        if (cIsMobile === isMobileUrl && 'focus' in c) {
          if ('navigate' in c && !c.url.endsWith(url)) {
            try { await c.navigate(url); } catch {}
          }
          return c.focus();
        }
      }
      // 2ª tentativa: qualquer janela do app (navega para o destino certo)
      for (const c of list) {
        if ('focus' in c) {
          if ('navigate' in c) { try { await c.navigate(url); } catch {} }
          return c.focus();
        }
      }
      // 3ª tentativa: abrir nova janela
      return clients.openWindow(url);
    })
  );
});

// Quando o browser rotaciona/invalida a subscription, re-inscreve e avisa o backend
// removendo o endpoint antigo (causa #1 de "notificações pararam do nada")
self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil((async () => {
    try {
      const oldEndpoint = event.oldSubscription ? event.oldSubscription.endpoint : null;

      // Sempre busca a chave VAPID atual do servidor (mais robusto que reutilizar a antiga)
      const r = await fetch('/api/admin/push/vapid-public-key', { credentials: 'same-origin' });
      if (!r.ok) {
        console.error('[SW] pushsubscriptionchange: falha ao buscar VAPID', r.status);
        return;
      }
      const { publicKey } = await r.json();
      const padding = '='.repeat((4 - publicKey.length % 4) % 4);
      const raw = atob((publicKey + padding).replace(/-/g, '+').replace(/_/g, '/'));
      const appKey = Uint8Array.from([...raw].map(c => c.charCodeAt(0)));

      const newSub = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appKey,
      });

      // Detecta contexto mobile (PWA instalado em /mobile)
      let isMobile = false;
      try {
        const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        isMobile = clientList.some(c => c.url.includes('/mobile'));
      } catch {}

      // Envia oldEndpoint + nova subscription para o backend limpar o registro velho
      await fetch('/api/admin/push/resubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          oldEndpoint,
          newSubscription: newSub.toJSON(),
          is_mobile: isMobile,
        }),
      });
      console.log('[SW] pushsubscriptionchange: re-inscrito com sucesso');
    } catch (err) {
      console.error('[SW] pushsubscriptionchange falhou:', err);
    }
  })());
});
