/* 路由接线：四个界面的进出口都要经过地址栏，后退键能原路返回 */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { loadGame } = require('./harness');

function app(opts = {}){
  const g = loadGame(['startGame', 'openLux', 'routePath', 'backToGate', 'showOverlay'], opts);
  const doc = g.__sandbox.document;
  return {
    g, doc,
    loc: g.__sandbox.location,
    hist: g.__sandbox.history,
    el: id => doc.getElementById(id),
    shown: id => doc.getElementById(id).style.display,
  };
}

test('首屏加载后地址栏是 #/，入口门显示', () => {
  const a = app();
  assert.strictEqual(a.loc.hash, '#/');
  assert.strictEqual(a.shown('gate'), 'flex');
});

test('点「我坐 小孩桌」→ #/sdv，标题屏显示', () => {
  const a = app();
  a.el('gate18').click();
  assert.strictEqual(a.loc.hash, '#/sdv');
  assert.strictEqual(a.shown('title'), 'flex');
});

test('点「我坐 大人桌」→ #/lux，老登版显示', () => {
  const a = app();
  a.el('gateOld').click();
  assert.strictEqual(a.loc.hash, '#/lux');
  assert.strictEqual(a.shown('lux'), 'block');
});

test('开始游戏 → #/play', () => {
  const a = app();
  a.el('gate18').click();
  a.g.startGame('groom');
  assert.strictEqual(a.loc.hash, '#/play');
  assert.strictEqual(a.shown('hud'), 'block');
});

test('后退键从老登版回到入口门', () => {
  const a = app();
  a.el('gateOld').click();
  assert.strictEqual(a.loc.hash, '#/lux');
  a.hist.back();
  assert.strictEqual(a.loc.hash, '#/');
  assert.strictEqual(a.shown('gate'), 'flex');
  assert.strictEqual(a.shown('lux'), 'none', '回到入口门时老登版要收起来');
});

test('后退键从标题屏回到入口门', () => {
  const a = app();
  a.el('gate18').click();
  a.hist.back();
  assert.strictEqual(a.loc.hash, '#/');
  assert.strictEqual(a.shown('gate'), 'flex');
  assert.strictEqual(a.shown('title'), 'none');
});

test('前进键能再回到刚才的界面', () => {
  const a = app();
  a.el('gateOld').click();
  a.hist.back();
  a.hist.forward();
  assert.strictEqual(a.loc.hash, '#/lux');
  assert.strictEqual(a.shown('lux'), 'block');
});

test('直开 #/lux 落在老登版，入口门不显示', () => {
  const a = app({ hash: '#/lux' });
  assert.strictEqual(a.shown('lux'), 'block');
  assert.strictEqual(a.shown('gate'), 'none');
});

test('老登版「返回入口」按钮走路由，不再手工切 display', () => {
  const a = app({ hash: '#/lux' });
  a.el('luxBack').click();
  assert.strictEqual(a.loc.hash, '#/');
  assert.strictEqual(a.shown('gate'), 'flex');
});

/* ——— 常驻返回按钮：iOS PWA / 微信内置浏览器没有返回手势，得给条明路 ——— */

test('标题屏和老登版有常驻返回按钮，入口门和游戏里没有', () => {
  const at = h => app({ hash: h }).shown('navBack');
  assert.notStrictEqual(at('#/sdv'), 'none', '标题屏该有');
  assert.notStrictEqual(at('#/lux'), 'none', '老登版该有（请帖很长，滚到哪都能返回）');
  assert.strictEqual(at('#/'), 'none', '入口门是根页，不需要');
  const a = app();
  a.el('gate18').click(); a.g.startGame('groom');
  assert.strictEqual(a.shown('navBack'), 'none', '游戏里左上角是任务栏，出口在 ⚙ 里');
});

test('点常驻返回按钮回到入口门', () => {
  for (const h of ['#/sdv', '#/lux']) {
    const a = app({ hash: h });
    a.el('navBack').click();
    assert.strictEqual(a.loc.hash, '#/', `${h} 点返回该到入口门`);
    assert.strictEqual(a.shown('gate'), 'flex');
  }
});

test('从分享链接直接落在 #/sdv 时，返回按钮不能把人退出站点', () => {
  const a = app({ hash: '#/sdv' });
  assert.strictEqual(a.hist.length, 1, '直接落地时 history 里没有上一页');
  a.el('navBack').click();
  assert.strictEqual(a.loc.hash, '#/', '要真的到入口门');
  assert.ok(a.hist.length > 1, '必须用 routeGo 前进一步，用 history.back() 会直接离站');
});

test('浮层打开时藏起常驻返回按钮，免得浮在浮层上面', () => {
  const a = app({ hash: '#/sdv' });
  a.g.showOverlay('<p>请帖</p>');
  assert.ok(a.doc.body.classList.contains('has-overlay'), '开浮层应给 body 挂标记');
  a.el('ovOk').click();
  assert.ok(!a.doc.body.classList.contains('has-overlay'), '关掉后标记要撤掉');
});
