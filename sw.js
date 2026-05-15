// Service Worker — 오프라인 플레이 (PWA).
// 처음 방문 후 핵심 자산을 캐시 → 네트워크 없어도 게임 동작.

const CACHE = 'bulsa-v6';   // 캐시 키 갱신 시 자동 무효화
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

// Network-first: JS 파일·쿼리스트링 URL은 캐시 제외 (코드 업데이트 즉시 반영)
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // JS 파일이나 ?쿼리가 있는 URL은 캐시 저장 안 함 (항상 네트워크)
  const skipCache = url.pathname.endsWith('.js') || url.pathname.endsWith('.html') || url.search;

  e.respondWith(
    fetch(req).then(res => {
      if (res && res.status === 200 && !skipCache) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(req, clone).catch(() => {}));
      }
      return res;
    }).catch(() => caches.match(req))
  );
});
