/* ============================================================
 * 玩法循环：钓鱼小游戏 + 每帧 update(移动/跳跃/互动触发/出入口)
 * （由原 game.js 按职责拆分，多文件共享全局作用域；保持原加载顺序）
 * ============================================================ */
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
    game.fishN++;showGet('🐟');
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

