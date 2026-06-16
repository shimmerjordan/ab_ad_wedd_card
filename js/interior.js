/* ============================================================
 * 渲染(二)：博物馆内景 + 婚礼殿堂内景 + 世界整体绘制与 y 排序
 * （由原 game.js 按职责拆分，多文件共享全局作用域；保持原加载顺序）
 * ============================================================ */
/* —— 博物馆内景陈设：矿物大展架 + 4油画(上墙) + 8玻璃展柜(中央) + 家具 —— */
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
  /* 中央两排「玻璃展柜」5-12：木质底座 + 透明玻璃罩 + 展品 + 高光（程序化，避免切图突兀） */
  EX_TBL.forEach(([tx,ty],i)=>{
    const px=tx*TILE-cam.x|0,py=ty*TILE-cam.y|0;
    const has=!!RT.museum[4+i];
    ents.push({y:ty*TILE+34,draw(){
      const cx=px+3;
      /* 投影 */
      ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(cx,py+34,36,4);
      /* 木质底座 */
      ctx.fillStyle='#6e4218';ctx.fillRect(cx,py+24,36,13);
      ctx.fillStyle='#8c5a2b';ctx.fillRect(cx,py+24,36,3);
      ctx.fillStyle='#5a3413';ctx.fillRect(cx,py+34,36,3);
      ctx.fillStyle='#a8743c';ctx.fillRect(cx+2,py+27,32,4);
      /* 玻璃罩主体（半透明青白） */
      const gx=cx+3,gy=py-6,gw=30,gh=30;
      ctx.fillStyle='rgba(150,205,232,.34)';ctx.fillRect(gx,gy,gw,gh);
      /* 展品（布展则金色发光小物，未布展则空台提示） */
      if(has){
        ctx.fillStyle='#7a4a1e';ctx.fillRect(gx+9,gy+gh-8,12,4);            // 展品底托
        ctx.fillStyle='#ffd84d';ctx.fillRect(gx+10,gy+gh-18,10,11);          // 金色展品
        ctx.fillStyle='#ffec8a';ctx.fillRect(gx+11,gy+gh-17,3,9);
        ctx.fillStyle='#b3661f';ctx.fillRect(gx+10,gy+gh-8,10,2);
      }else{
        ctx.fillStyle='rgba(90,69,48,.5)';ctx.fillRect(gx+12,gy+gh-7,6,3);
      }
      /* 玻璃高光：两道斜白条 */
      ctx.fillStyle='rgba(255,255,255,.5)';
      ctx.fillRect(gx+5,gy+3,2,gh-8);ctx.fillRect(gx+9,gy+5,1,gh-12);
      /* 白色金属框 */
      ctx.strokeStyle='#eaf6ff';ctx.lineWidth=2;ctx.strokeRect(gx+1,gy+1,gw-2,gh-2);
      ctx.fillStyle='#cfe6f4';ctx.fillRect(gx,gy,gw,2);
      /* 顶盖金边 */
      ctx.fillStyle='#e0b44a';ctx.fillRect(gx-1,gy-3,gw+2,3);
      ctx.fillStyle='#b3661f';ctx.fillRect(gx-1,gy-3,gw+2,1);
      /* 金角接头 */
      ctx.fillStyle='#e0b44a';
      ctx.fillRect(gx,gy,3,3);ctx.fillRect(gx+gw-3,gy,3,3);
      ctx.fillRect(gx,gy+gh-3,3,3);ctx.fillRect(gx+gw-3,gy+gh-3,3,3);
      /* 布展闪光 */
      if(has&&((game.time*2|0)+i)%2===0){ctx.fillStyle='#fff';ctx.fillRect(gx+gw-6,gy-7,2,2);ctx.fillRect(gx+3,gy-5,2,2);}
    }});
  });
  /* 家具：书架(程序化)/留言台(程序化)/海兽骨架/盆栽（贴地摆放） */
  for(const k in MOBJ){
    const o=MOBJ[k], im=img(o.img);
    ents.push({y:o.y+o.h,draw(){
      const px=o.x-cam.x|0, py=o.y-cam.y|0;
      if(o.proc==='bookcase')      drawBookcase(px,py);
      else if(o.proc==='guestbook')drawGuestbook(px,py);
      else if(im)ctx.drawImage(im, px, (o.y+o.h-im.height)-cam.y|0);
    }});
  }
  /* 中央走道椭圆地毯 */
  ents.push({y:-994,draw(){
    const im=img('rugOval'); if(!im)return;
    ctx.drawImage(im,(26*TILE-im.width)/2-cam.x|0,7.8*TILE-cam.y|0);
  }});
}
/* 婚纱照懒加载缓存(图片在 assets/imgs/, 不在素材清单里) */
function hallPhotoImg(idx){
  const o=RT.hallPhotos&&RT.hallPhotos[idx]; if(!o||!o.img) return null;
  const im=loadPhoto(resolveImg(o.img));   // 共享缓存(assets.js)
  return im._ok?im:null;
}
/* 立式婚纱照展板(木相框+画架腿; 有图显示缩略图, 无图显示爱心占位) */
function drawPhotoBoard(px,py,idx){
  ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(px+18,py+10,17,4,0,0,7);ctx.fill();
  ctx.fillStyle='#6e4218';ctx.fillRect(px+5,py-4,3,15);ctx.fillRect(px+28,py-4,3,15);ctx.fillRect(px+17,py+3,3,9); // 画架腿
  ctx.fillStyle='#8c5a2b';ctx.fillRect(px,py-42,36,40);                 // 外框
  ctx.fillStyle='#5b2c0e';ctx.fillRect(px,py-42,36,2);ctx.fillRect(px,py-4,36,2);
  ctx.fillStyle='#e0b44a';ctx.fillRect(px+2,py-40,32,2);                 // 金内边
  const im=hallPhotoImg(idx);
  if(im){
    ctx.imageSmoothingEnabled=false;
    // 等比裁剪填入 30x30 相框
    const s=Math.max(30/im.width,30/im.height), sw=30/s, sh=30/s;
    ctx.drawImage(im,(im.width-sw)/2,(im.height-sh)/2,sw,sh, px+3,py-38,30,30);
  }else{
    ctx.fillStyle='#f3e8d6';ctx.fillRect(px+3,py-38,30,30);
    ctx.fillStyle='#e0457b';                                            // 爱心占位
    ctx.fillRect(px+13,py-28,3,3);ctx.fillRect(px+18,py-28,3,3);ctx.fillRect(px+12,py-25,11,3);ctx.fillRect(px+14,py-22,7,3);ctx.fillRect(px+16,py-19,3,3);
    ctx.fillStyle='#b48a5a';ctx.font='7px monospace';ctx.textAlign='center';ctx.fillText('婚纱照',px+18,py-9);
  }
}
/* —— 殿堂内景陈设(舞台居中 x12.5, 左右对称) —— */
function drawHallInt(ents){
  const HW=27, CX=12.5*TILE;     // 殿堂中心
  /* ① 上墙三角彩旗(贯穿整面背墙, 最底层) */
  ents.push({y:-1000,draw(){
    const cols=['#ff7daa','#ffd84d','#7dc4ff','#a06ee0','#7ec850'];
    const wy=2*TILE-cam.y;
    ctx.strokeStyle='#e8d6a8';ctx.lineWidth=1;
    ctx.beginPath();
    for(let wx=8;wx<HW*TILE-8;wx+=4){const sx=wx-cam.x, sy=wy-6+Math.sin(wx*0.06)*3;wx===8?ctx.moveTo(sx,sy):ctx.lineTo(sx,sy);}
    ctx.stroke();
    for(let i=0,wx=10;wx<HW*TILE-12;wx+=15,i++){
      const sx=(wx-cam.x)|0, sy=(wy-5+Math.sin(wx*0.06)*3)|0;
      ctx.fillStyle=cols[i%cols.length];
      ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+11,sy);ctx.lineTo(sx+5,sy+10);ctx.closePath();ctx.fill();
    }
  }});
  /* ② 舞台背景幔布(粉白竖条帷幕 + 顶部缦帐) */
  ents.push({y:-999,draw(){
    const x0=8*TILE-cam.x|0, x1=17*TILE-cam.x|0, y0=3*TILE-cam.y-2|0, y1=6*TILE-cam.y|0;
    for(let x=x0;x<x1;x+=8){
      ctx.fillStyle=((x-x0)/8|0)%2?'#f6dbe6':'#ffffff';
      ctx.fillRect(x,y0,8,y1-y0);
    }
    ctx.fillStyle='#e0457b';ctx.fillRect(x0,y0-3,x1-x0,4);          // 帐顶横杆
    for(let x=x0;x<x1;x+=14){ctx.fillStyle='#d63b6e';               // 缦帐波浪
      ctx.beginPath();ctx.moveTo(x,y0+1);ctx.lineTo(x+14,y0+1);ctx.lineTo(x+7,y0+8);ctx.closePath();ctx.fill();}
  }});
  /* ②a 落地灯(立灯 + 暖光呼吸光晕, 立于地面, 左右侧墙等距, 参与 y 排序) */
  HLAMP.forEach(([lxT,lyT],si)=>{
    const lp=img('lampPost');
    const baseY=lyT*TILE+(lp?lp.height:30);
    ents.push({y:baseY,draw(){
      const px=lxT*TILE-cam.x|0, py=lyT*TILE-cam.y|0;
      if(!lp){ctx.fillStyle='#5b4636';ctx.fillRect(px+4,py+6,3,24);return;}
      const g=0.34+0.18*Math.sin(game.time*2.4+si*1.3);
      const cxf=px+(lp.width/2|0), cyf=py+4;        // 灯头在顶部
      ctx.save();
      ctx.globalAlpha=g;      ctx.fillStyle='#ffe48c';ctx.beginPath();ctx.ellipse(cxf,cyf,10,10,0,0,7);ctx.fill();
      ctx.globalAlpha=g*0.4;  ctx.fillStyle='#ffefb0';ctx.beginPath();ctx.ellipse(cxf,cyf,17,16,0,0,7);ctx.fill();
      ctx.restore();
      ctx.drawImage(lp, px, py);
    }});
  });
  /* ②b 舞台红毯地毯(真素材, 铺在舞台地面, 居中) */
  ents.push({y:-998,draw(){
    const rg=img('rugStage'); if(!rg)return;
    ctx.drawImage(rg, CX-rg.width/2-cam.x|0, 4.2*TILE-cam.y|0);
  }});
  /* ③ 舞台「花拱门」：真实金柱 + 开花灌木花环（素材拼合, 居中对称） */
  ents.push({y:6*TILE+2,draw(){
    const pil=img('pillar'), bush=img('bushFl');
    const lx=10.5*TILE-cam.x|0, rx=14.3*TILE-cam.x|0, base=6.3*TILE-cam.y|0;
    const ph=pil?pil.height:48;
    if(pil){ ctx.drawImage(pil,lx,base-ph); ctx.drawImage(pil,rx,base-ph); }
    else{ ctx.fillStyle='#e0b44a';ctx.fillRect(lx,base-ph,8,ph);ctx.fillRect(rx,base-ph,8,ph); }
    const top=base-ph+6;
    if(bush){                                   // 花环：5 丛开花灌木, 以拱门中心左右对称排布
      const cx0=(lx+rx+(pil?pil.width:8))/2, n=5, step=18, gy=(top-bush.height+8)|0;
      for(let i=0;i<n;i++) ctx.drawImage(bush, (cx0+(i-(n-1)/2)*step-bush.width/2)|0, gy);
    }
    ctx.fillStyle='#e0457b';ctx.fillRect(lx+3,top+2,3,12);ctx.fillRect(rx+4,top+2,3,12);
  }});
  /* ④ 红毯花瓣(无碰撞, 贴地装饰; 红毯居中 x12-13) */
  ents.push({y:-993,draw(){
    for(let ty=8;ty<22;ty++)for(const tx of [12,13]){
      const h=hash(tx*7,ty*3);if(h%2)continue;
      const px=tx*TILE-cam.x+ (h%12)|0, py=ty*TILE-cam.y+((h>>3)%14)|0;
      ctx.fillStyle=['#ff9eb5','#ffd1dc','#ffffff'][h%3];ctx.fillRect(px,py,2,2);
    }
  }});
  /* 五月柱（节日素材） */
  for(const k of ['poleL','poleR']){
    const o=HOBJ[k], im=img(o.img);
    ents.push({y:o.y+o.h,draw(){
      if(im)ctx.drawImage(im, o.x-cam.x|0, (o.y+o.h-im.height)-cam.y|0);
    }});
  }
  /* 盆栽装饰(对称) */
  HDECOR.forEach(d=>{
    const im=img(d.img);
    ents.push({y:d.y+14,draw(){
      if(im)ctx.drawImage(im, d.x-cam.x|0, (d.y+14-im.height)-cam.y|0);
    }});
  });
  /* 节日装饰：气球 / 礼盒(真素材) */
  HFEST.forEach(d=>{
    const im=img(d.img);
    ents.push({y:d.y+12,draw(){
      if(im)ctx.drawImage(im, d.x-cam.x|0, (d.y+12-im.height)-cam.y|0);
    }});
  });
  /* 婚纱照展板(立式相框) */
  HALLPHOTO_POS.forEach(([tx,ty],i)=>{
    ents.push({y:ty*TILE+11,draw(){ drawPhotoBoard(tx*TILE-cam.x|0, ty*TILE-cam.y|0, i); }});
  });
  /* 烛灯：海滩灯笼真素材(暖光), 红毯两侧对称排开 */
  HCANDLE.forEach(([lxT,lyT],ci)=>{
    ents.push({y:lyT*TILE+10,draw(){
      const ca=img('candle'); const px=lxT*TILE-cam.x|0,py=lyT*TILE-cam.y|0;
      const g=0.30+0.20*Math.sin(game.time*2.6+ci*1.7);   // 烛光渐淡呼吸(平滑, 非闪烁)
      if(ca){
        const fy=py-ca.height, cxf=px+(ca.width/2|0);
        ctx.save();
        ctx.globalAlpha=g;        ctx.fillStyle='#ffe48c';ctx.beginPath();ctx.ellipse(cxf,fy+4,8,8,0,0,7);ctx.fill();
        ctx.globalAlpha=g*0.45;   ctx.fillStyle='#ffefb0';ctx.beginPath();ctx.ellipse(cxf,fy+4,14,13,0,0,7);ctx.fill();
        ctx.restore();
        ctx.drawImage(ca, px, fy);
      }else{
        ctx.save();ctx.globalAlpha=g;ctx.fillStyle='#ffe48c';ctx.fillRect(px,py-24,10,8);ctx.restore();
        ctx.fillStyle='#f6f0e2';ctx.fillRect(px+3,py-18,4,16);ctx.fillStyle='#ffb84a';ctx.fillRect(px+3,py-22,4,5);
      }
    }});
  });
  /* ⑤ 三角钢琴（黑漆琴身+掀盖+琴凳） */
  ents.push({y:HOBJ.piano.y+30,draw(){
    const o=HOBJ.piano,px=o.x-cam.x|0,py=o.y-cam.y|0;
    ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(px+2,py+30,44,4);
    ctx.fillStyle='#17171c';ctx.beginPath();ctx.moveTo(px+2,py+26);ctx.lineTo(px+2,py+12);ctx.lineTo(px+30,py+8);ctx.lineTo(px+44,py+14);ctx.lineTo(px+44,py+26);ctx.closePath();ctx.fill(); // 琴身
    ctx.fillStyle='#2b2b34';ctx.beginPath();ctx.moveTo(px+4,py+11);ctx.lineTo(px+30,py+2);ctx.lineTo(px+30,py+8);ctx.lineTo(px+4,py+13);ctx.closePath();ctx.fill(); // 掀起的盖
    ctx.fillStyle='#3a3a44';ctx.fillRect(px+5,py+9,24,2);
    ctx.fillStyle='#f6f0e2';ctx.fillRect(px+4,py+24,40,5);                 // 白键
    ctx.fillStyle='#17171c';for(let i=0;i<13;i++)ctx.fillRect(px+6+i*3,py+24,1,3);
    ctx.fillStyle='#1b1b22';ctx.fillRect(px+12,py+34,4,8);ctx.fillRect(px+34,py+34,4,8); // 琴腿
    ctx.fillStyle='#6e4218';ctx.fillRect(px+18,py+33,12,6);ctx.fillStyle='#8c5a2b';ctx.fillRect(px+19,py+34,10,2); // 琴凳
  }});
  /* ⑥ 香槟塔 */
  ents.push({y:HOBJ.tower.y+30,draw(){
    const o=HOBJ.tower,px=o.x-cam.x|0,py=o.y-cam.y|0;
    ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(px,py+30,30,3);
    ctx.fillStyle='#fdf3dc';ctx.fillRect(px,py+22,30,8);
    ctx.fillStyle='#d9bd85';ctx.fillRect(px,py+27,30,3);
    ctx.fillStyle='rgba(190,225,255,.9)';
    for(let r=0;r<4;r++)for(let i=0;i<=r;i++)ctx.fillRect(px+13-r*4+i*8,py+16-r*5,4,5);
    ctx.fillStyle='#ffd84d';if((game.time*3|0)%2){ctx.fillRect(px+13,py-2,2,2);ctx.fillRect(px+6,py+4,2,2);}
  }});
  /* ⑧ 礼花筒 */
  for(const k of ['popperL','popperR']) ents.push({y:HOBJ[k].y+16,draw(){
    const o=HOBJ[k],px=o.x-cam.x|0,py=o.y-cam.y|0;
    ctx.fillStyle='#e8943a';ctx.fillRect(px+2,py+4,8,12);
    ctx.fillStyle='#c0392b';ctx.fillRect(px,py,12,6);
    if((game.time*2|0)%2){ctx.fillStyle='#ffd84d';ctx.fillRect(px+4,py-4,3,3);}
  }});
  /* ⑨ 红圆桌（真素材, 纯装饰；无桌号/无座位安排, 左右对称摆放） */
  TABLE_POS.forEach(([tx,ty],i)=>{
    ents.push({y:ty*TILE+28,draw(){
      const px=tx*TILE-cam.x|0,py=ty*TILE-cam.y|0;
      const tb=img('tblRed');
      const cx=px+(tb?(tb.width/2|0):17), cy=py+13;
      if(tb)ctx.drawImage(tb, px, py+28-tb.height);
      else{ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(cx,py+22,17,5,0,0,7);ctx.fill();
        ctx.fillStyle='#c0392b';ctx.beginPath();ctx.ellipse(cx,cy,17,10,0,0,7);ctx.fill();}
      /* 桌上喜宴菜品(真素材, 每桌两道, 居中摆在桌面正中) */
      const fy=py+5;     // 桌面正中(原来偏下)
      const d1=img('food'+(1+i%6)), d2=img('food'+(1+(i+3)%6));
      if(d1)ctx.drawImage(d1, cx-d1.width-1, fy-(d1.height/2|0));
      if(d2)ctx.drawImage(d2, cx+1, fy-(d2.height/2|0));
      if(!d1){ctx.fillStyle='#3f8a3c';ctx.fillRect(cx-2,fy-2,4,3);ctx.fillStyle='#ff5c8a';ctx.fillRect(cx-2,fy-5,2,3);}
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
    /* 树/灌木等高素材锚点在底部、向上延伸80px，cull 余量放大避免在屏幕边缘“跳一跳”地出现/消失 */
    const x0=Math.max(0,cam.x/TILE-2|0),y0=Math.max(0,cam.y/TILE-1|0),
          x1=Math.min(s.w-1,(cam.x+VW)/TILE+2|0),y1=Math.min(s.h-1,(cam.y+VH)/TILE+6|0);
    const sdvTree=!!img('tree');
    for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){
      const tch=s.g[ty][tx];
      if(tch==='T'){
        /* 大树素材较宽：边界树墙隔一棵画一棵(碰撞不变)，避免过密 */
        const border=tx===0||ty===0||tx===s.w-1||ty===s.h-1;
        if(sdvTree&&border&&(tx+ty)%2)continue;
        ents.push({y:ty*TILE+TILE,occ:{x:tx*TILE-16,y:ty*TILE-80,w:48,h:88},
          draw:((a,b,c)=>()=>drawTree(a,b,c))(tx*TILE-cam.x|0,ty*TILE-cam.y|0,hash(tx,ty))});
      }
      else if(tch==='B'){ /* 开花灌木(可跳越) */
        ents.push({y:ty*TILE+TILE,draw:((a,b)=>()=>{
          const im=img('bushFl');
          if(im)ctx.drawImage(im,a-8,b-14);
          else{ctx.fillStyle='#3f8a3c';ctx.fillRect(a,b,16,14);ctx.fillStyle='#ff9eb5';ctx.fillRect(a+4,b+3,3,3);ctx.fillRect(a+10,b+6,3,3);}
        })(tx*TILE-cam.x|0,ty*TILE-cam.y|0)});
      }
    }
    BUILDINGS.forEach(b=>{
      const im=b.img&&img(b.img);
      const occ = im ? {x:bldImgX(b,im), y:(b.y+b.h)*TILE-im.height, w:im.width, h:im.height}
                     : {x:b.x*TILE-6, y:b.y*TILE-24, w:b.w*TILE+12, h:b.h*TILE+24};
      ents.push({y:(b.y+b.h)*TILE, occ, draw:()=>drawBuilding(b)});
    });
    WDECOR.forEach(d=>{
      const tall=d.img==='palm'||d.img==='xmasTree';
      ents.push({y:d.y+(d.h||14), occ: tall?{x:d.x-8,y:d.y-44,w:56,h:60}:null, draw:()=>{
        const im=img(d.img);
        if(!im)return;
        const bob=d.boat?Math.round(Math.sin(game.time*1.3+d.x)*1.5):0;   // 小船随波轻晃
        const sc=d.scale||1, dw=Math.round(im.width*sc), dh=Math.round(im.height*sc);
        const baseY=d.y+(d.h||im.height), dx=d.x+((im.width-dw)/2|0);      // 缩放后水平居中, 底边对齐
        ctx.drawImage(im, dx-cam.x|0, (baseY-dh+bob)-cam.y|0, dw, dh);
      }});
    });
    ents.push({y:WOBJ.well.y+28,draw:drawWell});
    ents.push({y:WOBJ.mailbox.y+12,draw:drawMailbox});
    ents.push({y:WOBJ.chest.y+10,draw:drawChest});
    ents.push({y:WOBJ.bush.y+14,draw:drawBush});
    ents.push({y:cat.y+12,draw:drawCat});
    chickens.forEach(ck=>ents.push({y:ck.y+12,draw:()=>drawChickenE(ck)}));
    for(const key in obstacles){
      const [ox,oy]=key.split(',').map(Number), ob=obstacles[key];
      ents.push({y:oy*TILE+15,draw:()=>drawObstacle(ox*TILE-cam.x|0, oy*TILE-cam.y|0, ob)});
    }
  }
  if(game.scene==='museum')drawMuseumInt(ents);
  if(game.scene==='hall')drawHallInt(ents);
  if(partner.scene===game.scene&&game.quest<6)
    ents.push({y:partner.y+16,draw:()=>drawChar(partner,partner.role,true)});
  ents.push({y:player.y+16,draw:()=>drawChar(player,game.playerRole,false)});
  /* 遮挡半透明：人物被前方(更靠下)的树/房屋/棕榈遮住时, 这些遮挡物半透明, 露出人物 */
  const pbox={x:player.x-2,y:player.y-16,w:16,h:32};
  const ov=(o)=>o&&!(o.x>pbox.x+pbox.w||o.x+o.w<pbox.x||o.y>pbox.y+pbox.h||o.y+o.h<pbox.y);
  ents.sort((a,b)=>a.y-b.y).forEach(e=>{
    if(game.scene==='world'&&e.occ&&e.y>player.y+14&&ov(e.occ)){
      ctx.globalAlpha=0.5; e.draw(); ctx.globalAlpha=1;
    } else e.draw();
  });
  drawMarker();
}

