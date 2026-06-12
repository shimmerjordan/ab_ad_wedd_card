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

/* —— 户外大世界 36x40 —— */
function buildWorld(){
  const W=36,H=40,g=grid(W,H,'.');
  /* 湖（椭圆 + 沙边） */
  const cx=29.2,cy=5.6,rx=5.6,ry=4.1;
  for(let y=1;y<12;y++)for(let x=22;x<35;x++){
    const dx=(x-cx)/rx,dy=(y-cy)/ry;
    if(dx*dx+dy*dy<=1) g[y][x]='~';
  }
  for(let y=1;y<13;y++)for(let x=21;x<36;x++){
    if(g[y][x]==='.'&&[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]].some(([a,b])=>g[y+b]&&g[y+b][x+a]==='~')) g[y][x]='n';
  }
  /* 木栈道伸进湖里 */
  vline(g,29,7,10,'=');
  /* 农田 + 篱笆（底部留门，可跳跃） */
  rect(g,9,7,14,9,'P');
  hline(g,8,15,6,'f'); hline(g,8,10,10,'f'); hline(g,13,15,10,'f');
  vline(g,8,7,9,'f');  vline(g,15,7,9,'f');
  /* 鸡圈（无门，跳进去） */
  hline(g,18,21,6,'f'); hline(g,18,21,9,'f');
  vline(g,18,7,8,'f');  vline(g,21,7,8,'f');
  /* 花田 */
  for(let y=20;y<=25;y++)for(let x=27;x<=33;x++) if(hash(x,y)%3<2) g[y][x]='F';
  /* 西边小树林 + 神秘草丛 */
  for(const [tx,ty] of [[2,20],[4,21],[2,24],[5,24],[3,26],[2,30],[5,29],[3,33],[6,32],[2,36]]) g[ty][tx]='T';
  g[22][3]=',';
  /* 路网 */
  vline(g,5,6,18,':');             // 家门口往南
  hline(g,5,30,18,':');            // 主路东西
  vline(g,18,18,28,':');           // 往殿堂
  hline(g,18,27,22,':');           // 往花田
  vline(g,9,17,18,':');            // 杂货店门口
  vline(g,27,17,18,':');           // 邻居门口
  vline(g,29,11,13,':'); hline(g,29,30,13,':'); vline(g,30,13,18,':'); // 湖往主路
  hline(g,17,18,28,':'); vline(g,17,28,36,':'); vline(g,18,28,36,':'); // 殿堂红毯前
  /* 草丛点缀 */
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++) if(g[y][x]==='.'&&hash(x,y)%13===0) g[y][x]=',';
  /* 树木点缀（避开空地建筑） */
  const forb=(x,y)=> (x>=1&&x<=10&&y>=1&&y<=6)||(x>=7&&x<=16&&y>=5&&y<=11)||(x>=17&&x<=22&&y>=5&&y<=10)||
    (x>=20&&x<=35&&y>=0&&y<=13)||(x>=6&&x<=31&&y>=12&&y<=19)||(x>=25&&x<=35&&y>=19&&y<=26)||
    (x>=10&&x<=25&&y>=28&&y<=39)||(x>=16&&x<=19&&y>=18&&y<=39);
  for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++)
    if(g[y][x]==='.'&&!forb(x,y)&&hash(x*3,y*7)%17===0) g[y][x]='T';
  /* 边界树墙 */
  hline(g,0,W-1,0,'T'); hline(g,0,W-1,H-1,'T');
  vline(g,0,0,H-1,'T'); vline(g,W-1,0,H-1,'T');
  return {w:W,h:H,g};
}
/* —— 博物馆内景 20x14 —— */
function buildMuseum(){
  const W=20,H=14,g=grid(W,H,'w');
  rect(g,0,0,W-1,1,'W'); hline(g,0,W-1,H-1,'W');
  vline(g,0,0,H-1,'W'); vline(g,W-1,0,H-1,'W');
  g[H-1][9]='w'; g[H-1][10]='w';          // 门口
  rect(g,8,6,11,7,'c');                   // 中央地毯
  return {w:W,h:H,g};
}
/* —— 婚礼殿堂内景 26x20 —— */
function buildHall(){
  const W=26,H=20,g=grid(W,H,'w');
  rect(g,0,0,W-1,0,'W'); hline(g,0,W-1,H-1,'W');
  vline(g,0,0,H-1,'W'); vline(g,W-1,0,H-1,'W');
  rect(g,7,1,18,4,'S');                   // 舞台
  rect(g,12,5,13,18,'c');                 // 中央红毯通道
  g[H-1][12]='c'; g[H-1][13]='c';         // 门口
  return {w:W,h:H,g};
}

/* —— 建筑（户外，参数化绘制+碰撞） —— */
const BUILDINGS = [
  {key:'home',   x:2, y:2, w:6, h:4, wall:'#e8d5a8', roof:'#b04a3a', label:'',
   door:{x:4.5,w:1,  act:'homeDoor'}},
  {key:'shop',   x:7, y:13,w:6, h:4, wall:'#f0e0b8', roof:'#3f8a3c', label:'杂货店',
   door:{x:9,  w:1,  act:'shop'}},
  {key:'museum', x:14,y:12,w:9, h:5, wall:'#e8e0d0', roof:'#5a6fb0', label:'博物馆',
   door:{x:18, w:1,  act:'enterMuseum'}},
  {key:'nb1',    x:25,y:13,w:5, h:4, wall:'#e8d5a8', roof:'#c9772e', label:'',
   door:{x:27, w:1,  act:'nbDoor'}},
  {key:'hall',   x:11,y:28,w:14,h:7, wall:'#f5ead0', roof:'#c0392b', label:'婚礼殿堂',
   door:{x:17, w:2,  act:'enterHall'}},
];
/* 户外固定对象 */
const WOBJ = {
  mailbox:{x:8*TILE+4, y:5*TILE+2, w:8, h:12},
  well:   {x:2*TILE,   y:8*TILE,  w:30, h:28},
  chest:  {x:19*TILE+2,y:7*TILE+2, w:12, h:10},
  bush:   {x:3*TILE,   y:22*TILE,  w:16, h:14},
};
/* 殿堂内对象：8 桌 + 互动点 */
const TABLE_POS=[[3,7],[8,7],[15,7],[20,7],[3,12],[8,12],[15,12],[20,12]]; // tile 坐标(2x2)
const HOBJ = {
  piano:  {x:2*TILE, y:2*TILE, w:38, h:26},
  tower:  {x:21*TILE,y:1*TILE+8, w:30, h:30},
  cake:   {x:21*TILE,y:15*TILE, w:30, h:24},
  popperL:{x:1*TILE+4,y:16*TILE, w:12, h:16},
  popperR:{x:24*TILE, y:16*TILE, w:12, h:16},
};
/* 博物馆展位坐标（前8面墙画，后4台座） */
const EX_WALL=[[2,2],[4,2],[6,2],[8,2],[11,2],[13,2],[15,2],[17,2]];
const EX_PED =[[4,7],[8,7],[12,7],[16,7]];

const SCENES = {
  world:  Object.assign(buildWorld(),  {type:'out'}),
  museum: Object.assign(buildMuseum(), {type:'in', exit:{to:'world', x:18.5*TILE, y:18.2*TILE}}),
  hall:   Object.assign(buildHall(),  {type:'in', exit:{to:'world', x:17.5*TILE, y:36*TILE}}),
};
/* 场景间寻路（指引箭头用）：当前场景到目标场景该走哪个“门” */
function routeDoor(from,to){
  if(from==='world') return to==='museum' ? {x:18.5*TILE,y:17*TILE} : {x:17.5*TILE,y:35*TILE};
  return {x:from==='museum'?9.5*TILE:12.5*TILE, y:(SCENES[from].h-1)*TILE};
}

/* ============================================================
 * 游戏状态
 * ============================================================ */
const game = {
  mode:'title',                 // title|play|dialog|ui|fish
  scene:'world',
  quest:0,                      // 0找TA 1农务 2钓鱼 3收信 4博物馆 5殿堂仪式 6完结
  coins:10, seeds:0, fert:0, water:0, fruits:0, fishN:0, fishQ:false, rod:false,
  meetReplyIdx:0, vowIdx:0,
  chestOpened:false, chickenTalk:0, wellWish:0, bushJump:0, catTalk:false, bootCaught:false,
  fragGot:[],                   // 已收集碎片下标
  exhibitSeen:false,
  playerRole:'groom', time:0,
};
const player  = {x:5.5*TILE, y:6.5*TILE, dir:'down', flip:false, moving:false, animT:0, frame:'A', frameI:0, z:0, vz:0};
const partner = {x:30*TILE, y:22*TILE, scene:'world', dir:'down', flip:false, role:'bride', bob:0};
const chicken = {x:19*TILE, y:8*TILE, dir:1, t:0, pause:false};
const cat     = {x:23*TILE, y:12*TILE};
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
  if(game.scene==='world') return Object.values(WOBJ).concat(BUILDINGS.map(b=>({x:b.x*TILE,y:b.y*TILE,w:b.w*TILE,h:b.h*TILE})));
  if(game.scene==='hall')  return Object.values(HOBJ).concat(TABLE_POS.map(([tx,ty])=>({x:tx*TILE+2,y:ty*TILE+6,w:28,h:22})));
  if(game.scene==='museum'){
    const peds=[];
    RT.museum.forEach((ex,i)=>{ if(i>=8&&i<12){const[px,py]=EX_PED[i-8];peds.push({x:px*TILE,y:py*TILE,w:16,h:14});} });
    return peds;
  }
  return [];
}
function solidAt(px,py,airborne){
  const t=tileAt(px,py);
  if(t==='T'||t==='W'||t==='~')return true;
  if(t==='f'&&!airborne)return true;
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
  if(!ok){ sfx('blip'); toast('鱼跑掉了…再试一次！'); return; }
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
    if(t==='W'){ // 内墙
      ctx.fillStyle='#7a5a40';ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle='#8d6b4e';ctx.fillRect(px,py,TILE,3);
      ctx.fillStyle='#5e4530';ctx.fillRect(px,py+13,TILE,3);
      continue;
    }
    if(t==='w'||t==='c'||t==='S'){ // 木地板基底
      ctx.fillStyle=(tx+ty)%2?'#c89858':'#bf9050';ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle='rgba(0,0,0,.08)';ctx.fillRect(px,py+15,TILE,1);
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
    else if(t==='F'){
      const colors=['#ff7daa','#ffd84d','#a06ee0','#ff8a5c','#fff'];
      ctx.fillStyle='#3f8a3c';ctx.fillRect(px+7,py+8,2,6);
      ctx.fillStyle=colors[h%colors.length];ctx.fillRect(px+5,py+4,6,6);
      ctx.fillStyle='#ffe9a8';ctx.fillRect(px+7,py+6,2,2);
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
  if(im){ ctx.drawImage(im,0,0,32,32, px-8, py-18+((game.time*1.2|0)%2), 32,32); return; }
  blit(ctx,CAT,px,py-((game.time*1.2|0)%2===0?0:1),false);
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
  const im=img('tree');
  if(im){ ctx.drawImage(im, px-16, py-80); return; }   // 48x96, 树干底对齐地块
  ctx.fillStyle='#6e4218';ctx.fillRect(px+6,py+2,4,12);
  ctx.fillStyle=h%3?'#3a7a2c':'#2f6b24';ctx.fillRect(px-2,py-12,20,12);
  ctx.fillStyle='#4c9b3c';ctx.fillRect(px,py-16,16,8);ctx.fillRect(px+2,py-18,12,4);
  ctx.fillStyle='#2f6b24';ctx.fillRect(px+2,py-6,4,3);ctx.fillRect(px+10,py-10,4,3);
  if(h%5===0){ctx.fillStyle='#ff7daa';ctx.fillRect(px+4,py-14,2,2);ctx.fillRect(px+11,py-9,2,2);}
}

/* —— 博物馆内景陈设 —— */
function drawMuseumInt(ents){
  RT.museum.forEach((ex,i)=>{
    if(i<8){
      const[tx,ty]=EX_WALL[i],px=tx*TILE-cam.x|0,py=(ty-1)*TILE-cam.y+4|0;
      ents.push({y:-999,draw(){ // 挂画直接贴墙(先画)
        ctx.fillStyle='#6e4218';ctx.fillRect(px-2,py-2,24,20);
        ctx.fillStyle='#ffd84d';ctx.fillRect(px-1,py-1,22,18);
        ctx.fillStyle='#fdf3dc';ctx.fillRect(px+1,py+1,18,14);
        ctx.fillStyle=['#ff9eb5','#7dc4ff','#a06ee0','#7ec850','#ffd84d','#ff8a5c','#e0457b','#5a6fb0'][i];
        ctx.fillRect(px+3,py+3,14,8);
        ctx.fillStyle='#5b2c0e';ctx.fillRect(px+3,py+12,10,2);
      }});
    }else if(i<12){
      const[tx,ty]=EX_PED[i-8],px=tx*TILE-cam.x|0,py=ty*TILE-cam.y|0;
      ents.push({y:ty*TILE+14,draw(){
        ctx.fillStyle='#d9bd85';ctx.fillRect(px+1,py,14,14);
        ctx.fillStyle='#bfa06a';ctx.fillRect(px+1,py+11,14,3);
        ctx.fillStyle='#ffd84d';ctx.fillRect(px+5,py-6,6,7);
        if((game.time*2|0)%2){ctx.fillStyle='#fff';ctx.fillRect(px+11,py-8,2,2);}
      }});
    }
  });
  /* 横幅 */
  ents.push({y:-998,draw(){
    const px=5*TILE-cam.x|0,py=0-cam.y+6|0;
    ctx.fillStyle='#e0457b';ctx.fillRect(px,py,160,14);
    ctx.fillStyle='#fff';ctx.font='10px "Fusion Pixel 12px Proportional SC",monospace';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('我 们 的 回 忆 博 物 馆',px+80,py+8);
  }});
}
/* —— 殿堂内景陈设 —— */
function drawHallInt(ents){
  /* 舞台拱门 */
  ents.push({y:4*TILE,draw(){
    const px=11*TILE-cam.x|0,py=1*TILE-cam.y|0;
    ctx.fillStyle='#e8d5a8';ctx.fillRect(px,py,6,46);ctx.fillRect(px+58,py,6,46);
    ctx.fillStyle='#3f8a3c';ctx.fillRect(px-4,py-8,72,8);ctx.fillRect(px+2,py-13,60,6);
    const fc=['#ff7daa','#ffd84d','#fff','#ff5c8a'];
    for(let i=0;i<9;i++){ctx.fillStyle=fc[i%4];ctx.fillRect(px+i*8,py-10+(i%2)*4,4,4);}
  }});
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
    for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++)
      if(s.g[ty][tx]==='T'){
        /* 大树素材较宽：边界树墙隔一棵画一棵(碰撞不变)，避免过密 */
        const border=tx===0||ty===0||tx===s.w-1||ty===s.h-1;
        if(sdvTree&&border&&(tx+ty)%2)continue;
        ents.push({y:ty*TILE+TILE,draw:((a,b,c)=>()=>drawTree(a,b,c))(tx*TILE-cam.x|0,ty*TILE-cam.y|0,hash(tx,ty))});
      }
    BUILDINGS.forEach(b=>ents.push({y:(b.y+b.h)*TILE,draw:()=>drawBuilding(b)}));
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
    case 1: return {scene:'world', x:11.5*TILE, y:7*TILE};
    case 2: return {scene:'world', x:29.5*TILE, y:7*TILE};
    case 3: return {scene:'world', x:WOBJ.mailbox.x+4, y:WOBJ.mailbox.y-20};
    case 4: return {scene:'museum', x:10*TILE, y:5*TILE};
    case 5: return {scene:'hall', x:12.5*TILE, y:4.5*TILE};
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
  chips.push(`💧${game.water}/3`);
  if(game.fert)chips.push(`💜肥${game.fert}`);
  if(game.quest===1||game.fruits)chips.push(`⭐${game.fruits}/3`);
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
     ${f.img?`<img class="exhibit-img" src="${esc(f.img)}" onerror="this.style.display='none'">`:''}
     <div class="frag-card">${esc(f.text)}</div>
     <div class="center" style="margin-top:8px;font-size:12px;color:#8a5a2b">已收集 ${game.fragGot.length} / ${RT.frags.length} · 在 📜 里可回看</div>`,
    after,'收下 ♥');
}

/* ============================================================
 * 任务
 * ============================================================ */
const QUEST_TEXTS=[
  ()=>`找 ${nameFor(partnerRole())} 聊聊（东南花田，跟着箭头走）`,
  ()=>`农务时间：种 3 颗星之种子 → 水井/湖边接水 → 浇水 → 收获`,
  ()=>`去湖边木栈道尽头，钓一条「同心鱼」（按住 A 控制绿区）`,
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
    if(near(cat,18))return talkCat();
    if(inRect(fx,fy,WOBJ.mailbox,8)||inRect(player.x+6,player.y+12,WOBJ.mailbox,10))return openMailbox();
    if(inRect(fx,fy,WOBJ.chest,8))return openChest();
    if(inRect(fx,fy,WOBJ.well,8))return useWell();
    if(inRect(fx,fy,WOBJ.bush,6))return pokeBush();
    /* 建筑门 */
    for(const b of BUILDINGS){
      const door={x:b.door.x*TILE-6,y:(b.y+b.h)*TILE-18,w:b.door.w*TILE+12,h:26};
      if(inRect(fx,fy,door,4)||inRect(player.x+6,player.y+12,door,6))return doorAction(b);
    }
    /* 湖边/栈道 */
    const t=tileAt(fx,fy);
    if(t==='~'){
      if(tileAt(player.x+6,player.y+12)==='='&&player.dir==='up')return tryFish();
      return fillCan('湖');
    }
    /* 耕地 */
    const tx=fx/TILE|0,ty=fy/TILE|0,key=tx+','+ty;
    const myKey=((player.x+6)/TILE|0)+','+((player.y+12)/TILE|0);
    const k=plots[key]?key:(plots[myKey]?myKey:null);
    if(k)return farmAction(k);
  }
  else if(game.scene==='museum'){
    if(partner.scene==='museum'&&near(partner,24))return talkPartner();
    /* 展品：取面前点最近的一件（墙画需在上半区，台座需贴近） */
    let idx=-1,best=18;
    EX_WALL.forEach(([ex],i)=>{
      if(fy>3.8*TILE)return;
      const d=Math.abs(fx-(ex*TILE+8));
      if(d<best){best=d;idx=i;}
    });
    EX_PED.forEach(([ex,ey],i)=>{
      const d=Math.hypot(fx-(ex*TILE+8),fy-(ey*TILE+8));
      if(d<22&&d<best){best=d;idx=8+i;}
    });
    if(idx>=0&&RT.museum[idx])return showExhibit(idx);
  }
  else if(game.scene==='hall'){
    if(partner.scene==='hall'&&near(partner,26))return talkPartner();
    if(inRect(fx,fy,HOBJ.piano,8))return playPiano();
    if(inRect(fx,fy,HOBJ.tower,8))return champagne();
    if(inRect(fx,fy,HOBJ.cake,8))return cakeBite();
    if(inRect(fx,fy,HOBJ.popperL,8)||inRect(fx,fy,HOBJ.popperR,8))return popper();
    /* 桌子 */
    for(let i=0;i<TABLE_POS.length;i++){
      const[tx,ty]=TABLE_POS[i];
      if(inRect(fx,fy,{x:tx*TILE,y:ty*TILE,w:32,h:30},4))return tableInfo(i);
    }
    /* 舞台 */
    if(tileAt(fx,fy)==='S'||tileAt(player.x+6,player.y+12)==='S')return tryCeremony();
  }
}

/* —— 各互动实现 —— */
function doorAction(b){
  switch(b.door.act){
    case 'homeDoor': return startDialog([{who:'me',text:'这是我们婚后的小家。今天先不开放参观啦~'}]);
    case 'nbDoor':   return startDialog([{who:'me',text:'邻居家。门上贴着字条：「去喝喜酒了，不在家」。'}]);
    case 'shop':     return openShop();
    case 'enterMuseum': return gotoScene('museum',9.7*TILE,11.5*TILE);
    case 'enterHall':
      if(game.quest<5){startDialog([{who:'me',text:'殿堂的大门还没开。先把别的事办完吧（看顶部任务提示）。'}]);return;}
      return gotoScene('hall',12*TILE,16.5*TILE);
  }
}
function useWell(){
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
  if(game.water>=3)return toast('水壶已经满了');
  game.water=3;sfx('water');updateItemBar();
  toast(`💧 在${src}边接满了水壶`);
}
function tryFish(){
  if(!game.rod)return startDialog([{who:'me',text:'水里有鱼影…但我还没有鱼竿。（剧情推进后会拿到）'}]);
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
  if(!game.catTalk){
    game.catTalk=true;
    sfx('blip');
    startDialog([{who:'cat',text:'喵～（它蹭了蹭你的裤脚，把一片亮晶晶的东西拍到你脚边)'}],()=>{
      toast('🏆 隐藏彩蛋：博物馆后巷的小猫');
      maybeFrag(1);
    });
  }else startDialog([{who:'cat',text:'喵喵～（它困了，蜷成了一个毛团）'}]);
}
function talkChicken(){
  game.chickenTalk++;
  sfx('blip');
  if(game.chickenTalk<3)startDialog([{who:'chicken',text:['咯咯哒？','咯咯…咯咯哒！','（小鸡歪着头看你）'][game.chickenTalk%3]}]);
  else if(game.chickenTalk===3)startDialog([{who:'chicken',text:'咯咯哒——！（它郑重地拍了拍翅膀，送上鸡生最真挚的祝福）'}],()=>{
    toast('🏆 隐藏成就：小鸡的祝福');
    flyHearts(innerWidth/2,innerHeight/2,4);
  });
  else startDialog([{who:'chicken',text:'咯咯哒~（它已经把祝福全部给你了）'}]);
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
        partner.scene='museum';partner.x=10*TILE;partner.y=5.5*TILE;
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
    toast(`🌱 种下星之种子（剩 ${game.seeds}）· 接水浇灌它吧`);
  }else if(p.st===1){
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
    toast(`⭐ 收获${golden?'「金色」':''}星之果实！（${game.fruits}/3）`);
    updateItemBar();
    const after=()=>{
      if(game.fruits>=3&&game.quest===1){
        startDialog([{who:'me',text:'集齐 3 颗星之果实了！果实在掌心拼出了一行字——'}],()=>{
          showOverlay(infoHTML(),()=>{
            setQuest(2);
            startDialog([{who:partnerRole(),text:'（TA 跑过来塞给你一根鱼竿）湖里有传说中的「同心鱼」，婚宴的压轴菜就靠你啦！栈道尽头见！'}],()=>{
              game.rod=true;toast('🎣 获得鱼竿！去湖边栈道尽头（跟着箭头）');
            });
          });
        });
      }
    };
    maybeFrag(golden?0.85:0.25,after);
  }
}

/* —— 杂货店 —— */
function openShop(){
  sfx('coin');
  game.mode='ui';
  const html=`<h3>🏪 杂货店</h3>
  <div class="body" style="text-align:center;font-size:12px;color:#8a5a2b">老板去喝喜酒了，自助购买，诚信经营～</div>
  <div class="trade-row"><div class="nm">🌱 星之种子</div><div class="pr">3 金币</div><button class="sdv-btn small" data-buy="seed">买</button></div>
  <div class="trade-row"><div class="nm">💜 魔法肥料（加速+金果）</div><div class="pr">5 金币</div><button class="sdv-btn small" data-buy="fert">买</button></div>
  <div class="trade-row"><div class="nm">🐟 卖出普通鱼 ×1</div><div class="pr">+6 金币</div><button class="sdv-btn small" data-sell="fish">卖</button></div>
  <div class="trade-row"><div class="nm">💰 当前金币</div><div class="pr" id="shopCoins">${game.coins}</div></div>`;
  showOverlay(html,null,'离开 ▶');
}
/* 商店按钮：全局事件委托（只绑一次，避免重复触发） */
overlayInner.addEventListener('click',e=>{
  const b=e.target.closest('button[data-buy],button[data-sell]');
  if(!b)return;
  if(b.dataset.buy==='seed'){
    if(game.coins<3)return toast('金币不够…去钓鱼卖钱吧');
    game.coins-=3;game.seeds++;sfx('coin');toast('购买成功：星之种子 +1');
  }else if(b.dataset.buy==='fert'){
    if(game.coins<5)return toast('金币不够…去钓鱼卖钱吧');
    game.coins-=5;game.fert++;sfx('coin');toast('购买成功：魔法肥料 +1');
  }else if(b.dataset.sell==='fish'){
    if(game.fishN<=0)return toast('背包里没有鱼。去湖边钓一条吧！');
    game.fishN--;game.coins+=6;sfx('coin');toast('卖出一条鱼 +6 金币');
  }
  const sc_=document.getElementById('shopCoins');if(sc_)sc_.textContent=game.coins;
  updateItemBar();
});

/* —— 博物馆 —— */
function showExhibit(i){
  const ex=RT.museum[i];
  game.exhibitSeen=true;
  sfx('choice');
  showOverlay(
    `<h3>🖼 ${esc(ex.title||('展品 '+(i+1)))}</h3>
     ${ex.img?`<img class="exhibit-img" src="${esc(ex.img)}" onerror="this.outerHTML='<div style=\\'font-size:12px;color:#8a5a2b\\'>（图片加载失败）</div>'">`:''}
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
      partner.scene='hall';partner.x=12.5*TILE;partner.y=3*TILE;partner.dir='down';
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
    showOverlay(`<h3>💫 记忆碎片</h3>${f.img?`<img class="exhibit-img" src="${esc(f.img)}">`:''}<div class="frag-card">${esc(f.text)}</div>`,null,'返回 ▶');
  });
});

/* ============================================================
 * 另一半的对话（按任务阶段）
 * ============================================================ */
function talkPartner(){
  const other=partnerRole();
  if(game.quest===0){
    startDialog([
      {who:other,text:'你来啦！我就知道你会先来找我。今天的云，像极了棉花糖。'},
      {who:'me',text:'当然，巡视农场的第一站永远是你。'},
      {who:other,text:'嘿嘿。考你一下——还记得我们第一次见面吗？',
        choices:CONFIG.meetChoices.map(c=>[c[0]]),
        onPick:i=>{game.meetReplyIdx=i;dlg.queue.splice(dlg.idx+1,0,{who:other,text:CONFIG.meetChoices[i][1]});}},
      {who:other,text:'对了！长老说，种出 3 颗「星之果实」，婚礼就会得到星星的祝福。'},
      {who:other,text:'种子和水壶都给你（其实早就备好啦）。农田在房子旁边，水不够就去水井或湖边接！'},
    ],()=>{
      game.seeds=3;game.water=3;
      toast('获得 <b style="color:#ffd84d">星之种子×3</b> 和 <b style="color:#7dc4ff">水壶(满)</b>');
      showOverlay(coupleHTML(),()=>setQuest(1));
      drawOverlayPortraits();
    });
  }else if(game.quest===1){
    const planted=Object.values(plots).some(p=>p.st>0);
    startDialog([{who:other,text:planted?'浇过水颜色会变深；杂货店的魔法肥料能加速，还可能结出金果哦。':'去篱笆围着的农田，靠近土地按 A 就能种下。水壶空了就去井边接水。'}]);
  }else if(game.quest===2){
    startDialog([{who:other,text:'鱼竿拿好！站上湖边栈道的尽头，面朝湖水按 A。按住 A 绿区上浮、松开下沉，罩住小鱼攒满进度！'}]);
  }else if(game.quest===3){
    startDialog([{who:other,text:'刚才邮递员来过！快回家看看那个红色邮箱。'}]);
  }else if(game.quest===4){
    if(!game.exhibitSeen)startDialog([{who:other,text:'欢迎来到「我们的回忆博物馆」！每件展品都值得一看——走近按 A。'}]);
    else museumQuestCheck();
  }else if(game.quest===5){
    startDialog([{who:other,text:'就等你啦。走上舞台来——仪式马上开始！'}]);
  }else{
    startDialog([{who:other,text:'婚礼达成 ♥ 桌上的香槟塔、钢琴、礼花筒都可以玩玩！'}]);
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
  }
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
        <label>图片（可填 URL，或选择本地图片转存）</label>
        <input type="text" data-f="img" data-i="${i}" value="${(it.img||'').startsWith('data:')?'(已存入本地图片)':esc(it.img||'')}" placeholder="https://... 或留空">
        <input type="file" accept="image/*" data-file="${i}" style="font-size:11px;margin-top:4px">
        ${it.img?`<img class="ed-thumb" src="${esc(it.img)}">`:''}
      </div>`).join('');
    showOverlay(
      `<h3>${isMu?'🖼 博物馆展品配置':'💫 记忆碎片配置'} <span style="font-size:11px;color:#8a5a2b">(${items.length}${isMu?'/12':''})</span></h3>
       <div class="body" style="font-size:12px;color:#8a5a2b;text-align:center">${isMu?'前 8 件挂墙上，9-12 件放展台':'农作/钓鱼/彩蛋时随机掉落'}</div>
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
  if(q>=2){game.rod=true;game.fruits=3;}
  if(q>=4){partner.scene='museum';partner.x=10*TILE;partner.y=5.5*TILE;}
  if(q>=5){partner.scene='hall';partner.x=12.5*TILE;partner.y=3*TILE;}
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