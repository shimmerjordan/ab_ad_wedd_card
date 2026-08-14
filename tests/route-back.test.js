/* 返回键逐层关浮层：手机上按返回不该直接退出请帖 */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { loadGame } = require('./harness');

function app(opts = {}){
  const g = loadGame(['showOverlay', 'openLightbox', 'closeLightbox', 'routePath', 'game', 'routeOverlayOpen'], opts);
  const doc = g.__sandbox.document;
  return { g, doc, loc: g.__sandbox.location, hist: g.__sandbox.history, el: id => doc.getElementById(id) };
}

test('开浮层会压一条历史，但地址栏不变（浮层不上地址栏）', () => {
  const a = app();
  a.el('gate18').click();
  const before = a.hist.length;
  a.g.showOverlay('<p>婚礼信息</p>');
  assert.strictEqual(a.hist.length, before + 1, '应压一条历史条目，返回键才有东西可退');
  assert.strictEqual(a.loc.hash, '#/sdv', '浮层不改地址栏');
});

test('按返回先关浮层，界面不动', () => {
  const a = app();
  a.el('gate18').click();
  a.g.showOverlay('<p>婚礼信息</p>');
  a.hist.back();
  assert.strictEqual(a.el('overlay').style.display, 'none', '浮层应被关掉');
  assert.strictEqual(a.loc.hash, '#/sdv', '还停在原来的界面，没退出去');
});

test('关浮层会跑 onClose 回调，和点「继续 ▶」一样', () => {
  const a = app();
  a.el('gate18').click();
  let closed = 0;
  a.g.showOverlay('<p>x</p>', () => closed++);
  a.hist.back();
  assert.strictEqual(closed, 1);
});

test('浮层关完再按返回，才真的切界面', () => {
  const a = app();
  a.el('gate18').click();
  a.g.showOverlay('<p>x</p>');
  a.hist.back();                       // 关浮层
  a.hist.back();                       // 这次才回入口门
  assert.strictEqual(a.loc.hash, '#/');
  assert.strictEqual(a.el('gate').style.display, 'flex');
});

test('看大图也吃返回键', () => {
  const a = app();
  a.el('gate18').click();
  a.g.openLightbox('assets/imgs/x.jpg');
  assert.ok(a.el('lightbox').classList.contains('on'));
  a.hist.back();
  assert.ok(!a.el('lightbox').classList.contains('on'), '返回应关掉大图');
  assert.strictEqual(a.loc.hash, '#/sdv');
});

test('浮层上再开大图：返回先关大图，再返回关浮层', () => {
  const a = app();
  a.el('gate18').click();
  a.g.showOverlay('<p>展品</p>');
  a.g.openLightbox('assets/imgs/x.jpg');
  a.hist.back();
  assert.ok(!a.el('lightbox').classList.contains('on'), '第一次返回关大图');
  assert.strictEqual(a.el('overlay').style.display, 'flex', '浮层还开着');
  a.hist.back();
  assert.strictEqual(a.el('overlay').style.display, 'none', '第二次返回关浮层');
  assert.strictEqual(a.loc.hash, '#/sdv', '两次都没离开当前界面');
});

test('自己点「继续 ▶」关掉浮层后，返回键不该再白退一次', () => {
  const a = app();
  a.el('gate18').click();
  a.g.showOverlay('<p>x</p>');
  a.el('ovOk').click();                       // 正常关闭
  assert.strictEqual(a.el('overlay').style.display, 'none');
  a.hist.back();
  assert.strictEqual(a.loc.hash, '#/', '浮层已经关了，返回就该切界面');
});
