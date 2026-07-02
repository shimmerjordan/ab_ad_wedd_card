/* ============================================================
 * 测试基建：零依赖 DOM/Canvas stub + vm 沙箱按加载顺序执行全部游戏脚本
 * 用法：const g = loadGame(['game','fish','fishReelStep']); g.fishReelStep(...)
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS_DIR = path.join(__dirname, '..', 'js');
const LOAD_ORDER = ['config','assets','scene','core','play','render','interior','hud','invite','interact','scenefx','boot'];

function fakeCtx(){
  const special = {
    measureText: () => ({width: 0}),
    createLinearGradient: () => ({addColorStop(){}}),
    createRadialGradient: () => ({addColorStop(){}}),
    createPattern: () => ({}),
    getImageData: () => ({data: new Uint8ClampedArray(4)}),
  };
  return new Proxy({}, {
    get(t, k){
      if(k in t) return t[k];
      if(special[k]) return special[k];
      return t[k] = () => {};
    },
    set(t, k, v){ t[k] = v; return true; },
  });
}

function fakeEl(tag){
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    style: new Proxy({}, {get: (t,k) => (k in t ? t[k] : ''), set: (t,k,v) => {t[k]=v; return true;}}),
    children: [], dataset: {}, attributes: {},
    _cls: new Set(),
    innerHTML: '', textContent: '', value: '', width: 0, height: 0,
    onclick: null, onchange: null, files: [],
    appendChild(c){ this.children.push(c); return c; },
    removeChild(){}, remove(){}, insertBefore(c){ return c; },
    setAttribute(k,v){ this.attributes[k]=v; }, getAttribute(k){ return this.attributes[k]; },
    addEventListener(){}, removeEventListener(){},
    setPointerCapture(){}, releasePointerCapture(){},
    getContext(){ this._ctx = this._ctx || fakeCtx(); return this._ctx; },
    getBoundingClientRect(){ return {width: 420, height: 860, left: 0, top: 0, right: 420, bottom: 860}; },
    querySelector(){ return fakeEl(); },
    querySelectorAll(){ return []; },
    closest(){ return null; },
    click(){}, focus(){}, blur(){},
  };
  el.classList = {
    add(...c){ c.forEach(x => el._cls.add(x)); },
    remove(...c){ c.forEach(x => el._cls.delete(x)); },
    toggle(c,f){ if(f===undefined){ el._cls.has(c) ? el._cls.delete(c) : el._cls.add(c); } else { f ? el._cls.add(c) : el._cls.delete(c); } },
    contains(c){ return el._cls.has(c); },
  };
  return el;
}

/* 加载游戏全部脚本，返回 names 里列出的顶层绑定（const/let/function 均可） */
function loadGame(names, opts = {}){
  const els = {};
  const document = {
    getElementById: id => els[id] || (els[id] = fakeEl()),
    createElement: t => fakeEl(t),
    querySelector: () => fakeEl(),
    querySelectorAll: () => [],
    addEventListener(){}, removeEventListener(){},
    body: fakeEl('body'),
    documentElement: fakeEl('html'),
  };
  class FakeImage { constructor(){ this._ok = false; this.width = 16; this.height = 16; } set src(v){ this._src = v; } get src(){ return this._src; } addEventListener(){} }
  class FakeAudioCtx {
    constructor(){ this.currentTime = 0; this.state = 'running'; this.destination = {}; }
    resume(){}
    createOscillator(){ return {type:'', frequency:{value:0}, connect(){ return {connect(){}}; }, start(){}, stop(){}}; }
    createGain(){ return {gain:{setValueAtTime(){}, linearRampToValueAtTime(){}}, connect(o){ return o; }}; }
  }
  const sandbox = {
    console, Math, JSON, Date, Promise, Set, Map, RegExp, Array, Object, String, Number, Boolean,
    parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, URLSearchParams, URL,
    Uint8ClampedArray,
    document,
    location: {search: opts.search || '', href: 'http://localhost/', origin: 'http://localhost', pathname: '/', hash: '', replace(){}, reload(){}},
    navigator: {clipboard: {writeText: () => Promise.resolve()}},
    localStorage: {_m: {}, getItem(k){ return k in this._m ? this._m[k] : null; }, setItem(k,v){ this._m[k] = String(v); }, removeItem(k){ delete this._m[k]; }},
    matchMedia: () => ({matches: false, addEventListener(){}}),
    fetch: () => Promise.resolve({ok: false, json: () => Promise.resolve(null)}),
    Image: FakeImage,
    AudioContext: FakeAudioCtx, webkitAudioContext: FakeAudioCtx,
    requestAnimationFrame: () => 0, cancelAnimationFrame(){},
    setTimeout: () => 0, clearTimeout(){}, setInterval: () => 0, clearInterval(){},
    addEventListener(){}, removeEventListener(){},
    innerWidth: 420, innerHeight: 860,
    IntersectionObserver: class {observe(){} disconnect(){} unobserve(){}},
    FileReader: class {readAsDataURL(){}},
    Blob: class {constructor(){}},
    performance: {now: () => 0},
    prompt(){}, alert(){}, confirm(){ return true; },
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
  let grabbed = null;
  sandbox.__grab = o => { grabbed = o; };
  const ctx = vm.createContext(sandbox);
  let code = LOAD_ORDER.map(f => fs.readFileSync(path.join(JS_DIR, f + '.js'), 'utf8')).join('\n;\n');
  code += `\n;__grab({${names.join(',')}});`;
  vm.runInContext(code, ctx, {filename: 'game-bundle.js'});
  grabbed.__sandbox = sandbox;
  return grabbed;
}

module.exports = { loadGame };
