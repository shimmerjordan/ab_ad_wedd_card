/* ============================================================
 * 渲染(一)：地块/地面 + 建筑立面 + 角色/头顶物 + 树/路障/水井/邮箱/宝箱/猫鸡 等世界对象
 * （由原 game.js 按职责拆分，多文件共享全局作用域；保持原加载顺序）
 * ============================================================ */
/* ============================================================
 * 渲染：地块
 * ============================================================ */
function drawTiles(){
  const s=sc(),g=s.g;
  const x0=Math.max(0,cam.x/TILE-1|0),y0=Math.max(0,cam.y/TILE-1|0),
        x1=Math.min(s.w-1,(cam.x+VW)/TILE+2|0),y1=Math.min(s.h-1,(cam.y+VH)/TILE+2|0);
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
    else if(t==='='){ // 木栈道/码头(星露谷木地板真素材平铺, 末端有支柱)
      ctx.fillStyle='#3a76b8';ctx.fillRect(px,py,TILE,TILE);
      const dk=img('dockWood');
      if(dk){ ctx.drawImage(dk, px, py, TILE, TILE);
        ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(px,py+14,TILE,2);   // 板缝阴影
      }else{
        ctx.fillStyle='#a8743c';ctx.fillRect(px+1,py,14,TILE);
        ctx.fillStyle='#8c5a2b';for(let i=0;i<4;i++)ctx.fillRect(px+1,py+i*4,14,1);
        ctx.fillStyle='#6e4218';ctx.fillRect(px+1,py,2,TILE);ctx.fillRect(px+13,py,2,TILE);
      }
      /* 栈道末端(最靠湖心一格)画两根入水支柱 */
      if(g[ty-1]&&g[ty-1][tx]==='~'){ ctx.fillStyle='#5a3413';ctx.fillRect(px+1,py+TILE-3,3,5);ctx.fillRect(px+12,py+TILE-3,3,5); }
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
    else if(t==='f'){ // 连体栅栏（秋季图集木栅真素材, 底边对齐地块, 栏柱向上伸出）
      const lf=g[ty][tx-1]==='f',rt=g[ty][tx+1]==='f',up=g[ty-1]&&g[ty-1][tx]==='f',dn=g[ty+1]&&g[ty+1][tx]==='f';
      const fh=img('fenceH'), fv=img('fenceV');
      if(fh&&(lf||rt))      ctx.drawImage(fh, px, py+TILE-fh.height);
      else if(fv&&(up||dn)) ctx.drawImage(fv, px+((TILE-fv.width)/2|0), py+TILE-fv.height);
      else if(fh)           ctx.drawImage(fh, px, py+TILE-fh.height);
      else{
        ctx.fillStyle='#9a6433';
        if(lf||rt){ctx.fillRect(lf?px:px+6,py+6,lf&&rt?TILE:10,3);ctx.fillRect(lf?px:px+6,py+11,lf&&rt?TILE:10,2);}
        if(up||dn)ctx.fillRect(px+6,up?py:py+4,3,up&&dn?TILE:12);
        ctx.fillStyle='#8c5a2b';ctx.fillRect(px+5,py+3,5,11);
        ctx.fillStyle='#6e4218';ctx.fillRect(px+5,py+3,5,2);
        ctx.fillStyle='#a8743c';ctx.fillRect(px+6,py+5,2,8);
      }
    }
    else if(t==='P'){
      const key=tx+','+ty,pl=plots[key];
      const till=pl?pl.till:0, watered=pl&&pl.st===2;
      /* 草地底（开垦前就是普通草地） */
      ctx.fillStyle=(h%7<2)?'#55a04a':'#5fae52';ctx.fillRect(px,py,TILE,TILE);
      if(h%11===0){ctx.fillStyle='#4c9342';ctx.fillRect(px+(h>>3)%12,py+(h>>5)%12,2,2);}
      if(till>0){                                   // 耕地: hoeDirt 真素材, 随次数逐步变深
        const hd=img('hoeDirt'), a=[0,0.42,0.72,1][till];
        ctx.save(); ctx.globalAlpha=a;
        if(hd)ctx.drawImage(hd, watered?80:0,0,16,16, px,py,16,16);
        else{ ctx.fillStyle=watered?'#5b3a1e':'#8a5a2f';ctx.fillRect(px+1,py+1,14,14);
          ctx.fillStyle='rgba(0,0,0,.18)';for(let i=0;i<3;i++)ctx.fillRect(px+2,py+3+i*4,12,1); }
        ctx.restore();
      }
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
  /* 农舍/邻居家：星露谷房屋素材原寸绘制(底边对齐地基, 水平居中), 与镇区立面同比例 */
  if(b.key==='home'||b.key==='nb1'){
    const im=img(b.key==='home'?'house2':'house1');
    if(im){
      ctx.drawImage(im, px+((w-im.width)/2|0), py+h-im.height);
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
  const gb=img('gift1');
  if(gb){ ctx.drawImage(gb, px, py+12-gb.height);
    if(!game.chestOpened&&(game.time*2|0)%2){ctx.fillStyle='#fff';ctx.fillRect(px+gb.width-2,py-4,2,2);ctx.fillRect(px-2,py+2,2,2);}
    return;
  }
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
function drawChickenE(ck){
  ck=ck||chicken;
  const px=ck.x-cam.x|0,py=ck.y-cam.y|0;
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(px+2,py+10,10,2);
  const im=img('chicken');
  if(im){ /* 16x16帧, 原始朝右, 向左走时翻转 */
    const fi=ck.pause?0:(game.time*5|0)%2;
    drawSprite(ctx,im,fi*16,0,16,16,px,py-4,ck.dir===1);
    return;
  }
  blit(ctx,CHICKEN,px,py-(ck.pause?0:(game.time*6|0)%2),ck.dir===1);
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
  }else if(player.over) drawOverHead(c);
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
/* 路障：石头(镐) / 草丛灌木(镰) / 树枝(斧)，paths.png 真素材, 底边对齐地块 */
function drawObstacle(px,py,ob){
  const im=img(ob.spr);
  ctx.fillStyle='rgba(0,0,0,.20)';ctx.beginPath();ctx.ellipse(px+8,py+14,6,2.5,0,0,7);ctx.fill();
  if(im){ ctx.drawImage(im, px, py); return; }
  /* 回退(素材未加载)：简易程序化 */
  if(ob.type==='rock'){ ctx.fillStyle='#8a8f9a';ctx.beginPath();ctx.ellipse(px+8,py+9,6,5,0,0,7);ctx.fill();ctx.fillStyle='#aab0bb';ctx.fillRect(px+5,py+5,4,3); }
  else if(ob.type==='weed'){ ctx.fillStyle='#3f8a3c';for(const [bx,by,hh] of [[4,15,8],[7,15,11],[10,15,8]])ctx.fillRect(px+bx,py+by-hh,2,hh); }
  else{ ctx.fillStyle='#7a4a2a';ctx.fillRect(px+2,py+11,12,3);ctx.fillStyle='#8c5a2b';ctx.fillRect(px+9,py+7,3,5); }
}
/* 头顶展示：拾取的物品(emoji)举过头顶 / 使用工具挥舞 */
function drawOverHead(c){
  const o=player.over; if(!o)return;
  const t=(game.time-o.t0)/o.dur; if(t>=1){player.over=null;return;}
  const px=c.x-cam.x|0, py=c.y-cam.y|0;
  if(o.kind==='item'){
    const rise=Math.min(1,t*4), bob=Math.sin(game.time*9)*1.5;
    const cx=px+6, cy=py-14-rise*8+bob;
    ctx.save();
    ctx.fillStyle='rgba(255,255,255,.92)';ctx.beginPath();ctx.ellipse(cx,cy,11,11,0,0,7);ctx.fill();
    ctx.strokeStyle='#8c4a16';ctx.lineWidth=1.5;ctx.stroke();
    ctx.font='13px serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(o.val, cx, cy+1);
    ctx.restore();
  }else{ /* tool 挥舞：工具图标在头顶上方快速下挥 */
    const ang=-1.1+Math.min(1,t*3)*1.9, cx=px+6, cy=py-12;
    const tt=TOOLS.find(x=>x.key===o.val), ti=tt&&tt.icon&&img(tt.icon);
    ctx.save();ctx.translate(cx,cy);ctx.rotate(ang);
    if(ti)ctx.drawImage(ti,0,0,ti.width,ti.height,-8,-8,16,16); else drawToolIcon(ctx,-7,-7,o.val,14);
    ctx.restore();
  }
}

/* 程序化书架（始终完整, 木框+三层彩色书脊+顶部小物） */
function drawBookcase(px,py){
  const W=38,H=40, x=px, y=py;
  ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(x+2,y+H,W-4,3);
  ctx.fillStyle='#6e4218';ctx.fillRect(x,y,W,H);                 // 外框
  ctx.fillStyle='#5a3413';ctx.fillRect(x,y,W,3);ctx.fillRect(x,y+H-4,W,4);
  ctx.fillStyle='#3c2410';ctx.fillRect(x+3,y+4,W-6,H-8);         // 内背板
  const cols=['#c0392b','#2e6fb0','#3f8a3c','#e8943a','#7a4a9a','#d8a72e','#2f8f8a','#b04a6a'];
  for(let s=0;s<3;s++){                                          // 三层书
    const sy=y+5+s*11;
    ctx.fillStyle='#6e4218';ctx.fillRect(x+3,sy+9,W-6,2);        // 隔板
    let bx=x+5;
    let i=s*3;
    while(bx<x+W-6){
      const bw=2+ (hash(bx,sy)%3), bh=7+ (hash(bx*3,sy)%3);
      ctx.fillStyle=cols[(i++)%cols.length];
      ctx.fillRect(bx, sy+9-bh, bw, bh);
      ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(bx,sy+9-bh,1,bh);
      bx+=bw+1;
    }
  }
  /* 顶层摆件：一只小地球仪/花瓶 */
  ctx.fillStyle='#2e6fb0';ctx.fillRect(x+W-13,y+1,8,5);
  ctx.fillStyle='#3f8a3c';ctx.fillRect(x+W-12,y+2,2,2);ctx.fillRect(x+W-9,y+3,2,1);
  ctx.fillStyle='#8c5a2b';ctx.fillRect(x+W-11,y+6,4,1);
}
/* 程序化留言台（木质斜面讲台 + 翻开的签到簿 + 羽毛笔） */
function drawGuestbook(px,py){
  const x=px,y=py;
  ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(x+3,y+26,20,3);
  ctx.fillStyle='#6e4218';ctx.fillRect(x+6,y+12,14,14);          // 立柱
  ctx.fillStyle='#5a3413';ctx.fillRect(x+4,y+24,18,3);
  /* 斜面台板 */
  ctx.fillStyle='#8c5a2b';ctx.fillRect(x+2,y+6,22,9);
  ctx.fillStyle='#a8743c';ctx.fillRect(x+2,y+6,22,2);
  /* 翻开的书页 */
  ctx.fillStyle='#fdf3dc';ctx.fillRect(x+5,y+4,16,8);
  ctx.fillStyle='#e6d8b8';ctx.fillRect(x+12,y+4,2,8);            // 书脊中缝
  ctx.fillStyle='#b9a98a';for(let i=0;i<3;i++){ctx.fillRect(x+6,y+6+i*2,5,1);ctx.fillRect(x+15,y+6+i*2,5,1);}
  /* 羽毛笔 */
  ctx.fillStyle='#e0457b';ctx.fillRect(x+18,y+1,1,5);ctx.fillStyle='#fff';ctx.fillRect(x+17,y+2,1,3);
}
