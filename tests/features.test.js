'use strict';
/* 新增功能单测：存档往返 / 成就表 / 通关评分 / 抛捧花物理 */
const { test } = require('node:test');
const assert = require('node:assert');
const { loadGame } = require('./harness');

test('存档 serializeSave → applySave 往返保留进度', () => {
  const g = loadGame(['game', 'serializeSave', 'applySave', 'dog', 'player', 'partner', 'plots', 'obstacles']);
  g.game.quest = 4; g.game.coins = 99; g.game.hearts = 7;
  g.game.gems.diamond = 2; g.game.fragGot = [0, 2]; g.game.rod = true;
  g.dog.petted = true; g.game.playerRole = 'bride';
  const snap = JSON.parse(JSON.stringify(g.serializeSave()));
  /* 打乱当前状态，再套用存档 */
  g.game.quest = 0; g.game.coins = 0; g.game.hearts = 0;
  g.game.gems.diamond = 0; g.game.fragGot = []; g.game.rod = false; g.dog.petted = false;
  assert.ok(g.applySave(snap), 'applySave 应返回 true');
  assert.strictEqual(g.game.quest, 4);
  assert.strictEqual(g.game.coins, 99);
  assert.strictEqual(g.game.hearts, 7);
  assert.strictEqual(g.game.gems.diamond, 2);
  assert.deepStrictEqual(g.game.fragGot, [0, 2]);
  assert.strictEqual(g.game.rod, true);
  assert.strictEqual(g.dog.petted, true);
  assert.strictEqual(g.game.playerRole, 'bride');
});

test('applySave 拒绝空存档 / 版本不符', () => {
  const g = loadGame(['applySave']);
  assert.strictEqual(g.applySave(null), false);
  assert.strictEqual(g.applySave({ v: 999, g: {} }), false);
  assert.strictEqual(g.applySave({ v: 2 }), false);   // 缺 g
});

test('成就表 achEarned 随 flag 增长；achTotal 稳定', () => {
  const g = loadGame(['game', 'dog', 'achEarned', 'achTotal']);
  const total = g.achTotal();
  assert.ok(total >= 18, '成就总数应涵盖新增彩蛋');
  const base = g.achEarned().length;
  g.game.chestOpened = true; g.game.konami = true; g.dog.petted = true; g.game.ringCaught = true;
  assert.strictEqual(g.achEarned().length, base + 4);
});

test('computeScore 返回 0-100 分与非空称号', () => {
  const g = loadGame(['game', 'computeScore']);
  let s = g.computeScore();
  assert.ok(s.score >= 0 && s.score <= 100);
  assert.ok(typeof s.title === 'string' && s.title.length > 0);
  /* 拉满关键指标，分数应更高 */
  g.game.hearts = 10; g.game.chestOpened = true; g.game.donatedN = 4; g.game.toastCount = 4;
  const s2 = g.computeScore();
  assert.ok(s2.score >= s.score);
});

test('抛捧花物理 bouquetStep：对准接住 / 偏离落空 / 空中下落', () => {
  const g = loadGame(['bouquetStep']);
  const W = 200, H = 800;
  /* 花已到底部且接篮对准 → catch */
  assert.strictEqual(g.bouquetStep({ x: 100, y: 1000, vx: 0, vy: 0, basket: 100 }, 0, 0.016, W, H), 'catch');
  /* 花到底部但接篮偏远 → miss */
  assert.strictEqual(g.bouquetStep({ x: 190, y: 1000, vx: 0, vy: 0, basket: 24 }, 0, 0.016, W, H), 'miss');
  /* 花还在空中 → fall */
  assert.strictEqual(g.bouquetStep({ x: 100, y: 10, vx: 0, vy: 0, basket: 100 }, 0, 0.016, W, H), 'fall');
});

test('抛捧花 move 输入驱动接篮移动并夹在边界内', () => {
  const g = loadGame(['bouquetStep']);
  const b = { x: 100, y: 10, vx: 0, vy: 0, basket: 100 };
  g.bouquetStep(b, -1, 0.1, 200, 800);   // 向左
  assert.ok(b.basket < 100);
  const b2 = { x: 100, y: 10, vx: 0, vy: 0, basket: 30 };
  for (let i = 0; i < 100; i++) g.bouquetStep(b2, -1, 0.1, 200, 800);
  assert.ok(b2.basket >= 24, '接篮不应越过左边界');
});

test('场景与渲染冒烟：矿洞数据就绪，小游戏 UI 绘制不抛', () => {
  const g = loadGame(['SCENES', 'mineWalls', 'CRYSTAL_AT', 'ACHIEVEMENTS', 'drawBouquetUI', 'drawDanceUI', 'game', 'chicks', 'spawnChick']);
  assert.ok(g.SCENES.mine && g.SCENES.mine.type === 'in', 'mine 场景注册为内景');
  assert.ok(Object.keys(g.mineWalls).length > 5, '矿墙已生成');
  assert.strictEqual(g.CRYSTAL_AT[0], 11); assert.strictEqual(g.CRYSTAL_AT[1], 4);
  assert.ok(g.ACHIEVEMENTS.length >= 18);
  g.game.mode = 'bouquet';
  assert.doesNotThrow(() => g.drawBouquetUI());
  g.game.mode = 'dance';
  assert.doesNotThrow(() => g.drawDanceUI());
  g.spawnChick();
  assert.strictEqual(g.chicks.length, 1, 'spawnChick 生成一只小鸡仔');
});

test('领奖码 shortCode：确定性 + 格式 XXXX-XXXX + 不同输入不同码', () => {
  const g = loadGame(['shortCode']);
  const a = g.shortCode('G:张三#3'), b = g.shortCode('G:张三#3');
  assert.strictEqual(a, b, '同输入应得同码');
  assert.match(a, /^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  assert.notStrictEqual(g.shortCode('G:李四#5'), a, '不同宾客应得不同码');
});

test('giftCode：同一会话稳定（存 localStorage，不每次都变）', () => {
  const g = loadGame(['giftCode']);
  const a = g.giftCode(), b = g.giftCode();
  assert.strictEqual(a, b, '领奖码应在本机稳定，防止刷新领多份');
  assert.match(a, /^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
});

test('giftEligible：默认锁定；全碎片+通关+成就≥15 解锁，14 仍锁定', () => {
  const g = loadGame(['game', 'dog', 'giftEligible', 'RT']);
  assert.strictEqual(g.giftEligible().ok, false, '初始应锁定');
  const G = g.game;
  G.quest = 6;
  G.fragGot = g.RT.frags.map((_, i) => i);   // 全碎片
  /* 先给 14 个成就 → 仍锁定 */
  G.chestOpened = true; G.chickenTalk = 3; G.wellWish = 3; G.bushJump = 3; G.catTalk = true;
  G.bootCaught = true; G.catFed = 3; G.hearts = 10; G.donateLv4 = true; g.dog.petted = true;
  G.toastDone = true; G.bouquetCaught = true; G.starDate = true; G.danced = true;
  let e = g.giftEligible();
  assert.strictEqual(e.ach, 14);
  assert.strictEqual(e.need, 15);
  assert.strictEqual(e.ok, false, '14<15 应锁定');
  /* 第 15 个成就 → 解锁 */
  G.konami = true;
  e = g.giftEligible();
  assert.ok(e.ach >= 15);
  assert.strictEqual(e.ok, true, '满 15 且全碎片+通关应解锁');
  /* 少一个碎片 → 重新锁定 */
  G.fragGot = G.fragGot.slice(1);
  assert.strictEqual(g.giftEligible().ok, false, '缺记忆碎片应重新锁定');
});

test('新人卡片：头像/合照可点开大图 + 灯箱开关', () => {
  const g = loadGame(['coupleHTML', 'couplePosterHTML', 'openLightbox', 'closeLightbox']);
  const c = g.coupleHTML();
  /* 合照 + 新郎 + 新娘 共 3 处带 data-big */
  const bigs = [...c.matchAll(/data-big="([^"]+)"/g)].map(m => m[1]);
  assert.strictEqual(bigs.length, 3, '应有 3 处可点大图');
  assert.ok(bigs.some(u => /couplePhoto/.test(u)), '含合照');
  assert.ok(bigs.some(u => /groomAvatar/.test(u)), '含新郎头像');
  assert.ok(bigs.some(u => /brideAvatar/.test(u)), '含新娘头像');
  assert.ok(/zoom-hint/.test(c), '有「点看大图」提示');
  /* 合照大图源 === 缩略图 src（放大同一张，保持一致） */
  const cp = c.match(/<span class="zoomable" data-big="([^"]+)"><img src="([^"]+)"/);
  assert.strictEqual(cp[1], cp[2], '合照大图与缩略图同源');
  /* 海报版两个头像也可点开 */
  assert.strictEqual([...g.couplePosterHTML().matchAll(/data-big=/g)].length, 2);
  /* 灯箱：open 加 .on、close 去 .on */
  const lb = g.__sandbox.document.getElementById('lightbox');
  g.openLightbox('assets/imgs/couplePhoto.png');
  assert.ok(lb.classList.contains('on'), 'openLightbox 应显示灯箱');
  g.closeLightbox();
  assert.ok(!lb.classList.contains('on'), 'closeLightbox 应隐藏灯箱');
});
