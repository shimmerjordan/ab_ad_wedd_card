/* 新作物（草莓/蓝莓）逻辑测试 */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { loadGame } = require('./harness');

function tillPlot(g, key){
  g.selectTool(3);
  g.farmAction(key); g.farmAction(key);
}

test('多种种子时弹选择，种草莓走完整生长收获入包', () => {
  const g = loadGame(['game', 'plots', 'farmAction', 'plantCrop', 'selectTool', 'dlg', 'advance', 'CROP_DEFS']);
  const key = Object.keys(g.plots)[0];
  g.game.quest = 6; g.game.hasCan = true; g.game.water = 3;
  g.game.seeds = 1; g.game.seedBag.straw = 2;
  tillPlot(g, key);
  g.farmAction(key);                       // 两种种子 → 选择对话
  assert.equal(g.game.mode, 'dialog');
  const line = g.dlg.queue[g.dlg.idx];
  assert.equal(line.choices.length, 2, '向日葵+草莓两个选项');
  assert.ok(line.choices[1][0].includes('草莓'));
  line.onPick(1);                          // 选草莓
  g.advance();
  assert.equal(g.plots[key].crop, 'straw');
  assert.equal(g.game.seedBag.straw, 1, '草莓种子消耗');
  assert.equal(g.game.seeds, 1, '向日葵种子不动');
  g.farmAction(key);                       // 浇水
  assert.equal(g.plots[key].st, 2);
  g.game.time = g.plots[key].t + 10;       // 催熟
  const sandbox = g.__sandbox; sandbox.Math.random = () => 0.99;
  g.farmAction(key);                       // 收获
  assert.equal(g.game.cropInv.straw, 1, '草莓入包');
  assert.equal(g.game.fruits, 0, '不计入任务向日葵');
  assert.equal(g.plots[key].crop, null);
});

test('只有一种种子时直接种（不弹选择）', () => {
  const g = loadGame(['game', 'plots', 'farmAction', 'selectTool']);
  const key = Object.keys(g.plots)[0];
  g.game.quest = 1; g.game.seeds = 0; g.game.seedBag.blue = 1;
  tillPlot(g, key);
  g.farmAction(key);
  assert.equal(g.plots[key].st, 1, '直接种下');
  assert.equal(g.plots[key].crop, 'blue');
  assert.equal(g.game.seedBag.blue, 0);
});

test('作物表帧序/时长配置健全', () => {
  const g = loadGame(['CROP_DEFS']);
  for(const k of ['sun', 'straw', 'blue']){
    const d = g.CROP_DEFS[k];
    assert.equal(d.frames.length, 4, k + ' 四个生长帧');
    assert.ok(d.fertRipe < d.ripe, k + ' 施肥应更快');
    assert.ok(d.sell > 0);
  }
});
