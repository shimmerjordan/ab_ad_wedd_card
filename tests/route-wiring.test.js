/* 路由接线：四个界面的进出口都要经过地址栏，后退键能原路返回 */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { loadGame } = require('./harness');

function app(opts = {}){
  const g = loadGame(['startGame', 'openLux', 'routePath', 'backToGate'], opts);
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
