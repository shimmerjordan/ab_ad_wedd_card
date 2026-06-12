/* ============================================================
 * 运行时配置：默认值 ⊕ wedding-config.json ⊕ localStorage(DEBUG改的)
 * 桌位分享: ?gn=姓名&gt=桌号(自包含) 或 ?g=姓名(查表)
 * ============================================================ */
const LS = { museum:'wedd_museum', seats:'wedd_seats', frags:'wedd_frags', debug:'wedd_debug' };
function lsGet(k){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):null; }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){ toast('保存失败：存储空间不足'); } }
function lsDel(k){ try{ localStorage.removeItem(k); }catch(e){} }
const RT = { museum:CONFIG.museum, seats:CONFIG.seats, frags:CONFIG.frags };
function applyLocal(){
  for(const k of ['museum','seats','frags']){
    const v=lsGet(LS[k]); if(v&&Array.isArray(v)) RT[k]=v;
  }
}
applyLocal();
/* 站点部署可提交 wedding-config.json 让宾客也读到配置 */
fetch('wedding-config.json').then(r=>r.ok?r.json():null).then(j=>{
  if(!j) return;
  for(const k of ['museum','seats','frags']) if(Array.isArray(j[k]) && !lsGet(LS[k])) RT[k]=j[k];
  refreshGuest();
}).catch(()=>{});

const QS = new URLSearchParams(location.search);
let GUEST = null;                     // {name, table}
function refreshGuest(){
  if(QS.get('gn')&&QS.get('gt')) GUEST={name:QS.get('gn'), table:QS.get('gt')};
  else if(QS.get('g')){
    const hit=RT.seats.find(s=>s.name===QS.get('g'));
    if(hit) GUEST={name:hit.name, table:hit.table};
  }
  const gh=document.getElementById('guestHello');
  if(GUEST&&gh){ gh.style.display='block'; gh.innerHTML=`🎫 ${GUEST.name} 您好！您的喜宴桌位：<b style="color:#ffd84d">${GUEST.table} 号桌</b><br><span style="font-size:11px;opacity:.8">游戏终点的婚礼殿堂里，金色标记就是您的位置</span>`; }
}
let DEBUG = !!lsGet(LS.debug) || QS.get('debug')==='1';
function setDebug(on){
  DEBUG=on; lsSet(LS.debug,on?1:0);
  document.body.classList.toggle('debug',on);
  toast(on?'🛠 已进入 DEBUG 模式':'已退出 DEBUG 模式');
}

/* ============================================================
 * 场景生成（程序化，TILE=16）
 *  地块: . 草 , 草丛 : 路 ~ 水 T 树 f 篱笆 F 花 P 耕地 = 木栈道
 *        W 墙 w 木地板 c 红毯 S 舞台 n 沙地
 * ============================================================ */
const TILE=16;
function grid(w,h,fill){ return Array.from({length:h},()=>Array(w).fill(fill)); }
function rect(g,x0,y0,x1,y1,ch){ for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++) if(g[y]&&g[y][x]!==undefined) g[y][x]=ch; }
function hline(g,x0,x1,y,ch){ rect(g,x0,y,x1,y,ch); }
function vline(g,x,y0,y1,ch){ rect(g,x,y0,x,y1,ch); }

/* —— 户外大世界 36x46（镇区建筑改用高大真立面，整体南移） ——
 *  新增地块: B 开花灌木(可跳过) u 小灌木(装饰) G 觅食灌木(采谷粒) */
function buildWorld(){
  const W=36,H=46,g=grid(W,H,'.');
  /* 湖（椭圆 + 沙边） */
  const cx=29.2,cy=5.6,rx=5.6,ry=4.1;
  for(let y=1;y<12;y++)for(let x=22;x<35;x++){
    const dx=(x-cx)/rx,dy=(y-cy)/ry;
    if(dx*dx+dy*dy<=1) g[y][x]='~';
  }
  for(let y=1;y<13;y++)for(let x=21;x<36;x++){
    if(g[y][x]==='.'&&[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]].some(([a,b])=>g[y+b]&&g[y+b][x+a]==='~')) g[y][x]='n';
  }
  vline(g,29,7,10,'=');                       // 木栈道
  /* 农田 + 篱笆（底部留门，可跳跃） */
  rect(g,9,7,14,9,'P');
  hline(g,8,15,6,'f'); hline(g,8,10,10,'f'); hline(g,13,15,10,'f');
  vline(g,8,7,9,'f');  vline(g,15,7,9,'f');
  /* 鸡圈（无门，跳进去） */
  hline(g,18,21,6,'f'); hline(g,18,21,9,'f');
  vline(g,18,7,8,'f');  vline(g,21,7,8,'f');
  /* 花田（东南） */
  for(let y=25;y<=30;y++)for(let x=26;x<=33;x++) if(hash(x,y)%3<2) g[y][x]='F';
  /* 西边小树林 + 神秘草丛(蛋) */
  for(const [tx,ty] of [[2,20],[4,21],[2,24],[5,25],[3,27],[2,31],[5,30],[3,34],[6,33],[2,38],[5,38],[3,42]]) g[ty][tx]='T';
  /* 路网：家→主路→各门口→殿堂门前广场 */
  vline(g,5,6,22,':');                        // 家门口往南
  hline(g,5,30,22,':');                       // 主路（镇区门前）
  vline(g,12,21,22,':');                      // 杂货店门口
  vline(g,20,21,22,':');                      // 博物馆门口
  vline(g,27,21,22,':');                      // 邻居门口
  vline(g,29,11,14,':'); hline(g,29,30,14,':'); vline(g,30,14,21,':'); // 湖→主路
  vline(g,18,22,30,':');                      // 主路往南
  hline(g,18,26,30,':');                      // 往花田
  vline(g,24,30,40,':');                      // 绕殿堂东侧
  hline(g,17,24,40,':');                      // 殿堂门前横路
  rect(g,15,37,20,39,':');                    // ★ 殿堂门前广场（直达大门）
  vline(g,17,36,37,':'); vline(g,18,36,37,':');
  /* 开花灌木(B, 可跳)与小灌木(u, 装饰) */
  for(const [bx,by] of [[7,12],[16,12],[22,15],[31,16],[7,24],[14,24],[25,23],[34,22],[12,31],[26,33],[33,33],[10,38],[26,41],[31,38]]) if(g[by][bx]==='.') g[by][bx]='B';
  for(const [ux,uy] of [[4,12],[10,12],[19,15],[24,12],[33,12],[8,20],[15,20],[23,20],[31,20],[6,27],[13,27],[21,28],[34,27],[9,34],[21,34],[30,35],[14,42],[22,43],[28,43]]) if(g[uy][ux]==='.') g[uy][ux]='u';
  /* 觅食灌木(G: 鸡饲料谷粒) */
  for(const [gx,gy] of [[4,18],[24,16],[34,30],[26,31],[6,40]]) g[gy][gx]='G';
  /* 草丛点缀 */
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++) if(g[y][x]==='.'&&hash(x,y)%13===0) g[y][x]=',';
  /* 树木点缀（避开空地建筑） */
  const forb=(x,y)=> (x>=1&&x<=10&&y>=1&&y<=10)||(x>=7&&x<=16&&y>=5&&y<=11)||(x>=17&&x<=22&&y>=5&&y<=10)||
    (x>=20&&x<=35&&y>=0&&y<=14)||(x>=3&&x<=33&&y>=11&&y<=23)||(x>=24&&x<=35&&y>=24&&y<=31)||
    (x>=11&&x<=25&&y>=30&&y<=45)||(x>=15&&x<=20&&y>=22&&y<=45);
  for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++)
    if(g[y][x]==='.'&&!forb(x,y)&&hash(x*3,y*7)%15===0) g[y][x]='T';
  /* 边界树墙 */
  hline(g,0,W-1,0,'T'); hline(g,0,W-1,H-1,'T');
  vline(g,0,0,H-1,'T'); vline(g,W-1,0,H-1,'T');
  return {w:W,h:H,g};
}
/* —— 博物馆内景 26x18：上墙矿物大展架+4油画，中央两排圆桌展台 —— */
function buildMuseum(){
  const W=26,H=18,g=grid(W,H,'w');
  rect(g,0,0,W-1,2,'W');                      // 上墙(3行墙面)
  hline(g,0,W-1,H-1,'W');
  vline(g,0,0,H-1,'W'); vline(g,W-1,0,H-1,'W');
  g[H-1][12]='w'; g[H-1][13]='w';             // 门口
  return {w:W,h:H,g};
}
/* —— 婚礼殿堂内景 26x20：墙面3行+舞台+中央红毯 —— */
function buildHall(){
  const W=26,H=20,g=grid(W,H,'w');
  rect(g,0,0,W-1,2,'W');
  hline(g,0,W-1,H-1,'W');
  vline(g,0,0,H-1,'W'); vline(g,W-1,0,H-1,'W');
  rect(g,7,3,18,6,'S');                       // 舞台
  rect(g,12,7,13,18,'c');                     // 中央红毯
  g[H-1][12]='c'; g[H-1][13]='c';             // 门口
  return {w:W,h:H,g};
}

/* —— 建筑（img=星露谷立面素材, 底边对齐地基; 无图时回退参数化绘制） —— */
const BUILDINGS = [
  {key:'home',   x:2, y:2, w:6, h:4, wall:'#e8d5a8', roof:'#b04a3a', label:'',
   door:{x:4.5,w:1,  act:'homeDoor'}},
  {key:'shop',   x:7, y:17,w:11,h:4, wall:'#f0e0b8', roof:'#3f8a3c', label:'杂货店',
   img:'shopB', doorOff:110, doorW:36,
   door:{x:11.5,w:1.6,act:'shop'}},
  {key:'museum', x:17,y:17,w:8, h:4, wall:'#e8e0d0', roof:'#5a6fb0', label:'博物馆',
   img:'museumB', doorOff:64, doorW:32,
   door:{x:20.6,w:1.6,act:'enterMuseum'}},
  {key:'nb1',    x:26,y:17,w:5, h:4, wall:'#e8d5a8', roof:'#c9772e', label:'',
   door:{x:28, w:1,  act:'nbDoor'}},
  {key:'hall',   x:13,y:33,w:10,h:4, wall:'#f5ead0', roof:'#c0392b', label:'婚礼殿堂',
   img:'hallB', doorOff:58, doorW:48,
   door:{x:17,  w:2,  act:'enterHall'}},
];
/* 立面图左缘的世界 X（图按地基宽度水平居中） */
function bldImgX(b,im){ return b.x*TILE+((b.w*TILE-im.width)/2|0); }
/* 门的世界矩形：素材建筑用像素偏移，参数化建筑用 tile 偏移 */
function bldDoorRect(b){
  const im=b.img&&img(b.img);
  if(im&&b.doorOff!==undefined){
    return {x:bldImgX(b,im)+b.doorOff, y:(b.y+b.h)*TILE-20, w:b.doorW, h:30};
  }
  return {x:b.door.x*TILE-6, y:(b.y+b.h)*TILE-18, w:b.door.w*TILE+12, h:26};
}
/* 户外固定对象 */
const WOBJ = {
  mailbox:{x:8*TILE+4, y:5*TILE+2, w:8, h:12},
  well:   {x:2*TILE,   y:8*TILE,  w:30, h:28},
  chest:  {x:19*TILE+2,y:7*TILE+2, w:12, h:10},
  bush:   {x:3*TILE,   y:22*TILE,  w:16, h:14},   // 神秘草丛(跳3次彩蛋)
};
/* 户外装饰（殿堂/博物馆门前：干净盆栽） */
const WDECOR = [
  {img:'potA', x:15.2*TILE, y:36.4*TILE, w:14, h:10, solid:1},
  {img:'potC', x:16.2*TILE, y:36.4*TILE, w:14, h:10, solid:1},
  {img:'potC', x:19.4*TILE, y:36.4*TILE, w:14, h:10, solid:1},
  {img:'potA', x:20.4*TILE, y:36.4*TILE, w:14, h:10, solid:1},
  {img:'potB', x:19.4*TILE, y:20.5*TILE, w:14, h:10, solid:1},
  {img:'potB', x:22.4*TILE, y:20.5*TILE, w:14, h:10, solid:1},
  {img:'potC', x:11*TILE,   y:20.5*TILE, w:14, h:10, solid:1},
  {img:'potA', x:13.6*TILE, y:20.5*TILE, w:14, h:10, solid:1},
];
/* 殿堂内对象：8 圆桌 + 互动点 + 自助宴会桌/装饰 */
const TABLE_POS=[[4,9],[8,9],[15,9],[19,9],[4,14],[8,14],[15,14],[19,14]];
const HOBJ = {
  piano:  {x:8*TILE, y:3.6*TILE, w:38, h:26},
  tower:  {x:15.5*TILE,y:3.4*TILE, w:30, h:30},
  cake:   {x:21.5*TILE,y:7.4*TILE, w:30, h:24},
  buffetL:{x:1*TILE+6, y:6.4*TILE, w:44, h:58, img:'tableRedA'},
  buffetR:{x:22*TILE+4,y:12.4*TILE,w:44, h:58, img:'tableRedB'},
  poleL:  {x:2*TILE,  y:16.6*TILE, w:24, h:18, img:'maypole'},
  poleR:  {x:22.6*TILE,y:16.6*TILE,w:24, h:18, img:'maypole'},
  popperL:{x:1*TILE+4,y:11*TILE, w:12, h:16},
  popperR:{x:23.6*TILE,y:5*TILE, w:12, h:16},
};
/* 殿堂内装饰（无碰撞）：盆栽列于舞台两侧 + 红毯夹道 */
const HDECOR = [
  {img:'potB', x:9.8*TILE, y:6.2*TILE},
  {img:'potB', x:15.2*TILE,y:6.2*TILE},
  {img:'potC', x:10.8*TILE,y:11.4*TILE},
  {img:'potC', x:14*TILE,  y:11.4*TILE},
  {img:'potA', x:10.8*TILE,y:16.4*TILE},
  {img:'potA', x:14*TILE,  y:16.4*TILE},
];
/* 博物馆展位：
 *  1-4 → 上墙油画(矿架两侧各2幅, 像素坐标)
 *  5-12 → 中央两排圆木桌展台(tile 坐标) */
const EX_WALL_PX=[[26,8],[74,8],[296,8],[344,8]];
const EX_TBL=[[3,5],[9,5],[15,5],[21,5],[3,10],[9,10],[15,10],[21,10]];
const MUSEUM_PAINTS=['paintBoat','paintHills','paintSunset','paintNight'];
/* 博物馆家具(贴地摆放, 带碰撞) */
const MOBJ = {
  bookL:{x:5*TILE,   y:15*TILE,   w:36, h:26, img:'bookshelf'},
  bookR:{x:18*TILE+8,y:15*TILE,   w:36, h:26, img:'bookshelf'},
  skel: {x:11.4*TILE,y:7.6*TILE,  w:50, h:22, img:'skeleton'},
  plantA:{x:1*TILE+6, y:3.6*TILE, w:28, h:16, img:'plantA'},
  plantB:{x:21.6*TILE,y:3.6*TILE, w:36, h:16, img:'plantB'},
  plantC:{x:1*TILE+6, y:14.6*TILE,w:28, h:16, img:'plantA'},
  plantD:{x:21.6*TILE,y:14.6*TILE,w:36, h:16, img:'plantB'},
};

const SCENES = {
  world:  Object.assign(buildWorld(),  {type:'out'}),
  museum: Object.assign(buildMuseum(), {type:'in', exit:{to:'world', x:21*TILE, y:21.2*TILE}}),
  hall:   Object.assign(buildHall(),  {type:'in', exit:{to:'world', x:17.5*TILE, y:37.2*TILE}}),
};
/* 场景间寻路（指引箭头用） */
function routeDoor(from,to){
  if(from==='world') return to==='museum' ? {x:21.3*TILE,y:21*TILE} : {x:18*TILE,y:37*TILE};
  return {x:12.5*TILE, y:(SCENES[from].h-1)*TILE};
}

/* ============================================================
 * 游戏状态
 * ============================================================ */
const game = {
  mode:'title',                 // title|play|dialog|ui|fish
  scene:'world',
  quest:0,                      // 0找TA 1农务 2钓鱼 3收信 4博物馆 5殿堂仪式 6完结
  coins:10, seeds:0, fert:0, water:0, fruits:0, fishN:0, fishQ:false,
  rod:false, hasCan:false,      // 鱼竿(商店购买)/水壶(水井任务获取)
  bait:0, eggs:0, feed:0, flowers:0, giftN:0,
  chickenFedT:-99,              // 母鸡消化计时
  meetReplyIdx:0, vowIdx:0,
  chestOpened:false, chickenTalk:0, wellWish:0, bushJump:0, catTalk:false, catFed:0, bootCaught:false,
  fragGot:[],                   // 已收集碎片下标
  exhibitSeen:false,
  playerRole:'groom', time:0,
};
/* 觅食灌木/野花 重生计时 */
const forageT={}, pickedF={};
const player  = {x:5.5*TILE, y:6.5*TILE, dir:'down', flip:false, moving:false, animT:0, frame:'A', frameI:0, z:0, vz:0};
const partner = {x:30*TILE, y:27*TILE, scene:'world', dir:'down', flip:false, role:'bride', bob:0};
const chicken = {x:19*TILE, y:8*TILE, dir:1, t:0, pause:false};
/* 猫：状态机漫游(博物馆与邻居家之间的街角) + 喂食后跟随 */
const cat = {x:24*TILE, y:21.6*TILE, homeX:24*TILE, homeY:21.6*TILE,
             tx:24*TILE, ty:21.6*TILE, state:'sit', t:2, flip:false, followT:0, animT:0, frame:0};
const plots = {};               // "x,y"->{st:0空/1种/2浇, fert:0/1, t}
{
  const wg=SCENES.world.g;
  for(let y=0;y<SCENES.world.h;y++)for(let x=0;x<SCENES.world.w;x++)
    if(wg[y][x]==='P') plots[x+','+y]={st:0,fert:0,t:0};
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
addEventListener('keydown',e=>{
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  const k=e.key.toLowerCase();
  keys[k]=true;
  if([' ','e','enter','z'].includes(k)){ if(!e.repeat) actA=true; holdA=true; }
  if(['x','shift'].includes(k)) actB=true;
});
addEventListener('keyup',e=>{
  const k=e.key.toLowerCase();
  keys[k]=false;
  if([' ','e','enter','z'].includes(k)) holdA=false;
});
const padL=document.getElementById('padL'),base=document.getElementById('stickBase'),nub=document.getElementById('stickNub');
padL.addEventListener('pointerdown',e=>{
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
  if(game.scene==='hall')  return Object.values(HOBJ).concat(TABLE_POS.map(([tx,ty])=>({x:tx*TILE+2,y:ty*TILE+6,w:28,h:22})));
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
  },420);
}

/* ============================================================
 * 钓鱼小游戏
 * ============================================================ */
const fish={zone:50,zoneV:0,fy:30,fv:18,prog:30,t:0,quest:false};
const fishUI=document.getElementById('fishUI'),fishHint=document.getElementById('fishHint'),
      fishZoneEl=document.getElementById('fishZone'),fishIconEl=document.getElementById('fishIcon'),
      fishProgEl=document.getElementById('fishProg');
function startFishing(){
  game.mode='fish';
  fish.zone=60;fish.zoneV=0;fish.fy=30;fish.prog=34;fish.t=0;
  fish.quest=(game.quest===2&&!game.fishQ);
  fishUI.style.display='flex';fishHint.style.display='block';
  sfx('plant');
}
function updateFish(dt){
  fish.t+=dt;
  /* 鱼运动：随机加速度 */
  fish.fv+=(Math.sin(fish.t*2.2)*46+Math.sin(fish.t*5.1)*30)*dt*2;
  fish.fv=Math.max(-85,Math.min(85,fish.fv));
  fish.fy+=fish.fv*dt;
  if(fish.fy<4){fish.fy=4;fish.fv=Math.abs(fish.fv)*.6;}
  if(fish.fy>196){fish.fy=196;fish.fv=-Math.abs(fish.fv)*.6;}
  /* 绿区：按住上浮，松开下沉 */
  fish.zoneV += (holdA?-260:230)*dt;
  fish.zoneV=Math.max(-150,Math.min(150,fish.zoneV));
  fish.zone+=fish.zoneV*dt;
  if(fish.zone<0){fish.zone=0;fish.zoneV=0;}
  if(fish.zone>176){fish.zone=176;fish.zoneV=0;}
  /* 进度 */
  const inZone=fish.fy+10>=fish.zone&&fish.fy+10<=fish.zone+64;
  fish.prog+=(inZone?26:-17)*dt;
  fish.prog=Math.max(0,Math.min(100,fish.prog));
  fishZoneEl.style.top=fish.zone+'px';
  fishIconEl.style.top=fish.fy+'px';
  fishProgEl.style.height=fish.prog+'%';
  fishProgEl.style.background=inZone?'linear-gradient(180deg,#aef08a,#7ec850)':'linear-gradient(180deg,#ffd84d,#e8943a)';
  if(fish.prog>=100) endFishing(true);
  else if(fish.prog<=0) endFishing(false);
}
function endFishing(ok){
  fishUI.style.display='none';fishHint.style.display='none';
  game.mode='play';
  if(!ok){ sfx('blip'); toast('鱼跑掉了，鱼饵也被吃了…再试一次！'); return; }
  sfx('harvest'); flyHearts(innerWidth/2,innerHeight/2,3);
  if(fish.quest){
    game.fishQ=true;
    startDialog([{who:'me',text:'钓到了！鳞片是淡粉色的——传说中的「同心鱼」！'}],()=>{
      toast('获得 <b style="color:#ff9eb5">同心鱼</b> ×1');
      maybeFrag(.9,()=>advanceAfterFish());
    });
  }else if(!game.bootCaught&&Math.random()<.25){
    game.bootCaught=true;
    startDialog([{who:'me',text:'钓上来一只旧靴子…等等，里面塞着一张被防水袋裹好的纸条！'}],()=>{
      toast('🏆 隐藏彩蛋：旧靴子里的纸条');
      maybeFrag(1);
    });
  }else{
    game.fishN++;
    toast(`钓到一条鱼！（背包 ${game.fishN} 条，可去杂货店卖掉）`);
    maybeFrag(.3);
    updateItemBar();
  }
}
function advanceAfterFish(){
  setQuest(3);
  toast('📬 邮箱似乎有动静…回家看看红色邮箱');
}

/* ============================================================
 * 更新
 * ============================================================ */
function update(dt){
  game.time+=dt;
  if(game.mode==='fish'){ updateFish(dt); actA=actB=false; return; }
  if(game.mode!=='play'){ actA=actB=false; return; }
  let mx=0,my=0;
  if(keys['arrowleft']||keys['a'])mx-=1; if(keys['arrowright']||keys['d'])mx+=1;
  if(keys['arrowup']||keys['w'])my-=1;   if(keys['arrowdown']||keys['s'])my+=1;
  mx+=stick.dx;my+=stick.dy;
  const len=Math.hypot(mx,my);
  player.moving=len>0.25;
  if(player.moving){
    mx/=len;my/=len;
    if(Math.abs(mx)>Math.abs(my)){player.dir='side';player.flip=mx<0;}
    else player.dir=my<0?'up':'down';
    const sp=70*dt,air=player.z>4;
    const nx=player.x+mx*sp,ny=player.y+my*sp;
    if(canMove(nx,player.y,air))player.x=nx;
    if(canMove(player.x,ny,air))player.y=ny;
    player.animT+=dt;
    if(player.animT>0.13){
      player.animT=0;
      player.frameI=(player.frameI+1)%4;
      player.frame=player.frameI%2?'B':'A';   // 回退用双帧
    }
  }else{player.frame='A';player.frameI=0;}
  if(actB&&player.z===0){player.vz=150;sfx('jump');checkBushJump();}
  if(player.z>0||player.vz>0){
    player.z+=player.vz*dt;player.vz-=560*dt;
    if(player.z<=0){player.z=0;player.vz=0;}
  }
  if(actA)interact();
  actA=actB=false;
  /* 内景出口：走到门口自动返回 */
  const s=sc();
  if(s.type==='in'&&player.y+12>=(s.h-1)*TILE+4){
    gotoScene('world',s.exit.x,s.exit.y);
    return;
  }
  /* 殿堂：走上舞台自动开始仪式 */
  if(game.scene==='hall'&&game.quest===5&&!ceremonyDone&&tileAt(player.x+6,player.y+12)==='S')
    tryCeremony();
  /* 小鸡 */
  chicken.t-=dt;
  if(chicken.t<=0){chicken.t=1+Math.random()*2;chicken.dir=Math.random()*4|0;chicken.pause=Math.random()<.4;}
  if(!chicken.pause&&game.scene==='world'){
    const d=[[1,0],[-1,0],[0,1],[0,-1]][chicken.dir],csp=14*dt;
    const nx=chicken.x+d[0]*csp,ny=chicken.y+d[1]*csp;
    if(nx>18.2*TILE&&nx<20.6*TILE&&ny>6.5*TILE&&ny<8.4*TILE){chicken.x=nx;chicken.y=ny;}
    else chicken.t=0;
  }
  /* 猫咪 AI：跟随 > 漫游(走/坐/睡) */
  if(game.scene==='world'){
    cat.animT+=dt;
    if(cat.animT>0.18){cat.animT=0;cat.frame=(cat.frame+1)%4;}
    if(cat.followT>0){
      cat.followT-=dt;
      const dx=player.x-cat.x, dy=player.y+4-cat.y, d=Math.hypot(dx,dy);
      if(d>26){ cat.x+=dx/d*46*dt; cat.y+=dy/d*46*dt; cat.flip=dx<0; cat.state='walk'; }
      else cat.state='sit';
    }else{
      cat.t-=dt;
      if(cat.state==='walk'){
        const dx=cat.tx-cat.x, dy=cat.ty-cat.y, d=Math.hypot(dx,dy);
        if(d<3||cat.t<=0) cat.state=Math.random()<.5?'sit':'sleep', cat.t=3+Math.random()*4;
        else { cat.x+=dx/d*24*dt; cat.y+=dy/d*24*dt; cat.flip=dx<0; }
      }else if(cat.t<=0){
        cat.state='walk'; cat.t=6;
        cat.tx=cat.homeX+(Math.random()*3-1.5)*TILE;
        cat.ty=cat.homeY+(Math.random()*1.6-0.6)*TILE;   // 沿街角小范围溜达,不钻建筑后面
      }
    }
  }
  partner.bob+=dt;
  updateCam();
  updateArrow();
}

/* ============================================================
 * 渲染：地块
 * ============================================================ */
function drawTiles(){
  const s=sc(),g=s.g;
  const x0=Math.max(0,cam.x/TILE|0),y0=Math.max(0,cam.y/TILE|0),
        x1=Math.min(s.w-1,(cam.x+VW)/TILE+1|0),y1=Math.min(s.h-1,(cam.y+VH)/TILE+1|0);
  for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){
    const t=g[ty][tx],px=tx*TILE-cam.x|0,py=ty*TILE-cam.y|0,h=hash(tx,ty);
    if(t==='W'){ // 内墙：距地面3行内的墙体画墙纸立面，其余画砖色
      const wp=img(game.scene==='museum'?'wallMuseum':'wallHall');
      let below=0; while(g[ty+below+1]&&g[ty+below+1][tx]==='W') below++;
      const faceRow = below<=2 && g[ty+below+1] && g[ty+below+1][tx]!=='W';
      if(wp && faceRow && game.scene!=='world'){
        const slice=Math.max(0,2-below);     // 墙纸切片: 0顶 1中 2底
        ctx.drawImage(wp,0,slice*16,16,16,px,py,16,16);
      }else{
        ctx.fillStyle='#7a5a40';ctx.fillRect(px,py,TILE,TILE);
        ctx.fillStyle='#8d6b4e';ctx.fillRect(px,py,TILE,3);
        ctx.fillStyle='#5e4530';ctx.fillRect(px,py+13,TILE,3);
      }
      continue;
    }
    if(t==='w'||t==='c'||t==='S'){ // 木地板基底（素材地板优先）
      const fl=img(game.scene==='museum'?'floorMuseum':'floorHall');
      if(fl) ctx.drawImage(fl,(tx%2)*16,(ty%2)*16,16,16,px,py,16,16);
      else{
        ctx.fillStyle=(tx+ty)%2?'#c89858':'#bf9050';ctx.fillRect(px,py,TILE,TILE);
        ctx.fillStyle='rgba(0,0,0,.08)';ctx.fillRect(px,py+15,TILE,1);
      }
      if(t==='c'){ ctx.fillStyle='#c0392b';ctx.fillRect(px,py,TILE,TILE);
        ctx.fillStyle='#a82e22';ctx.fillRect(px,py,TILE,2);
        ctx.fillStyle='#e8b04a';if(tx%2===0)ctx.fillRect(px,py+7,2,2);
      }
      if(t==='S'){ ctx.fillStyle='#e8d5a8';ctx.fillRect(px,py,TILE,TILE);
        ctx.fillStyle='#d9bd85';ctx.fillRect(px,py+(ty%2?8:0),TILE,2);
      }
      continue;
    }
    /* 室外草地基底 */
    ctx.fillStyle=(h%7<2)?'#55a04a':'#5fae52';
    ctx.fillRect(px,py,TILE,TILE);
    if(h%11===0){ctx.fillStyle='#4c9342';ctx.fillRect(px+(h>>3)%12,py+(h>>5)%12,2,2);}
    if(t===','){ctx.fillStyle='#3f8a3c';ctx.fillRect(px+3,py+9,2,4);ctx.fillRect(px+7,py+7,2,6);ctx.fillRect(px+11,py+10,2,3);}
    else if(t===':'){
      ctx.fillStyle='#d8b06a';ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle='#c69b56';ctx.fillRect(px+(h%8),py+(h>>4)%10,3,2);ctx.fillRect(px+((h>>6)%10),py+((h>>2)%12),2,2);
    }
    else if(t==='n'){ // 沙岸
      ctx.fillStyle='#e8d6a0';ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle='#d9c488';ctx.fillRect(px+(h%10),py+((h>>3)%12),3,2);
    }
    else if(t==='~'){
      const deep=((tx-29.2)**2/31+(ty-5.6)**2/17)<0.45;
      ctx.fillStyle=deep?'#2f66a8':'#3f7fc4';ctx.fillRect(px,py,TILE,TILE);
      /* 岸边白沫 */
      const up=g[ty-1]&&g[ty-1][tx],dn=g[ty+1]&&g[ty+1][tx],lf=g[ty][tx-1],rt=g[ty][tx+1];
      ctx.fillStyle='rgba(255,255,255,.65)';
      const fo=Math.sin(game.time*2+tx*2+ty)>0.3?1:0;
      if(up&&up!=='~'&&up!=='=')ctx.fillRect(px,py,TILE,2+fo);
      if(dn&&dn!=='~'&&dn!=='=')ctx.fillRect(px,py+14-fo,TILE,2+fo);
      if(lf&&lf!=='~'&&lf!=='=')ctx.fillRect(px,py,2+fo,TILE);
      if(rt&&rt!=='~'&&rt!=='=')ctx.fillRect(px+14-fo,py,2+fo,TILE);
      /* 波光 */
      ctx.fillStyle='#5d9bd8';
      if((h+(game.time*1.6|0))%6===0)ctx.fillRect(px+3,py+6,7,2);
      ctx.fillStyle='#79b4e8';ctx.fillRect(px+(h%9),py+((h>>3)%12),4,1);
      /* 睡莲 */
      if(h%23===0&&!deep){ctx.fillStyle='#3f8a3c';ctx.fillRect(px+4,py+5,7,5);ctx.fillStyle='#2f6b24';ctx.fillRect(px+8,py+5,3,2);
        if(h%46===0){ctx.fillStyle='#ff9eb5';ctx.fillRect(px+6,py+3,3,3);}}
    }
    else if(t==='='){ // 木栈道
      ctx.fillStyle='#3a76b8';ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle='#a8743c';ctx.fillRect(px+1,py,14,TILE);
      ctx.fillStyle='#8c5a2b';for(let i=0;i<4;i++)ctx.fillRect(px+1,py+i*4,14,1);
      ctx.fillStyle='#6e4218';ctx.fillRect(px+1,py,2,TILE);ctx.fillRect(px+13,py,2,TILE);
    }
    else if(t==='u'){ // 小灌木(装饰,可穿过)
      const im=img(h%2?'bushSm1':'bushSm2');
      if(im)ctx.drawImage(im,px,py-16);
      else{ctx.fillStyle='#3f8a3c';ctx.fillRect(px+3,py+3,10,10);}
    }
    else if(t==='G'){ // 觅食灌木(谷粒)
      const im=img('bushFl');
      const ready=!forageT[tx+','+ty]||game.time-forageT[tx+','+ty]>40;
      if(im)ctx.drawImage(im,px-8,py-16);
      else{ctx.fillStyle='#3f8a3c';ctx.fillRect(px,py,16,14);}
      if(ready&&(game.time*2|0)%2){ctx.fillStyle='#ffd84d';ctx.fillRect(px+11,py-12,3,3);ctx.fillRect(px+2,py-6,2,2);}
    }
    else if(t==='F'){
      const picked=pickedF[tx+','+ty]&&game.time-pickedF[tx+','+ty]<60;
      const fim=img(['flowerA','flowerB','flowerC'][h%3]);
      if(fim){ /* 星露谷花卉（作物终阶帧）；被采后显示幼苗 */
        if(picked){
          const sp=img('flowerSprout');
          if(sp)ctx.drawImage(sp,px+(16-sp.width)/2|0,py+9);
        }else{
          ctx.drawImage(fim,px+((16-fim.width)/2|0),py+14-fim.height);
        }
      }else{
        const colors=['#ff7daa','#ffd84d','#a06ee0','#ff8a5c','#fff'];
        ctx.fillStyle='#3f8a3c';ctx.fillRect(px+7,py+8,2,6);
        if(!picked){
          ctx.fillStyle=colors[h%colors.length];ctx.fillRect(px+5,py+4,6,6);
          ctx.fillStyle='#ffe9a8';ctx.fillRect(px+7,py+6,2,2);
        }
      }
    }
    else if(t==='f'){ // 连体栅栏
      const lf=g[ty][tx-1]==='f',rt=g[ty][tx+1]==='f',up=g[ty-1]&&g[ty-1][tx]==='f',dn=g[ty+1]&&g[ty+1][tx]==='f';
      ctx.fillStyle='#9a6433';
      if(lf||rt){ctx.fillRect(lf?px:px+6,py+6,lf&&rt?TILE:10,3);ctx.fillRect(lf?px:px+6,py+11,lf&&rt?TILE:10,2);}
      if(up||dn)ctx.fillRect(px+6,up?py:py+4,3,up&&dn?TILE:12);
      ctx.fillStyle='#8c5a2b';ctx.fillRect(px+5,py+3,5,11);
      ctx.fillStyle='#6e4218';ctx.fillRect(px+5,py+3,5,2);
      ctx.fillStyle='#a8743c';ctx.fillRect(px+6,py+5,2,8);
    }
    else if(t==='P'){
      const key=tx+','+ty,pl=plots[key];
      ctx.fillStyle=pl&&pl.st===2?'#5b3a1e':'#8a5a2f';
      ctx.fillRect(px+1,py+1,14,14);
      ctx.fillStyle='rgba(0,0,0,.15)';
      for(let i=0;i<3;i++)ctx.fillRect(px+2,py+3+i*4,12,1);
      if(pl&&pl.fert){ctx.fillStyle='rgba(160,110,224,.5)';ctx.fillRect(px+2,py+2,3,3);ctx.fillRect(px+11,py+10,3,3);}
      if(pl&&pl.st>0){
        const stage=pl.st===1?0:Math.min(3,1+((game.time-pl.t)/(pl.fert?0.9:1.6)|0));
        const sun=img('sunflower');
        if(sun){ /* 向日葵 6 帧条带: 种下=芽(2), 生长=3/4, 成熟=5 */
          const fi=stage===0?2:2+stage;
          ctx.drawImage(sun, fi*16,0,16,32, px, py-16, 16,32);
          if(stage===3&&(game.time*3|0)%2){
            ctx.fillStyle=pl.fert?'#ffec8a':'#fff';
            ctx.fillRect(px+3,py-10,2,2);ctx.fillRect(px+11,py-13,2,2);
          }
        }
        else if(stage===0){ctx.fillStyle='#7ec850';ctx.fillRect(px+7,py+9,2,3);}
        else if(stage===1){ctx.fillStyle='#5fae52';ctx.fillRect(px+7,py+6,2,6);ctx.fillRect(px+5,py+8,2,2);ctx.fillRect(px+9,py+7,2,2);}
        else if(stage===2){ctx.fillStyle='#3f8a3c';ctx.fillRect(px+7,py+4,2,8);ctx.fillRect(px+4,py+6,3,2);ctx.fillRect(px+9,py+5,3,2);}
        else{
          ctx.fillStyle='#3f8a3c';ctx.fillRect(px+7,py+7,2,6);
          ctx.fillStyle=pl.fert?'#ffec8a':'#ffd84d';
          ctx.fillRect(px+5,py+3,6,5);ctx.fillRect(px+7,py+1,2,2);ctx.fillRect(px+3,py+5,2,2);ctx.fillRect(px+11,py+5,2,2);
          if((game.time*3|0)%2){ctx.fillStyle='#fff';ctx.fillRect(px+6,py+4,1,1);}
        }
      }
    }
  }
}

/* ============================================================
 * 渲染：建筑与对象
 * ============================================================ */
function drawBuilding(b){
  const px=b.x*TILE-cam.x|0,py=b.y*TILE-cam.y|0,w=b.w*TILE,h=b.h*TILE;
  /* 农舍/邻居家：星露谷房屋素材(160x144 半尺寸绘制, 底边对齐) */
  if(b.key==='home'||b.key==='nb1'){
    const im=img(b.key==='home'?'house2':'house1');
    if(im){
      const dw=80,dh=72;
      ctx.drawImage(im,0,0,160,144, px+((w-dw)/2|0), py+h-dh, dw,dh);
      return;
    }
  }
  /* 星露谷镇区立面（原寸不规则透明边缘，底边对齐地基） */
  if(b.img){
    const im=img(b.img);
    if(im){
      const ix=bldImgX(b,im)-cam.x|0, iy=py+h-im.height;
      ctx.drawImage(im, ix, iy);
      /* 中文木牌招牌挂在立面上部 */
      if(b.label){
        const lw=b.label.length*14+10;
        const lx=px+w/2-lw/2, ly=iy+(b.key==='shop'?40:52);
        ctx.fillStyle='#5b2c0e';ctx.fillRect(lx-2,ly-2,lw+4,17);
        ctx.fillStyle='#b3661f';ctx.fillRect(lx,ly,lw,13);
        ctx.fillStyle='#ffefc9';ctx.font='11px "Fusion Pixel 12px Proportional SC",monospace';
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(b.label,px+w/2,ly+7);
      }
      if(b.key==='hall'){ /* 彩旗+爱心保持喜庆 */
        const fc=['#ff7daa','#ffd84d','#7dc4ff','#a06ee0'];
        for(let i=0;i<9;i++){ctx.fillStyle=fc[i%4];ctx.fillRect(ix+12+i*(im.width-30)/8,iy+34+(i%2)*4,5,7);}
        ctx.fillStyle='#e0457b';
        const hx=px+w/2;ctx.fillRect(hx-3,iy-8,3,3);ctx.fillRect(hx+1,iy-8,3,3);ctx.fillRect(hx-3,iy-5,7,3);ctx.fillRect(hx-1,iy-2,3,2);
      }
      return;
    }
  }
  const roofH=14+(b.h>5?8:0);
  /* 墙体 */
  ctx.fillStyle=b.wall;ctx.fillRect(px,py+roofH-4,w,h-roofH+4);
  ctx.fillStyle='rgba(0,0,0,.12)';ctx.fillRect(px,py+roofH-4,w,3);
  /* 屋顶 */
  ctx.fillStyle=b.roof;ctx.fillRect(px-4,py-8,w+8,roofH+8);
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(px-4,py+roofH-4,w+8,4);
  ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(px-4,py-8,w+8,4);
  /* 门 */
  const dx=px+(b.door.x-b.x)*TILE,dw=b.door.w*TILE;
  ctx.fillStyle='#6e4218';ctx.fillRect(dx-2,py+h-24,dw+4,24);
  ctx.fillStyle='#8c5a2b';ctx.fillRect(dx,py+h-22,dw,22);
  ctx.fillStyle='#ffd84d';ctx.fillRect(dx+dw-5,py+h-13,2,3);
  /* 窗 */
  ctx.fillStyle='#7ec8e8';
  for(let wx=px+8;wx<px+w-14;wx+=26){
    if(Math.abs(wx-dx)<20)continue;
    ctx.fillRect(wx,py+roofH+5,12,10);
    ctx.fillStyle='#6e4218';ctx.fillRect(wx+5,py+roofH+5,2,10);ctx.fillStyle='#7ec8e8';
  }
  /* 招牌 */
  if(b.label){
    const lw=b.label.length*14+12;
    const lx=px+w/2-lw/2,ly=py+roofH-2;
    ctx.fillStyle='#5b2c0e';ctx.fillRect(lx-2,ly-2,lw+4,18);
    ctx.fillStyle='#b3661f';ctx.fillRect(lx,ly,lw,14);
    ctx.fillStyle='#ffefc9';ctx.font='11px "Fusion Pixel 12px Proportional SC",monospace';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(b.label,px+w/2,ly+8);
  }
  /* 殿堂彩旗 */
  if(b.key==='hall'){
    const fc=['#ff7daa','#ffd84d','#7dc4ff','#a06ee0'];
    for(let i=0;i<8;i++){ctx.fillStyle=fc[i%4];ctx.fillRect(px+8+i*(w-20)/7,py-6+(i%2)*3,5,7);}
    ctx.fillStyle='#e0457b';
    const hx=px+w/2;ctx.fillRect(hx-3,py-16,3,3);ctx.fillRect(hx+1,py-16,3,3);ctx.fillRect(hx-3,py-13,7,3);ctx.fillRect(hx-1,py-10,3,2);
  }
  if(b.key==='museum'){ /* 柱子 */
    ctx.fillStyle='#fdfdff';
    ctx.fillRect(px+6,py+roofH+2,6,h-roofH-2);ctx.fillRect(px+w-12,py+roofH+2,6,h-roofH-2);
    ctx.fillStyle='rgba(0,0,0,.15)';
    ctx.fillRect(px+10,py+roofH+2,2,h-roofH-2);ctx.fillRect(px+w-8,py+roofH+2,2,h-roofH-2);
  }
}
function drawWell(){
  const o=WOBJ.well,px=o.x-cam.x|0,py=o.y-cam.y|0;
  const im=img('well');
  if(im){ ctx.drawImage(im, px-9, py+28-80); return; }   // 48x80, 底边对齐碰撞盒
  ctx.fillStyle='#8a8a96';ctx.fillRect(px,py+10,30,16);
  ctx.fillStyle='#6e6e7a';ctx.fillRect(px,py+10,30,3);ctx.fillRect(px+2,py+22,26,4);
  ctx.fillStyle='#3f7fc4';ctx.fillRect(px+5,py+14,20,7);
  ctx.fillStyle='#5d9bd8';if((game.time*2|0)%2)ctx.fillRect(px+8,py+16,6,2);
  ctx.fillStyle='#6e4218';ctx.fillRect(px+2,py-4,4,16);ctx.fillRect(px+24,py-4,4,16);
  ctx.fillStyle='#b04a3a';ctx.fillRect(px-2,py-10,34,8);
  ctx.fillStyle='#8e3a2e';ctx.fillRect(px-2,py-4,34,3);
}
function drawMailbox(){
  const o=WOBJ.mailbox,px=o.x-cam.x|0,py=o.y-cam.y|0;
  ctx.fillStyle='#6e4218';ctx.fillRect(px+2,py+4,3,10);
  ctx.fillStyle='#c0392b';ctx.fillRect(px-2,py-4,12,8);
  ctx.fillStyle='#8e2a20';ctx.fillRect(px-2,py-4,12,2);
  ctx.fillStyle='#ffd84d';ctx.fillRect(px+6,py-1,3,2);
  if(game.quest===3){
    const byy=py-12+Math.sin(game.time*3)*1.5;
    ctx.fillStyle='#fff';ctx.fillRect(px-1,byy|0,10,7);
    ctx.fillStyle='#e0a040';ctx.fillRect(px-1,byy|0,10,1);ctx.fillRect(px+3,byy+3|0,2,1);
  }
}
function drawChest(){
  const o=WOBJ.chest,px=o.x-cam.x|0,py=o.y-cam.y|0;
  ctx.fillStyle=game.chestOpened?'#8c5a2b':'#b3661f';ctx.fillRect(px,py,12,10);
  ctx.fillStyle='#6e4218';ctx.fillRect(px,py,12,3);
  ctx.fillStyle='#ffd84d';ctx.fillRect(px+5,py+4,2,3);
  if(!game.chestOpened&&(game.time*2|0)%2){ctx.fillStyle='#fff';ctx.fillRect(px+10,py-3,2,2);}
}
function drawBush(){
  const o=WOBJ.bush,px=o.x-cam.x|0,py=o.y-cam.y|0;
  ctx.fillStyle='#3f8a3c';ctx.fillRect(px,py+4,16,10);ctx.fillRect(px+2,py,12,6);
  ctx.fillStyle='#2f6b24';ctx.fillRect(px+3,py+6,4,3);ctx.fillRect(px+10,py+3,4,3);
  if(game.bushJump<3&&(game.time*1.5|0)%2){ctx.fillStyle='#fff';ctx.fillRect(px+12,py-3,2,2);ctx.fillRect(px+2,py-1,1,1);}
}
function drawCat(){
  const px=cat.x-cam.x|0,py=cat.y-cam.y|0;
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(px,py+10,14,2);
  const im=img('cat');
  if(im){
    let sx=0, sy=CAT_F.sitY;
    if(cat.state==='walk'){ sy=CAT_F.walkRow*32; sx=(cat.frame%4)*32; }
    else if(cat.state==='sleep'){ sy=CAT_F.sleepY; sx=((game.time/1.2|0)%2)*32; }
    drawSprite(ctx,im,sx,sy,32,32, px-8, py-18, cat.flip);
    if(cat.followT>0&&(game.time*2|0)%2){ /* 跟随时头顶小爱心 */
      ctx.fillStyle='#e0457b';ctx.fillRect(px+4,py-24,2,2);ctx.fillRect(px+8,py-24,2,2);ctx.fillRect(px+4,py-22,6,2);ctx.fillRect(px+6,py-20,2,1);
    }
    return;
  }
  blit(ctx,CAT,px,py-((game.time*1.2|0)%2===0?0:1),cat.flip);
}
function drawChickenE(){
  const px=chicken.x-cam.x|0,py=chicken.y-cam.y|0;
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(px+2,py+10,10,2);
  const im=img('chicken');
  if(im){ /* 16x16帧, 原始朝右, 向左走时翻转 */
    const fi=chicken.pause?0:(game.time*5|0)%2;
    drawSprite(ctx,im,fi*16,0,16,16,px,py-4,chicken.dir===1);
    return;
  }
  blit(ctx,CHICKEN,px,py-(chicken.pause?0:(game.time*6|0)%2),chicken.dir===1);
}
function drawChar(c,role,npc){
  const px=c.x-cam.x|0,py=c.y-cam.y|0;
  const z=npc?0:player.z*0.22;
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(px+2,py+14,8,2);
  const im=charImgFor(role);
  if(im){
    /* 星露谷行走图: 16x32, 角色脚底对齐原碰撞盒底部 */
    const row=charRow(c.dir,c.flip);
    const fi=npc?0:(player.moving?player.frameI:0);
    ctx.drawImage(im, fi*16, row*32, 16,32, px-2, (py-16-z)|0, 16,32);
  }else{
    const sheet=SPRITES[role];
    const dirMap=sheet[c.dir]||sheet.down;
    ctx.drawImage(getFrame(npc?dirMap.A:dirMap[player.frame],c.flip),px,py-z|0);
  }
  if(npc){
    const byy=py-26+Math.sin(partner.bob*2.4)*1.5;
    ctx.fillStyle='#e0457b';ctx.fillRect(px+4,byy|0,2,2);ctx.fillRect(px+7,byy|0,2,2);ctx.fillRect(px+4,byy+2|0,5,2);ctx.fillRect(px+5,byy+4|0,3,1);
  }
}
function drawTree(px,py,h){
  /* 三种树按位置哈希混栽：橡树/枫树/松树 */
  const im=img(['tree','tree2','tree3'][h%3])||img('tree');
  if(im){ ctx.drawImage(im, px-16, py-80); return; }   // 48x96, 树干底对齐地块
  ctx.fillStyle='#6e4218';ctx.fillRect(px+6,py+2,4,12);
  ctx.fillStyle=h%3?'#3a7a2c':'#2f6b24';ctx.fillRect(px-2,py-12,20,12);
  ctx.fillStyle='#4c9b3c';ctx.fillRect(px,py-16,16,8);ctx.fillRect(px+2,py-18,12,4);
  ctx.fillStyle='#2f6b24';ctx.fillRect(px+2,py-6,4,3);ctx.fillRect(px+10,py-10,4,3);
  if(h%5===0){ctx.fillStyle='#ff7daa';ctx.fillRect(px+4,py-14,2,2);ctx.fillRect(px+11,py-9,2,2);}
}

/* —— 博物馆内景陈设：矿物大展架 + 4油画(上墙) + 8圆桌展台(中央) + 家具 —— */
function drawMuseumInt(ents){
  /* 上墙正中：矿物大展架(128宽, 底边落在墙脚) */
  ents.push({y:-997,draw(){
    const im=img('shelfBig'); if(!im)return;
    ctx.drawImage(im,(26*TILE-im.width)/2-cam.x|0, 50-im.height-cam.y|0);
  }});
  /* 金柱一对立在大展架两侧的地面上(不贴墙) */
  ents.push({y:3.9*TILE,draw(){
    const im=img('pillar'); if(!im)return;
    const cx_=(26*TILE)/2;
    ctx.drawImage(im,cx_-64-16-6-cam.x|0,(3.9*TILE-im.height)-cam.y|0);
    ctx.drawImage(im,cx_+64+6-cam.x|0,(3.9*TILE-im.height)-cam.y|0);
  }});
  /* 油画展位 1-4（上墙, 矿架两侧） */
  EX_WALL_PX.forEach(([ex_,ey_],i)=>{
    const px=ex_-cam.x|0, py=ey_-cam.y|0;
    const pk=img(MUSEUM_PAINTS[i]), has=!!RT.museum[i];
    ents.push({y:-996,draw(){
      if(pk){ ctx.drawImage(pk,px,py); }
      else{
        ctx.fillStyle='#6e4218';ctx.fillRect(px-2,py-2,30,26);
        ctx.fillStyle='#fdf3dc';ctx.fillRect(px,py,26,22);
        ctx.fillStyle=['#ff9eb5','#7dc4ff','#ffd84d','#5a6fb0'][i];
        ctx.fillRect(px+3,py+3,20,14);
      }
      if(has&&(game.time*2|0)%2){ctx.fillStyle='rgba(255,255,255,.8)';ctx.fillRect(px+2,py-4,2,2);}
    }});
  });
  /* 中央两排圆木桌展台 5-12：已布展的桌上摆放展品并闪光 */
  EX_TBL.forEach(([tx,ty],i)=>{
    const px=tx*TILE-cam.x|0,py=ty*TILE-cam.y|0;
    const tb=img('tableRound'), has=!!RT.museum[4+i];
    ents.push({y:ty*TILE+32,draw(){
      if(tb)ctx.drawImage(tb,px,py-4);
      else{
        ctx.fillStyle='#a8743c';ctx.fillRect(px+2,py,40,22);
        ctx.fillStyle='#8c5a2b';ctx.fillRect(px+6,py+22,6,8);ctx.fillRect(px+32,py+22,6,8);
      }
      if(has){ /* 桌上展品：金色小物 + 闪光 */
        ctx.fillStyle='#b3661f';ctx.fillRect(px+17,py+2,10,3);
        ctx.fillStyle='#ffd84d';ctx.fillRect(px+19,py-4,6,6);
        ctx.fillStyle='#fff';ctx.fillRect(px+21,py-2,2,2);
        if(((game.time*2|0)+i)%2===0){ctx.fillStyle='#fff';ctx.fillRect(px+30,py-8,2,2);}
      }
    }});
  });
  /* 家具：书架/海兽骨架/盆栽（贴地摆放） */
  for(const k in MOBJ){
    const o=MOBJ[k], im=img(o.img);
    ents.push({y:o.y+o.h,draw(){
      if(im)ctx.drawImage(im, o.x-cam.x|0, (o.y+o.h-im.height)-cam.y|0);
    }});
  }
  /* 中央走道椭圆地毯 */
  ents.push({y:-994,draw(){
    const im=img('rugOval'); if(!im)return;
    ctx.drawImage(im,(26*TILE-im.width)/2-cam.x|0,7.8*TILE-cam.y|0);
  }});
}
/* —— 殿堂内景陈设 —— */
function drawHallInt(ents){
  /* 舞台拱门 */
  ents.push({y:6*TILE,draw(){
    const px=11*TILE-cam.x|0,py=3*TILE-cam.y|0;
    ctx.fillStyle='#e8d5a8';ctx.fillRect(px,py,6,46);ctx.fillRect(px+58,py,6,46);
    ctx.fillStyle='#3f8a3c';ctx.fillRect(px-4,py-8,72,8);ctx.fillRect(px+2,py-13,60,6);
    const fc=['#ff7daa','#ffd84d','#fff','#ff5c8a'];
    for(let i=0;i<9;i++){ctx.fillStyle=fc[i%4];ctx.fillRect(px+i*8,py-10+(i%2)*4,4,4);}
  }});
  /* 自助宴会长桌 / 五月柱（节日素材） */
  for(const k of ['buffetL','buffetR','poleL','poleR']){
    const o=HOBJ[k], im=img(o.img);
    ents.push({y:o.y+o.h,draw(){
      if(im)ctx.drawImage(im, o.x-cam.x|0, (o.y+o.h-im.height)-cam.y|0);
      else{ctx.fillStyle='#c0392b';ctx.fillRect(o.x-cam.x|0,o.y-cam.y|0,o.w,o.h);}
    }});
  }
  /* 粉树/花箱装饰（无碰撞） */
  HDECOR.forEach(d=>{
    const im=img(d.img);
    ents.push({y:d.y+14,draw(){
      if(im)ctx.drawImage(im, d.x-cam.x|0, (d.y+14-im.height)-cam.y|0);
    }});
  });
  /* 钢琴 */
  ents.push({y:HOBJ.piano.y+26,draw(){
    const o=HOBJ.piano,px=o.x-cam.x|0,py=o.y-cam.y|0;
    ctx.fillStyle='#2b2b34';ctx.fillRect(px,py,38,22);
    ctx.fillStyle='#1b1b22';ctx.fillRect(px,py,38,5);
    ctx.fillStyle='#fff';for(let i=0;i<9;i++)ctx.fillRect(px+2+i*4,py+14,3,7);
    ctx.fillStyle='#2b2b34';for(let i=0;i<8;i++)ctx.fillRect(px+4+i*4,py+14,2,4);
  }});
  /* 香槟塔 */
  ents.push({y:HOBJ.tower.y+30,draw(){
    const o=HOBJ.tower,px=o.x-cam.x|0,py=o.y-cam.y|0;
    ctx.fillStyle='#fdf3dc';ctx.fillRect(px,py+22,30,8);
    ctx.fillStyle='#d9bd85';ctx.fillRect(px,py+27,30,3);
    ctx.fillStyle='rgba(180,220,255,.85)';
    for(let r=0;r<4;r++)for(let i=0;i<=r;i++)ctx.fillRect(px+13-r*4+i*8,py+16-r*5,4,5);
    if((game.time*3|0)%2){ctx.fillStyle='#fff';ctx.fillRect(px+13,py-2,2,2);}
  }});
  /* 蛋糕 */
  ents.push({y:HOBJ.cake.y+24,draw(){
    const o=HOBJ.cake,px=o.x-cam.x|0,py=o.y-cam.y|0;
    ctx.fillStyle='#fdf3dc';ctx.fillRect(px,py+16,30,8);
    ctx.fillStyle='#fff';ctx.fillRect(px+4,py+8,22,8);ctx.fillRect(px+8,py+2,14,7);
    ctx.fillStyle='#ff9eb5';ctx.fillRect(px+4,py+8,22,3);ctx.fillRect(px+8,py+2,14,2);
    ctx.fillStyle='#e0457b';ctx.fillRect(px+13,py-4,2,4);ctx.fillRect(px+16,py-4,2,4);
  }});
  /* 礼花筒 */
  for(const k of ['popperL','popperR']) ents.push({y:HOBJ[k].y+16,draw(){
    const o=HOBJ[k],px=o.x-cam.x|0,py=o.y-cam.y|0;
    ctx.fillStyle='#e8943a';ctx.fillRect(px+2,py+4,8,12);
    ctx.fillStyle='#c0392b';ctx.fillRect(px,py,12,6);
    if((game.time*2|0)%2){ctx.fillStyle='#ffd84d';ctx.fillRect(px+4,py-4,3,3);}
  }});
  /* 桌子 + 桌号 + 宾客高亮 */
  TABLE_POS.forEach(([tx,ty],i)=>{
    ents.push({y:ty*TILE+28,draw(){
      const px=tx*TILE-cam.x|0,py=ty*TILE-cam.y|0;
      const mine=GUEST&&String(i+1)===String(GUEST.table);
      ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(px+3,py+26,26,3);
      ctx.fillStyle='#fdfdff';ctx.fillRect(px+2,py+6,28,20);
      ctx.fillStyle='#e8e0ee';ctx.fillRect(px+2,py+22,28,4);
      ctx.fillStyle=mine?'#ffd84d':'#ff9eb5';ctx.fillRect(px+12,py+2,8,8);
      ctx.fillStyle='#5b2c0e';ctx.font='9px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillStyle='#fff';ctx.fillRect(px+11,py+12,10,9);
      ctx.fillStyle='#5b2c0e';ctx.fillText(String(i+1),px+16,py+17);
      if(mine){
        const byy=py-8+Math.sin(game.time*4)*2;
        ctx.fillStyle='#ffd84d';
        ctx.fillRect(px+13,byy|0,6,6);ctx.fillRect(px+15,byy+6|0,2,3);
        ctx.strokeStyle='rgba(255,216,77,.8)';ctx.lineWidth=2;
        ctx.strokeRect(px+1,py+4,30,24);
      }
    }});
  });
}

/* ============================================================
 * 世界绘制 + y 排序
 * ============================================================ */
function drawWorld(){
  const s=sc();
  if(s.type==='in'){ ctx.fillStyle='#171019'; ctx.fillRect(0,0,VW,VH); }
  drawTiles();
  const ents=[];
  if(game.scene==='world'){
    const x0=Math.max(0,cam.x/TILE|0),y0=Math.max(0,cam.y/TILE|0),
          x1=Math.min(s.w-1,(cam.x+VW)/TILE+1|0),y1=Math.min(s.h-1,(cam.y+VH)/TILE+2|0);
    const sdvTree=!!img('tree');
    for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){
      const tch=s.g[ty][tx];
      if(tch==='T'){
        /* 大树素材较宽：边界树墙隔一棵画一棵(碰撞不变)，避免过密 */
        const border=tx===0||ty===0||tx===s.w-1||ty===s.h-1;
        if(sdvTree&&border&&(tx+ty)%2)continue;
        ents.push({y:ty*TILE+TILE,draw:((a,b,c)=>()=>drawTree(a,b,c))(tx*TILE-cam.x|0,ty*TILE-cam.y|0,hash(tx,ty))});
      }
      else if(tch==='B'){ /* 开花灌木(可跳越) */
        ents.push({y:ty*TILE+TILE,draw:((a,b)=>()=>{
          const im=img('bushFl');
          if(im)ctx.drawImage(im,a-8,b-14);
          else{ctx.fillStyle='#3f8a3c';ctx.fillRect(a,b,16,14);ctx.fillStyle='#ff9eb5';ctx.fillRect(a+4,b+3,3,3);ctx.fillRect(a+10,b+6,3,3);}
        })(tx*TILE-cam.x|0,ty*TILE-cam.y|0)});
      }
    }
    BUILDINGS.forEach(b=>ents.push({y:(b.y+b.h)*TILE,draw:()=>drawBuilding(b)}));
    WDECOR.forEach(d=>ents.push({y:d.y+d.h,draw:()=>{
      const im=img(d.img);
      if(im)ctx.drawImage(im, d.x-cam.x|0, (d.y+d.h-im.height)-cam.y|0);
    }}));
    ents.push({y:WOBJ.well.y+28,draw:drawWell});
    ents.push({y:WOBJ.mailbox.y+12,draw:drawMailbox});
    ents.push({y:WOBJ.chest.y+10,draw:drawChest});
    ents.push({y:WOBJ.bush.y+14,draw:drawBush});
    ents.push({y:cat.y+12,draw:drawCat});
    ents.push({y:chicken.y+12,draw:drawChickenE});
  }
  if(game.scene==='museum')drawMuseumInt(ents);
  if(game.scene==='hall')drawHallInt(ents);
  if(partner.scene===game.scene&&game.quest<6)
    ents.push({y:partner.y+16,draw:()=>drawChar(partner,partner.role,true)});
  ents.push({y:player.y+16,draw:()=>drawChar(player,game.playerRole,false)});
  ents.sort((a,b)=>a.y-b.y).forEach(e=>e.draw());
  drawMarker();
}

/* ============================================================
 * 任务目标 + 指引
 * ============================================================ */
function questTarget(){
  switch(game.quest){
    case 0: return {scene:'world', x:partner.x+6, y:partner.y-14};
    case 1:
      if(!game.hasCan) return {scene:'world', x:WOBJ.well.x+15, y:WOBJ.well.y-16};
      return {scene:'world', x:11.5*TILE, y:7*TILE};
    case 2:
      if(!game.rod||game.bait<=0) return {scene:'world', x:15*TILE, y:20*TILE};   // 先去杂货店购置
      return {scene:'world', x:29.5*TILE, y:7*TILE};
    case 3: return {scene:'world', x:WOBJ.mailbox.x+4, y:WOBJ.mailbox.y-20};
    case 4: return {scene:'museum', x:13*TILE, y:5*TILE};
    case 5: return {scene:'hall', x:12.5*TILE, y:6*TILE};
    default: return null;
  }
}
function drawMarker(){
  let t=questTarget();if(!t)return;
  if(t.scene!==game.scene)t=Object.assign({},routeDoor(game.scene,t.scene),{viaDoor:1});
  const px=t.x-cam.x|0,py=(t.y-cam.y+Math.sin(game.time*4)*2)|0;
  if(px<-8||py<-8||px>VW+8||py>VH+8)return;
  ctx.fillStyle='#ffd84d';
  ctx.fillRect(px-1,py-8,3,6);ctx.fillRect(px-1,py,3,2);
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(px-2,py-9,1,8);ctx.fillRect(px+2,py-9,1,8);
}
const edgeArrow=document.getElementById('edgeArrow');
function updateArrow(){
  let t=questTarget();
  if(!t||game.mode!=='play'){edgeArrow.style.display='none';return;}
  if(t.scene!==game.scene)t=routeDoor(game.scene,t.scene);
  const sx=(t.x-cam.x)*SCALE,sy=(t.y-cam.y)*SCALE;
  const m=30,w=lastW,h=lastH;
  if(sx>m&&sx<w-m&&sy>m&&sy<h-m){edgeArrow.style.display='none';return;}
  const cxx=w/2,cyy=h/2;
  const ang=Math.atan2(sy-cyy,sx-cxx);
  const rx=Math.min(cxx-26,Math.abs((cxx-26)/Math.cos(ang)||1e9)),
        ry=Math.min(cyy-26,Math.abs((cyy-26)/Math.sin(ang)||1e9));
  const rr=Math.min(rx/Math.abs(Math.cos(ang)||1e-9),ry/Math.abs(Math.sin(ang)||1e-9),Math.hypot(cxx,cyy));
  let ex=cxx+Math.cos(ang)*Math.min(rr,Math.hypot(sx-cxx,sy-cyy)),
      ey=cyy+Math.sin(ang)*Math.min(rr,Math.hypot(sx-cxx,sy-cyy));
  ex=Math.max(26,Math.min(w-26,ex));ey=Math.max(70,Math.min(h-26,ey));
  edgeArrow.style.display='block';
  edgeArrow.style.left=(ex-11)+'px';edgeArrow.style.top=(ey-9)+'px';
  edgeArrow.style.transform=`rotate(${ang*180/Math.PI+90}deg)`;
}

/* ============================================================
 * 主循环
 * ============================================================ */
let lastT=0;
function loop(t){
  const dt=Math.min(0.05,(t-lastT)/1000||0);lastT=t;
  const _r=cv.getBoundingClientRect();
  if(lastW!==_r.width||lastH!==_r.height){resize();updateCam();}
  update(dt);
  if(game.mode!=='title'){ctx.clearRect(0,0,VW,VH);drawWorld();}
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ============================================================
 * 音频
 * ============================================================ */
let actx=null,bgmOn=false,sfxOn=true,loopTimer=null;
const BPM=152,BEAT=60/BPM;
const fq=m=>440*Math.pow(2,(m-69)/12);
const MELODY=[[64,1],[67,1],[72,1],[71,1.5],[69,.5],[67,1],[69,1],[67,1],[64,1],[67,3],
              [64,1],[67,1],[72,1],[74,1.5],[76,.5],[74,1],[72,1],[69,1],[71,1],[72,3]];
const BASSL=[[48,55,55],[43,50,50],[45,52,52],[48,55,55],[48,55,55],[43,50,50],[41,48,53],[48,52,55]];
function tone(type,midi,t,dur,vol){
  const o=actx.createOscillator(),gg=actx.createGain();
  o.type=type;o.frequency.value=fq(midi);
  gg.gain.setValueAtTime(0,t);
  gg.gain.linearRampToValueAtTime(vol,t+.02);
  gg.gain.setValueAtTime(vol,t+dur*.6);
  gg.gain.linearRampToValueAtTime(0,t+dur*.95);
  o.connect(gg).connect(actx.destination);
  o.start(t);o.stop(t+dur);
}
function ensureCtx(){if(!actx)actx=new (window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume();}
function bgmLoop(){
  let t=actx.currentTime+.05;const t0=t;
  MELODY.forEach(([m,b])=>{if(m)tone('square',m,t,b*BEAT,.04);t+=b*BEAT;});
  BASSL.forEach((bar,bi)=>{const bt=t0+bi*3*BEAT;bar.forEach((m,i)=>tone('triangle',m,bt+i*BEAT,BEAT*.9,i===0?.06:.035));});
  loopTimer=setTimeout(bgmLoop,(t-t0-.15)*1000);
}
function toggleBgm(force){
  const want=force!==undefined?force:!bgmOn;
  if(want&&!bgmOn){ensureCtx();bgmOn=true;bgmLoop();}
  else if(!want&&bgmOn){bgmOn=false;clearTimeout(loopTimer);}
  document.getElementById('bgmBtn').textContent=bgmOn?'♪':'✕';
}
document.getElementById('bgmBtn').addEventListener('click',()=>toggleBgm());
function sfx(name){
  if(!actx||!sfxOn)return;
  const t=actx.currentTime;
  if(name==='blip')tone('square',86,t,.05,.03);
  else if(name==='jump'){tone('square',70,t,.06,.04);tone('square',77,t+.06,.08,.04);}
  else if(name==='plant'){tone('triangle',60,t,.06,.06);tone('triangle',67,t+.07,.08,.05);}
  else if(name==='water'){tone('sine',55,t,.1,.06);tone('sine',52,t+.08,.12,.05);}
  else if(name==='harvest'){[72,76,79].forEach((m,i)=>tone('square',m,t+i*.07,.09,.045));}
  else if(name==='quest'){[60,64,67,72].forEach((m,i)=>tone('square',m,t+i*.09,.12,.05));}
  else if(name==='choice')tone('square',79,t,.06,.04);
  else if(name==='coin'){tone('square',88,t,.05,.04);tone('square',93,t+.05,.08,.04);}
  else if(name==='piano'){[60,64,67,72,76].forEach((m,i)=>tone('sine',m,t+i*.12,.4,.06));}
  else if(name==='pop'){tone('square',96,t,.04,.05);tone('square',60,t+.03,.1,.04);}
  else if(name==='fanfare'){[60,64,67,72,76,79,84].forEach((m,i)=>tone('square',m,t+i*.1,.16,.05));[48,52,55,60].forEach((m,i)=>tone('triangle',m,t+i*.2,.3,.06));}
}

/* ============================================================
 * UI 工具
 * ============================================================ */
function toast(msg){
  const d=document.createElement('div');
  d.className='toast';d.innerHTML=msg;
  document.getElementById('toasts').appendChild(d);
  setTimeout(()=>d.remove(),3200);
}
const HEARTC=['%23e0457b','%23ff7daa','%23f0a94e','%23a06ee0'];
function flyHearts(x,y,n){
  for(let i=0;i<n;i++){
    const h=document.createElement('div');
    h.className='fly-heart';
    const c=HEARTC[Math.random()*HEARTC.length|0],sz=12+Math.random()*12;
    h.style.cssText=`left:${x-sz/2+(Math.random()*40-20)}px;top:${y-sz/2}px;width:${sz}px;height:${sz}px;animation-delay:${i*.07}s;`+
      `background:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 13 12" shape-rendering="crispEdges"><path fill="${c}" d="M2 1h3v1h1v1h1V2h1V1h3v1h1v3h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v-1H4V9H3V8H2V7H1V6H0V2h1V1h1z"/></svg>') no-repeat center/contain`;
    document.body.appendChild(h);
    setTimeout(()=>h.remove(),1500);
  }
}
function confetti(n){
  const colors=['#e0457b','#ffd84d','#7dc4ff','#a06ee0','#ff8a5c','#7ec850'];
  for(let i=0;i<n;i++){
    const d=document.createElement('div');
    d.className='confetti';
    const sz=4+Math.random()*5;
    d.style.cssText=`left:${Math.random()*100}vw;width:${sz}px;height:${sz*1.4}px;background:${colors[i%colors.length]};animation-duration:${2.2+Math.random()*2.5}s;animation-delay:${Math.random()*1.2}s`;
    document.body.appendChild(d);
    setTimeout(()=>d.remove(),6000);
  }
}
function fade(b){document.getElementById('fade').style.opacity=b?1:0;}

/* ============================================================
 * 对话系统
 * ============================================================ */
const dlg={el:document.getElementById('dialog'),txt:document.getElementById('dlgText'),
  name:document.getElementById('dlgName'),choices:document.getElementById('dlgChoices'),
  next:document.getElementById('dlgNext'),queue:[],idx:0,typing:false,full:'',onDone:null,timer:null};
function portraitFor(who){
  portraitInto(document.querySelector('#dlgPortrait canvas'), who);
}
function nameFor(who){return who==='groom'?CONFIG.groom:who==='bride'?CONFIG.bride:who==='cat'?'小猫':'小鸡';}
function startDialog(lines,onDone){
  game.mode='dialog';
  dlg.queue=lines;dlg.idx=0;dlg.onDone=onDone||null;
  dlg.el.style.display='block';
  showLine();
}
function showLine(){
  const line=dlg.queue[dlg.idx];
  dlg.choices.style.display='none';dlg.choices.innerHTML='';dlg.next.style.display='none';
  const who=line.who==='me'?game.playerRole:line.who;
  portraitFor(who);
  dlg.name.textContent=line.who==='me'?nameFor(game.playerRole)+'（你）':nameFor(line.who);
  dlg.full=line.text;dlg.txt.textContent='';
  dlg.typing=true;
  let i=0;
  clearInterval(dlg.timer);
  dlg.timer=setInterval(()=>{
    dlg.txt.textContent=dlg.full.slice(0,++i);
    if(i%3===0)sfx('blip');
    if(i>=dlg.full.length){clearInterval(dlg.timer);dlg.typing=false;endOfLine(line);}
  },26);
}
function endOfLine(line){
  if(line.choices){
    dlg.choices.style.display='flex';
    line.choices.forEach((c,ci)=>{
      const b=document.createElement('button');
      b.textContent='» '+c[0];
      b.onclick=e=>{e.stopPropagation();sfx('choice');line.onPick&&line.onPick(ci);advance();};
      dlg.choices.appendChild(b);
    });
  }else dlg.next.style.display='block';
}
function advance(){
  dlg.idx++;
  if(dlg.idx>=dlg.queue.length){
    dlg.el.style.display='none';
    game.mode='play';
    const cb=dlg.onDone;dlg.onDone=null;
    cb&&cb();
  }else showLine();
}
document.getElementById('dlgBox').addEventListener('click',()=>{
  const line=dlg.queue[dlg.idx];
  if(dlg.typing){clearInterval(dlg.timer);dlg.txt.textContent=dlg.full;dlg.typing=false;endOfLine(line);}
  else if(!line.choices)advance();
});

/* ============================================================
 * 浮层
 * ============================================================ */
const overlay=document.getElementById('overlay'),overlayInner=document.getElementById('overlayInner');
let overlayOnClose=null;
function showOverlay(html,onClose,btnText){
  game.mode='ui';
  overlayOnClose=onClose||null;
  overlayInner.innerHTML=html+`<div class="center ok"><button class="sdv-btn" id="ovOk">${btnText||'继续 ▶'}</button></div>`;
  overlay.style.display='flex';
  document.getElementById('ovOk').onclick=()=>{
    overlay.style.display='none';
    game.mode='play';
    const cb=overlayOnClose;overlayOnClose=null;
    cb&&cb();
  };
}
function coupleHTML(){
  return `<h3>♥ 新人介绍 ♥</h3>
  <div class="couple-row">
    <div><div class="frame"><canvas class="pcg" width="64" height="64"></canvas></div>
      <div class="nm">${CONFIG.groom}</div><div class="ds">${CONFIG.groomDesc}</div></div>
    <span class="px-heart"></span>
    <div><div class="frame"><canvas class="pcb" width="64" height="64"></canvas></div>
      <div class="nm">${CONFIG.bride}</div><div class="ds">${CONFIG.brideDesc}</div></div>
  </div>`;
}
function infoHTML(){
  return `<h3>✦ 婚礼信息 ✦</h3>
  <div class="info-row"><div class="info-ico">日</div><div>${CONFIG.dateDetail}</div></div>
  <div class="info-row"><div class="info-ico">时</div><div>${CONFIG.timeDetail}</div></div>
  <div class="info-row"><div class="info-ico">地</div><div>${CONFIG.place}</div></div>
  <div class="info-row"><div class="info-ico">话</div><div>${CONFIG.phone}</div></div>
  <div class="countdown" data-cd="1">
    <div class="cd-cell"><b class="cdD">--</b><span>天</span></div>
    <div class="cd-cell"><b class="cdH">--</b><span>时</span></div>
    <div class="cd-cell"><b class="cdM">--</b><span>分</span></div>
    <div class="cd-cell"><b class="cdS">--</b><span>秒</span></div>
  </div>`;
}
function letterHTML(){
  return `<h3>✉ 邀请函 ✉</h3>
  <div class="letter-paper">${CONFIG.letterHTML}
  <div class="sign">${CONFIG.groom} &amp; ${CONFIG.bride}<br>敬邀</div></div>`;
}
function scheduleHTML(){
  return `<h3>⚑ 当日流程 ⚑</h3>`+
    CONFIG.schedule.map(([t,w])=>`<div class="tl-row"><div class="tl-time">${t}</div><div class="tl-what">${w}</div></div>`).join('');
}
function seatHTML(){
  if(!GUEST)return '';
  return `<div class="seat-card">🎫 ${esc(GUEST.name)}，您的桌位是 <b>${esc(GUEST.table)} 号桌</b><br>
  <span style="font-size:12px;color:#8a5a2b">婚礼殿堂里有金色标记，当天凭此入座～</span></div>`;
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function drawOverlayPortraits(){
  document.querySelectorAll('.pcg').forEach(c=>portraitInto(c,'groom'));
  document.querySelectorAll('.pcb').forEach(c=>portraitInto(c,'bride'));
}
const target=new Date(CONFIG.weddingISO).getTime();
const pad2=n=>String(n).padStart(2,'0');
setInterval(()=>{
  const diff=target-Date.now();
  document.querySelectorAll('[data-cd]').forEach(cd=>{
    if(diff<=0){cd.innerHTML='<div style="font-size:16px;color:var(--red)">♥ 今天就是大喜之日 ♥</div>';return;}
    cd.querySelector('.cdD').textContent=Math.floor(diff/864e5);
    cd.querySelector('.cdH').textContent=pad2(Math.floor(diff/36e5)%24);
    cd.querySelector('.cdM').textContent=pad2(Math.floor(diff/6e4)%60);
    cd.querySelector('.cdS').textContent=pad2(Math.floor(diff/1e3)%60);
  });
},500);

/* ============================================================
 * 物品栏 / 记忆碎片
 * ============================================================ */
function updateItemBar(){
  const bar=document.getElementById('itemBar');
  const chips=[`💰${game.coins}`];
  if(game.seeds)chips.push(`🌱${game.seeds}`);
  if(game.hasCan)chips.push(`💧${game.water}/3`);
  if(game.fert)chips.push(`💜${game.fert}`);
  if(game.feed)chips.push(`🌾${game.feed}`);
  if(game.eggs)chips.push(`🥚${game.eggs}`);
  if(game.flowers)chips.push(`🌼${game.flowers}`);
  if(game.bait)chips.push(`🪱${game.bait}`);
  if(game.quest===1||game.fruits)chips.push(`🌻${Math.min(game.fruits,3)}/3${game.fruits>3?'+'+(game.fruits-3):''}`);
  if(game.fishN)chips.push(`🐟${game.fishN}`);
  if(game.fishQ)chips.push(`💞鱼`);
  bar.innerHTML=chips.map(c=>`<span class="chip">${c}</span>`).join('');
}
function maybeFrag(prob,after){
  const left=RT.frags.map((f,i)=>i).filter(i=>!game.fragGot.includes(i));
  if(!left.length||Math.random()>prob){after&&after();return;}
  const i=left[Math.random()*left.length|0];
  game.fragGot.push(i);
  const f=RT.frags[i];
  sfx('quest');
  showOverlay(
    `<h3>💫 收获了一片记忆碎片</h3>
     ${f.img?`<img class="exhibit-img" src="${esc(resolveImg(f.img))}" onerror="this.style.display='none'">`:''}
     <div class="frag-card">${esc(f.text)}</div>
     <div class="center" style="margin-top:8px;font-size:12px;color:#8a5a2b">已收集 ${game.fragGot.length} / ${RT.frags.length} · 在 📜 里可回看</div>`,
    after,'收下 ♥');
}

/* ============================================================
 * 任务
 * ============================================================ */
const QUEST_TEXTS=[
  ()=>`找 ${nameFor(partnerRole())} 聊聊（东南花田，跟着箭头走）`,
  ()=>game.hasCan?`种 3 颗向日葵 → 浇水 → 收获（喂猫可得天然肥料加速）`:`先去水井边找回水壶，再种向日葵`,
  ()=>(game.rod&&game.bait>0)?`去湖边木栈道尽头钓「同心鱼」（按住 A 控制绿区）`:`去杂货店购置鱼竿(12金)和鱼饵(2金)，卖蛋/卖花能凑钱`,
  ()=>`红色邮箱有一封信，去查收`,
  ()=>`去镇上的「博物馆」逛逛我们的回忆`,
  ()=>`前往南边「婚礼殿堂」，走上舞台举行仪式！`,
  ()=>`婚礼达成 ♥ 殿堂里还有桌位和互动，点 📜 重看请帖`,
];
function partnerRole(){return game.playerRole==='groom'?'bride':'groom';}
function setQuest(q){
  game.quest=q;
  document.getElementById('questText').textContent=QUEST_TEXTS[q]();
  const prog=document.getElementById('progress');
  prog.innerHTML='';
  for(let i=0;i<6;i++){const d=document.createElement('div');d.className='ph'+(i<q?' on':'');prog.appendChild(d);}
  if(q>0)sfx('quest');
  updateItemBar();
}

/* ============================================================
 * 互动派发
 * ============================================================ */
function facingPoint(){
  const cxx=player.x+6,cyy=player.y+12;
  if(player.dir==='up')return [cxx,cyy-14];
  if(player.dir==='down')return [cxx,cyy+10];
  return [cxx+(player.flip?-14:14),cyy];
}
function near(e,r){const[fx,fy]=facingPoint();return Math.hypot(e.x+6-fx,e.y+8-fy)<r||Math.hypot(e.x+6-(player.x+6),e.y+8-(player.y+8))<r;}
function inRect(px,py,o,pad){return px>=o.x-pad&&px<o.x+o.w+pad&&py>=o.y-pad&&py<o.y+o.h+pad;}
function interact(){
  ensureCtx();
  const[fx,fy]=facingPoint();
  if(game.scene==='world'){
    if(partner.scene==='world'&&near(partner,22))return talkPartner();
    if(near(chicken,18))return talkChicken();
    if(near(cat,20))return talkCat();
    if(inRect(fx,fy,WOBJ.mailbox,8)||inRect(player.x+6,player.y+12,WOBJ.mailbox,10))return openMailbox();
    if(inRect(fx,fy,WOBJ.chest,8))return openChest();
    if(inRect(fx,fy,WOBJ.well,8))return useWell();
    if(inRect(fx,fy,WOBJ.bush,6))return pokeBush();
    /* 建筑门 */
    for(const b of BUILDINGS){
      const door=bldDoorRect(b);
      if(inRect(fx,fy,door,4)||inRect(player.x+6,player.y+12,door,6))return doorAction(b);
    }
    /* 觅食灌木(谷粒) / 野花采摘 */
    const t=tileAt(fx,fy), tx=fx/TILE|0, ty=fy/TILE|0;
    if(t==='G')return forageBush(tx,ty);
    if(t==='F')return pickFlower(tx,ty);
    /* 湖边/栈道 */
    if(t==='~'){
      if(tileAt(player.x+6,player.y+12)==='='&&player.dir==='up')return tryFish();
      return fillCan('湖');
    }
    /* 耕地 */
    const key=tx+','+ty;
    const myKey=((player.x+6)/TILE|0)+','+((player.y+12)/TILE|0);
    const k=plots[key]?key:(plots[myKey]?myKey:null);
    if(k)return farmAction(k);
  }
  else if(game.scene==='museum'){
    if(partner.scene==='museum'&&near(partner,24))return talkPartner();
    /* 展品：上墙油画(1-4) / 圆桌展台(5-12) 取面前点最近 */
    let idx=-1,best=26;
    EX_WALL_PX.forEach(([ex,ey],i)=>{
      if(fy>4.2*TILE)return;
      const d=Math.abs(fx-(ex+14));
      if(d<best){best=d;idx=i;}
    });
    EX_TBL.forEach(([ex,ey],i)=>{
      const d=Math.hypot(fx-(ex*TILE+22),fy-(ey*TILE+16));
      if(d<30&&d<best){best=d;idx=4+i;}
    });
    if(idx>=0){
      if(RT.museum[idx])return showExhibit(idx);
      return startDialog([{who:'me',text:'这张展台还空着，等待布展。（DEBUG 模式可以添加展品）'}]);
    }
    /* 家具小互动 */
    if(inRect(fx,fy,MOBJ.skel,6))return startDialog([{who:'me',text:'「远古海兽骨架」——据说是从矿井深处挖出来的。婚礼也要有镇馆之宝！'}]);
    if(inRect(fx,fy,MOBJ.bookL,6)||inRect(fx,fy,MOBJ.bookR,6))return startDialog([{who:'me',text:'书架上摆着我们读过的书。有一本的折角，停在第一次见面那天。'}]);
  }
  else if(game.scene==='hall'){
    if(partner.scene==='hall'&&near(partner,26))return talkPartner();
    if(inRect(fx,fy,HOBJ.piano,8))return playPiano();
    if(inRect(fx,fy,HOBJ.tower,8))return champagne();
    if(inRect(fx,fy,HOBJ.cake,8))return cakeBite();
    if(inRect(fx,fy,HOBJ.buffetL,6)||inRect(fx,fy,HOBJ.buffetR,6))return startDialog([{who:'me',text:'自助宴会桌摆满了喜宴菜——烤火鸡、果冻、还有星之果实甜点！'}]);
    if(inRect(fx,fy,HOBJ.poleL,6)||inRect(fx,fy,HOBJ.poleR,6)){sfx('quest');flyHearts(innerWidth/2,innerHeight/2,4);return toast('🎏 五月柱的彩带随风转了一圈');}
    if(inRect(fx,fy,HOBJ.popperL,8)||inRect(fx,fy,HOBJ.popperR,8))return popper();
    /* 桌子 */
    for(let i=0;i<TABLE_POS.length;i++){
      const[tx2,ty2]=TABLE_POS[i];
      if(inRect(fx,fy,{x:tx2*TILE,y:ty2*TILE,w:32,h:30},4))return tableInfo(i);
    }
    /* 舞台 */
    if(tileAt(fx,fy)==='S'||tileAt(player.x+6,player.y+12)==='S')return tryCeremony();
  }
}
/* —— 觅食灌木：采谷粒喂鸡 —— */
function forageBush(tx,ty){
  const key=tx+','+ty;
  if(forageT[key]&&game.time-forageT[key]<40)
    return startDialog([{who:'me',text:'这丛灌木刚被薅过，过一会儿再来吧。'}]);
  if(game.feed>=5)return toast('谷粒袋满了（5/5），先去喂鸡吧');
  forageT[key]=game.time;
  game.feed++;sfx('plant');updateItemBar();
  toast(`🌾 在灌木丛里翻到一把谷粒（${game.feed}/5）· 可以去喂鸡`);
}
/* —— 野花采摘：可卖钱 —— */
function pickFlower(tx,ty){
  const key=tx+','+ty;
  if(pickedF[key]&&game.time-pickedF[key]<60)
    return toast('这一株刚被摘过，等它再开');
  if(game.flowers>=9)return toast('野花已经抱不下了（9/9），去杂货店卖掉些吧');
  pickedF[key]=game.time;
  game.flowers++;sfx('plant');updateItemBar();
  flyHearts(innerWidth/2,innerHeight/2,1);
  toast(`🌼 摘下一朵野花（${game.flowers}/9）· 杂货店收购 2金/朵`);
}

/* —— 各互动实现 —— */
function doorAction(b){
  switch(b.door.act){
    case 'homeDoor': return startDialog([{who:'me',text:'这是我们婚后的小家。今天先不开放参观啦~'}]);
    case 'nbDoor':   return startDialog([{who:'me',text:'邻居家。门上贴着字条：「去喝喜酒了，不在家」。'}]);
    case 'shop':     return openShop();
    case 'enterMuseum': return gotoScene('museum',9.7*TILE,11.5*TILE);
    case 'enterHall':
      if(game.quest<5&&!DEBUG){startDialog([{who:'me',text:'殿堂的大门还没开。先把别的事办完吧（看顶部任务提示）。'}]);return;}
      return gotoScene('hall',12*TILE,16.5*TILE);
  }
}
function useWell(){
  /* 任务获取水壶：TA 把水壶忘在了井边 */
  if(!game.hasCan){
    if(game.quest<1)return startDialog([{who:'me',text:'井边挂着一只旧水壶…是 TA 的。先去花田找 TA 吧。'}]);
    game.hasCan=true;game.water=3;sfx('harvest');updateItemBar();
    return startDialog([{who:'me',text:'井边果然挂着 TA 说的那只旧水壶！壶身上还刻着我们俩的名字缩写。'}],()=>{
      toast('🏆 获得 <b style="color:#7dc4ff">刻字水壶</b>（已接满 3 格水）');
      setQuest(1);
    });
  }
  if(game.water>=3){
    game.wellWish++;
    if(game.wellWish===3){
      sfx('coin');toast('🏆 隐藏彩蛋：井底的愿望');
      return startDialog([{who:'me',text:'对着井许了第三次愿。井底好像传来回声：「祝你们百年好合」…谁在下面?!'}]);
    }
    return startDialog([{who:'me',text:'水壶是满的。对着井许了个愿。（再许几次试试？）'}]);
  }
  game.water=3;sfx('water');updateItemBar();
  toast('💧 水壶已接满（3 次浇水）');
}
function fillCan(src){
  if(!game.hasCan)return startDialog([{who:'me',text:'湖水清澈见底…可我没有水壶。听说水井边挂着一只。'}]);
  if(game.water>=3)return toast('水壶已经满了');
  game.water=3;sfx('water');updateItemBar();
  toast(`💧 在${src}边接满了水壶`);
}
function tryFish(){
  if(!game.rod)return startDialog([{who:'me',text:'水里有鱼影…但我还没有鱼竿。杂货店有卖（12 金币），卖鸡蛋野花能凑钱。'}]);
  if(game.bait<=0)return startDialog([{who:'me',text:'没有鱼饵了，空钩可钓不上「同心鱼」。杂货店 2 金币一份。'}]);
  game.bait--;updateItemBar();
  startFishing();
}
function pokeBush(){
  startDialog([{who:'me',text:'一丛会发光的神秘草。好像…可以跳上去试试（B 跳）？'}]);
}
function checkBushJump(){
  if(game.scene!=='world')return;
  const o=WOBJ.bush;
  if(Math.abs(player.x+6-(o.x+8))<20&&Math.abs(player.y+12-(o.y+7))<20){
    game.bushJump++;
    if(game.bushJump===3){
      sfx('quest');confetti(30);
      toast('🏆 隐藏彩蛋：草丛里的萤火虫为你们起舞');
    }else if(game.bushJump<3)toast(`草丛沙沙作响…（${game.bushJump}/3）`);
  }
}
function talkCat(){
  /* 摸头 / 喂蛋 / 喂鱼（喂食→天然肥料 + 跟随） */
  const opts=[['「摸摸头」']];
  if(game.eggs>0)opts.push([`「喂它一颗鸡蛋」(🥚${game.eggs})`]);
  if(game.fishN>0)opts.push([`「喂它一条小鱼」(🐟${game.fishN})`]);
  opts.push(['「算了，不打扰它」']);
  startDialog([
    {who:'cat',text:cat.state==='sleep'?'呼噜…呼噜…（它睡得正香，耳朵抖了一下）':'喵？（它抬起头看你，尾巴卷成一个问号）',
     choices:opts,
     onPick:i=>{
       const label=opts[i][0];
       if(label.startsWith('「摸摸头')){
         dlg.queue.splice(dlg.idx+1,0,{who:'cat',text:'呼噜噜～（它眯起眼睛蹭你的手心，毛茸茸的）'});
         if(!game.catTalk){
           game.catTalk=true;
           dlg.queue.splice(dlg.idx+2,0,{who:'cat',text:'（它把一片亮晶晶的东西拍到你脚边）'});
           dlg.onDoneExtra=()=>{toast('🏆 隐藏彩蛋：博物馆后巷的小猫');maybeFrag(1);};
         }else flyHearts(innerWidth/2,innerHeight/2,2);
       }else if(label.startsWith('「喂它一颗鸡蛋')||label.startsWith('「喂它一条小鱼')){
         const isFish=label.includes('小鱼');
         if(isFish)game.fishN--;else game.eggs--;
         game.catFed++;cat.followT=isFish?40:25;
         updateItemBar();
         dlg.queue.splice(dlg.idx+1,0,
           {who:'cat',text:isFish?'喵呜——！（它两口吞掉小鱼，幸福地打了个滚，决定跟着你走）':'咔嚓咔嚓…（它优雅地吃完鸡蛋，舔了舔爪子，决定跟着你走一段）'});
         dlg.onDoneExtra=()=>{
           setTimeout(()=>{
             game.fert++;updateItemBar();sfx('coin');
             toast('💩→💜 猫猫在角落留下了一份「谢礼」…获得天然肥料 ×1');
           },2500);
           if(game.catFed===3)setTimeout(()=>toast('🏆 隐藏成就：猫粮赞助商'),4000);
         };
       }
     }},
  ],()=>{ const cb=dlg.onDoneExtra;dlg.onDoneExtra=null;cb&&cb(); });
}
function talkChicken(){
  sfx('blip');
  const digesting=game.time-game.chickenFedT<10;
  const opts=[];
  if(game.feed>0&&!digesting)opts.push([`「喂一把谷粒」(🌾${game.feed})`]);
  opts.push(['「咯咯哒？」(聊天)'],['「再见」']);
  startDialog([
    {who:'chicken',text:digesting?'咯…咯…（它吃饱了，正在专心消化）':'咯咯哒？（它期待地看着你的口袋）',
     choices:opts,
     onPick:i=>{
       const label=opts[i][0];
       if(label.startsWith('「喂一把谷粒')){
         game.feed--;game.chickenFedT=game.time;
         updateItemBar();
         dlg.queue.splice(dlg.idx+1,0,
           {who:'chicken',text:'咯咯咯咯——！（它欢快地啄食谷粒，然后神圣地蹲下…）'},
           {who:'me',text:'它下蛋了！热乎的！'});
         dlg.onDoneExtra=()=>{
           game.eggs++;sfx('harvest');updateItemBar();
           toast('🥚 获得鸡蛋 ×1（可以送TA、喂猫、或卖4金）');
         };
       }else if(label.startsWith('「咯咯哒？')){
         game.chickenTalk++;
         if(game.chickenTalk<3)
           dlg.queue.splice(dlg.idx+1,0,{who:'chicken',text:['咯咯哒？','咯咯…咯咯哒！','（小鸡歪着头看你）'][game.chickenTalk%3]});
         else if(game.chickenTalk===3){
           dlg.queue.splice(dlg.idx+1,0,{who:'chicken',text:'咯咯哒——！（它郑重地拍了拍翅膀，送上鸡生最真挚的祝福）'});
           dlg.onDoneExtra=()=>{toast('🏆 隐藏成就：小鸡的祝福');flyHearts(innerWidth/2,innerHeight/2,4);};
         }
         else dlg.queue.splice(dlg.idx+1,0,{who:'chicken',text:'咯咯哒~（它已经把祝福全部给你了）'});
       }
     }},
  ],()=>{ const cb=dlg.onDoneExtra;dlg.onDoneExtra=null;cb&&cb(); });
}
function openChest(){
  if(game.chestOpened)return startDialog([{who:'me',text:'宝箱已经空了。'}]);
  game.chestOpened=true;
  sfx('harvest');
  startDialog([{who:'me',text:'跳进鸡圈打开宝箱…一枚闪闪发光的「美人鱼吊坠」！婚礼上用得到！'}],()=>{
    toast('🏆 隐藏彩蛋：美人鱼吊坠');
    confetti(40);
  });
}
function openMailbox(){
  if(game.quest<3)return startDialog([{who:'me',text:'邮箱空空的，现在还没有信。'}]);
  if(game.quest===3){
    sfx('harvest');
    startDialog([{who:'me',text:'有一封烫金边的信！是…我们的婚礼邀请函！'}],()=>{
      showOverlay(letterHTML(),()=>{
        setQuest(4);
        toast('TA 先去博物馆布展了，去镇上找 TA →');
        partner.scene='museum';partner.x=13*TILE;partner.y=4.5*TILE;
      });
    });
  }else startDialog([{who:'me',text:'信已经收好啦。'}]);
}

/* —— 农务 —— */
function farmAction(key){
  const p=plots[key];
  if(game.quest<1)return startDialog([{who:'me',text:'先去花田找 TA 吧（跟着金色箭头）。'}]);
  if(p.st===0){
    if(game.seeds<=0)return startDialog([{who:'me',text:'没有种子了。杂货店有卖（3 金币一颗）。'}]);
    game.seeds--;p.st=1;p.fert=0;sfx('plant');updateItemBar();
    toast(`🌱 种下向日葵种子（剩 ${game.seeds}）· 浇灌它吧`);
  }else if(p.st===1){
    if(!game.hasCan)return startDialog([{who:'me',text:'还没有水壶。TA 说忘在水井边了，去拿吧（跟着箭头）。'}]);
    if(game.water<=0)return startDialog([{who:'me',text:'水壶空了。去水井或湖边按 A 接水。'}]);
    game.water--;p.st=2;p.t=game.time;sfx('water');updateItemBar();
    toast(`💧 浇水完毕（剩 ${game.water} 次）`);
  }else{
    const ripeT=p.fert?0.9:1.6;
    const stage=Math.min(3,1+((game.time-p.t)/ripeT|0));
    if(stage<3){
      if(game.fert>0&&!p.fert){
        game.fert--;p.fert=1;sfx('plant');updateItemBar();
        return toast('💜 施肥成功！生长加速，还会闪闪发光');
      }
      sfx('blip');return toast(p.fert?'金灿灿的，马上就熟！':'长得很好，再等等…（杂货店的肥料可加速）');
    }
    const golden=p.fert===1;
    p.st=0;p.fert=0;game.fruits++;sfx('harvest');
    flyHearts(innerWidth/2,innerHeight/2,3);
    toast(`🌻 收获${golden?'「金色」':''}向日葵！（${game.fruits}/3）`);
    updateItemBar();
    const after=()=>{
      if(game.fruits>=3&&game.quest===1){
        startDialog([{who:'me',text:'集齐 3 朵向日葵了！花瓣在阳光下拼出了一行字——'}],()=>{
          showOverlay(infoHTML(),()=>{
            setQuest(2);
            startDialog([
              {who:partnerRole(),text:'向日葵真漂亮！接下来…湖里有传说中的「同心鱼」，婚宴的压轴菜就靠你啦！'},
              {who:partnerRole(),text:'鱼竿和鱼饵杂货店有卖。这是我的私房钱，拿去（塞给你 8 金币）。不够就卖点鸡蛋野花～'},
            ],()=>{
              game.coins+=8;updateItemBar();sfx('coin');
              toast('💰 获得 8 金币 · 去杂货店购置渔具（跟着箭头）');
            });
          });
        });
      }
    };
    maybeFrag(golden?0.85:0.25,after);
  }
}

/* —— 杂货店 v3：买卖双列，渔具/种子/肥料 + 收购农副产品 —— */
function shopRows(){
  return `
  <div class="body" style="text-align:center;font-size:12px;color:#8a5a2b">—— 购买 ——</div>
  <div class="trade-row"><div class="nm">🌱 向日葵种子</div><div class="pr">3 金</div><button class="sdv-btn small" data-buy="seed">买</button></div>
  <div class="trade-row"><div class="nm">💜 魔法肥料（催熟+金花）</div><div class="pr">5 金</div><button class="sdv-btn small" data-buy="fert">买</button></div>
  <div class="trade-row"><div class="nm">🎣 鱼竿${game.rod?'（已拥有）':''}</div><div class="pr">12 金</div>${game.rod?'':'<button class="sdv-btn small" data-buy="rod">买</button>'}</div>
  <div class="trade-row"><div class="nm">🪱 鱼饵（每次抛竿消耗1份）</div><div class="pr">2 金</div><button class="sdv-btn small" data-buy="bait">买</button></div>
  <div class="body" style="text-align:center;font-size:12px;color:#8a5a2b;margin-top:6px">—— 收购 ——</div>
  <div class="trade-row"><div class="nm">🐟 普通鱼 ×${game.fishN}</div><div class="pr">+6 金</div><button class="sdv-btn small" data-sell="fish">卖</button></div>
  <div class="trade-row"><div class="nm">🥚 鸡蛋 ×${game.eggs}</div><div class="pr">+4 金</div><button class="sdv-btn small" data-sell="egg">卖</button></div>
  <div class="trade-row"><div class="nm">🌼 野花 ×${game.flowers}</div><div class="pr">+2 金</div><button class="sdv-btn small" data-sell="flower">卖</button></div>
  <div class="trade-row"><div class="nm">🌻 多余向日葵 ×${Math.max(0,game.fruits-3)}</div><div class="pr">+5 金</div><button class="sdv-btn small" data-sell="sun">卖</button></div>
  <div class="trade-row"><div class="nm">💰 当前金币</div><div class="pr" id="shopCoins">${game.coins}</div></div>`;
}
function openShop(){
  sfx('coin');
  game.mode='ui';
  showOverlay(`<h3>🏪 杂货店</h3>
  <div class="body" style="text-align:center;font-size:12px;color:#8a5a2b">老板去喝喜酒了，自助交易，诚信经营～</div>
  <div id="shopBody">${shopRows()}</div>`,null,'离开 ▶');
}
/* 商店按钮：全局事件委托（只绑一次，避免重复触发） */
overlayInner.addEventListener('click',e=>{
  const b=e.target.closest('button[data-buy],button[data-sell]');
  if(!b)return;
  const buy=b.dataset.buy, sell=b.dataset.sell;
  if(buy==='seed'){
    if(game.coins<3)return toast('金币不够…卖点鸡蛋/野花/鱼吧');
    game.coins-=3;game.seeds++;sfx('coin');toast('购买成功：向日葵种子 +1');
  }else if(buy==='fert'){
    if(game.coins<5)return toast('金币不够…卖点鸡蛋/野花/鱼吧');
    game.coins-=5;game.fert++;sfx('coin');toast('购买成功：魔法肥料 +1');
  }else if(buy==='rod'){
    if(game.rod)return toast('已经有鱼竿了');
    if(game.coins<12)return toast(`还差 ${12-game.coins} 金币…喂鸡下蛋、采野花都能换钱`);
    game.coins-=12;game.rod=true;sfx('quest');toast('🎣 购得鱼竿！再备点鱼饵就能开钓');
  }else if(buy==='bait'){
    if(game.coins<2)return toast('金币不够…卖点东西吧');
    game.coins-=2;game.bait++;sfx('coin');toast('购买成功：鱼饵 +1');
  }else if(sell==='fish'){
    if(game.fishN<=0)return toast('背包里没有鱼。去湖边钓一条吧！');
    game.fishN--;game.coins+=6;sfx('coin');toast('卖出一条鱼 +6 金币');
  }else if(sell==='egg'){
    if(game.eggs<=0)return toast('没有鸡蛋。给母鸡喂谷粒它就下蛋');
    game.eggs--;game.coins+=4;sfx('coin');toast('卖出一颗鸡蛋 +4 金币');
  }else if(sell==='flower'){
    if(game.flowers<=0)return toast('没有野花。花田里按 A 采摘');
    game.flowers--;game.coins+=2;sfx('coin');toast('卖出一朵野花 +2 金币');
  }else if(sell==='sun'){
    if(game.fruits<=3)return toast('任务要留 3 朵，多余的才能卖');
    game.fruits--;game.coins+=5;sfx('coin');toast('卖出一朵向日葵 +5 金币');
  }
  const body=document.getElementById('shopBody');if(body)body.innerHTML=shopRows();
  updateItemBar();
  if(game.quest===2)setQuest(2);   // 刷新任务文案(购齐渔具后指向湖边)
});

/* —— 博物馆 —— */
function showExhibit(i){
  const ex=RT.museum[i];
  game.exhibitSeen=true;
  sfx('choice');
  showOverlay(
    `<h3>🖼 ${esc(ex.title||('展品 '+(i+1)))}</h3>
     ${ex.img?`<img class="exhibit-img" src="${esc(resolveImg(ex.img))}" onerror="this.outerHTML='<div style=\\'font-size:12px;color:#8a5a2b\\'>（图片加载失败：assets/imgs/ 下没找到）</div>'">`:''}
     <div class="frag-card">${esc(ex.text||'')}</div>`,
    ()=>{ if(game.quest===4)museumQuestCheck(); },'看完了 ▶');
}
function museumQuestCheck(){
  if(game.quest!==4||!game.exhibitSeen)return;
  if(partner.scene==='museum'){
    startDialog([
      {who:partnerRole(),text:'这里每一件展品，都是我们一步步走来的证据。'},
      {who:partnerRole(),text:'最后一站——婚礼殿堂。我先去把彩旗挂好，你随后就来！'},
    ],()=>{
      partner.scene='hall';partner.x=12.5*TILE;partner.y=4.5*TILE;partner.dir='down';
      setQuest(5);
      toast('🏰 前往南边的婚礼殿堂！');
    });
  }
}

/* —— 殿堂互动 —— */
function playPiano(){sfx('piano');flyHearts(innerWidth/2,innerHeight/3,3);toast('🎹 一段《婚礼进行曲》响起');}
function champagne(){sfx('coin');confetti(24);toast('🥂 香槟塔亮起金色的光！');}
function cakeBite(){sfx('harvest');toast('🍰 偷尝了一口奶油…甜到心里！');}
function popper(){sfx('pop');confetti(60);toast('🎉 砰——！礼花漫天');}
function tableInfo(i){
  const n=i+1;
  const names=RT.seats.filter(s=>String(s.table)===String(n)).map(s=>s.name);
  const mine=GUEST&&String(GUEST.table)===String(n);
  startDialog([{who:'me',text:`${n} 号桌${mine?'（这是你的桌位！）':''}${names.length?'：'+names.join('、'):'：虚位以待'}`}],()=>{
    if(mine){sfx('quest');flyHearts(innerWidth/2,innerHeight/2,5);}
  });
}

/* —— 终幕仪式 —— */
let ceremonyDone=false;
function tryCeremony(){
  if(game.quest<5||ceremonyDone)return;
  ceremonyDone=true;
  const other=partnerRole();
  startDialog([
    {who:other,text:'你来了。今天的殿堂，是全星露谷最好看的地方。'},
    {who:'me',text:'因为你站在这里。'},
    {who:other,text:'（脸红）咳咳…仪式开始！请交换信物，并说出你的誓言——',
      choices:CONFIG.vowChoices.map(c=>[c[0]]),
      onPick:i=>{game.vowIdx=i;dlg.queue.splice(dlg.idx+1,0,
        {who:other,text:CONFIG.vowChoices[i][1]},
        {who:other,text:(game.chestOpened?'戴上你找到的那枚「美人鱼吊坠」——':'交换「美人鱼吊坠」——')+'从今天起，我们就是一家人啦！'});
      }},
  ],()=>{
    sfx('fanfare');
    confetti(140);
    flyHearts(innerWidth/2,innerHeight/3,10);
    setTimeout(()=>{
      showOverlay(
        `<h3>♥ 礼成 ♥</h3>
         <div class="couple-row">
           <div class="frame"><canvas class="pcg" width="64" height="64"></canvas></div>
           <span class="px-heart"></span>
           <div class="frame"><canvas class="pcb" width="64" height="64"></canvas></div>
         </div>
         <div class="body center" style="text-align:center">在星露谷的见证下<br><b>${CONFIG.groom}</b> 与 <b>${CONFIG.bride}</b> 永结同心<br><br>—— 而现实中的婚礼，等你来 ——</div>`,
        ()=>{showOverlay(scheduleHTML(),()=>{setQuest(6);finalSummary();},'查看完整请帖 ▶');},
        '然后呢？▶');
      drawOverlayPortraits();
    },900);
  });
}
function achHTML(){
  const list=[
    [game.chestOpened,'美人鱼吊坠'],[game.chickenTalk>=3,'小鸡的祝福'],
    [game.wellWish>=3,'井底的愿望'],[game.bushJump>=3,'草丛萤火虫'],
    [game.catTalk,'后巷小猫'],[game.bootCaught,'旧靴子纸条'],
    [game.catFed>=3,'猫粮赞助商'],
  ].filter(a=>a[0]).map(a=>'🏆 '+a[1]);
  return list.length?`<br>${list.join(' · ')}`:'';
}
function finalSummary(){
  showOverlay(
    coupleHTML()+'<hr>'+infoHTML()+seatHTML()+'<hr>'+letterHTML()+'<hr>'+scheduleHTML()+
    `<div class="body center" style="text-align:center;margin-top:14px;font-size:13px;color:#8a5a2b">
      你的誓言：「${CONFIG.vowChoices[game.vowIdx][0].replace(/[「」]/g,'')}」
      ${achHTML()}
      <br>💫 记忆碎片 ${game.fragGot.length}/${RT.frags.length}
    </div>`,
    null,'回到游戏 ▶');
  drawOverlayPortraits();
}
/* 📜 进度/重看 */
document.getElementById('bookBtn').addEventListener('click',()=>{
  if(game.mode==='ui'||game.mode==='dialog'||game.mode==='fish')return;
  if(game.quest>=6)return finalSummary();
  const fragList=RT.frags.map((f,i)=>{
    const got=game.fragGot.includes(i);
    return `<div class="it ${got?'':'lock'}" ${got?`data-frag="${i}"`:''}>${got?'💫 '+esc(f.text.slice(0,26))+'…':'🔒 未收集的碎片（农作/钓鱼时随机掉落）'}</div>`;
  }).join('');
  showOverlay(
    `<h3>📜 请帖收集进度</h3>
     <div class="body center" style="text-align:center;line-height:2.4">
       ${game.quest>=1?'✅':'🔒'} 新人介绍 —— 找 TA 聊天<br>
       ${game.quest>=2?'✅':'🔒'} 婚礼信息 —— 收获 3 颗星之果实<br>
       ${game.quest>=3?'✅':'🔒'} 同心鱼 —— 湖边钓鱼<br>
       ${game.quest>=4?'✅':'🔒'} 邀请函 —— 查收邮箱<br>
       ${game.quest>=5?'✅':'🔒'} 回忆展 —— 参观博物馆<br>
       ${game.quest>=6?'✅':'🔒'} 当日流程 —— 殿堂仪式
     </div>
     <div class="frag-list">${fragList}</div>
     <div class="center" style="margin-top:12px"><button class="sdv-btn ghost" style="color:#8a5a2b;border-color:#8a5a2b" id="revealAll">跳过游戏，直接看完整请帖</button></div>`,
    null,'继续游戏 ▶');
  document.getElementById('revealAll').onclick=()=>{game.vowIdx=game.vowIdx||0;finalSummary();};
  overlayInner.querySelectorAll('[data-frag]').forEach(el=>el.onclick=()=>{
    const f=RT.frags[+el.dataset.frag];
    showOverlay(`<h3>💫 记忆碎片</h3>${f.img?`<img class="exhibit-img" src="${esc(resolveImg(f.img))}">`:''}<div class="frag-card">${esc(f.text)}</div>`,null,'返回 ▶');
  });
});

/* ============================================================
 * 另一半的对话（按任务阶段）
 * ============================================================ */
function talkPartner(){
  const other=partnerRole();
  /* 送鸡蛋（任意阶段，1-5 章可触发；奖励交替：鱼饵→金币） */
  if(game.quest>=1&&game.quest<6&&game.eggs>0&&game.scene==='world'){
    const opts=[['「聊聊进展」'],[`「送TA一颗鸡蛋」(🥚${game.eggs})`]];
    startDialog([
      {who:other,text:'怎么啦？是来看我，还是有好东西要分享？',
       choices:opts,
       onPick:i=>{
         if(i===1){
           game.eggs--;game.giftN++;updateItemBar();
           const reward=game.giftN%2===1?'bait':'coin';
           dlg.queue.splice(dlg.idx+1,0,
             {who:other,text:'给我的？还热乎着！（TA 小心地把鸡蛋收进篮子）'},
             {who:other,text:reward==='bait'?'拿这个回礼——两份鱼饵，钓鱼时用得上！':'那我也不能小气——给你 3 金币零花！'});
           dlg.onDoneExtra=()=>{
             if(reward==='bait'){game.bait+=2;toast('🪱 获得鱼饵 ×2');}
             else{game.coins+=3;toast('💰 获得 3 金币');}
             sfx('coin');updateItemBar();
             flyHearts(innerWidth/2,innerHeight/2,4);
           };
         }else{
           dlg.queue.splice(dlg.idx+1,0,{who:other,text:partnerHint(other)});
         }
       }},
    ],()=>{ const cb=dlg.onDoneExtra;dlg.onDoneExtra=null;cb&&cb(); });
    return;
  }
  if(game.quest===0){
    startDialog([
      {who:other,text:'你来啦！我就知道你会先来找我。今天的云，像极了棉花糖。'},
      {who:'me',text:'当然，巡视农场的第一站永远是你。'},
      {who:other,text:'嘿嘿。考你一下——还记得我们第一次见面吗？',
        choices:CONFIG.meetChoices.map(c=>[c[0]]),
        onPick:i=>{game.meetReplyIdx=i;dlg.queue.splice(dlg.idx+1,0,{who:other,text:CONFIG.meetChoices[i][1]});}},
      {who:other,text:'对了！长老说，亲手种出 3 朵「向日葵」，婚礼就会得到太阳的祝福。这是种子！'},
      {who:other,text:'呀，水壶忘在水井边了…就在你家旁边，顺路拿一下吧！'},
    ],()=>{
      game.seeds=3;
      toast('获得 <b style="color:#ffd84d">向日葵种子×3</b> · 水壶在水井边');
      showOverlay(coupleHTML(),()=>setQuest(1));
      drawOverlayPortraits();
    });
  }else if(game.quest===4&&game.exhibitSeen){
    museumQuestCheck();
  }else{
    startDialog([{who:other,text:partnerHint(other)}]);
  }
}
/* 各阶段提示语 */
function partnerHint(other){
  switch(game.quest){
    case 1:
      if(!game.hasCan)return '水壶就挂在水井边上！拿到后去农田种向日葵（靠近土地按 A）。';
      return Object.values(plots).some(p=>p.st>0)
        ?'浇过水颜色会变深；喂猫咪能得到天然肥料，杂货店也有卖，催熟还会开金花！'
        :'去篱笆围着的农田按 A 种下种子。对了，灌木丛里能翻到喂鸡的谷粒哦。';
    case 2:
      return (game.rod&&game.bait>0)
        ?'站上栈道尽头朝湖按 A！按住 A 绿区上浮、松开下沉，罩住小鱼攒满进度！'
        :'渔具去杂货店买：鱼竿 12 金、鱼饵 2 金。钱不够就卖鸡蛋(4金)、野花(2金)～';
    case 3: return '刚才邮递员来过！快回家看看那个红色邮箱。';
    case 4: return '欢迎来到「我们的回忆博物馆」！墙上的画、玻璃柜里的展品，走近按 A 都能看。';
    case 5: return '就等你啦。走上舞台来——仪式马上开始！';
    default: return '婚礼达成 ♥ 香槟塔、钢琴、五月柱、礼花筒都可以玩玩！';
  }
}

/* ============================================================
 * 设置 / DEBUG
 * ============================================================ */
let verTaps=0,verTapT=0;
function openSettings(){
  if(game.mode==='dialog'||game.mode==='fish')return;
  const dbgBtns=DEBUG?`
    <div class="ed-btns">
      <button class="sdv-btn small" id="edMuseum">🖼 博物馆展品配置</button>
      <button class="sdv-btn small" id="edSeats">🪑 婚宴桌位配置</button>
      <button class="sdv-btn small" id="edFrags">💫 记忆碎片配置</button>
      <button class="sdv-btn small" id="edExport">⬇ 导出配置 JSON</button>
      <button class="sdv-btn small danger" id="edClear">清除本地配置</button>
    </div>
    <div class="body" style="font-size:12px;color:#8a5a2b;text-align:center;margin-top:6px">— 任务直达（自动补齐所需道具）—</div>
    <div class="ed-btns" id="dbgJump">
      ${[0,1,2,3,4,5].map(q=>`<button class="sdv-btn small" data-jq="${q}">Q${q}</button>`).join('')}
      <button class="sdv-btn small" data-jq="6">礼成</button>
    </div>`:'';
  showOverlay(
    `<h3>⚙ 设置</h3>
     <div class="set-row"><div class="lab">背景音乐</div><div class="toggle ${bgmOn?'on':''}" id="tgBgm"></div></div>
     <div class="set-row"><div class="lab">音效</div><div class="toggle ${sfxOn?'on':''}" id="tgSfx"></div></div>
     <div class="set-row"><div class="lab">操作说明</div><button class="sdv-btn small" id="helpBtn">查看</button></div>
     <div class="set-row"><div class="lab">关于</div><button class="sdv-btn small" id="aboutBtn">GitHub 开源地址</button></div>
     ${dbgBtns}
     <div id="verRow">
       <span id="verNum">星露谷婚礼请帖 ${VERSION}</span>
       <span class="dbg-badge">DEBUG</span>
       <button class="sdv-btn small danger" id="dbgExit">退出 DEBUG</button>
     </div>`,
    null,'关闭 ▶');
  document.getElementById('tgBgm').onclick=e=>{toggleBgm();e.target.classList.toggle('on',bgmOn);};
  document.getElementById('tgSfx').onclick=e=>{sfxOn=!sfxOn;e.target.classList.toggle('on',sfxOn);sfx('blip');};
  document.getElementById('helpBtn').onclick=()=>showOverlay(
    `<h3>🕹 操作说明</h3><div class="body">
     📱 手机：左半屏拖动=虚拟摇杆 · A=互动 · B=跳跃<br>
     💻 电脑：方向键/WASD=移动 · 空格/E/Z=互动 · X/Shift=跳跃<br><br>
     🟡 跟着金色箭头和顶部任务条走就不会迷路<br>
     🎣 钓鱼：按住A绿区上浮，松开下沉，罩住鱼攒进度<br>
     🦘 篱笆可以跳过去；某些角落藏着 6 个隐藏彩蛋…</div>`,openSettings,'返回 ▶');
  document.getElementById('aboutBtn').onclick=()=>{
    sfx('quest');confetti(40);
    showOverlay(
      `<h3>🎉 彩蛋触发！</h3>
       <div class="body center" style="text-align:center;line-height:2.2">
       恭喜你找到了<b>阿丹的开发基地</b>！<br>
       <span style="font-size:12px;color:#8a5a2b">这份请帖的全部源码都开源在 GitHub<br>${GITHUB_URL.replace('https://','')}</span></div>
       <div class="center" style="margin-top:10px"><button class="sdv-btn ghost" style="color:#8a5a2b;border-color:#8a5a2b" id="aboutBack">先不去，返回设置</button></div>`,
      ()=>{window.open(GITHUB_URL,'_blank');},'确定，去看看 →');
    document.getElementById('aboutBack').onclick=()=>openSettings();
  };
  /* 版本号连点 10 下 → DEBUG */
  document.getElementById('verNum').onclick=()=>{
    const now=Date.now();
    if(now-verTapT>1500)verTaps=0;
    verTapT=now;verTaps++;
    if(verTaps>=10&&!DEBUG){setDebug(true);openSettings();}
    else if(verTaps>=3&&!DEBUG)toast(`再点 ${10-verTaps} 下进入 DEBUG 模式`);
  };
  document.getElementById('dbgExit').onclick=()=>{setDebug(false);openSettings();};
  if(DEBUG){
    document.getElementById('edMuseum').onclick=()=>openListEditor('museum');
    document.getElementById('edSeats').onclick=()=>openSeatsEditor();
    document.getElementById('edFrags').onclick=()=>openListEditor('frags');
    document.getElementById('edExport').onclick=exportConfig;
    document.getElementById('edClear').onclick=()=>{
      for(const k of ['museum','seats','frags'])lsDel(LS[k]);
      RT.museum=CONFIG.museum;RT.seats=CONFIG.seats;RT.frags=CONFIG.frags;
      toast('已恢复默认配置');openSettings();
    };
    document.querySelectorAll('#dbgJump [data-jq]').forEach(b=>b.onclick=()=>debugJump(+b.dataset.jq));
  }
}
/* DEBUG：任务直达（补齐道具与 NPC 位置，并传送到对应场景） */
function debugJump(q){
  overlay.style.display='none';game.mode='play';
  game.seeds=Math.max(game.seeds,3);
  if(q>=1){game.hasCan=true;game.water=3;}
  if(q>=2){game.fruits=Math.max(game.fruits,3);game.rod=true;game.bait=Math.max(game.bait,3);game.coins+=8;}
  if(q>=3){game.fishQ=true;}
  partner.scene='world';partner.x=30*TILE;partner.y=27*TILE;
  if(q>=4){partner.scene='museum';partner.x=13*TILE;partner.y=4.5*TILE;}
  if(q>=5){partner.scene='hall';partner.x=12.5*TILE;partner.y=4.5*TILE;}
  ceremonyDone=false;
  game.scene='world';
  const spots={0:[28,27],1:[11,8],2:[15,21],3:[9,7],4:[20,22],5:[17.5,38],6:[17.5,38]};
  const [sx,sy]=spots[q]||spots[0];
  player.x=sx*TILE;player.y=sy*TILE;
  if(q>=6){setQuest(6);ceremonyDone=true;}
  else setQuest(q);
  updateCam();
  toast(`🛠 已跳转到任务 Q${q}`);
}
document.getElementById('setBtn').addEventListener('click',openSettings);

/* —— 通用列表编辑器（博物馆/碎片）—— */
function openListEditor(kind){
  const isMu=kind==='museum';
  const items=JSON.parse(JSON.stringify(RT[kind]));
  function render(){
    const rows=items.map((it,i)=>`
      <div class="ed-item" data-i="${i}">
        <button class="ed-del" data-del="${i}">✕</button>
        ${isMu?`<label>标题</label><input type="text" data-f="title" data-i="${i}" value="${esc(it.title||'')}">`:''}
        <label>文字内容</label><textarea data-f="text" data-i="${i}">${esc(it.text||'')}</textarea>
        <label>图片：填 assets/imgs/ 下的<b>文件名</b>（如 合照.jpg），或完整URL，或上传转存</label>
        <input type="text" data-f="img" data-i="${i}" value="${(it.img||'').startsWith('data:')?'(已存入本地图片)':esc(it.img||'')}" placeholder="https://... 或留空">
        <input type="file" accept="image/*" data-file="${i}" style="font-size:11px;margin-top:4px">
        ${it.img?`<img class="ed-thumb" src="${esc(resolveImg(it.img))}" onerror="this.style.opacity=.25">`:''}
      </div>`).join('');
    showOverlay(
      `<h3>${isMu?'🖼 博物馆展品配置':'💫 记忆碎片配置'} <span style="font-size:11px;color:#8a5a2b">(${items.length}${isMu?'/12':''})</span></h3>
       <div class="body" style="font-size:12px;color:#8a5a2b;text-align:center">${isMu?'1-4 = 上墙挂画区 · 5-12 = 中央圆桌展台':'农作/钓鱼/彩蛋时随机掉落'}</div>
       ${rows}
       <div class="ed-btns">
         <button class="sdv-btn small" id="edAdd">＋ 添加一项</button>
         <button class="sdv-btn small" id="edSave">💾 保存</button>
       </div>
       <div class="body center" style="font-size:11px;color:#8a5a2b;margin-top:8px;text-align:center">
         保存仅写入本机浏览器；要让宾客看到，请「导出配置JSON」后将<br>wedding-config.json 放到仓库根目录一起部署</div>`,
      openSettings,'返回设置 ▶');
    overlayInner.querySelectorAll('[data-f]').forEach(inp=>{
      inp.onchange=()=>{ const i=+inp.dataset.i;
        if(inp.dataset.f==='img'&&inp.value==='(已存入本地图片)')return;
        items[i][inp.dataset.f]=inp.value; };
    });
    overlayInner.querySelectorAll('[data-file]').forEach(inp=>{
      inp.onchange=()=>{
        const i=+inp.dataset.file,f=inp.files[0];
        if(!f)return;
        if(f.size>400*1024)return toast('图片太大(>400KB)，请压缩后再传或用URL');
        const rd=new FileReader();
        rd.onload=()=>{items[i].img=rd.result;toast('图片已读取，记得保存');render();};
        rd.readAsDataURL(f);
      };
    });
    overlayInner.querySelectorAll('[data-del]').forEach(b=>{
      b.onclick=()=>{items.splice(+b.dataset.del,1);render();};
    });
    document.getElementById('edAdd').onclick=()=>{
      if(isMu&&items.length>=12)return toast('博物馆最多 12 件展品');
      items.push(isMu?{title:'',text:'',img:''}:{text:'',img:''});render();
    };
    document.getElementById('edSave').onclick=()=>{
      RT[kind]=JSON.parse(JSON.stringify(items));
      lsSet(LS[kind],RT[kind]);
      sfx('coin');toast('已保存到本机 ✓（导出JSON可分发给宾客）');
    };
  }
  render();
}
/* —— 桌位编辑器 —— */
function openSeatsEditor(){
  const text=RT.seats.map(s=>`${s.name},${s.table}`).join('\n');
  showOverlay(
    `<h3>🪑 婚宴桌位配置</h3>
     <div class="body" style="font-size:12px;color:#8a5a2b;text-align:center">每行一位宾客：<b>姓名,桌号</b>（桌号 1-8 对应殿堂里的桌子）</div>
     <textarea class="ed-ta" id="seatTa">${esc(text)}</textarea>
     <div class="ed-btns"><button class="sdv-btn small" id="seatSave">💾 保存</button></div>
     <div id="seatLinks" class="frag-list"></div>`,
    openSettings,'返回设置 ▶');
  function renderLinks(){
    const box=document.getElementById('seatLinks');
    box.innerHTML='<div style="font-size:12px;color:#8a5a2b;text-align:center;margin-top:6px">— 每位宾客的专属分享链接 —</div>'+
      RT.seats.map(s=>`<div class="it">🎫 ${esc(s.name)} → ${esc(s.table)}号桌
        <button class="sdv-btn small" style="float:right" data-cp="${esc(s.name)}|${esc(s.table)}">复制链接</button></div>`).join('');
    box.querySelectorAll('[data-cp]').forEach(b=>b.onclick=()=>{
      const[n,t]=b.dataset.cp.split('|');
      const url=location.origin+location.pathname+`?gn=${encodeURIComponent(n)}&gt=${encodeURIComponent(t)}`;
      (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(
        ()=>toast('已复制 '+n+' 的链接'),
        ()=>prompt('手动复制链接：',url));
    });
  }
  renderLinks();
  document.getElementById('seatSave').onclick=()=>{
    const lines=document.getElementById('seatTa').value.split('\n').map(l=>l.trim()).filter(Boolean);
    const seats=[];
    for(const l of lines){
      const m=l.split(/[,，]/);
      if(m.length>=2&&m[0].trim())seats.push({name:m[0].trim(),table:m[1].trim()});
    }
    RT.seats=seats;lsSet(LS.seats,seats);
    sfx('coin');toast(`已保存 ${seats.length} 位宾客 ✓`);
    refreshGuest();renderLinks();
  };
}
function exportConfig(){
  const json=JSON.stringify({museum:RT.museum,seats:RT.seats,frags:RT.frags},null,2);
  const blob=new Blob([json],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='wedding-config.json';
  a.click();URL.revokeObjectURL(a.href);
  toast('已导出 wedding-config.json，与 index.html 一起部署即可生效');
}

/* ============================================================
 * 标题屏 / 启动
 * ============================================================ */
document.getElementById('tNames').innerHTML=`${CONFIG.groom} <span class="px-heart"></span> ${CONFIG.bride}`;
document.getElementById('pickGroomNm').textContent=CONFIG.groom+'（新郎）';
document.getElementById('pickBrideNm').textContent=CONFIG.bride+'（新娘）';
document.body.classList.toggle('debug',DEBUG);
refreshGuest();
{
  const ts=document.getElementById('titleStars');
  for(let i=0;i<40;i++){
    const s=document.createElement('div');
    s.className='star';
    const sz=Math.random()<.3?4:2;
    s.style.cssText=`width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*100}%;animation-delay:${(Math.random()*2.4).toFixed(2)}s`;
    ts.appendChild(s);
  }
  /* 角色卡：素材加载完成后重绘一次（启动早期可能还没加载完） */
  const drawCards=()=>{
    titleCardInto(document.querySelector('#pickGroom canvas'),'groom');
    titleCardInto(document.querySelector('#pickBride canvas'),'bride');
  };
  drawCards();
  setTimeout(drawCards,600);
  setTimeout(drawCards,2000);
}
function startGame(role){
  ensureCtx();toggleBgm(true);
  game.playerRole=role;
  partner.role=partnerRole();
  document.getElementById('title').style.display='none';
  document.getElementById('hud').style.display='block';
  if(matchMedia('(pointer:coarse)').matches){
    document.getElementById('padL').style.display='block';
    document.getElementById('btns').style.display='flex';
  }
  game.mode='play';
  setQuest(0);updateCam();
  setTimeout(()=>startDialog([
    {who:'me',text:`（天气真好。${nameFor(partnerRole())} 在东南边的花田等我——跟着金色箭头走吧。）`},
    {who:'me',text:'（镇上多了好几栋房子：杂货店、博物馆…南边还有座挂满彩旗的婚礼殿堂！）'},
  ]),350);
}
document.getElementById('pickGroom').addEventListener('click',()=>startGame('groom'));
document.getElementById('pickBride').addEventListener('click',()=>startGame('bride'));
document.getElementById('skipBtn').addEventListener('click',()=>{
  document.getElementById('title').style.display='none';
  document.getElementById('hud').style.display='block';
  game.mode='play';ceremonyDone=true;
  setQuest(6);
  finalSummary();
});
document.addEventListener('pointerdown',e=>{
  if(game.mode==='title')flyHearts(e.clientX,e.clientY,2);
});
/* 测试钩子 */
const _q=QS;
if(_q.get('auto'))setTimeout(()=>startGame(_q.get('auto')==='bride'?'bride':'groom'),200);
if(_q.get('at')){const[ax,ay]=_q.get('at').split(',').map(Number);setTimeout(()=>{player.x=ax*TILE;player.y=ay*TILE;updateCam();},350);}
if(_q.get('scene'))setTimeout(()=>{game.scene=_q.get('scene');updateCam();},340);
if(_q.get('q'))setTimeout(()=>{
  const q=+_q.get('q');
  if(q>=1){game.seeds=3;game.hasCan=true;game.water=3;}
  if(q>=2){game.fruits=3;game.rod=true;game.bait=3;}
  if(q>=4){partner.scene='museum';partner.x=13*TILE;partner.y=4.5*TILE;}
  if(q>=5){partner.scene='hall';partner.x=12.5*TILE;partner.y=4.5*TILE;}
  setQuest(q);
},400);
if(_q.get('show'))setTimeout(()=>{
  const s=_q.get('show');
  if(game.mode==='dialog'){clearInterval(dlg.timer);dlg.el.style.display='none';game.mode='play';}
  if(s==='final'){game.vowIdx=0;finalSummary();}
  else if(s==='info')showOverlay(infoHTML());
  else if(s==='couple'){showOverlay(coupleHTML());drawOverlayPortraits();}
  else if(s==='letter')showOverlay(letterHTML());
  else if(s==='settings')openSettings();
  else if(s==='fish')startFishing();
},650);