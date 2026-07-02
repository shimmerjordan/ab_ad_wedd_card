/* ============================================================
 * 玩法循环：钓鱼小游戏(星露谷式三段) + 每帧 update(移动/跳跃/互动触发/出入口)
 * （由原 game.js 按职责拆分，多文件共享全局作用域；保持原加载顺序）
 * ============================================================ */
/* ============================================================
 * 钓鱼小游戏 —— 抛竿等待 → 「!」咬钩 → 拉扯条（星露谷式）
 *  · 鱼种有权重/卖价/习性(dart 越高越爱乱窜)
 *  · 全程绿区不脱鱼 = 「完美」，卖价 ×1.5
 *  · 拉扯中随机出现「喜礼盒」，罩住集满可得额外奖励
 * ============================================================ */
const FISH_SPECIES=[
  {key:'carp', name:'金鲤鱼', icon:'fishCarp', price:6,  weight:50, dart:0.25, speed:30},
  {key:'perch',name:'银梭鱼', icon:'fishPerch',price:10, weight:32, dart:0.8,  speed:44},
  {key:'trout',name:'红鲷鱼', icon:'fishTrout',price:16, weight:18, dart:1.6,  speed:58},
];
const FISH_HEART={key:'heart',name:'同心鱼',icon:'fishHeart',price:0,weight:0,dart:1.2,speed:50};
const JUNK_ITEMS=[
  {key:'weed', name:'水草', icon:'junkWeed'},
  {key:'trash',name:'破烂', icon:'junkTrash'},
];
/* 拉扯条逻辑空间：轨道高 200，鱼中心 fy∈[8,192]，绿区顶 zone∈[0,200-zoneH] */
const FISH_L=200;
const fish={
  phase:'idle',            // idle|wait|bite|reel
  waitT:0, biteT:0, t:0,
  sp:null, quest:false, junk:null,
  zone:70, zoneV:0, zoneH:56,
  fy:60, fv:0, tgt:100, dartT:0,
  prog:30, everOut:false,
  tr:null, trAt:-1, trGot:false,
};
const fishHint=document.getElementById('fishHint');
function fishHintText(html){ fishHint.style.display='block'; fishHint.innerHTML=html; }
/* 随权重抽一条鱼 */
function rollFishSpecies(rng){
  const total=FISH_SPECIES.reduce((s,f)=>s+f.weight,0);
  let r=(rng||Math.random)()*total;
  for(const f of FISH_SPECIES){ r-=f.weight; if(r<0)return f; }
  return FISH_SPECIES[0];
}
function startFishing(){
  game.mode='fish';
  fish.phase='wait';
  fish.t=0;
  fish.waitT=1.2+Math.random()*2.6;
  fish.quest=(game.quest===2&&!game.fishQ);
  fish.junk=null; fish.trGot=false; fish.tr=null;
  fishHintText('🎣 浮标已抛出…耐心等鱼咬钩<br>（按 A 可提前收竿）');
  sfx('cast');
}
function fishBite(){
  fish.phase='bite'; fish.biteT=0.9;
  /* 咬钩瞬间决定钓物：任务鱼 > 杂物(12%) > 按权重抽鱼 */
  if(fish.quest){ fish.sp=FISH_HEART; }
  else if(Math.random()<0.12){ fish.junk=JUNK_ITEMS[Math.random()*JUNK_ITEMS.length|0]; fish.sp=null; }
  else fish.sp=rollFishSpecies();
  fishHintText('<b style="color:#ffd84d">❗ 咬钩了！快按 A！</b>');
  sfx('bite');
}
function startReel(){
  game.bait--; updateItemBar();          // 上钩才消耗鱼饵（等待期收竿不亏饵）
  /* 杂物：没有搏斗，直接拽上来 */
  if(fish.junk){ endFishing('junk'); return; }
  fish.phase='reel';
  fish.zone=70; fish.zoneV=0; fish.zoneH=56;
  fish.fy=100; fish.fv=0; fish.tgt=100; fish.dartT=0.4;
  fish.prog=30; fish.everOut=false;
  fish.tr=null; fish.trGot=false;
  fish.trAt=(!fish.quest&&Math.random()<0.30)?fish.t+1.2+Math.random()*2.5:-1;
  fishHintText('按住 A 绿区上浮 · 松开下沉<br>罩住小鱼攒满进度！');
  sfx('plant');
}
/* —— 拉扯物理步进（纯逻辑，可单测；rng 可注入）—— */
function fishReelStep(f,hold,dt,rng){
  rng=rng||Math.random;
  /* 鱼：朝目标点游 + 按习性随机窜 */
  f.dartT-=dt;
  if(f.dartT<=0){
    f.dartT=0.5+rng()*1.1;
    if(rng()<f.sp.dart*0.5) f.tgt=8+rng()*(FISH_L-16);          // 猛窜向随机处
    else f.tgt=Math.max(8,Math.min(FISH_L-8,f.fy+(rng()*2-1)*70)); // 平滑漂移
  }
  f.fv+=(f.tgt-f.fy)*dt*(f.sp.speed/13);
  f.fv*=Math.pow(0.2,dt);
  f.fy+=f.fv*dt;
  if(f.fy<8){f.fy=8;f.fv=Math.abs(f.fv)*.4;}
  if(f.fy>FISH_L-8){f.fy=FISH_L-8;f.fv=-Math.abs(f.fv)*.4;}
  /* 绿区：按住上浮，松开下沉 */
  f.zoneV+=(hold?-260:230)*dt;
  f.zoneV=Math.max(-150,Math.min(150,f.zoneV));
  f.zone+=f.zoneV*dt;
  if(f.zone<0){f.zone=0;f.zoneV=0;}
  if(f.zone>FISH_L-f.zoneH){f.zone=FISH_L-f.zoneH;f.zoneV=0;}
  /* 进度 */
  const inZone=f.fy>=f.zone&&f.fy<=f.zone+f.zoneH;
  if(!inZone)f.everOut=true;
  f.prog+=(inZone?26:-17)*dt;
  f.prog=Math.max(0,Math.min(100,f.prog));
  /* 喜礼盒：到点出现；罩住攒、脱开掉；6 秒不满则沉走 */
  if(f.trAt>=0&&f.t>=f.trAt&&!f.tr&&!f.trGot){
    f.tr={y:20+rng()*(FISH_L-40),prog:0,life:6};
  }
  if(f.tr){
    f.tr.life-=dt;
    const trIn=f.tr.y>=f.zone&&f.tr.y<=f.zone+f.zoneH;
    f.tr.prog=Math.max(0,f.tr.prog+(trIn?34:-14)*dt);
    if(f.tr.prog>=100){ f.tr=null; f.trAt=-1; f.trGot=true; return 'treasure'; }
    else if(f.tr.life<=0){ f.tr=null; f.trAt=-1; }   // 一次性：沉走就不再出现
  }
  return inZone?'in':'out';
}
function updateFish(dt){
  fish.t+=dt;
  if(fish.phase==='wait'){
    if(actA){ endFishing(null); return; }
    fish.waitT-=dt;
    if(fish.waitT<=0)fishBite();
    return;
  }
  if(fish.phase==='bite'){
    if(actA){ startReel(); return; }
    fish.biteT-=dt;
    if(fish.biteT<=0){
      game.bait--; updateItemBar();
      endFishing(false,'慢了一步…鱼把饵叼走了！');
    }
    return;
  }
  if(fish.phase!=='reel')return;
  const ev=fishReelStep(fish,holdA,dt);
  if(ev==='treasure'){ sfx('treasure'); toast('🎁 收住了「喜礼盒」！钓上鱼就归你'); }
  if(fish.prog>=100)endFishing(true);
  else if(fish.prog<=0)endFishing(false);
}
/* 背包鱼获：{sp,perfect}；fishN 与之同步（喂猫/物品栏用总数） */
function addFish(spKey,perfect){
  game.fishInv.push({sp:spKey,perfect:!!perfect});
  game.fishN=game.fishInv.length;
}
function consumeFish(){
  /* 先吃掉最便宜且非完美的那条 */
  if(!game.fishInv.length)return null;
  let idx=0,best=1e9;
  game.fishInv.forEach((f,i)=>{
    const sp=FISH_SPECIES.find(s=>s.key===f.sp)||{price:0};
    const v=sp.price*(f.perfect?1.5:1);
    if(v<best){best=v;idx=i;}
  });
  const out=game.fishInv.splice(idx,1)[0];
  game.fishN=game.fishInv.length;
  return out;
}
/* 送礼取最好的那条（完美/贵的优先）——送人要送最好的 */
function consumeBestFish(){
  if(!game.fishInv.length)return null;
  let idx=0,best=-1;
  game.fishInv.forEach((f,i)=>{
    const sp=FISH_SPECIES.find(s=>s.key===f.sp)||{price:0};
    const v=sp.price*(f.perfect?1.5:1);
    if(v>best){best=v;idx=i;}
  });
  const out=game.fishInv.splice(idx,1)[0];
  game.fishN=game.fishInv.length;
  return out;
}
function fishSpeciesOf(key){ return FISH_SPECIES.find(s=>s.key===key)||FISH_HEART; }
function grantTreasure(){
  const r=Math.random();
  if(r<0.40){ const c=3+(Math.random()*4|0); game.coins+=c; toast(`🎁 喜礼盒里是 ${c} 金币！`); sfx('coin'); }
  else if(r<0.65){ game.fert++; toast('🎁 喜礼盒里是「魔法肥料」×1！'); sfx('coin'); }
  else if(r<0.85){ game.bait+=2; toast('🎁 喜礼盒里是鱼饵 ×2！'); sfx('coin'); }
  else { toast('🎁 喜礼盒里竟然是…'); maybeFrag(1); }
  updateItemBar();
}
function endFishing(ok,msg){
  fishHint.style.display='none';
  game.mode='play';
  fish.phase='idle';
  if(ok===null){ sfx('blip'); return; }                       // 主动收竿
  if(ok==='junk'){                                            // 杂物：直接拽上来
    sfx('blip');
    if(!game.bootCaught&&Math.random()<0.35){
      game.bootCaught=true;
      startDialog([{who:'me',text:'钓上来一只旧靴子…等等，里面塞着一张被防水袋裹好的纸条！'}],()=>{
        toast('🏆 隐藏彩蛋：旧靴子里的纸条');addHearts(1,'旧靴子纸条');
        maybeFrag(1);
      });
      return;
    }
    toast(`钓上来一把「${fish.junk.name}」…重新抛竿试试吧`);
    return;
  }
  if(!ok){
    sfx('blip');
    if(fish.sp&&fish.sp.key==='heart'){
      game.bait++; updateItemBar();                           // 任务鱼跑了不亏饵，鼓励再试
      toast('同心鱼挣脱了！它还在湖里——鱼饵还你，再试一次！');
    }else toast(msg||(fish.trGot?'鱼带着喜礼盒跑了…':'鱼挣脱了，鱼饵也没了…再试一次！'));
    return;
  }
  /* —— 成功 —— */
  const sp=fish.sp, perfect=!fish.everOut;
  sfx('harvest'); flyHearts(innerWidth/2,innerHeight/2,3);
  if(perfect)sfx('quest');
  if(sp.key==='heart'){
    game.fishQ=true;
    startDialog([{who:'me',text:'钓到了！鳞片是淡粉色的——传说中的「同心鱼」！'}],()=>{
      toast(`获得 <b style="color:#ff9eb5">同心鱼</b> ×1${perfect?' · <b style="color:#ffd84d">完美收线!</b>':''}`);
      if(fish.trGot)grantTreasure();
      maybeFrag(perfect?1:.9,()=>advanceAfterFish());
    });
  }else{
    addFish(sp.key,perfect);
    showGet('🐟');
    toast(`钓到${perfect?'<b style="color:#ffd84d">完美品相</b>的':''}「${sp.name}」！（杂货店 ${Math.round(sp.price*(perfect?1.5:1))} 金收购）`);
    if(fish.trGot)grantTreasure();
    maybeFrag(perfect?.5:.3);
    updateItemBar();
  }
}
function advanceAfterFish(){
  setQuest(3);
  toast('📬 邮箱似乎有动静…回家看看红色邮箱');
}

/* —— 钓鱼画面（画在游戏画布上，与像素世界同风格）—— */
function drawFishUI(){
  if(fish.phase==='wait'||fish.phase==='bite'){ drawBobber(); return; }
  if(fish.phase!=='reel')return;
  drawBobber();
  const TH=Math.min(190,VH-140), S=TH/FISH_L;
  const x=10, y=(VH-TH)/2|0;
  /* 木框轨道 */
  ctx.fillStyle='#3a1d08';ctx.fillRect(x-4,y-7,30,TH+14);
  ctx.fillStyle='#8c5a2b';ctx.fillRect(x-2,y-5,26,TH+10);
  ctx.fillStyle='#5a3413';ctx.fillRect(x-2,y-5,26,2);ctx.fillRect(x-2,y+TH+3,26,2);
  /* 水槽 */
  ctx.fillStyle='#1c4a70';ctx.fillRect(x+1,y,20,TH);
  ctx.fillStyle='#2a5f8a';ctx.fillRect(x+1,y,20,2);
  for(let i=0;i<4;i++){ const wy=y+((game.time*22+i*TH/4)%TH)|0; ctx.fillStyle='rgba(150,200,240,.35)';ctx.fillRect(x+3+(i%2)*9,wy,6,1); }
  /* 绿区 */
  const zy=y+fish.zone*S|0, zh=Math.max(8,fish.zoneH*S|0);
  ctx.fillStyle='rgba(126,200,80,.72)';ctx.fillRect(x+1,zy,20,zh);
  ctx.fillStyle='#aef08a';ctx.fillRect(x+1,zy,20,2);ctx.fillRect(x+1,zy+zh-2,20,2);
  /* 喜礼盒 */
  if(fish.tr){
    const ty=y+fish.tr.y*S|0, gb=img('gift1');
    if(gb)ctx.drawImage(gb,0,0,gb.width,gb.height,x+3,ty-8,16,16);
    else{ctx.fillStyle='#e0457b';ctx.fillRect(x+5,ty-6,12,12);}
    if(fish.tr.prog>0){ ctx.fillStyle='#ffd84d';ctx.fillRect(x+3,ty+9,(16*fish.tr.prog/100)|0,2); }
  }
  /* 鱼 */
  const fy=y+fish.fy*S|0, wob=Math.sin(fish.t*7)*1.5|0;
  const fim=fish.sp&&img(fish.sp.icon);
  if(fim)ctx.drawImage(fim,0,0,16,16,x+3+wob,fy-8,16,16);
  else{ctx.fillStyle='#ffd84d';ctx.beginPath();ctx.ellipse(x+11+wob,fy,6,4,0,0,7);ctx.fill();}
  /* 进度条(右侧) */
  const bx=x+28;
  ctx.fillStyle='#3a1d08';ctx.fillRect(bx-1,y-1,9,TH+2);
  ctx.fillStyle='#241203';ctx.fillRect(bx,y,7,TH);
  const ph=TH*fish.prog/100|0;
  const inz=fish.fy>=fish.zone&&fish.fy<=fish.zone+fish.zoneH;
  ctx.fillStyle=inz?'#7ec850':'#e8943a';ctx.fillRect(bx,y+TH-ph,7,ph);
  ctx.fillStyle=inz?'#aef08a':'#ffd84d';ctx.fillRect(bx,y+TH-ph,7,2);
  /* 完美星标 */
  if(!fish.everOut){
    ctx.fillStyle='#ffd84d';
    const sx=x+9, sy=y-13;
    ctx.fillRect(sx,sy-3,2,8);ctx.fillRect(sx-3,sy,8,2);
    ctx.fillRect(sx-2,sy-2,2,2);ctx.fillRect(sx+2,sy-2,2,2);ctx.fillRect(sx-2,sy+2,2,2);ctx.fillRect(sx+2,sy+2,2,2);
  }
}
/* 浮标 + 咬钩「!」（世界坐标） */
function drawBobber(){
  const wx=player.x+6-cam.x|0;
  const dip=fish.phase==='bite'?3:Math.sin(game.time*2.6)*1.2;
  const wy=(player.y-20-cam.y+dip)|0;
  /* 鱼线 */
  ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(wx+5,player.y-10-cam.y|0);ctx.lineTo(wx,wy);ctx.stroke();
  /* 波纹 */
  const rp=(game.time*1.4)%1;
  ctx.strokeStyle=`rgba(255,255,255,${(1-rp)*.5})`;
  ctx.beginPath();ctx.ellipse(wx,wy+4,3+rp*7,1.5+rp*3,0,0,7);ctx.stroke();
  /* 浮标（红顶白肚） */
  ctx.fillStyle='#d8483a';ctx.fillRect(wx-2,wy-3,5,3);
  ctx.fillStyle='#fdfdff';ctx.fillRect(wx-2,wy,5,3);
  ctx.fillStyle='#2b2b34';ctx.fillRect(wx-1,wy+3,3,1);
  if(fish.phase==='bite'){
    /* 玩家头顶大「!」 */
    const px=player.x+4-cam.x|0, py=player.y-34-cam.y|0;
    ctx.fillStyle='#fff';ctx.fillRect(px-3,py-3,11,14);
    ctx.fillStyle='#d8483a';ctx.fillRect(px,py,4,7);ctx.fillRect(px,py+9,4,3);
  }
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
  /* 母鸡们（运动场内漫步） */
  for(const ck of chickens){
    ck.t-=dt;
    if(ck.t<=0){ck.t=1+Math.random()*2;ck.dir=Math.random()*4|0;ck.pause=Math.random()<.4;}
    if(!ck.pause&&game.scene==='world'){
      const d=[[1,0],[-1,0],[0,1],[0,-1]][ck.dir],csp=14*dt;
      const nx=ck.x+d[0]*csp,ny=ck.y+d[1]*csp;
      if(nx>16.7*TILE&&nx<21.2*TILE&&ny>7.7*TILE&&ny<11.3*TILE){ck.x=nx;ck.y=ny;}
      else ck.t=0;
    }
  }
  /* 鸭子：湖面缓慢游动（椭圆湖范围内挑目标点） */
  if(game.scene==='world')for(const dk of ducks){
    dk.t-=dt;
    const dx=dk.tx-dk.x, dy=dk.ty-dk.y, d=Math.hypot(dx,dy);
    if(d<3||dk.t<=0){
      dk.t=4+Math.random()*5;
      const a=Math.random()*6.28, r=Math.random();
      dk.tx=(29.2+Math.cos(a)*4.2*r)*TILE; dk.ty=(5.6+Math.sin(a)*2.8*r)*TILE;
    }else{ dk.x+=dx/d*9*dt; dk.y+=dy/d*9*dt; dk.flip=dx<0; }
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
