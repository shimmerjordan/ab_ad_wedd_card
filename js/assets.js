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
  tree:'assets/elem/tree.png',
  well:'assets/elem/well.png',             house1:'assets/elem/house1.png', house2:'assets/elem/house2.png',
  /* 建筑立面 */
  shopB:'assets/elem/shopB.png', museumB:'assets/elem/museumB.png', hallB:'assets/elem/hallB.png',
  /* 博物馆内饰 */
  shelfBig:'assets/elem/shelfBig.png',
  skeleton:'assets/elem/skeleton.png', skeleton2:'assets/elem/skeleton2.png',
  pillar:'assets/elem/pillar.png',
  plantA:'assets/elem/plantA.png', plantB:'assets/elem/plantB.png', rugOval:'assets/elem/rugOval.png',
  paintJelly:'assets/elem/paintJelly.png', paintGreen:'assets/elem/paintGreen.png',
  paintCity:'assets/elem/paintCity.png',   paintBoat:'assets/elem/paintBoat.png',
  paintBeach:'assets/elem/paintBeach.png', paintHills:'assets/elem/paintHills.png',
  paintSunset:'assets/elem/paintSunset.png', paintNight:'assets/elem/paintNight.png',
  /* 节日/殿堂装饰 */
  maypole:'assets/elem/maypole.png',
  tableRedA:'assets/elem/tableRedA.png', tableRedB:'assets/elem/tableRedB.png',
  /* 殿堂真素材：红圆桌/多层蛋糕/红毯舞台地毯/蜡烛/圣诞树/菜品 */
  tblRed:'assets/elem/tblRed.png', cakePink:'assets/elem/cakePink.png',
  cakeTier:'assets/elem/cakeTier.png', candle:'assets/elem/candle.png',
  xmasTree:'assets/elem/xmasTree.png',
  food1:'assets/elem/food1.png', food2:'assets/elem/food2.png', food3:'assets/elem/food3.png',
  food4:'assets/elem/food4.png', food5:'assets/elem/food5.png', food6:'assets/elem/food6.png',
  rugStage:'assets/elem/rugStage.png', lampPost:'assets/elem/lampPost.png',
  /* 室内地板墙纸 */
  floorMuseum:'assets/elem/floorMuseum.png', floorHall:'assets/elem/floorHall.png',
  wallMuseum:'assets/elem/wallMuseum.png',   wallHall:'assets/elem/wallHall.png',
  /* 栅栏(秋季户外图集真素材) */
  fenceH:'assets/elem/fenceH.png', fenceV:'assets/elem/fenceV.png',
  /* 耕地/鸡舍/码头/海滩装饰(星露谷真素材) */
  dockWood:'assets/elem/dockWood.png', rowboat:'assets/elem/rowboat.png',
  tilled:'assets/elem/tilled.png', tilledWet:'assets/elem/tilledWet.png',
  hoeDirt:'assets/elem/hoeDirt.png', slotBox:'assets/elem/slotBox.png',
  /* 工具图标(tools.png 真素材) + 路障(paths.png 真素材) */
  toolPick:'assets/elem/toolPick.png', toolAxe:'assets/elem/toolAxe.png', toolHoe:'assets/elem/toolHoe.png',
  obsRock:'assets/elem/obsRock.png', obsRock2:'assets/elem/obsRock2.png',
  obsWeed:'assets/elem/obsWeed.png', obsWeed2:'assets/elem/obsWeed2.png', obsWeed3:'assets/elem/obsWeed3.png',
  obsBranch:'assets/elem/obsBranch.png', obsBush:'assets/elem/obsBush.png',
  /* 装饰：盆栽家具(furniture.png) */
  furnPlant1:'assets/elem/furnPlant1.png', furnPlant2:'assets/elem/furnPlant2.png', furnPlant3:'assets/elem/furnPlant3.png',
  coopB:'assets/elem/coopB.png', dock:'assets/elem/dock.png',
  palm:'assets/elem/palm.png', lantern:'assets/elem/lantern.png',
  gift1:'assets/elem/gift1.png', gift2:'assets/elem/gift2.png', gift3:'assets/elem/gift3.png',
  balloon:'assets/elem/balloon.png',
  /* 植被 */
  bushFl:'assets/elem/bushFl.png', bushSm1:'assets/elem/bushSm1.png', bushSm2:'assets/elem/bushSm2.png',
  tree2:'assets/elem/tree2.png', tree3:'assets/elem/tree3.png',
  /* 花田花卉(作物终阶) + 盆栽 */
  flowerA:'assets/elem/flowerA.png', flowerB:'assets/elem/flowerB.png',
  flowerC:'assets/elem/flowerC.png', flowerSprout:'assets/elem/flowerSprout.png',
  potA:'assets/elem/potA.png', potB:'assets/elem/potB.png', potC:'assets/elem/potC.png',
  /* 鱼获(springobjects 真素材) + 钓鱼杂物 */
  fishCarp:'assets/elem/fishCarp.png', fishPerch:'assets/elem/fishPerch.png',
  fishTrout:'assets/elem/fishTrout.png', fishHeart:'assets/elem/fishHeart.png',
  junkWeed:'assets/elem/junkWeed.png', junkTrash:'assets/elem/junkTrash.png',
  /* 宝石(springobjects 真素材)：挖矿获得, 可捐博物馆/出售/送人 */
  gemAmethyst:'assets/elem/gemAmethyst.png', gemAqua:'assets/elem/gemAqua.png',
  gemTopaz:'assets/elem/gemTopaz.png', gemRuby:'assets/elem/gemRuby.png',
  gemDiamond:'assets/elem/gemDiamond.png',
  /* 婚礼宾客 NPC(镇民立绘, 不与新郎新娘立绘同款) + 主持人 */
  npcAbigail:'assets/elem/npcAbigail.png', npcSebastian:'assets/elem/npcSebastian.png',
  npcCaroline:'assets/elem/npcCaroline.png', npcEmily:'assets/elem/npcEmily.png',
  npcMaru:'assets/elem/npcMaru.png', npcHarvey:'assets/elem/npcHarvey.png',
  npcSam:'assets/elem/npcSam.png', npcPenny:'assets/elem/npcPenny.png',
  npcGus:'assets/elem/npcGus.png', npcLeah:'assets/elem/npcLeah.png',
  npcLewis:'assets/elem/npcLewis.png', npcEvelyn:'assets/elem/npcEvelyn.png',
  /* 商店老板皮埃尔(肖像) */
  portPierre:'assets/elem/portPierre.png',
  /* 新作物条带(8帧 16x32) + 果实图标 */
  cropStraw:'assets/elem/cropStraw.png', cropBlue:'assets/elem/cropBlue.png',
  iconStraw:'assets/elem/iconStraw.png', iconBlue:'assets/elem/iconBlue.png',
  /* 农场狗(坐姿) + 湖面鸭子(两帧浮水) */
  dogSit:'assets/elem/dogSit.png',
  duckA:'assets/elem/duckA.png', duckB:'assets/elem/duckB.png',
};
/* 8 幅挂壁油画键名（博物馆展位 1-8） */
const PAINT_KEYS=['paintJelly','paintGreen','paintCity','paintBoat','paintBeach','paintHills','paintSunset','paintNight'];
/* 猫全图 32x32/帧 4列: 行1=向右走 行7=蜷睡 行0=坐姿 */
const CAT_F={ walkRow:1, sleepY:224, sitY:0 };
/* 素材版本号：更新素材后 +1，强制宾客浏览器绕过旧缓存（file:// 直开不加参数） */
const ASSET_VER='3';
for(const k in ASSET_MANIFEST){
  const im=new Image();
  im.onload=()=>{im._ok=true;};
  im.onerror=()=>{im._ok=false;};
  im.src=ASSET_MANIFEST[k]+(location.protocol==='file:'?'':'?v='+ASSET_VER);
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
    /* 自定义头像(config.groomAvatar/brideAvatar：assets/imgs 文件名或图床URL)优先 */
    const custom=who==='groom'?CONFIG.groomAvatar:CONFIG.brideAvatar;
    if(custom){
      const cim=loadPhoto(resolveImg(custom));
      if(cim._ok){ coverDraw(c,cim,0,0,canvas.width,canvas.height); return; }
      cim.addEventListener('load',()=>portraitInto(canvas,who),{once:true});   // 加载完成后重绘
    }
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
  if(who==='mayor'){
    const im=img('npcLewis');
    if(im){ c.drawImage(im,2,1,12,12,8,8,48,48); return; }   // 头部特写放大
    c.fillStyle='#5a3413'; c.fillRect(16,16,32,32); return;
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
/* 个人照片(头像/合照/婚纱照)统一缓存加载；带 _ok 标记 */
const _photoCache={};
function loadPhoto(src){
  let im=_photoCache[src];
  if(!im){ im=new Image(); im._ok=false; im.onload=()=>im._ok=true; im.onerror=()=>im._ok=false; im.src=src; _photoCache[src]=im; }
  return im;
}
/* 等比裁剪铺满目标矩形(cover) */
function coverDraw(c,im,x,y,w,h){
  const s=Math.max(w/im.width,h/im.height), sw=w/s, sh=h/s;
  c.imageSmoothingEnabled=true;
  c.drawImage(im,(im.width-sw)/2,(im.height-sh)/2,sw,sh, x,y,w,h);
}
