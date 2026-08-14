/* URL 路由：四个顶层界面 ↔ hash，老链接兼容，刷新落点 */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { loadGame } = require('./harness');

/* 装一套「哪个界面被打开了」的记录器，路由的可观察行为就是它 */
function withRouter(opts = {}){
  const g = loadGame(['routePath', 'routeGo', 'routeInit', 'routeFromLegacy', 'ROUTE_SCREENS'], opts);
  const seen = [];
  g.routeInit({
    gate:  () => seen.push('gate'),
    title: () => seen.push('title'),
    play:  () => seen.push('play'),
    lux:   () => seen.push('lux'),
  });
  return { g, seen, loc: g.__sandbox.location, hist: g.__sandbox.history };
}

test('四个顶层界面各有一个 path', () => {
  const g = loadGame(['ROUTE_SCREENS']);
  assert.deepStrictEqual(Object.keys(g.ROUTE_SCREENS).sort(), ['/', '/lux', '/play', '/sdv']);
  assert.deepStrictEqual(
    ['/', '/sdv', '/play', '/lux'].map(p => g.ROUTE_SCREENS[p]),
    ['gate', 'title', 'play', 'lux']);
});

test('没有 hash 时落在入口门', () => {
  const { seen, loc } = withRouter();
  assert.strictEqual(loc.hash, '#/');
  assert.deepStrictEqual(seen, ['gate']);
});

test('routeGo 改写地址栏并切到对应界面', () => {
  const { seen, loc } = withRouter();
  seen.length = 0;
  routeGoAnd(loc, '#/lux');
  assert.strictEqual(loc.hash, '#/lux');
  assert.deepStrictEqual(seen, ['lux']);
});
function routeGoAnd(loc, hash){ loc.hash = hash; }   // 直接改 hash，等价于用户点了链接

test('直开 #/lux 就落在老登版，不经过入口门', () => {
  const { seen, loc } = withRouter({ hash: '#/lux' });
  assert.strictEqual(loc.hash, '#/lux');
  assert.deepStrictEqual(seen, ['lux']);
});

test('认不出的 path 一律回落入口门', () => {
  const { seen, loc } = withRouter({ hash: '#/nonsense' });
  assert.strictEqual(loc.hash, '#/', '地址栏也要跟着纠正，不留一个死链接');
  assert.deepStrictEqual(seen, ['gate']);
});

test('刷新落在 #/play 时改去标题屏（游戏状态已经没了，别假装能恢复）', () => {
  const { seen, loc, hist } = withRouter({ hash: '#/play' });
  assert.strictEqual(loc.hash, '#/sdv');
  assert.deepStrictEqual(seen, ['title']);
  assert.strictEqual(hist.length, 1, '纠正用 replaceState，不该多出一条历史');
});

test('游戏里跳到 #/play 是正常的，只有首屏落地才纠正', () => {
  const { seen, loc } = withRouter();
  seen.length = 0;
  loc.hash = '#/play';
  assert.strictEqual(loc.hash, '#/play');
  assert.deepStrictEqual(seen, ['play']);
});

test('老宾客链接 ?lux=1 / ?auto=groom 仍然管用，并改写成等价 hash', () => {
  for (const [search, hash, screen] of [
    ['?lux=1', '#/lux', 'lux'],
    ['?auto=groom', '#/play', 'play'],
    ['?show=final', '#/play', 'play'],
  ]) {
    const { seen, loc, hist } = withRouter({ search });
    assert.strictEqual(loc.hash, hash, `${search} 应改写成 ${hash}`);
    assert.deepStrictEqual(seen, [screen], `${search} 应直接打开 ${screen}`);
    assert.strictEqual(hist.length, 1, '改写用 replaceState，不该多一条历史');
    assert.strictEqual(loc.search, search, '老参数本身要留着，boot.js 还要读它');
  }
});

test('宾客参数 ?gn=&gt= 与 hash 各走各的，导航不会把它冲掉', () => {
  const { loc } = withRouter({ search: '?gn=%E5%BC%A0%E4%B8%89&gt=3' });
  loc.hash = '#/lux';
  assert.strictEqual(loc.search, '?gn=%E5%BC%A0%E4%B8%89&gt=3');
  assert.strictEqual(loc.hash, '#/lux');
});

test('routePath 读出当前 path', () => {
  const { g, loc } = withRouter({ hash: '#/lux' });
  assert.strictEqual(g.routePath(), '/lux');
  loc.hash = '#/sdv';
  assert.strictEqual(g.routePath(), '/sdv');
});

test('routeGo 到当前所在 path 不重复触发界面切换', () => {
  const { g, seen } = withRouter({ hash: '#/lux' });
  seen.length = 0;
  g.routeGo('/lux');
  assert.deepStrictEqual(seen, []);
});

test('浏览器后退在四个界面之间走', () => {
  const { seen, loc, hist } = withRouter();
  loc.hash = '#/sdv';
  loc.hash = '#/play';
  seen.length = 0;
  hist.back();
  assert.strictEqual(loc.hash, '#/sdv');
  assert.deepStrictEqual(seen, ['title']);
  hist.back();
  assert.strictEqual(loc.hash, '#/');
  assert.deepStrictEqual(seen, ['title', 'gate']);
});
