/* ============================================================
 * 测试基建：零依赖 DOM/Canvas stub + vm 沙箱按加载顺序执行全部游戏脚本
 * 用法：const g = loadGame(['game','fish','fishReelStep']); g.fishReelStep(...)
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS_DIR = path.join(__dirname, '..', 'js');
const LOAD_ORDER = ['config','assets','scene','core','play','render','interior','hud','invite','interact','scenefx','router','boot'];

/* 可导航的 location + history 桩：改 hash 会派发 hashchange，back() 会派发 popstate。
 * 路由测试要的就是这些，别的桩一律保持原来的哑实现。 */
function makeNav(fire, opts){
  const origin = 'http://localhost', pathname = '/';
  let search = opts.search || '', hash = opts.hash || '';
  const stack = [{search, hash, state: null}];
  let idx = 0;
  const at = () => stack[idx];
  const sync = () => { search = at().search; hash = at().hash; };
  const resolve = url => {
    if (url == null) return;
    const u = new URL(String(url), origin + pathname + search + hash);
    search = u.search; hash = u.hash;
  };
  const push = state => { stack.splice(idx + 1); stack.push({search, hash, state}); idx = stack.length - 1; };

  const location = {
    origin, pathname, _reloads: 0, _replaces: [],
    get search(){ return search; },
    get hash(){ return hash; },
    set hash(v){
      const nv = v === '' ? '' : (String(v)[0] === '#' ? String(v) : '#' + v);
      if (nv === hash) return;
      hash = nv; push(null);
      fire('hashchange', {oldURL: '', newURL: this.href});
    },
    get href(){ return origin + pathname + search + hash; },
    replace(u){ this._replaces.push(String(u)); resolve(u); stack[idx] = {search, hash, state: null}; },
    reload(){ this._reloads++; },
  };
  const history = {
    get length(){ return stack.length; },
    get state(){ return at().state; },
    pushState(state, _t, url){ resolve(url); push(state); },
    replaceState(state, _t, url){ resolve(url); stack[idx] = {search, hash, state}; },
    back(){ if (idx > 0) { idx--; sync(); fire('popstate', {state: at().state}); } },
    forward(){ if (idx < stack.length - 1) { idx++; sync(); fire('popstate', {state: at().state}); } },
    go(n){ n < 0 ? this.back() : n > 0 ? this.forward() : null; },
  };
  return {location, history};
}

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
    removeAttribute(k){ delete this.attributes[k]; },
    addEventListener(t, fn){ (el._ev[t] = el._ev[t] || []).push(fn); },
    removeEventListener(t, fn){ el._ev[t] = (el._ev[t] || []).filter(f => f !== fn); },
    setPointerCapture(){}, releasePointerCapture(){},
    getContext(){ this._ctx = this._ctx || fakeCtx(); return this._ctx; },
    getBoundingClientRect(){ return {width: 420, height: 860, left: 0, top: 0, right: 420, bottom: 860}; },
    querySelector(){ return fakeEl(); },
    querySelectorAll(){ return []; },
    closest(){ return null; },
    /* 真的按下去：onclick 与 addEventListener('click') 都要触发，接线才测得到 */
    click(){ if (el.onclick) el.onclick({target: el, preventDefault(){}}); (el._ev.click || []).forEach(f => f({target: el, preventDefault(){}})); },
    focus(){}, blur(){},
  };
  el._ev = {};
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
    navigator: {clipboard: {writeText: () => Promise.resolve()}},
    localStorage: {_m: {}, getItem(k){ return k in this._m ? this._m[k] : null; }, setItem(k,v){ this._m[k] = String(v); }, removeItem(k){ delete this._m[k]; }},
    matchMedia: () => ({matches: false, addEventListener(){}}),
    fetch: () => Promise.resolve({ok: false, json: () => Promise.resolve(null)}),
    Image: FakeImage,
    AudioContext: FakeAudioCtx, webkitAudioContext: FakeAudioCtx,
    requestAnimationFrame: () => 0, cancelAnimationFrame(){},
    setTimeout: () => 0, clearTimeout(){}, setInterval: () => 0, clearInterval(){},
    innerWidth: 420, innerHeight: 860,
    IntersectionObserver: class {observe(){} disconnect(){} unobserve(){}},
    FileReader: class {readAsDataURL(){}},
    Blob: class {constructor(){}},
    performance: {now: () => 0},
    prompt(){}, alert(){}, confirm(){ return true; },
  };
  /* window 事件：路由要靠 hashchange / popstate，这里存真监听器并可主动派发 */
  const listeners = {};
  const fire = (type, ev) => (listeners[type] || []).slice().forEach(fn => fn({type, ...ev}));
  sandbox.addEventListener = (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); };
  sandbox.removeEventListener = (t, fn) => { listeners[t] = (listeners[t] || []).filter(f => f !== fn); };
  sandbox.__fire = fire;
  Object.assign(sandbox, makeNav(fire, opts));
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
