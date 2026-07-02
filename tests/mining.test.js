/* 挖矿 / 宝石 / 博物馆捐赠逻辑测试 */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { loadGame } = require('./harness');

test('rollGem 按权重返回各档宝石', () => {
  const g = loadGame(['rollGem']);
  /* 权重: 紫30 海22 黄28 红15 钻5 (共100) */
  assert.equal(g.rollGem(() => 0.05).key, 'amethyst');
  assert.equal(g.rollGem(() => 0.35).key, 'aqua');
  assert.equal(g.rollGem(() => 0.60).key, 'topaz');
  assert.equal(g.rollGem(() => 0.85).key, 'ruby');
  assert.equal(g.rollGem(() => 0.97).key, 'diamond');
});

test('采石点初始化在空草地上且未挖时是实心障碍', () => {
  const g = loadGame(['mines', 'mineAlive', 'game', 'solidAt', 'TILE', 'SCENES']);
  const keys = Object.keys(g.mines);
  assert.ok(keys.length >= 4, '至少布下 4 个采石点: ' + keys.length);
  for(const k of keys){
    const [mx, my] = k.split(',').map(Number);
    const t = g.SCENES.world.g[my][mx];
    assert.ok(t === '.' || t === ',', `采石点应在草地: (${k})=${t}`);
    assert.equal(g.mineAlive(mx, my), true, '开局矿岩存活');
    assert.equal(g.solidAt(mx * g.TILE + 8, my * g.TILE + 8, false), true, '矿岩应挡路');
  }
});

test('mineRock：非镐子提示；镐子开采后进入重生倒计时并可再生', () => {
  const g = loadGame(['game', 'mines', 'mineRock', 'mineAlive', 'selectTool', 'gemTotal']);
  const sandbox = g.__sandbox;
  const key = Object.keys(g.mines)[0];
  const [mx, my] = key.split(',').map(Number);
  /* 默认锄头：不消耗矿岩 */
  g.mineRock(key);
  assert.equal(g.mineAlive(mx, my), true, '用错工具矿岩不消失');
  /* 换镐子 + 必掉宝石 */
  sandbox.Math.random = () => 0.01;
  g.selectTool(0);
  g.game.time = 100;
  g.mineRock(key);
  assert.equal(g.gemTotal(), 1, '应挖到宝石');
  assert.equal(g.game.gems.amethyst, 1, 'rng=0.01 → 紫水晶');
  assert.equal(g.mineAlive(mx, my), false, '刚挖完应消失');
  g.game.time = 100 + 44;
  assert.equal(g.mineAlive(mx, my), false, '45 秒内不重生');
  g.game.time = 100 + 46;
  assert.equal(g.mineAlive(mx, my), true, '45 秒后重生');
  /* 碎石分支 */
  sandbox.Math.random = () => 0.99;
  const coins = g.game.coins;
  g.mineRock(key);
  assert.equal(g.game.coins, coins + 1, '没挖到宝石也 +1 金');
});

test('donateGem：逐颗入驻、里程碑奖励一次性、不可重复捐', () => {
  const g = loadGame(['game', 'donateGem']);
  const sandbox = g.__sandbox;
  sandbox.Math.random = () => 0.99;   // maybeFrag 不触发浮层
  g.game.gems = {amethyst: 1, aqua: 1, topaz: 1, ruby: 2, diamond: 0};
  assert.equal(g.donateGem('amethyst'), true);
  assert.equal(g.game.donatedN, 1);
  assert.equal(g.donateGem('amethyst'), false, '同种不能重复捐');
  const coinsBefore = g.game.coins;
  assert.equal(g.donateGem('aqua'), true);
  assert.equal(g.game.donateLv2, true, '第 2 颗触发馆长谢礼');
  assert.equal(g.game.coins, coinsBefore + 10);
  g.donateGem('topaz');
  assert.equal(g.game.donateLv4, false);
  g.donateGem('ruby');
  assert.equal(g.game.donateLv4, true, '4 颗集齐触发成就');
  assert.equal(g.game.gems.ruby, 1, '只消耗一颗');
  assert.equal(g.game.hearts, 1, '集齐 +1 好感');
});

test('清石头路障有 25% 概率掉宝石', () => {
  const g = loadGame(['game', 'obstacles', 'clearObstacle', 'selectTool', 'gemTotal']);
  const sandbox = g.__sandbox;
  const rockKey = Object.keys(g.obstacles).find(k => g.obstacles[k].type === 'rock');
  assert.ok(rockKey, '地图上应有石头路障');
  g.selectTool(0);                     // 镐子
  sandbox.Math.random = () => 0.1;     // <0.25 → 掉宝石(rollGem 0.1→紫水晶)
  g.clearObstacle(rockKey);
  assert.equal(g.obstacles[rockKey], undefined, '路障应清除');
  assert.equal(g.gemTotal(), 1, '应掉落宝石');
});

test('宝石商店出售与送礼选最贵', () => {
  const g = loadGame(['game', 'gemOf', 'gemTotal', 'giveGift', 'dlg', 'startDialog']);
  g.game.gems.topaz = 1; g.game.gems.ruby = 1;
  /* 送礼走对话上下文：手动开一个对话再送 */
  g.startDialog([{who: 'bride', text: 'x'}]);
  g.giveGift('bride', 'gem');
  assert.equal(g.game.gems.ruby, 0, '送出最贵的红宝石');
  assert.equal(g.game.gems.topaz, 1);
});
