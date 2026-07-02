/* 好感度系统 / 木牌 HUD 逻辑测试 */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { loadGame } = require('./harness');

test('addHearts 增加并钳制在 0-10', () => {
  const g = loadGame(['game', 'addHearts']);
  assert.equal(g.game.hearts, 0);
  g.addHearts(2, '测试');
  assert.equal(g.game.hearts, 2);
  g.addHearts(100);
  assert.equal(g.game.hearts, 10, '上限 10');
  g.addHearts(-100);
  assert.equal(g.game.hearts, 0, '下限 0');
});

test('weddingDaysLeft 按婚期正确计算', () => {
  const g = loadGame(['weddingDaysLeft', 'CONFIG']);
  const target = new Date(g.CONFIG.weddingISO).getTime();
  assert.equal(g.weddingDaysLeft(target - 864e5), 1, '差一天');
  assert.equal(g.weddingDaysLeft(target - 1), 1, '不足一天按 1 天');
  assert.equal(g.weddingDaysLeft(target + 1000), 0, '当天/已过 → ≤0');
  assert.equal(g.weddingDaysLeft(target - 10 * 864e5), 10);
});

test('consumeBestFish 优先送出价值最高的鱼', () => {
  const g = loadGame(['game', 'addFish', 'consumeBestFish']);
  g.addFish('carp', false);    // 6
  g.addFish('trout', false);   // 16
  g.addFish('perch', true);    // 15
  const best = g.consumeBestFish();
  assert.deepEqual(best, {sp: 'trout', perfect: false}, '红鲷16 > 完美银梭15');
  const second = g.consumeBestFish();
  assert.deepEqual(second, {sp: 'perch', perfect: true});
  assert.equal(g.game.fishN, 1);
});

test('心级奖励只发一次：6 心回礼 / 10 心成就', () => {
  const g = loadGame(['game', 'heartMilestone', 'dlg', 'advance']);
  g.game.quest = 2;
  g.game.hearts = 6;
  assert.equal(g.heartMilestone('bride'), true, '6 心应触发');
  assert.equal(g.game.heartLv6, true);
  /* 走完对话（2 行） */
  g.advance(); g.advance();
  assert.equal(g.game.mode, 'play');
  assert.equal(g.heartMilestone('bride'), false, '不应重复触发');
  g.game.hearts = 10;
  assert.equal(g.heartMilestone('bride'), true, '10 心应触发');
  g.advance(); g.advance(); g.advance();
  assert.equal(g.game.heartLv10, true);
  assert.equal(g.heartMilestone('bride'), false);
});

test('礼成时十心圆满且不再重复触发心级对话', () => {
  const g = loadGame(['game', 'tryCeremony', 'heartMilestone', 'dlg', 'advance']);
  g.game.quest = 5;
  g.tryCeremony();
  assert.equal(g.game.mode, 'dialog');
  /* 走到誓言三选一（对台词条数鲁棒） */
  let guard = 0;
  while(!g.dlg.queue[g.dlg.idx].choices && guard++ < 10) g.advance();
  const line = g.dlg.queue[g.dlg.idx];
  assert.ok(line.choices, '应有誓言三选一');
  line.onPick(0);
  guard = 0;
  while(g.game.mode === 'dialog' && guard++ < 10) g.advance();
  assert.equal(g.game.hearts, 10, '礼成十心圆满');
  assert.equal(g.heartMilestone('bride'), false, '礼成后不再触发心级对话');
});

test('送礼菜单数据源正确（蛋/鱼/多余向日葵）', () => {
  const g = loadGame(['game', 'addFish', 'talkPartner', 'dlg', 'partner']);
  g.game.quest = 2; g.game.scene = 'world'; g.partner.scene = 'world';
  g.game.eggs = 1; g.addFish('carp', false); g.game.fruits = 5;
  g.talkPartner();
  const line = g.dlg.queue[g.dlg.idx];
  assert.ok(line.choices.length === 4, '聊聊 + 3 种礼物');
  const labels = line.choices.map(c => c[0]).join('|');
  assert.ok(labels.includes('鸡蛋') && labels.includes('送TA一条鱼') && labels.includes('向日葵'), labels);
});
