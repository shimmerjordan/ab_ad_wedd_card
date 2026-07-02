/* ============================================================
 * 场景与地图：运行时配置(RT/DEBUG) + 程序化生成世界/博物馆/殿堂 + 建筑/装饰/工具/障碍素材表 + SCENES
 * （由原 game.js 按职责拆分，多文件共享全局作用域；保持原加载顺序）
 * ============================================================ */
/* ============================================================
 * 运行时配置：默认值 ⊕ wedding-config.json ⊕ localStorage(DEBUG改的)
 * 桌位分享: ?gn=姓名&gt=桌号(自包含) 或 ?g=姓名(查表)
 * ============================================================ */
const LS = { museum:'wedd_museum', seats:'wedd_seats', frags:'wedd_frags', hallPhotos:'wedd_hallphotos', debug:'wedd_debug' };
function lsGet(k){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):null; }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){ toast('保存失败：存储空间不足'); } }
function lsDel(k){ try{ localStorage.removeItem(k); }catch(e){} }
const RT = { museum:CONFIG.museum, seats:CONFIG.seats, frags:CONFIG.frags, hallPhotos:CONFIG.hallPhotos||[] };
function applyLocal(){
  for(const k of ['museum','seats','frags','hallPhotos']){
    const v=lsGet(LS[k]); if(v&&Array.isArray(v)) RT[k]=v;
  }
}
applyLocal();
/* 站点部署可提交 wedding-config.json 让宾客也读到配置（file:// 直开时跳过, 避免 CORS 报错） */
if(location.protocol!=='file:')
  fetch('wedding-config.json').then(r=>r.ok?r.json():null).then(j=>{
    if(!j) return;
    for(const k of ['museum','seats','frags','hallPhotos']) if(Array.isArray(j[k]) && !lsGet(LS[k])) RT[k]=j[k];
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
  if(GUEST&&gh){ gh.style.display='block'; gh.innerHTML=`🎫 ${esc(GUEST.name)} 您好，欢迎来玩这份请帖！<br><span style="font-size:11px;opacity:.8">走完旅程就能看到完整的婚礼邀请～</span>`; }
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

/* —— 户外大世界 44x46（镇区拓宽, 三栋建筑拉开间距） ——
 *  新增地块: B 开花灌木(可跳过) u 小灌木(装饰) G 觅食灌木(采谷粒) */
function buildWorld(){
  const W=44,H=46,g=grid(W,H,'.');
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
  hline(g,8,15,6,'f'); hline(g,8,10,10,'f'); hline(g,13,15,10,'f');   // 底部中间留门(x11-12)可走进去耕地
  vline(g,8,7,9,'f');  vline(g,15,6,12,'f');      // x15 右墙做农田/鸡舍「共用单层隔墙」(纵贯 y6-12)
  /* 鸡舍运动场（加大；鸡舍建筑在北侧, 围栏运动场内有 2 只鸡 + 宝箱, 跳进去） */
  hline(g,16,22,7,'f'); hline(g,16,22,12,'f');
  vline(g,22,8,11,'f');                           // 左墙与农田共用 x15 隔墙(不再单独建一层)
  /* 花田（东南） */
  for(let y=25;y<=30;y++)for(let x=26;x<=33;x++) if(hash(x,y)%3<2) g[y][x]='F';
  /* 西边小树林 + 神秘草丛(蛋) */
  for(const [tx,ty] of [[2,20],[4,21],[2,24],[5,25],[3,27],[2,31],[5,30],[3,34],[6,33],[2,38],[5,38],[3,42]]) g[ty][tx]='T';
  /* 路网：家→主路（横贯镇区门前）→各门口→殿堂门前广场 */
  vline(g,5,6,22,':');                        // 家门口往南
  hline(g,5,40,22,':');                       // 主路
  vline(g,7,21,22,':');                       // 杂货店门口(footprint x4-14)
  vline(g,24,21,22,':');                      // 博物馆门口(footprint x19-27)
  vline(g,33,21,22,':');                      // 邻居门口(footprint x31-37)
  vline(g,30,11,14,':'); hline(g,30,31,14,':'); vline(g,31,14,21,':'); // 湖→主路
  vline(g,18,22,30,':');                      // 主路往南
  hline(g,18,26,30,':');                      // 往花田
  vline(g,24,30,40,':');                      // 绕殿堂东侧
  hline(g,17,24,40,':');                      // 殿堂门前横路
  rect(g,15,37,20,39,':');                    // ★ 殿堂门前广场（直达大门）
  vline(g,17,36,37,':'); vline(g,18,36,37,':');
  /* 开花灌木(B, 可跳)与小灌木(u, 装饰)：建筑间隙也补绿植 */
  for(const [bx,by] of [[16,18],[29,18],[7,24],[14,24],[25,23],[38,19],[12,31],[26,33],[33,33],[10,38],[26,41],[31,38],[40,24],[41,32]]) if(g[by][bx]==='.') g[by][bx]='B';
  for(const [ux,uy] of [[17,19],[28,19],[30,19],[39,18],[8,20],[41,22],[6,27],[13,27],[21,28],[40,30],[9,34],[21,34],[30,35],[14,42],[22,43],[28,43],[38,40],[42,18]]) if(g[uy][ux]==='.') g[uy][ux]='u';
  /* 觅食灌木(G: 鸡饲料谷粒) */
  for(const [gx,gy] of [[16,17],[40,20],[42,32],[26,31],[6,40]]) if(g[gy][gx]==='.') g[gy][gx]='G';
  /* 草丛点缀 */
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++) if(g[y][x]==='.'&&hash(x,y)%13===0) g[y][x]=',';
  /* 树木点缀（避开空地建筑） */
  const forb=(x,y)=> (x>=1&&x<=10&&y>=1&&y<=10)||(x>=7&&x<=16&&y>=5&&y<=11)||(x>=15&&x<=23&&y>=2&&y<=13)||
    (x>=20&&x<=35&&y>=0&&y<=14)||(x>=3&&x<=40&&y>=11&&y<=23)||(x>=24&&x<=35&&y>=24&&y<=31)||
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
/* —— 婚礼殿堂内景 27x23：墙面3行+舞台+中央红毯+15 圆桌宴会区(5列3排, 收紧) —— */
function buildHall(){
  const W=27,H=23,g=grid(W,H,'w');
  rect(g,0,0,W-1,2,'W');
  hline(g,0,W-1,H-1,'W');
  vline(g,0,0,H-1,'W'); vline(g,W-1,0,H-1,'W');
  rect(g,8,3,17,6,'S');                         // 舞台(居中 x12.5)
  rect(g,12,7,13,H-1,'c');                       // 中央红毯主道(居中, 直达门口)
  return {w:W,h:H,g};
}

/* —— 建筑（img=星露谷立面素材, 底边对齐地基; 无图时回退参数化绘制） —— */
const BUILDINGS = [
  {key:'home',   x:2, y:2, w:6, h:4, wall:'#e8d5a8', roof:'#b04a3a', label:'',
   door:{x:5.5,w:1,  act:'homeDoor'}},
  {key:'shop',   x:4, y:17,w:10,h:4, wall:'#f0e0b8', roof:'#b04a3a', label:'杂货店',
   img:'shopB', doorOff:30, doorW:40,
   door:{x:7,   w:1.6,act:'shop'}},
  {key:'museum', x:19,y:17,w:8, h:4, wall:'#e8e0d0', roof:'#5a6fb0', label:'博物馆',
   img:'museumB', doorOff:64, doorW:32,
   door:{x:24,  w:1.6,act:'enterMuseum'}},
  {key:'nb1',    x:31,y:17,w:6, h:4, wall:'#e8d5a8', roof:'#c9772e', label:'',
   img:'house1', doorOff:40, doorW:30,
   door:{x:33,  w:1,  act:'nbDoor'}},
  {key:'coop',   x:16,y:3, w:4, h:4, wall:'#7ec850', roof:'#8c5a2b', label:'',
   img:'coopB',
   door:{x:18,  w:1,  act:'coopDoor'}},
  {key:'hall',   x:13,y:33,w:10,h:4, wall:'#f5ead0', roof:'#c0392b', label:'婚礼殿堂',
   img:'hallB', doorOff:66, doorW:48,
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
  chest:  {x:18*TILE+2,y:9*TILE+2, w:14, h:12},   // 鸡舍运动场内的宝箱(跳进去)
  bush:   {x:3*TILE,   y:22*TILE,  w:16, h:14},   // 神秘草丛(跳3次彩蛋)
};
/* 户外装饰：门前干净盆栽(各家门口两侧, 小碰撞盒) + 湖边海滩装饰(无碰撞) */
const WDECOR = [
  /* 殿堂门前 */
  {img:'potA', x:15.2*TILE, y:36.4*TILE, w:14, h:10, solid:1},
  {img:'potC', x:16.2*TILE, y:36.4*TILE, w:14, h:10, solid:1},
  {img:'potC', x:19.4*TILE, y:36.4*TILE, w:14, h:10, solid:1},
  {img:'potA', x:20.4*TILE, y:36.4*TILE, w:14, h:10, solid:1},
  /* 博物馆门前：圣诞树装饰(去掉盆栽; 立于门两侧, 小碰撞盒; 缩小 1/2) */
  {img:'xmasTree', x:21.7*TILE, y:21.2*TILE, w:16, h:10, solid:1, scale:0.5},
  {img:'xmasTree', x:25.6*TILE, y:21.2*TILE, w:16, h:10, solid:1, scale:0.5},
  /* 杂货店门前(door≈x7) */
  {img:'potC', x:5.4*TILE,  y:20.5*TILE, w:14, h:10, solid:1},
  {img:'potA', x:8.4*TILE,  y:20.5*TILE, w:14, h:10, solid:1},
  /* —— 湖边海滩装饰(summer_beach 元素, 无碰撞) —— */
  {img:'palm',    x:24*TILE,   y:11.2*TILE},
  {img:'palm',    x:34*TILE,   y:10.5*TILE},
  {img:'palm',    x:35.5*TILE, y:3.5*TILE},
  {img:'lantern', x:27.6*TILE, y:11*TILE},
  {img:'lantern', x:31*TILE,   y:11*TILE},
  /* 湖面小木船(浮在水面, 无碰撞) */
  {img:'rowboat', x:24.5*TILE, y:4*TILE,  boat:1},
  {img:'rowboat', x:32*TILE,   y:8.5*TILE,boat:1},
  /* —— 盆栽家具(furniture.png 真素材, 无碰撞)：户外点缀 —— */
  {img:'furnPlant1', x:1.4*TILE,  y:15.4*TILE},
  {img:'furnPlant2', x:40*TILE,   y:13.6*TILE},
  {img:'furnPlant3', x:38.4*TILE, y:24.4*TILE},
];
/* 殿堂内对象：12 圆桌(左右各 6 桌 = 2 列×3 排, 对称) + 互动点 */
const TABLE_POS=[
  [2,9.5],[7,9.5],[18,9.5],[23,9.5],
  [2,13],[7,13],[18,13],[23,13],
  [2,16.5],[7,16.5],[18,16.5],[23,16.5],
];
const HOBJ = {
  piano:  {x:1.3*TILE, y:3.0*TILE, w:46, h:30},
  tower:  {x:21.4*TILE,y:3.6*TILE, w:30, h:30},
  poleL:  {x:1*TILE,  y:18.6*TILE, w:24, h:18, img:'maypole'},
  poleR:  {x:24.6*TILE,y:18.6*TILE,w:24, h:18, img:'maypole'},
  popperL:{x:8*TILE,  y:3.0*TILE, w:12, h:16},
  popperR:{x:17*TILE, y:3.0*TILE, w:12, h:16},
};
/* 婚纱照展板(立式相框, 红毯两侧/入口处, 带碰撞; 内容取 RT.hallPhotos 按文件名) */
/* 婚纱照展板：靠左右两侧紧凑成对, 避开中央舞台(x8-17)与红毯过道 */
const HALLPHOTO_POS=[[2.8,7.0],[5.5,7.0],[18.5,7.0],[21.3,7.0]];
/* 喜宴宾客(镇民 NPC)：围站在各圆桌旁([tileX,tileY,素材,翻转])；礼成后会鼓掌冒心 */
const HALL_GUESTS=[
  [3.4,8.7,'npcAbigail',0],[6.0,8.9,'npcSebastian',1],
  [18.4,8.7,'npcCaroline',0],[23.6,8.9,'npcSam',1],
  [1.6,12.3,'npcEmily',0],[7.9,12.4,'npcMaru',1],
  [18.0,12.2,'npcHarvey',0],[24.0,12.4,'npcPenny',1],
  [3.2,15.8,'npcGus',0],[22.6,15.8,'npcLeah',1],
  [6.6,16.0,'npcEvelyn',0],
];
/* 主持人(镇长)：舞台上新人左侧（再靠后会被拱门花环挡住） */
const HALL_MAYOR={x:11.0*TILE, y:4.5*TILE};
/* 殿堂内装饰（无碰撞）：盆栽对称列于舞台两侧 + 红毯夹道 */
const HDECOR = [
  {img:'potB', x:8.2*TILE, y:6.4*TILE},
  {img:'potB', x:16.0*TILE,y:6.4*TILE},
  {img:'potC', x:10.4*TILE,y:7.6*TILE},
  {img:'potC', x:14.4*TILE,y:7.6*TILE},
  /* 盆栽家具(furniture.png)：背墙两角, 充实四周 */
  {img:'furnPlant1', x:0.7*TILE,  y:4.8*TILE},
  {img:'furnPlant2', x:25.2*TILE, y:4.8*TILE},
];
/* —— 殿堂「四周」装饰：仅保留落地灯, 左右侧墙等距排布(去掉棕榈/窗/气球, 简洁) —— */
/* 落地灯(lampPost 立灯, 暖光呼吸; [x,y] tile 坐标)；左 x0.5 右 x25.6, 各 4 盏, y 等距 4 格 */
const HLAMP = (()=>{
  const ys=[5.5,9.5,13.5,17.5], a=[];
  ys.forEach(y=>{ a.push([0.5,y]); a.push([25.6,y]); });
  return a;
})();
/* 殿堂烛灯：沿红毯(x12-13)两侧成对排开, 共 8 盏(每侧 4 盏, 不再压在花拱门柱子上) */
const HCANDLE=[
  [11.3,9],[14,9],[11.3,12],[14,12],[11.3,15],[14,15],[11.3,18],[14,18],
];
const HFEST=[
  {img:'balloon',x:6.4*TILE, y:3.2*TILE},
  {img:'balloon',x:17.8*TILE,y:3.2*TILE},
  {img:'gift1',  x:8.6*TILE, y:6.4*TILE},
  {img:'gift2',  x:10.2*TILE,y:6.4*TILE},
  {img:'gift3',  x:14.4*TILE,y:6.4*TILE},
  {img:'gift1',  x:16.0*TILE,y:6.4*TILE},
];
/* 博物馆展位：
 *  1-4 → 上墙油画(矿架两侧各2幅, 像素坐标)
 *  5-12 → 中央两排圆木桌展台(tile 坐标) */
const EX_WALL_PX=[[26,8],[74,8],[296,8],[344,8]];
const EX_TBL=[[3,5],[9,5],[15,5],[21,5],[3,10],[9,10],[15,10],[21,10]];
const MUSEUM_PAINTS=['paintBoat','paintHills','paintSunset','paintNight'];
/* 博物馆家具(贴地摆放, 带碰撞)；书架/留言台为程序化绘制(切图始终完整) */
const MOBJ = {
  bookL:{x:4.6*TILE, y:15*TILE,   w:38, h:40, proc:'bookcase'},
  bookR:{x:19*TILE,  y:15*TILE,   w:38, h:40, proc:'bookcase'},
  skel: {x:11.4*TILE,y:7.6*TILE,  w:50, h:22, img:'skeleton'},
  guest:{x:16*TILE,  y:15*TILE,   w:26, h:26, proc:'guestbook'},
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
  if(from==='world') return to==='museum' ? {x:24.5*TILE,y:21*TILE} : {x:18*TILE,y:37*TILE};
  return {x:12.5*TILE, y:(SCENES[from].h-1)*TILE};
}

