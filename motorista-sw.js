// Service Worker para Notificações Push - Garcia Transportes
// Versão: 1.0

const CACHE_NAME = 'garcia-transportes-v1';
const ASSETS_TO_CACHE = [
  '/motorista.html',
  '/images/motorista.png',
  '/images/destino.png',
  '/SOM/somchamada.mp3'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache aberto');
        return cache.addAll(ASSETS_TO_CACHE).catch(err => {
          console.warn('[SW] Alguns arquivos não puderam ser cacheados:', err);
        });
      })
  );
  self.skipWaiting(); // Ativa imediatamente
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Toma controle imediatamente
});

// Intercepta requisições de rede (estratégia Network First)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// ========================================================================
// HANDLER PRINCIPAL: Push Notification
// ========================================================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push recebido:', event);
  
  let data = {
    title: 'Nova Solicitação de Corrida!',
    body: 'Você recebeu uma nova solicitação de corrida',
    icon: '/images/destino.png',
    badge: '/images/motorista.png',
    tag: 'new-ride',
    requireInteraction: true, // Notificação fica visível até interação
    vibrate: [200, 100, 200, 100, 200, 100, 200], // Padrão de vibração
    actions: [
      { action: 'open', title: 'Abrir', icon: '/images/destino.png' },
      { action: 'close', title: 'Fechar' }
    ],
    data: {} // Dados extras da corrida
  };

  // Se o push vier com dados do servidor, usa eles
  if (event.data) {
    try {
      const pushData = event.data.json();
      console.log('[SW] Dados do push:', pushData);
      
      if (pushData.title) data.title = pushData.title;
      if (pushData.body) data.body = pushData.body;
      if (pushData.tag) data.tag = pushData.tag;
      if (pushData.rideId) data.data.rideId = pushData.rideId;
      if (pushData.destination) data.data.destination = pushData.destination;
    } catch (e) {
      console.error('[SW] Erro ao parsear dados do push:', e);
    }
  }

  // Exibe a notificação
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      requireInteraction: data.requireInteraction,
      vibrate: data.vibrate,
      actions: data.actions,
      data: data.data
    })
  );

  // Tenta tocar som mesmo em background (funciona em alguns navegadores)
  event.waitUntil(
    playNotificationSound()
  );

  // Notifica todas as abas abertas do app
  event.waitUntil(
    notifyAllClients(data)
  );
});

// ========================================================================
// HANDLER: Clique na Notificação
// ========================================================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificação clicada:', event.action);
  
  event.notification.close(); // Fecha a notificação

  if (event.action === 'close') {
    return; // Usuário fechou, não faz nada
  }

  // Abre ou foca na janela do app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Procura por uma janela já aberta
        for (let client of clientList) {
          if (client.url.includes('motorista.html') && 'focus' in client) {
            return client.focus();
          }
        }
        // Se não encontrou, abre uma nova
        if (clients.openWindow) {
          return clients.openWindow('/motorista.html');
        }
      })
  );
});

// ========================================================================
// FUNÇÃO AUXILIAR: Tocar Som em Background
// ========================================================================
async function playNotificationSound() {
  try {
    // Tenta usar Web Audio API para tocar som em background
    // Nota: Funciona em Chrome/Edge, limitado em Safari/Firefox
    
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    
    // Envia mensagem para todas as abas tocarem o som
    clients.forEach(client => {
      client.postMessage({
        type: 'PLAY_NOTIFICATION_SOUND'
      });
    });
  } catch (error) {
    console.error('[SW] Erro ao tocar som:', error);
  }
}

// ========================================================================
// FUNÇÃO AUXILIAR: Notificar Todas as Abas Abertas
// ========================================================================
async function notifyAllClients(data) {
  try {
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    
    clients.forEach(client => {
      client.postMessage({
        type: 'NEW_RIDE_NOTIFICATION',
        data: data
      });
    });
  } catch (error) {
    console.error('[SW] Erro ao notificar clientes:', error);
  }
}

// ========================================================================
// HANDLER: Sincronização em Background (Background Sync)
// ========================================================================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background Sync:', event.tag);
  
  if (event.tag === 'sync-rides') {
    event.waitUntil(syncRidesData());
  }
});

async function syncRidesData() {
  try {
    // Aqui poderia fazer sincronização de dados quando voltar online
    console.log('[SW] Sincronizando dados de corridas...');
  } catch (error) {
    console.error('[SW] Erro na sincronização:', error);
  }
}

// ========================================================================
// HANDLER: Mensagens do App
// ========================================================================
self.addEventListener('message', (event) => {
  console.log('[SW] Mensagem recebida:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

console.log('[SW] Service Worker Garcia Transportes carregado');
