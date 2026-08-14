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

test('婚纱照可点开看大图：archPhoto / luxHero / hallPhotos', () => {
  const g = loadGame(['posterHeroHTML', 'showHallPhoto', 'buildLux', 'lockMedia', 'CONFIG', 'RT']);
  const doc = g.__sandbox.document;

  /* ① 星露谷版·顶部主婚纱照 archPhoto：相框可点，且大图与缩略图同源 */
  const hero = g.posterHeroHTML();
  const m = hero.match(/class="hero-frame zoomable" data-big="([^"]+)"/);
  assert.ok(m, 'archPhoto 相框应挂 data-big');
  assert.strictEqual(m[1], 'assets/imgs/' + g.CONFIG.archPhoto, '大图指向 assets/imgs/ 下的原图');
  assert.ok(hero.includes(`<img src="${m[1]}"`), '缩略图与大图同源');
  assert.ok(/hero-zoom-tip/.test(hero), '有「点看大图」提示');

  /* ② 老登版·顶部主婚纱照 luxHero + 画廊 hallPhotos 都可点 */
  g.buildLux();
  const lux = doc.getElementById('luxInner').innerHTML;
  assert.ok(/class="lux-hero-photo" data-full="assets\/imgs\/[^"]+"/.test(lux), 'luxHero 应挂 data-full');
  assert.ok(/lux-tap/.test(lux), '有「轻触看大图」提示');
  const withImg = (g.RT.hallPhotos || []).filter(p => p && p.img).length;
  assert.strictEqual([...lux.matchAll(/data-full="/g)].length, withImg + 1,
    '主图 + 每张有图的画廊照各一个可点入口');

  /* ③ 星露谷版·殿堂婚纱照展板：有图才给入口，没图不给假入口 */
  const first = (g.RT.hallPhotos || []).findIndex(p => p && p.img);
  g.showHallPhoto(first);
  const ov = doc.getElementById('overlayInner').innerHTML;
  const h = ov.match(/class="zoomable exhibit-zoom" data-big="([^"]+)"/);
  assert.ok(h, '展板大图应挂 data-big');
  assert.strictEqual(h[1], 'assets/imgs/' + g.RT.hallPhotos[first].img);
  /* 只认「同一个 src」这件事本身，不锁属性书写顺序(decoding/loading 等提示随时可能加) */
  const thumb = ov.match(/<img class="exhibit-img"[^>]*\ssrc="([^"]+)"/);
  assert.ok(thumb && thumb[1] === h[1], '展板缩略图与大图同源');
  /* 加载失败要换掉整个可点区(而非只换 img)，否则留下一个点开全黑的空壳 */
  assert.ok(/onerror="this\.parentNode\.outerHTML=/.test(ov), 'onerror 应替换整个可点区');
  const none = (g.RT.hallPhotos || []).findIndex(p => !p || !p.img);
  g.showHallPhoto(none);
  assert.ok(!/data-big/.test(doc.getElementById('overlayInner').innerHTML), '没配图的展板不给大图入口');

  /* ④ 两个灯箱都上锁(禁右键/长按存图)且装了缩放，重复调用幂等 */
  const box = doc.getElementById('lightbox'), luxBox = doc.getElementById('luxBox');
  assert.strictEqual(box._locked, true, '灯箱应已上锁');
  g.lockMedia(box);
  assert.strictEqual(box._locked, true, 'lockMedia 幂等');
  assert.strictEqual(luxBox._locked, true, '老登版灯箱也应上锁');
  assert.ok(box._zoom && luxBox._zoom, '两个灯箱都应装上缩放');
});

test('全屏看图缩放：贴边 100% 起步，上限 200%，未溢出屏幕不许拖', () => {
  const g = loadGame(['zoomClamp', 'panLimit', 'ZOOM_MAX']);
  assert.strictEqual(g.ZOOM_MAX, 2, '上限 200%');
  /* 缩放钳制：不许小于贴边、不许大于 200% */
  assert.strictEqual(g.zoomClamp(1.5), 1.5, '区间内原样放行');
  assert.strictEqual(g.zoomClamp(0.4), 1, '缩不到贴边以下');
  assert.strictEqual(g.zoomClamp(2.7), 2, '捏到多大都夹回 200%');
  assert.strictEqual(g.zoomClamp(1e9), 2, '极端值也夹回 200%');
  assert.strictEqual(g.zoomClamp(undefined), 1, '无值按贴边算');
  /* 拖动范围：图片放大后超出屏幕的部分才可拖，且左右对称 */
  assert.strictEqual(g.panLimit(400, 430, 2), 185, '400×2=800 超出 430 → 可拖 ±185');
  assert.strictEqual(g.panLimit(400, 430, 1), 0, '贴边时不许拖');
  assert.strictEqual(g.panLimit(300, 430, 1.2), 0, '放大后仍没占满屏幕 → 不许拖');
});
