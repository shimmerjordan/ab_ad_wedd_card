/* 星露谷婚礼请帖 · Service Worker（离线缓存，拓展③）
 * 策略：核心文件安装时预缓存；其余同源资源(素材图/字体)运行时按需缓存(cache-first)。
 * 跨源请求(CDN 字体/图床)不拦截，交给浏览器默认处理。 */
const CACHE = 'wedd-v1';
const CORE = [
  './', './index.html', './css/style.css',
  './js/config.js', './js/assets.js', './js/scene.js', './js/core.js', './js/play.js',
  './js/render.js', './js/interior.js', './js/hud.js', './js/invite.js', './js/interact.js',
  './js/scenefx.js', './js/boot.js', './manifest.json',
];
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()).catch(() => {})
  );
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== location.origin) return;          // 跨源交给浏览器
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(resp => {
      if (resp && resp.ok) { const cp = resp.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return resp;
    }).catch(() => caches.match('./index.html')))
  );
});
