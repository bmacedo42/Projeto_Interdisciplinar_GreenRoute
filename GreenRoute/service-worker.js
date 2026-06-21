/**
 * ================================================
 * GREENROUTE - SERVICE WORKER
 * Gestão de cache e funcionamento offline
 * ================================================
 */

// Versão da cache
const CACHE_NAME = 'greenroute-v1';
const RUNTIME_CACHE = 'greenroute-runtime';

// Ficheiros essenciais para armazenar em cache
const ESSENTIAL_CACHE_FILES = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/js/auth.js',
    '/js/map.js',
    '/js/supabase.js',
    '/manifest.json'
];

// URLs externas para armazenar em cache
const EXTERNAL_CACHE_FILES = [
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
];

/**
 * Evento: install
 * Armazena ficheiros essenciais em cache durante a instalação
 */
self.addEventListener('install', (event) => {
    console.log('Service Worker: Instalando...');

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Service Worker: Armazenando em cache ficheiros essenciais');
            return cache.addAll(ESSENTIAL_CACHE_FILES).catch((error) => {
                console.warn('Erro ao armazenar ficheiros essenciais:', error);
                // Continuar mesmo que alguns ficheiros falhem
            });
        }).then(() => {
            // Armazenar recursos externos opcionais
            return caches.open(CACHE_NAME).then((cache) => {
                return Promise.all(
                    EXTERNAL_CACHE_FILES.map((url) => {
                        return cache.add(url).catch((error) => {
                            console.warn(`Erro ao armazenar ${url}:`, error);
                        });
                    })
                );
            });
        }).then(() => {
            // Ignorar espera e ativar imediatamente
            return self.skipWaiting();
        })
    );
});

/**
 * Evento: activate
 * Remove caches antigos quando uma nova versão está disponível
 */
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Ativando...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        console.log('Service Worker: Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

/**
 * Evento: fetch
 * Intercepta requisições e implementa estratégia de cache
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorar requisições não-GET
    if (request.method !== 'GET') {
        return;
    }

    // Ignorar requisições para localhost (para desenvolvimento)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return;
    }

    // Estratégia: Cache First (para recursos estáticos)
    if (isStaticResource(url.pathname)) {
        event.respondWith(
            caches.match(request).then((response) => {
                if (response) {
                    return response;
                }

                return fetch(request).then((response) => {
                    // Não armazenar respostas não-sucesso
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clonar a resposta
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    });

                    return response;
                }).catch(() => {
                    // Retornar página offline se disponível
                    return caches.match('/index.html');
                });
            })
        );
    }
    // Estratégia: Network First (para recursos dinâmicos)
    else {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (!response || response.status !== 200) {
                        return response;
                    }

                    const responseToCache = response.clone();

                    caches.open(RUNTIME_CACHE).then((cache) => {
                        cache.put(request, responseToCache);
                    });

                    return response;
                })
                .catch(() => {
                    // Tentar retornar do cache se a rede falhar
                    return caches.match(request).then((response) => {
                        if (response) {
                            return response;
                        }

                        // Retornar página padrão como fallback
                        return caches.match('/index.html');
                    });
                })
        );
    }
});

/**
 * Evento: message
 * Recebe mensagens do cliente
 */
self.addEventListener('message', (event) => {
    console.log('Service Worker: Mensagem recebida:', event.data);

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        clearAllCaches();
    }

    if (event.data && event.data.type === 'GET_CACHE_SIZE') {
        getCacheSize().then((size) => {
            event.ports[0].postMessage({ size });
        });
    }
});

/**
 * Verifica se é um recurso estático
 */
function isStaticResource(pathname) {
    const staticExtensions = ['.js', '.css', '.html', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf'];
    return staticExtensions.some((ext) => pathname.endsWith(ext));
}

/**
 * Limpa todos os caches
 */
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
    );
    console.log('Service Worker: Todos os caches foram limpos');
}

/**
 * Obtém o tamanho total do cache
 */
async function getCacheSize() {
    const cacheNames = await caches.keys();
    let totalSize = 0;

    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();

        for (const request of keys) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
            }
        }
    }

    return totalSize;
}

/**
 * Sincronização em background (para futura implementação)
 */
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background Sync -', event.tag);

    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

/**
 * Sincroniza dados pendentes
 */
async function syncData() {
    try {
        console.log('Service Worker: Sincronizando dados...');
        // Implementar sincronização aqui
    } catch (error) {
        console.error('Erro ao sincronizar dados:', error);
        throw error;
    }
}

/**
 * Notificações push (para futura implementação)
 */
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push notification recebida');

    let notificationData = {
        title: 'GreenRoute',
        body: 'Nova notificação de rota sustentável',
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-192x192.png'
    };

    if (event.data) {
        notificationData = event.data.json();
    }

    event.waitUntil(
        self.registration.showNotification(notificationData.title, notificationData)
    );
});

/**
 * Clique em notificação push
 */
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notificação clicada');

    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            // Procurar janela aberta
            for (let i = 0; i < clientList.length; i++) {
                if (clientList[i].url === '/' && 'focus' in clientList[i]) {
                    return clientList[i].focus();
                }
            }

            // Abrir janela se não houver nenhuma aberta
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

console.log('Service Worker: Carregado e pronto');
