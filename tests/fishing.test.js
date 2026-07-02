/* 钓鱼小游戏逻辑测试：拉扯物理 / 三段状态机 / 鱼获背包 / 商店收购 */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { loadGame } = require('./harness');

/* 构造确定性 rng：循环返回给定序列 */
function seqRng(vals){ let i = 0; return () => vals[i++ % vals.length]; }

function freshReelState(sp){
  return {
    sp, phase: 'reel', t: 0,
    zone: 70, zoneV: 0, zoneH: 56,
    fy: 100, fv: 0, tgt: 100, dartT: 0.4,
    prog: 30, everOut: false,
    tr: null, trAt: -1, trGot: false,
  };
}

test('鱼在绿区内进度上升，脱离后下降且标记 everOut', () => {
  const g = loadGame(['fishReelStep', 'FISH_SPECIES']);
  const sp = g.FISH_SPECIES[0];
  const f = freshReelState(sp);
  f.fy = 100; f.zone = 72;            // 鱼在绿区 [72,128] 内
  f.dartT = 99; f.tgt = f.fy;          // 禁止漂移
  const p0 = f.prog;
  g.fishReelStep(f, false, 0.016, seqRng([0.5]));
  assert.ok(f.prog > p0, `进度应上升: ${f.prog} > ${p0}`);
  assert.equal(f.everOut, false);

  f.fy = 10; f.zone = 100; f.fv = 0; f.tgt = 10; f.dartT = 99;   // 鱼在绿区外
  const p1 = f.prog;
  g.fishReelStep(f, false, 0.016, seqRng([0.5]));
  assert.ok(f.prog < p1, '脱离绿区进度应下降');
  assert.equal(f.everOut, true, '脱离过绿区应标记 everOut');
});

test('进度钳制在 [0,100]，绿区/鱼位置钳制在轨道内', () => {
  const g = loadGame(['fishReelStep', 'FISH_SPECIES', 'FISH_L']);
  const sp = g.FISH_SPECIES[0];
  const f = freshReelState(sp);
  f.prog = 1; f.fy = 8; f.zone = 144; f.tgt = 8; f.dartT = 99;
  /* 连续步进很多帧：进度不应变负，绿区不应越界 */
  for(let i = 0; i < 600; i++){
    g.fishReelStep(f, false, 0.016, seqRng([0.5]));
    assert.ok(f.prog >= 0 && f.prog <= 100, 'prog 越界: ' + f.prog);
    assert.ok(f.zone >= 0 && f.zone <= g.FISH_L - f.zoneH, 'zone 越界: ' + f.zone);
    assert.ok(f.fy >= 8 && f.fy <= g.FISH_L - 8, 'fy 越界: ' + f.fy);
  }
  assert.equal(f.prog, 0, '长时间脱离应归零');
  /* 一直按住：绿区应顶到最上边并停住 */
  for(let i = 0; i < 300; i++) g.fishReelStep(f, true, 0.016, seqRng([0.5]));
  assert.equal(f.zone, 0, '按住应顶到顶部');
});

test('宝箱：罩住时攒进度、攒满触发 treasure 事件、超时消失', () => {
  const g = loadGame(['fishReelStep', 'FISH_SPECIES']);
  const sp = g.FISH_SPECIES[0];
  const f = freshReelState(sp);
  f.trAt = 0; f.t = 1;                 // 立即出宝箱
  f.dartT = 99; f.tgt = 100; f.fy = 100;
  /* rng: 宝箱 y=20+0.5*160=100 → 落在绿区 [72,128] */
  let ev = g.fishReelStep(f, false, 0.016, seqRng([0.5]));
  assert.ok(f.tr, '宝箱应出现');
  assert.ok(Math.abs(f.tr.y - 100) < 1e-9);
  /* 罩住持续攒满 */
  let got = false;
  for(let i = 0; i < 400 && !got; i++){
    f.zone = 72; f.zoneV = 0;          // 固定绿区罩住
    ev = g.fishReelStep(f, false, 0.016, seqRng([0.5]));
    if(ev === 'treasure') got = true;
  }
  assert.ok(got, '罩住宝箱应能攒满');
  assert.equal(f.trGot, true);
  assert.equal(f.tr, null);

  /* 超时消失：新宝箱不罩、6 秒后应消失 */
  const f2 = freshReelState(sp);
  f2.trAt = 0; f2.t = 1; f2.dartT = 99;
  g.fishReelStep(f2, false, 0.016, seqRng([0.9]));   // y=20+0.9*160=164, 绿区外
  assert.ok(f2.tr);
  for(let i = 0; i < 500; i++){ f2.zone = 0; f2.zoneV = 0; g.fishReelStep(f2, false, 0.016, seqRng([0.9])); }
  assert.equal(f2.tr, null, '超时未攒满应消失');
  assert.equal(f2.trGot, false);
});

test('三段状态机：抛竿→等待→咬钩→拉扯，鱼饵只在上钩时消耗', () => {
  const g = loadGame(['game', 'fish', 'startFishing', 'updateFish', '__setInput']);
  g.game.rod = true; g.game.bait = 3; g.game.quest = 2;
  g.startFishing();
  assert.equal(g.game.mode, 'fish');
  assert.equal(g.fish.phase, 'wait');
  assert.equal(g.fish.quest, true, 'Q2 未完成时应标记任务鱼');
  assert.equal(g.game.bait, 3, '抛竿不消耗鱼饵');
  /* 等待期结束 → 咬钩 */
  g.fish.waitT = 0.001;
  g.updateFish(0.016);
  assert.equal(g.fish.phase, 'bite');
  assert.equal(g.fish.sp.key, 'heart', '任务期咬钩的应是同心鱼');
  /* 按 A → 进入拉扯，消耗 1 鱼饵 */
  g.__setInput(true, true);
  g.updateFish(0.016);
  assert.equal(g.fish.phase, 'reel');
  assert.equal(g.game.bait, 2, '上钩才消耗鱼饵');
});

test('等待期收竿不消耗鱼饵；咬钩超时消耗鱼饵', () => {
  const g = loadGame(['game', 'fish', 'startFishing', 'updateFish', '__setInput']);
  g.game.rod = true; g.game.bait = 2; g.game.quest = 6;
  g.startFishing();
  g.__setInput(true, false);          // 等待期按 A = 收竿
  g.updateFish(0.016);
  assert.equal(g.fish.phase, 'idle');
  assert.equal(g.game.mode, 'play');
  assert.equal(g.game.bait, 2, '收竿不亏饵');
  /* 咬钩超时 */
  g.startFishing();
  g.fish.waitT = 0.001;
  g.__setInput(false, false);
  g.updateFish(0.016);                 // → bite
  assert.equal(g.fish.phase, 'bite');
  g.fish.biteT = 0.001;
  g.updateFish(0.016);                 // 超时
  assert.equal(g.fish.phase, 'idle');
  assert.equal(g.game.bait, 1, '咬钩没接住要亏饵');
});

test('同心鱼挣脱退还鱼饵并保持任务未完成', () => {
  const g = loadGame(['game', 'fish', 'startFishing', 'fishBite', 'startReel', 'endFishing', 'FISH_HEART']);
  g.game.rod = true; g.game.bait = 1; g.game.quest = 2;
  g.startFishing();
  g.fish.waitT = 0; g.fishBite();
  assert.equal(g.fish.sp.key, 'heart');
  g.startReel();
  assert.equal(g.game.bait, 0);
  /* 直接判定失败（避免依赖鱼的随机游动） */
  g.endFishing(false);
  assert.equal(g.fish.phase, 'idle');
  assert.equal(g.game.bait, 1, '任务鱼挣脱应退饵');
  assert.equal(g.game.fishQ, false);
});

test('成功钓起任务鱼推进任务；普通鱼进背包、完美判定生效', () => {
  const g = loadGame(['game', 'fish', 'startFishing', 'fishBite', 'startReel', 'endFishing', 'addFish', 'FISH_SPECIES']);
  const sandbox = g.__sandbox;
  sandbox.Math.random = () => 0.99;    // maybeFrag 不掉碎片, 干净推进
  g.game.rod = true; g.game.bait = 5; g.game.quest = 2;
  g.startFishing(); g.fish.waitT = 0; g.fishBite(); g.startReel();
  g.fish.prog = 100; g.fish.everOut = false;
  g.endFishing(true);
  /* 对话结束回调里 setQuest(3)：手动走完对话 */
  assert.equal(g.game.fishQ, true, '钓起同心鱼应标记完成');
  /* 普通鱼入包 */
  g.addFish('carp', true);
  g.addFish('trout', false);
  assert.equal(g.game.fishN, 2);
  assert.deepEqual(g.game.fishInv[0], {sp: 'carp', perfect: true});
});

test('商店分鱼种收购：先卖普通品相，完美 ×1.5 取整', () => {
  const g = loadGame(['game', 'addFish', 'FISH_SPECIES', 'shopRows', 'fishSellRows']);
  g.addFish('perch', false);
  g.addFish('perch', true);
  const rows = g.fishSellRows();
  assert.ok(rows.includes('银梭鱼'), '应显示鱼种名');
  assert.ok(rows.includes('✨完美1'), '应显示完美数量');
  assert.ok(rows.includes('+10/15 金'), '应显示两档价格: ' + rows);
  /* 权重抽鱼覆盖三种 */
  const { loadGame: lg } = require('./harness');
  const g2 = lg(['rollFishSpecies']);
  assert.equal(g2.rollFishSpecies(() => 0.01).key, 'carp');
  assert.equal(g2.rollFishSpecies(() => 0.6).key, 'perch');
  assert.equal(g2.rollFishSpecies(() => 0.99).key, 'trout');
});

test('喂猫消耗最便宜的非完美鱼', () => {
  const g = loadGame(['game', 'addFish', 'consumeFish']);
  g.addFish('trout', false);
  g.addFish('carp', true);
  g.addFish('carp', false);
  const eaten = g.consumeFish();
  assert.deepEqual(eaten, {sp: 'carp', perfect: false}, '应先吃普通金鲤鱼');
  assert.equal(g.game.fishN, 2);
});
