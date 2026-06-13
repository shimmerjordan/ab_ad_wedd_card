/* ============================================================
 * 像素素材
 * ============================================================ */
const PAL = {
  h:'#3b2a1e', H:'#7a4a2a',
  s:'#f8c890', e:'#4a2c17', b:'#f4a0a0', m:'#c75b5b',
  c:'#2e6fb0', C:'#1f4f80', p:'#3b4a6b', o:'#5b2c0e',
  d:'#ff9eb5', D:'#e07a96', f:'#ff5c8a',
  k:'#2b2b34', w:'#ffffff', t:'#c0392b', v:'#fdfdff', g:'#ffd84d',
  W:'#f5f0e8', y:'#f0b41e', r:'#d8483a',
  K:'#4a4a55', G:'#9a9aa8',                 // 小猫
};
const PORTRAIT_GROOM = [
'..hhhhhhhhhh..','.hhhhhhhhhhhh.','.hhhhhhhhhhhh.','.hhsssssssshh.',
'.hssssssssssh.','.hsseesseessh.','.hssssssssssh.','..sbssssssbs..',
'..ssssmmssss..','...ssssssss...','....kkkkkk....','..kkkwttwkkk..',
'..kkkwttwkkk..','..kkkwwwwkkk..','..kkkkkkkkkk..','...kkkkkkkk...'];
const PORTRAIT_BRIDE = [
'..vvvvvvvvvv..','.vvHHfHHHHHvv.','.vHHHHHHHHHHv.','.vHHssssssHHv.',
'.HHssssssssHH.','.HHseesseesHH.','.HHssssssssHH.','.HsbssssssbsH.',
'.HssssmmssssH.','.H.ssssssss.H.','.H..dddddd..H.','....dddddd....',
'...dddddddd...','..dddddddddd..','.dddddddddddd.','.dddddddddddd.'];
const G_DOWN = ['....hhhh....','..hhhhhhhh..','..hhhhhhhh..','..hssssssh..','..hsessesh..','..ssssssss..','...ssssss...','...cccccc...','..cccccccc..','..sccccccs..','..cccccccc..','...cccccc...'];
const G_UP   = ['....hhhh....','..hhhhhhhh..','..hhhhhhhh..','..hhhhhhhh..','..hhhhhhhh..','..hhhhhhhh..','...ssssss...','...cccccc...','..cccccccc..','..cccccccc..','..cccccccc..','...cccccc...'];
const G_SIDE = ['....hhhh....','...hhhhhh...','..hhhhhhhh..','..hhhhssss..','..hhhhsess..','..hhssssss..','...sssss....','...cccccc...','..cccccccc..','..cccccccs..','..cccccccc..','...cccccc...'];
const G_LEGA = ['...pppppp...','...pp..pp...','...pp..pp...','...oo..oo...'];
const G_LEGB = ['...pppppp...','..pp....pp..','..pp....pp..','..oo....oo..'];
const B_DOWN = ['....HHHH....','..HHHfHHHH..','..HHHHHHHH..','..HssssssH..','..HsessesH..','..HssssssH..','..H.ssss.H..','..HddddddH..','..dddddddd..','..sdddddds..','..dddddddd..','..dddddddd..'];
const B_UP   = ['....HHHH....','..HHHHHHHH..','..HHHHHHHH..','..HHHHHHHH..','..HHHHHHHH..','..HHHHHHHH..','..HHHHHHHH..','..HHddddHH..','..HddddddH..','..dddddddd..','..dddddddd..','..dddddddd..'];
const B_SIDE = ['....HHHH....','...HHHHHH...','..HHHHHHHH..','..HHHHssss..','..HHHHsess..','..HHHHssss..','..HHHssss...','..HHdddddd..','..Hddddddd..','..dddddddd..','..dddddddd..','...dddddd...'];
const B_LEGA = ['...dddddd...','...dddddd...','....s..s....','....o..o....'];
const B_LEGB = ['...dddddd...','..dddddddd..','...s....s...','...o....o...'];
const CHICKEN = ['...r....','..WWWW..','.WWWWWy.','WWWWWW..','.WWWW...','..W.W...'];
const CAT = ['K..K....','KKKK....','KeKK.KK.','KKKKKKK.','.KKKKKK.','..K..K..'];
function makeSheet(body,a,b){ return {A:body.concat(a), B:body.concat(b)}; }
const SPRITES = {
  groom:{down:makeSheet(G_DOWN,G_LEGA,G_LEGB),up:makeSheet(G_UP,G_LEGA,G_LEGB),side:makeSheet(G_SIDE,G_LEGA,G_LEGB)},
  bride:{down:makeSheet(B_DOWN,B_LEGA,B_LEGB),up:makeSheet(B_UP,B_LEGA,B_LEGB),side:makeSheet(B_SIDE,B_LEGA,B_LEGB)},
};
function blit(ctx,map,x,y,flip){
  for(let r=0;r<map.length;r++){
    const row=map[r];
    for(let c=0;c<row.length;c++){
      const ch=flip?row[row.length-1-c]:row[c];
      if(ch==='.')continue;
      ctx.fillStyle=PAL[ch]||'#000';
      ctx.fillRect(x+c,y+r,1,1);
    }
  }
}
const frameCache=new Map();
function getFrame(map,flip){
  const key=map.join('')+(flip?'F':'');
  if(frameCache.has(key))return frameCache.get(key);
  const cvv=document.createElement('canvas');
  cvv.width=map[0].length;cvv.height=map.length;
  blit(cvv.getContext('2d'),map,0,0,flip);
  frameCache.set(key,cvv);
  return cvv;
}
function drawPortrait(canvas,map){
  const c=canvas.getContext('2d');
  c.clearRect(0,0,canvas.width,canvas.height);
  blit(c,map,(canvas.width-14)/2|0,0,false);
}
function hash(x,y){ return ((x*73856093)^(y*19349663))>>>0; }

/* ============================================================
 * 星露谷正版素材加载（加载失败/离线时自动回退到上面的程序化像素画）
 * 素材: github.com/Huu-Yuu/StardewValley-Assets (© ConcernedApe, 非商用)
 * ============================================================ */
const IMGS = {};
const ASSET_MANIFEST = {
  charGroom:'assets/elem/char_groom.png',  charBride:'assets/elem/char_bride.png',
  portGroom:'assets/elem/port_groom.png',  portBride:'assets/elem/port_bride.png',
  chicken:'assets/elem/chicken.png',       cat:'assets/elem/cat.png',
  tree:'assets/elem/tree.png',             sunflower:'assets/elem/sunflower.png',
  well:'assets/elem/well.png',             house1:'assets/elem/house1.png', house2:'assets/elem/house2.png',
  /* 建筑立面 */
  shopB:'assets/elem/shopB.png', museumB:'assets/elem/museumB.png', hallB:'assets/elem/hallB.png',
  /* 博物馆内饰 */
  shelfBig:'assets/elem/shelfBig.png',
  skeleton:'assets/elem/skeleton.png', skeleton2:'assets/elem/skeleton2.png',
  bookshelf:'assets/elem/bookshelf.png', pillar:'assets/elem/pillar.png',
  plantA:'assets/elem/plantA.png', plantB:'assets/elem/plantB.png', rugOval:'assets/elem/rugOval.png',
  paintJelly:'assets/elem/paintJelly.png', paintGreen:'assets/elem/paintGreen.png',
  paintCity:'assets/elem/paintCity.png',   paintBoat:'assets/elem/paintBoat.png',
  paintBeach:'assets/elem/paintBeach.png', paintHills:'assets/elem/paintHills.png',
  paintSunset:'assets/elem/paintSunset.png', paintNight:'assets/elem/paintNight.png',
  /* 节日/殿堂装饰 */
  maypole:'assets/elem/maypole.png',
  tableRedA:'assets/elem/tableRedA.png', tableRedB:'assets/elem/tableRedB.png',
  /* 室内地板墙纸 */
  floorMuseum:'assets/elem/floorMuseum.png', floorHall:'assets/elem/floorHall.png',
  wallMuseum:'assets/elem/wallMuseum.png',   wallHall:'assets/elem/wallHall.png',
  /* 植被 */
  bushFl:'assets/elem/bushFl.png', bushSm1:'assets/elem/bushSm1.png', bushSm2:'assets/elem/bushSm2.png',
  tree2:'assets/elem/tree2.png', tree3:'assets/elem/tree3.png',
  /* 花田花卉(作物终阶) + 盆栽 */
  flowerA:'assets/elem/flowerA.png', flowerB:'assets/elem/flowerB.png',
  flowerC:'assets/elem/flowerC.png', flowerSprout:'assets/elem/flowerSprout.png',
  potA:'assets/elem/potA.png', potB:'assets/elem/potB.png', potC:'assets/elem/potC.png',
};
/* 8 幅挂壁油画键名（博物馆展位 1-8） */
const PAINT_KEYS=['paintJelly','paintGreen','paintCity','paintBoat','paintBeach','paintHills','paintSunset','paintNight'];
/* 猫全图 32x32/帧 4列: 行1=向右走 行7=蜷睡 行0=坐姿 */
const CAT_F={ walkRow:1, sleepY:224, sitY:0 };
for(const k in ASSET_MANIFEST){
  const im=new Image();
  im.onload=()=>{im._ok=true;};
  im.onerror=()=>{im._ok=false;};
  im.src=ASSET_MANIFEST[k];
  IMGS[k]=im;
}
function img(k){ const im=IMGS[k]; return im&&im._ok?im:null; }

/* 行走图布局: 16x32/帧, 4帧/行, 行序: 0下 1右 2上 3左 */
function charRow(dir,flip){ return dir==='down'?0 : dir==='up'?2 : (flip?3:1); }
function charImgFor(role){ return img(role==='groom'?'charGroom':'charBride'); }

/* 带翻转的 spritesheet 绘制 */
function drawSprite(ctx,im,sx,sy,sw,sh,dx,dy,flip){
  if(!flip){ ctx.drawImage(im,sx,sy,sw,sh,dx,dy,sw,sh); return; }
  ctx.save(); ctx.translate(dx+sw,dy); ctx.scale(-1,1);
  ctx.drawImage(im,sx,sy,sw,sh,0,0,sw,sh); ctx.restore();
}

/* 把肖像画进 64x64 画布（素材优先，回退字符画×4) */
function portraitInto(canvas, who){
  const c=canvas.getContext('2d');
  c.imageSmoothingEnabled=false;
  c.clearRect(0,0,canvas.width,canvas.height);
  if(who==='groom'||who==='bride'){
    const im=img(who==='groom'?'portGroom':'portBride');
    if(im){ c.drawImage(im,0,0,64,64,0,0,64,64); return; }
    c.save(); c.translate(4,0); c.scale(4,4);
    blit(c, who==='groom'?PORTRAIT_GROOM:PORTRAIT_BRIDE, 0,0,false);
    c.restore(); return;
  }
  if(who==='chicken'){
    const im=img('chicken');
    if(im){ c.drawImage(im,0,0,16,16,8,8,48,48); return; }
    c.save(); c.translate(8,14); c.scale(4,4); blit(c,CHICKEN,0,0,false); c.restore(); return;
  }
  /* cat */
  const im=img('cat');
  if(im){ c.drawImage(im,0,0,32,32,0,0,64,64); return; }
  c.save(); c.translate(8,14); c.scale(4,4); blit(c,CAT,0,0,false); c.restore();
}
/* 标题屏角色卡（16x32 画布） */
function titleCardInto(canvas, role){
  const c=canvas.getContext('2d');
  c.imageSmoothingEnabled=false;
  c.clearRect(0,0,canvas.width,canvas.height);
  const im=charImgFor(role);
  if(im){ c.drawImage(im,0,0,16,32,0,0,16,32); return; }
  blit(c, SPRITES[role].down.A, 2, 16, false);
}

/* 个人照片解析：纯文件名 → assets/imgs/<名>；URL/dataURL 原样 */
function resolveImg(v){
  if(!v) return '';
  if(/^(https?:|data:|\.{0,2}\/)/.test(v)) return v;
  return 'assets/imgs/'+v;
}
