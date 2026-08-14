/* ============================================================
 * URL 路由：四个顶层界面各有一个地址，可分享、可刷新、可后退
 *
 *   #/      入口门（默认）
 *   #/sdv   星露谷标题屏
 *   #/play  游戏中
 *   #/lux   老登版·典雅请帖
 *
 * 为什么用 hash 不用 query：宾客链接是 ?gn=张三&gt=3，调试参数是 ?lux=1/?show=…，
 * 都在 query 里。hash 与 query 互不干扰 —— 已经发出去的链接一个都不会失效，
 * 静态托管(GitHub Pages)也不需要任何 rewrite 规则。
 * ============================================================ */
const ROUTE_SCREENS = {
  '/':     'gate',
  '/sdv':  'title',
  '/play': 'play',
  '/lux':  'lux',
};
/* 老链接 → 等价 path。首屏落地时改写成 hash，参数本身留着(boot.js 还要读 ?show 的具体值) */
const ROUTE_LEGACY = [
  ['lux',  '/lux'],
  ['auto', '/play'],
  ['show', '/play'],
  ['scene','/play'],
  ['q',    '/play'],
  ['at',   '/play'],
];

/* 当前 path；认不出的一律当入口门 */
function routePath(){
  const p = (location.hash || '').replace(/^#/, '');
  return ROUTE_SCREENS[p] ? p : '/';
}
/* 老链接映射，没有匹配返回 null */
function routeFromLegacy(){
  const q = new URLSearchParams(location.search);
  for (const [key, path] of ROUTE_LEGACY) if (q.has(key)) return path;
  return null;
}

let _routeHandlers = null;
let _routeAt = null;        // 当前已生效的 path，避免同一个 path 重复切界面

/* 跳到某个界面。replace=true 时不留历史条目（用于首屏纠正）。
 * 用 pushState 而不是 location.hash= ：后者触发 hashchange 是异步的，
 * 调用方后面的代码会先跑，界面切换晚一拍；pushState 不发事件，这里同步 apply，时序确定。 */
function routeGo(path, replace){
  const p = ROUTE_SCREENS[path] ? path : '/';
  if (p === _routeAt) return;
  history[replace ? 'replaceState' : 'pushState'](history.state, '', '#' + p);
  routeApply(p);
}
/* 把 path 交给对应界面的处理函数 */
function routeApply(path){
  const p = ROUTE_SCREENS[path] ? path : '/';
  _routeAt = p;
  const fn = _routeHandlers && _routeHandlers[ROUTE_SCREENS[p]];
  if (fn) fn(p);
}

/* ——— 浮层栈：手机返回键先逐层关浮层，退到顶了才真的离开界面 ———
 * 浮层不上地址栏（你要的是「只有四个界面有地址」），所以压的历史条目 URL 不变，
 * 纯粹是给返回键留个可退的台阶。 */
const _routeOverlays = [];
/* 浮层打开时调：close 是关掉它的函数，要和用户自己点关闭走同一条路径 */
function routeOverlayOpen(close){
  _routeOverlays.push(close);
  history.pushState({ov: _routeOverlays.length}, '', location.hash || '#/');
}
/* 浮层被用户自己关掉时调：把台阶撤掉，免得返回键白退一次 */
function routeOverlayClosed(){
  if (_routeOverlays.length) { _routeOverlays.pop(); _routeSkipBack++; history.back(); }
}
let _routeSkipBack = 0;   // 上面那次 history.back() 引发的 popstate 不该再被当成用户按了返回
function routeOverlayCount(){ return _routeOverlays.length; }

let _routeListening = false;
/* handlers: {gate, title, play, lux}，各自负责把对应界面显示出来。
 * 可重复调用（只换处理函数），监听器只挂一次 —— 否则每调一次就多一层，同一次导航会切好几遍界面 */
function routeInit(handlers){
  _routeHandlers = handlers || {};
  if (!_routeListening) {
    _routeListening = true;
    addEventListener('hashchange', () => routeApply(routePath()));
    addEventListener('popstate', () => {
      if (_routeSkipBack > 0) { _routeSkipBack--; return; }   // 是我们自己撤台阶，不是用户按返回
      if (_routeOverlays.length) { _routeOverlays.pop()(); return; }   // 先关最上面那层浮层
      routeApply(routePath());
    });
  }

  /* 首屏落地：老链接 > hash > 默认入口门 */
  let path = routeFromLegacy() || routePath();
  /* #/play 刷新时内存里的游戏状态早没了，落到标题屏（那儿有「继续上次旅程」），别假装能恢复 */
  if (path === '/play' && !routeFromLegacy()) path = '/sdv';
  history.replaceState(history.state, '', '#' + path);
  routeApply(path);
}
