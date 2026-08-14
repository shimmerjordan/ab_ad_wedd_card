/* 首屏加载与落款排版：守住「入口页不该等的东西一律别等」这条线 */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadGame } = require('./harness');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
/* 注释里写「原先走 fonts.googleapis.com」是说明，不是引用 —— 只检查真正会发请求的部分 */
const htmlCode = html.replace(/<!--[\s\S]*?-->/g, '');
const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, '');

test('首屏不依赖任何跨域资源（国内白屏元凶：被墙的 Google Fonts 阻塞样式表）', () => {
  assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(htmlCode), 'index.html 不应再引用 Google Fonts');
  assert.ok(!/@import|fonts\.googleapis\.com/.test(cssCode), 'style.css 不应 @import 外部字体');
  const external = [...htmlCode.matchAll(/<link[^>]+href="(https?:)?\/\/[^"]+"/g)];
  assert.strictEqual(external.length, 0, `首屏不应有跨域 <link>：${external.map(m => m[0]).join(' | ')}`);
});

test('内联首屏样式只提前隐藏 style.css 本来就隐藏的元素（别再把 #game 关掉）', () => {
  const critical = htmlCode.match(/<style>([\s\S]*?)<\/style>/);
  assert.ok(critical, 'head 里应有内联首屏样式');
  const hidden = [...critical[1].matchAll(/([^{}]*)\{[^}]*display\s*:\s*none/g)]
    .flatMap(m => m[1].split(',').map(s => s.trim()).filter(s => s.startsWith('#')));
  assert.ok(hidden.length >= 10, '应提前隐藏一批默认不可见的浮层');
  assert.ok(!hidden.includes('#game'), '#game 在 style.css 里没有 display 声明，内联隐藏会永久藏起游戏画布');
  /* 每一个都必须在 style.css 里本来就是 display:none，否则内联样式会改变实际行为 */
  for (const sel of hidden) {
    const rule = new RegExp(`(^|[,}])\\s*${sel}(?![\\w-])[^{}]*\\{[^}]*display\\s*:\\s*none`, 'm');
    assert.ok(rule.test(cssCode), `${sel} 在 style.css 里并非默认隐藏，不能写进内联首屏样式`);
  }
});

test('file:// 直开不发任何 CORS 必失败的请求（字体/manifest 只在 http(s) 下挂载）', () => {
  /* 静态标签里不能有 manifest / @font-face / 字体 preload，它们必须在 protocol 判断之后 */
  const guarded = htmlCode.match(/if\s*\(location\.protocol!=='file:'\)([\s\S]*?)<\/script>/);
  assert.ok(guarded, 'head 里应有 file:// 判断');
  for (const needle of ['rel="manifest"', 'rel="preload"', '@font-face']) {
    assert.ok(guarded[1].includes(needle), `${needle} 应在 file:// 判断之内`);
  }
  const outside = htmlCode.replace(guarded[0], '');
  assert.ok(!/rel="manifest"|rel="preload"|@font-face/.test(outside), '这些不能出现在判断之外');
  assert.ok(!/@font-face/.test(cssCode), '@font-face 若留在 style.css，file:// 下必然报 CORS 错');
});

test('游戏脚本全部 defer，不阻塞入口页渲染', () => {
  const tags = [...html.matchAll(/<script([^>]*)src="(js\/[^"]+)"/g)];
  assert.ok(tags.length >= 12, `应至少 12 个游戏脚本，实际 ${tags.length}`);
  for (const [, attrs, src] of tags) assert.ok(/\bdefer\b/.test(attrs), `${src} 缺 defer`);
  /* 页面上加载的脚本要和 sw.js 预缓存的清单对齐，否则离线时少一个就白屏 */
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  for (const [, , src] of tags) assert.ok(sw.includes(`'./${src}'`), `sw.js 的 CORE 缺 ${src}`);
});

test('字体已子集化：三个 woff2 合计 < 500KB（全量是 1.39MB）', () => {
  const dir = path.join(ROOT, 'assets/fonts');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.woff2'));
  assert.deepStrictEqual(files.sort(), ['fusion-pixel-latin.woff2', 'fusion-pixel-sc.woff2', 'serif-sc.woff2']);
  const total = files.reduce((n, f) => n + fs.statSync(path.join(dir, f)).size, 0);
  assert.ok(total < 500 * 1024, `字体合计 ${(total / 1024).toFixed(0)}KB，超过 500KB 说明子集没生效`);
  /* 入口页要用的衬线才预载；像素字体等进星露谷再说 */
  assert.ok(/rel="preload"[^>]+serif-sc\.woff2/.test(html), '衬线子集应 preload');
  assert.ok(!/rel="preload"[^>]+fusion-pixel/.test(html), '像素字体不该占首屏预载额度');
});

test('像素素材不在脚本解析时就整批发请求（老登版宾客一张都不该下）', () => {
  const g = loadGame(['IMGS', 'preloadAssets', 'ASSET_MANIFEST']);
  assert.strictEqual(Object.keys(g.IMGS).length, 0, '未调用 preloadAssets 前不应有任何图片请求');
  g.preloadAssets();
  const n = Object.keys(g.IMGS).length;
  assert.strictEqual(n, Object.keys(g.ASSET_MANIFEST).length, 'preloadAssets 应把清单全部拉起');
  g.preloadAssets();
  assert.strictEqual(Object.keys(g.IMGS).length, n, '重复调用应幂等，不重发请求');
});

test('入口门两颗按钮各有各的动效（小孩桌=花瓣，老登桌=流光）', () => {
  const btn = html.match(/<button class="gate-btn sdv" id="gate18">[\s\S]*?<\/button>/);
  assert.ok(btn, '小孩桌按钮应带 sdv 类');
  const petals = [...btn[0].matchAll(/<i style="[^"]*--x:[^"]*--d:[^"]*"/g)];
  assert.ok(petals.length >= 5, `花瓣至少 5 片，实际 ${petals.length}`);
  assert.ok(/aria-hidden="true"/.test(btn[0]), '纯装饰层应对读屏隐藏');
  assert.ok(/@keyframes gbPetal/.test(css), '缺花瓣飘落动画');
  assert.ok(/prefers-reduced-motion:reduce\)\{[\s\S]{0,200}gb-petals i\{ animation:none/.test(css),
    '减少动态效果偏好下花瓣应停住');
  assert.ok(/@keyframes sweep/.test(css), '老登版流光动画应保留');
});

test('请帖落款：姓名❤姓名 一行、日期一行', () => {
  const g = loadGame(['finalSummary', 'CONFIG', 'game']);
  g.game.vowIdx = 0;
  g.finalSummary();
  const foot = g.__sandbox.document.getElementById('overlayInner').innerHTML
    .match(/<div class="poster-foot">([\s\S]*?)<\/div>\s*<div class="pf-date">/);
  assert.ok(foot, '落款应有独立的 pf-names 行');
  const names = foot[1];
  assert.ok(names.includes(g.CONFIG.groom) && names.includes(g.CONFIG.bride), '姓名行应含双方姓名');
  assert.ok(names.includes('px-heart'), '姓名之间应有爱心');
  assert.ok(!names.includes(g.CONFIG.dateText), '日期不应挤在姓名那一行');
  const html2 = g.__sandbox.document.getElementById('overlayInner').innerHTML;
  assert.ok(new RegExp(`<div class="pf-date">${g.CONFIG.dateText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</div>`).test(html2),
    '日期应独占一行');
});
