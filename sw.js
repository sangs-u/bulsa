// Service Worker — 오프라인 플레이 (PWA).
// 처음 방문 후 핵심 자산을 캐시 → 네트워크 없어도 게임 동작.

const CACHE = 'bulsa-v1';
const PRECACHE = [
  './',
  './game.html',
  './index.html',
  './manifest.webmanifest',
  './vendor/cannon.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// Stale-while-revalidate: 캐시에서 즉시 반환 + 백그라운드 갱신
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // 외부 CDN 은 캐시하지 않고 그냥 통과
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone).catch(() => {}));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
