/* UX 辅助逻辑测试：interact 探测模式 / 耕地两锄 / 农务状态机 */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { loadGame } = require('./harness');

test('interact(true) 探测模式无副作用', () => {
  const g = loadGame(['game', 'player', 'interact', 'WOBJ', 'TILE']);
  /* 站到水井边（面朝上正对井） */
  g.player.x = g.WOBJ.well.x + 8; g.player.y = g.WOBJ.well.y + 34; g.player.dir = 'up';
  const before = JSON.stringify({mode: g.game.mode, water: g.game.water, can: g.game.hasCan, q: g.game.quest});
  assert.equal(!!g.interact(true), true, '面前有水井应探测为真');
  const after = JSON.stringify({mode: g.game.mode, water: g.game.water, can: g.game.hasCan, q: g.game.quest});
  assert.equal(before, after, '探测不应改变任何状态');
  /* 站到空地（远离一切） */
  g.player.x = 10 * g.TILE; g.player.y = 27 * g.TILE; g.player.dir = 'down';
  assert.equal(!!g.interact(true), false, '空地应探测为假');
});

test('探测模式不触发对话/浮层', () => {
  const g = loadGame(['game', 'player', 'partner', 'interact', 'TILE']);
  g.game.quest = 1; g.game.mode = 'play';
  g.player.x = g.partner.x - 4; g.player.y = g.partner.y; g.player.dir = 'side'; g.player.flip = false;
  assert.equal(!!g.interact(true), true, 'TA 在面前应探测为真');
  assert.equal(g.game.mode, 'play', '不应进入对话模式');
});

test('耕地两锄可种：状态机 till→种→浇→收', () => {
  const g = loadGame(['game', 'plots', 'farmAction', 'selectTool', 'TOOLS']);
  const key = Object.keys(g.plots)[0];
  g.game.quest = 1; g.game.seeds = 1; g.game.hasCan = true; g.game.water = 3;
  g.selectTool(3);                        // 锄头
  g.farmAction(key);
  assert.equal(g.plots[key].till, 1);
  g.farmAction(key);
  assert.equal(g.plots[key].till, 2, '两锄翻好');
  g.farmAction(key);                      // 播种
  assert.equal(g.plots[key].st, 1);
  assert.equal(g.game.seeds, 0);
  g.farmAction(key);                      // 浇水
  assert.equal(g.plots[key].st, 2);
  assert.equal(g.game.water, 2);
  /* 时间推进至成熟(无肥 1.6s/阶段, 3 阶段) */
  g.game.time = g.plots[key].t + 10;
  const sandbox = g.__sandbox; sandbox.Math.random = () => 0.99;   // 不掉碎片
  g.farmAction(key);                      // 收获
  assert.equal(g.game.fruits, 1, '应收获向日葵');
  assert.equal(g.plots[key].st, 0, '收获后地块清空');
});

test('镇长在殿堂可探测可对话', () => {
  const g = loadGame(['game', 'player', 'interact', 'HALL_MAYOR', 'dlg']);
  g.game.scene = 'hall'; g.game.quest = 5;
  g.player.x = g.HALL_MAYOR.x; g.player.y = g.HALL_MAYOR.y + 18; g.player.dir = 'up';
  assert.equal(!!g.interact(true), true, '镇长面前应探测为真');
  g.interact();
  assert.equal(g.game.mode, 'dialog', '按 A 应和镇长对话');
  assert.ok(g.dlg.queue[0].who === 'mayor');
});
