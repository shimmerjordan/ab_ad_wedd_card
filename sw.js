/* 星露谷婚礼请帖 · Service Worker（离线缓存，拓展③）
 * 策略分两类，别再一刀切 cache-first —— 那样改了请帖内容，来过的宾客会被旧缓存钉死，
 * 连开发时 no-store 都盖不过它（SW 在 HTTP 缓存之前拦截）：
 *   · 页面/代码(html/css/js/json) → 网络优先，回源失败再吃缓存。改完刷新即生效，断网仍可用。
 *   · 照片/素材/字体          → 缓存优先。内容基本不变、体积大，走缓存最快。
 *     换了照片(文件名一样)时 bump 下面的 CACHE 版本号即可。
 * 跨源请求不拦截，交给浏览器默认处理。 */
const CACHE = 'wedd-v6';   // v6: 页面/代码改为网络优先（v5 起首屏提速：字体子集化/去 Google Fonts/脚本 defer/素材延后）
const CORE = [
  './', './index.html', './css/style.css',
  './js/config.js', './js/assets.js', './js/scene.js', './js/core.js', './js/play.js',
  './js/render.js', './js/interior.js', './js/hud.js', './js/invite.js', './js/interact.js',
  './js/scenefx.js', './js/router.js', './js/boot.js', './manifest.json',
  './assets/fonts/serif-sc.woff2',          // 入口页首屏字体，跟 CSS 一起预缓存
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
const keep = (req, resp) => {
  if (resp && resp.ok) { const cp = resp.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
  return resp;
};
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== location.origin) return;          // 跨源交给浏览器
  const isCode = req.mode === 'navigate' || /\.(html|css|js|json)$/.test(u.pathname) || u.pathname.endsWith('/');
  if (isCode) {                                      // 网络优先：新版本立刻可见，断网回落缓存
    e.respondWith(
      fetch(req).then(resp => keep(req, resp))
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(                                     // 缓存优先：照片/素材/字体
    caches.match(req).then(hit => hit || fetch(req).then(resp => keep(req, resp)))
  );
});
