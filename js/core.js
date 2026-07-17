/* ============================================================
 * 核心运行时：游戏状态/玩家/实体/地块/障碍初始化 + 画布相机 + 输入 + 碰撞 + 场景切换
 * （由原 game.js 按职责拆分，多文件共享全局作用域；保持原加载顺序）
 * ============================================================ */
/* ============================================================
 * 游戏状态
 * ============================================================ */
const game = {
  mode:'title',                 // title|play|dialog|ui|fish
  scene:'world',
  quest:0,                      // 0找TA 1农务 2钓鱼 3收信 4博物馆 5殿堂仪式 6完结
  coins:10, seeds:0, fert:0, water:0, fruits:0, fishN:0, fishQ:false,
  fishInv:[],                   // 鱼获明细 [{sp,perfect}]，fishN 与其长度同步
  hearts:0,                     // ❤ 与TA的好感度 0-10（送礼/彩蛋/剧情获得）
  heartLv6:false, heartLv10:false,   // 心级奖励是否已发放
  gems:{amethyst:0,aqua:0,topaz:0,ruby:0,diamond:0},   // 💎 宝石背包
  donated:{amethyst:0,aqua:0,topaz:0,ruby:0},          // 博物馆已捐赠(每种一颗)
  donatedN:0, donateLv2:false, donateLv4:false,        // 捐赠里程碑
  seedBag:{straw:0,blue:0},                            // 经济作物种子(向日葵用 seeds)
  cropInv:{straw:0,blue:0},                            // 收获的经济作物
  rod:false, hasCan:false,      // 鱼竿(商店购买)/水壶(水井任务获取)
  bait:0, eggs:0, feed:0, flowers:0, giftN:0,
  chickenFedT:-99,              // 母鸡消化计时
  meetReplyIdx:0, vowIdx:0,
  chestOpened:false, chickenTalk:0, wellWish:0, bushJump:0, catTalk:false, catFed:0, bootCaught:false,
  fragGot:[],                   // 已收集碎片下标
  exhibitSeen:false,
  playerRole:'groom', time:0,
  tool:3,                       // 当前选中工具下标(默认锄头), 见 TOOLS
  /* —— 扩展玩法 / 彩蛋 / 成就状态（存档序列化用）—— */
  toastCount:0, toastDone:false, toastedTables:[],  // ⑥ 终章逐桌敬酒
  bouquetTried:false, bouquetCaught:false,// 抛捧花小游戏
  starDate:false,                         // 十心·星空约会
  danced:false,                           // 五月柱跳舞 QTE
  konami:false,                           // Konami 秘技
  ringCaught:false,                       // 湖中戒指(钓鱼稀有)
  feedTotal:0, chickHatched:false,        // 喂鸡累计 → 孵出小鸡仔
  dogPets:0, dogFetch:false,              // 摸狗执念
  skelPoke:0,                             // 博物馆骨架眨眼
  minedDeep:false,                        // 矿洞探底
  dogCollar:false, wellCoins:0, fireworksBought:0,  // 金币消耗点
  nightSeen:false, annivSeen:false,       // 深夜 / 纪念日彩蛋
  playSec:0,                              // 累计游玩秒数(结算评分用)
};
/* 装备栏工具：镐子/镰刀/斧头/锄头(默认全装备)；用于清障与耕地 */
const TOOLS = [
  {key:'pickaxe', name:'镐子', clears:'rock',   icon:'toolPick'},
  {key:'scythe',  name:'镰刀', clears:'weed',   icon:null},        // 镰刀无干净静态图标, 用程序化绘制
  {key:'axe',     name:'斧头', clears:'branch', icon:'toolAxe'},
  {key:'hoe',     name:'锄头', clears:null,     icon:'toolHoe'},
];
/* 路障可用的真素材精灵(paths.png), 按类型分组取变体 */
const OBS_SPR = { rock:['obsRock','obsRock2'], weed:['obsWeed','obsWeed2','obsWeed3','obsBush'], branch:['obsBranch'] };
/* 觅食灌木/野花 重生计时 */
const forageT={}, pickedF={};
/* —— 宝石表：挖矿掉落权重/卖价（钻石稀有, 不参与博物馆四件套捐赠）—— */
const GEM_TYPES=[
  {key:'amethyst',name:'紫水晶',icon:'gemAmethyst',price:8, w:30},
  {key:'aqua',    name:'海蓝宝',icon:'gemAqua',    price:12,w:22},
  {key:'topaz',   name:'黄水晶',icon:'gemTopaz',   price:6, w:28},
  {key:'ruby',    name:'红宝石',icon:'gemRuby',    price:15,w:15},
  {key:'diamond', name:'钻石',  icon:'gemDiamond', price:30,w:5},
];
function gemOf(key){ return GEM_TYPES.find(g=>g.key===key); }
function gemTotal(){ return Object.values(game.gems).reduce((a,b)=>a+b,0); }
function rollGem(rng){
  const total=GEM_TYPES.reduce((s,g)=>s+g.w,0);
  let r=(rng||Math.random)()*total;
  for(const g of GEM_TYPES){ r-=g.w; if(r<0)return g; }
  return GEM_TYPES[0];
}
const player  = {x:5.5*TILE, y:6.5*TILE, dir:'down', flip:false, moving:false, animT:0, frame:'A', frameI:0, z:0, vz:0, over:null};
/* 头顶展示：over={kind:'item'|'tool', icon/tool, t0, dur} —— 拾取举过头顶 / 使用工具挥舞 */
function showOver(kind, val, dur){ player.over={kind, val, t0:game.time, dur:dur||1.2}; }
function showGet(icon){ showOver('item', icon, 1.3); player.moving=false; }
const partner = {x:30*TILE, y:27*TILE, scene:'world', dir:'down', flip:false, role:'bride', bob:0};
const chickens = [
  {x:18*TILE, y:9*TILE,  dir:1, t:0, pause:false},
  {x:20*TILE, y:10.5*TILE, dir:3, t:1, pause:false},
];
const chicken = chickens[0];   // talkChicken/near 以第一只母鸡为准
/* 喂鸡累计孵出的小鸡仔（彩蛋⑤）：在运动场内跟着母鸡跑 */
const chicks=[];
function spawnChick(){ chicks.push({x:19*TILE, y:10*TILE, dir:1, t:0, pause:false}); }
/* 猫：状态机漫游(博物馆与邻居家之间的街角) + 喂食后跟随 */
const cat = {x:29*TILE, y:21.6*TILE, homeX:29*TILE, homeY:21.6*TILE,
             tx:29*TILE, ty:21.6*TILE, state:'sit', t:2, flip:false, followT:0, animT:0, frame:0};
/* 农场狗「旺财」：坐在家门口小路旁(避开栅栏), 可以摸头 */
const dog = {x:6.0*TILE, y:6.6*TILE, petted:false, flip:false};
/* 湖面鸭子：慢慢游动 + 随波起伏 */
const ducks = [
  {x:26*TILE, y:4*TILE,  tx:28*TILE, ty:5*TILE, t:0, flip:false},
  {x:31*TILE, y:6.5*TILE,tx:30*TILE, ty:4.5*TILE, t:2, flip:true},
];
/* 花田蝴蝶（纯装饰, 程序化绘制） */
const butterflies = Array.from({length:6},(_,i)=>({
  x:(27+(i*2.3)%7)*TILE, y:(26+(i*1.7)%4)*TILE,
  phase:i*1.3, hue:['#ff9eb5','#ffd84d','#fdfdff','#a06ee0','#ff8a5c','#7dc4ff'][i],
}));
/* —— 作物表：strip=生长条带素材, frames=[种下,苗,长,熟]帧序, ripe=每阶段秒数 ——
 *  向日葵是任务作物(fruits 计数)；草莓/蓝莓是经济作物(卖钱) */
const CROP_DEFS={
  sun:  {name:'向日葵', strip:'sunflower', frames:[2,3,4,5], ripe:1.6, fertRipe:0.9, sell:5,  icon:'🌻'},
  straw:{name:'草莓',   strip:'cropStraw', frames:[2,3,5,6], ripe:2.0, fertRipe:1.1, sell:8,  icon:'🍓'},
  blue: {name:'蓝莓',   strip:'cropBlue',  frames:[2,3,5,6], ripe:2.4, fertRipe:1.3, sell:10, icon:'🫐'},
};
/* 农田地块: till=耕地进度(0未耕→2全耕可种), st=0空/1已种/2已浇, crop=作物键, fert, t */
const plots = {};               // "x,y"->{till,st,crop,fert,t}
{
  const wg=SCENES.world.g;
  for(let y=0;y<SCENES.world.h;y++)for(let x=0;x<SCENES.world.w;x++)
    if(wg[y][x]==='P') plots[x+','+y]={till:0,st:0,fert:0,t:0};   // 初始未耕(草地), 需用锄头开垦
}
/* 路上的障碍物: "x,y"->{type:'rock'|'weed'|'branch'} —— 用对应工具(镐/镰/斧)清除后可通行
 * 分布规则：在「路径及其两侧各 2 格」的带状区域内, 按确定性哈希随机散布(不连成墙),
 * 且只落在空草地/路面上, 避开建筑/栅栏/水域/树木/邮箱/水井/各类装饰等现有元素。 */
const obstacles = {};
{
  const s=SCENES.world, g=s.g, occ=new Set(), mk=(x,y)=>occ.add(x+','+y);
  for(const b of BUILDINGS) for(let y=b.y-1;y<=b.y+b.h;y++)for(let x=b.x-1;x<=b.x+b.w;x++) mk(x,y);   // 建筑+门口
  for(const k in WOBJ){const o=WOBJ[k]; mk((o.x/TILE)|0,(o.y/TILE)|0); mk(((o.x+o.w)/TILE)|0,((o.y+o.h)/TILE)|0);}
  for(const d of WDECOR){const tx=((d.x+8)/TILE)|0, ty=(d.y/TILE)|0; for(let yy=ty-1;yy<=ty+1;yy++)for(let xx=tx-1;xx<=tx+1;xx++) mk(xx,yy);}
  for(let y=4;y<=13;y++)for(let x=3;x<=23;x++) mk(x,y);    // 家/农田/鸡舍一带留白
  for(let y=24;y<=31;y++)for(let x=24;x<=35;x++) mk(x,y);  // 花田(另一半所在)留白
  const grassPath=t=>t==='.'||t===','||t===':';
  const nearPath=(x,y)=>{ for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const r=g[y+dy]; if(r&&r[x+dx]===':')return true;} return false; };
  const types=['rock','weed','branch'];
  for(let y=2;y<s.h-2;y++)for(let x=2;x<s.w-2;x++){
    if(occ.has(x+','+y)||!grassPath(g[y][x])||!nearPath(x,y)) continue;
    const h=hash(x*131+7, y*197+13);
    if(h%100 < 24){ const type=types[h%3], v=OBS_SPR[type]; obstacles[x+','+y]={type, spr:v[(h>>5)%v.length]}; }
  }
}
/* 采石点：会重生的矿岩(镐子敲开有几率掉宝石)；只落在空草地上 */
const mines={};
{
  const g=SCENES.world.g;
  for(const [mx,my] of [[2,14],[3,16],[2,18],[39,13],[41,17],[40,33]]){
    const t=g[my]&&g[my][mx];
    if((t==='.'||t===',')&&!obstacles[mx+','+my]) mines[mx+','+my]={t:-99};   // t=上次被挖时间
  }
}
const MINE_RESPAWN=45;
function mineAlive(tx,ty){
  const m=mines[tx+','+ty];
  return !!m&&(game.time-m.t>=MINE_RESPAWN);
}
/* —— 矿洞内可挖矿墙（玩法⑦）：中央走廊(x10,11)留空作通道, 两侧散布, 极少数含钻石 —— */
const CRYSTAL_AT=[11,4];
const mineWalls={};
{
  const s=SCENES.mine, g=s.g;
  for(let y=3;y<s.h-2;y++)for(let x=2;x<s.w-2;x++){
    if(g[y][x]!=='w')continue;
    if(x===10||x===11)continue;                 // 中央走廊: 门口 → 水晶脉
    if(x===CRYSTAL_AT[0]&&y===CRYSTAL_AT[1])continue;
    const h=hash(x*17+3,y*23+5);
    if(h%100<42) mineWalls[x+','+y]={gem:(h%100<5)?'diamond':null, mined:false};
  }
}

/* ============================================================
 * 画布 / 相机
 * ============================================================ */
const cv=document.getElementById('game');
const ctx=cv.getContext('2d');
let VW=192,VH=320,SCALE=2,lastW=0,lastH=0;
function resize(){
  const r=cv.getBoundingClientRect();
  lastW=r.width; lastH=r.height;
  SCALE=Math.max(2,Math.round(r.width/200));
  VW=Math.ceil(r.width/SCALE); VH=Math.ceil(r.height/SCALE);
  cv.width=VW; cv.height=VH;
  ctx.imageSmoothingEnabled=false;
}
addEventListener('resize',resize); resize();
const cam={x:0,y:0};
function sc(){ return SCENES[game.scene]; }
function updateCam(){
  const s=sc();
  cam.x=Math.max(0,Math.min(s.w*TILE-VW, player.x+6-VW/2));
  cam.y=Math.max(0,Math.min(s.h*TILE-VH, player.y+8-VH/2));
  if(s.w*TILE<VW) cam.x=(s.w*TILE-VW)/2;
  if(s.h*TILE<VH) cam.y=(s.h*TILE-VH)/2;
}

/* ============================================================
 * 输入
 * ============================================================ */
const keys={};
const stick={on:false,id:-1,ox:0,oy:0,dx:0,dy:0};
let actA=false, actB=false, holdA=false;
/* 测试钩子：单测中注入输入（生产环境无副作用） */
function __setInput(a,h){ actA=!!a; holdA=!!h; }
addEventListener('keydown',e=>{
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  const k=e.key.toLowerCase();
  keys[k]=true;
  if([' ','e','enter','z'].includes(k)){ if(!e.repeat) actA=true; holdA=true; }
  if(['x','shift'].includes(k)) actB=true;
  if(['1','2','3','4'].includes(k)) selectTool(+k-1);
  if(k==='q') selectTool(game.tool-1);
  if(k==='r'||k==='tab'){ if(k==='tab')e.preventDefault(); selectTool(game.tool+1); }
});
addEventListener('keyup',e=>{
  const k=e.key.toLowerCase();
  keys[k]=false;
  if([' ','e','enter','z'].includes(k)) holdA=false;
});
const padL=document.getElementById('padL'),base=document.getElementById('stickBase'),nub=document.getElementById('stickNub');
padL.addEventListener('pointerdown',e=>{
  const ph=document.getElementById('padHint');
  if(ph&&!ph.classList.contains('gone')){ph.classList.add('gone');setTimeout(()=>ph.style.display='none',600);}
  stick.on=true;stick.id=e.pointerId;stick.ox=e.clientX;stick.oy=e.clientY;stick.dx=stick.dy=0;
  base.style.display='block';base.style.left=e.clientX+'px';base.style.top=e.clientY+'px';
  nub.style.transform='translate(-50%,-50%)';
  padL.setPointerCapture(e.pointerId);
});
padL.addEventListener('pointermove',e=>{
  if(!stick.on||e.pointerId!==stick.id)return;
  let dx=e.clientX-stick.ox,dy=e.clientY-stick.oy;
  const len=Math.hypot(dx,dy),max=36;
  if(len>max){dx=dx/len*max;dy=dy/len*max;}
  stick.dx=dx/max;stick.dy=dy/max;
  nub.style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
});
function stickEnd(e){ if(e.pointerId===stick.id){stick.on=false;stick.dx=stick.dy=0;base.style.display='none';} }
padL.addEventListener('pointerup',stickEnd);
padL.addEventListener('pointercancel',stickEnd);
const btnA=document.getElementById('btnA');
btnA.addEventListener('pointerdown',e=>{e.preventDefault();actA=true;holdA=true;});
btnA.addEventListener('pointerup',()=>holdA=false);
btnA.addEventListener('pointercancel',()=>holdA=false);
document.getElementById('btnB').addEventListener('pointerdown',e=>{e.preventDefault();actB=true;});

/* ============================================================
 * 碰撞
 * ============================================================ */
function tileAt(px,py){
  const s=sc(),tx=px/TILE|0,ty=py/TILE|0;
  if(tx<0||ty<0||tx>=s.w||ty>=s.h)return 'T';
  return s.g[ty][tx];
}
function objList(){
  if(game.scene==='world') return Object.values(WOBJ)
    .concat(WDECOR.filter(d=>d.solid))
    .concat(BUILDINGS.map(b=>({x:b.x*TILE,y:b.y*TILE,w:b.w*TILE,h:b.h*TILE})));
  if(game.scene==='hall')  return Object.values(HOBJ)
    .concat(TABLE_POS.map(([tx,ty])=>({x:tx*TILE+2,y:ty*TILE+6,w:28,h:22})))
    .concat(HALLPHOTO_POS.map(([tx,ty])=>({x:tx*TILE+2,y:ty*TILE-4,w:32,h:12})));
  if(game.scene==='museum'){
    const obs=Object.values(MOBJ).slice();
    EX_TBL.forEach(([tx,ty])=>obs.push({x:tx*TILE+2,y:ty*TILE+8,w:40,h:24}));
    return obs;
  }
  return [];
}
function solidAt(px,py,airborne){
  const t=tileAt(px,py);
  if(t==='T'||t==='W'||t==='~')return true;
  if((t==='f'||t==='B')&&!airborne)return true;   // 篱笆/开花灌木均可跳越
  if(game.scene==='world'&&obstacles[(px/TILE|0)+','+(py/TILE|0)])return true;   // 未清除的障碍物
  if(game.scene==='world'&&mineAlive(px/TILE|0,py/TILE|0))return true;           // 未敲开的矿岩
  if(game.scene==='mine'){                                                       // 矿洞内的矿墙/水晶脉
    const k=(px/TILE|0)+','+(py/TILE|0);
    if(mineWalls[k]&&!mineWalls[k].mined)return true;
    if((px/TILE|0)===CRYSTAL_AT[0]&&(py/TILE|0)===CRYSTAL_AT[1]&&!game.minedDeep)return true;
  }
  for(const o of objList()) if(px>=o.x&&px<o.x+o.w&&py>=o.y&&py<o.y+o.h)return true;
  return false;
}
function canMove(nx,ny,airborne){
  for(const [ox,oy] of [[1,10],[11,10],[1,15],[11,15]])
    if(solidAt(nx+ox,ny+oy,airborne))return false;
  return true;
}

/* ============================================================
 * 场景切换
 * ============================================================ */
function gotoScene(name,px,py){
  fade(true);
  setTimeout(()=>{
    game.scene=name;
    player.x=px; player.y=py;
    updateCam(); fade(false);
    if(name==='hall'&&GUEST) toast(`🎫 ${GUEST.name}：您在 ${GUEST.table} 号桌（金色标记）`);
    if(typeof autoSave==='function')autoSave();
  },420);
}

/* ============================================================
 * 成就总表：所有隐藏彩蛋/里程碑集中登记
 *  —— achHTML(结算)、成就计数、分享图都从这里派生，新增彩蛋只需在此加一行
 * ============================================================ */
const ACHIEVEMENTS=[
  {key:'pendant',  name:'美人鱼吊坠', got:()=>game.chestOpened},
  {key:'chicken',  name:'小鸡的祝福', got:()=>game.chickenTalk>=3},
  {key:'well',     name:'井底的愿望', got:()=>game.wellWish>=3},
  {key:'firefly',  name:'草丛萤火虫', got:()=>game.bushJump>=3},
  {key:'cat',      name:'后巷小猫',   got:()=>game.catTalk},
  {key:'boot',     name:'旧靴子纸条', got:()=>game.bootCaught},
  {key:'catfeed',  name:'猫粮赞助商', got:()=>game.catFed>=3},
  {key:'tenheart', name:'十心相印',   got:()=>game.hearts>=10},
  {key:'miner',    name:'矿物学家',   got:()=>game.donateLv4},
  {key:'dog',      name:'旺财的认可', got:()=>dog.petted},
  /* —— 扩展玩法/彩蛋 —— */
  {key:'toast',    name:'滴酒不洒',   got:()=>game.toastDone},
  {key:'bouquet',  name:'捧花之约',   got:()=>game.bouquetCaught},
  {key:'stardate', name:'星空之约',   got:()=>game.starDate},
  {key:'dance',    name:'舞动鹈鹕镇', got:()=>game.danced},
  {key:'konami',   name:'资深玩家',   got:()=>game.konami},
  {key:'ring',     name:'湖中戒指',   got:()=>game.ringCaught},
  {key:'chick',    name:'添丁进口',   got:()=>game.chickHatched},
  {key:'dogfetch', name:'旺财的礼物', got:()=>game.dogFetch},
  {key:'skel',     name:'骨头会动',   got:()=>game.skelPoke>=3},
  {key:'deepmine', name:'深入矿脉',   got:()=>game.minedDeep},
];
function achEarned(){ return ACHIEVEMENTS.filter(a=>{ try{return a.got();}catch(e){return false;} }); }
function achTotal(){ return ACHIEVEMENTS.length; }

/* 通关结算评分 + 称号（玩法③，纯逻辑可单测）：碎片40 + 成就40 + 好感/捐赠/敬酒加成 */
function computeScore(){
  const fragTot=(typeof RT!=='undefined'&&RT.frags)?RT.frags.length:0;
  const frags=game.fragGot.length, ach=achEarned().length, achTot=achTotal();
  let score=Math.round(40*frags/Math.max(1,fragTot))
           +Math.round(40*ach/Math.max(1,achTot))
           +Math.min(10,game.hearts)
           +Math.min(6,(game.donatedN||0)*1.5)
           +Math.min(4,game.toastCount||0);
  score=Math.max(0,Math.min(100,Math.round(score)));
  let title;
  if(score>=92)                       title='鹈鹕镇传奇 · 圆满新人';
  else if(ach>=Math.ceil(achTot*0.7)) title='细节狂魔 · 彩蛋猎人';
  else if(fragTot&&frags>=fragTot)     title='记忆收藏家';
  else if(game.playSec>0&&game.playSec<210) title='闪电结缘 · 速通新人';
  else if(game.hearts>=10)            title='十心眷侣';
  else                                title='幸福的新人';
  return {score,title,frags,fragTot,ach,achTot,hearts:game.hearts,
          mins:Math.floor(game.playSec/60),secs:Math.floor(game.playSec%60)};
}

/* 领奖资格：需「完成婚礼 + 集齐全部记忆碎片 + 成就达阈值」，凭分享图领奖码才生效。
 * 阈值取 15（全成就 20，因抛捧花一次性、Konami 键盘专属等不宜强求全成就，兼顾硬核与可达） */
const GIFT_ACH_MIN=15;
function giftEligible(){
  const ach=achEarned().length, achTot=achTotal();
  const need=Math.min(GIFT_ACH_MIN, achTot);
  const fragTot=(typeof RT!=='undefined'&&RT.frags)?RT.frags.length:0;
  const frags=game.fragGot.length;
  const questOk=game.quest>=6, achOk=ach>=need, fragOk=fragTot?frags>=fragTot:true;
  return {ok:questOk&&achOk&&fragOk, ach, achTot, need, frags, fragTot, questOk, achOk, fragOk};
}

/* ============================================================
 * 存档：localStorage 单键快照（游戏进度/道具/好感/彩蛋/世界可变状态）
 *  serializeSave/applySave 为纯逻辑, 可单测往返一致性
 * ============================================================ */
const SAVE_KEY='wedd_save', SAVE_VER=2;
function serializeSave(){
  const g={};
  for(const k in game) if(typeof game[k]!=='function') g[k]=game[k];
  return {
    v:SAVE_VER,
    g,                                                   // game 全量数据字段
    dogPetted:dog.petted,
    partner:{scene:partner.scene,x:partner.x,y:partner.y,role:partner.role,dir:partner.dir},
    scene:game.scene, px:player.x, py:player.y,
    ceremony:typeof ceremonyDone!=='undefined'&&ceremonyDone,
    plots,                                               // 农田进度(可 JSON)
    obs:Object.keys(obstacles),                          // 尚未清除的路障
    mines:Object.fromEntries(Object.entries(mines).map(([k,v])=>[k,v.t])),
  };
}
function applySave(s){
  if(!s||s.v!==SAVE_VER||!s.g)return false;
  Object.assign(game,s.g);
  dog.petted=!!s.dogPetted;
  if(s.partner)Object.assign(partner,s.partner);
  if(s.scene)game.scene=s.scene;
  if(typeof s.px==='number'){player.x=s.px;player.y=s.py;}
  if(typeof ceremonyDone!=='undefined')ceremonyDone=!!s.ceremony;
  /* 农田：清空后套用存档 */
  if(s.plots){ for(const k in plots)delete plots[k]; Object.assign(plots,s.plots); }
  /* 路障：只保留存档中仍存在的 key */
  if(Array.isArray(s.obs)){ const keep=new Set(s.obs); for(const k in obstacles)if(!keep.has(k))delete obstacles[k]; }
  /* 矿岩重生计时 */
  if(s.mines)for(const k in s.mines)if(mines[k])mines[k].t=s.mines[k];
  if(game.chickHatched&&!chicks.length)spawnChick();   // 已孵化过则重建小鸡仔
  return true;
}
function hasSave(){ try{ const s=lsGet(SAVE_KEY); return !!(s&&s.v===SAVE_VER); }catch(e){ return false; } }
function autoSave(){ if(game.mode==='title')return; try{ lsSet(SAVE_KEY,serializeSave()); }catch(e){} }
function clearSave(){ lsDel(SAVE_KEY); }
let _lastSaveT=0;
function tickAutoSave(){                                 // 主循环里调用: 每 ~6 秒落一次盘
  if(game.mode==='title')return;
  if(game.time-_lastSaveT<6)return;
  _lastSaveT=game.time; autoSave();
}

