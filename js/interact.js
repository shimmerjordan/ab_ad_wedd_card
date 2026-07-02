/* ============================================================
 * 互动(一)：互动派发 interact + 农务/觅食/采花/门/水井/宝箱/邮箱/清障/母鸡/猫/商店
 * （由原 game.js 按职责拆分，多文件共享全局作用域；保持原加载顺序）
 * ============================================================ */
/* ============================================================
 * 任务
 * ============================================================ */
const QUEST_TEXTS=[
  ()=>`找 ${nameFor(partnerRole())} 聊聊（东南花田，跟着箭头走）`,
  ()=>game.hasCan?`种 3 颗向日葵 → 浇水 → 收获（喂猫可得天然肥料加速）`:`先去水井边找回水壶，再种向日葵`,
  ()=>(game.rod&&game.bait>0)?`去湖边木栈道尽头抛竿，等「!」咬钩钓「同心鱼」`:`去杂货店购置鱼竿(12金)和鱼饵(2金3份)，卖蛋/卖花能凑钱`,
  ()=>`红色邮箱有一封信，去查收`,
  ()=>`去镇上的「博物馆」逛逛我们的回忆`,
  ()=>`前往南边「婚礼殿堂」，走上舞台举行仪式！`,
  ()=>`婚礼达成 ♥ 殿堂里还有桌位和互动，点 📜 重看请帖`,
];
function partnerRole(){return game.playerRole==='groom'?'bride':'groom';}
function setQuest(q){
  game.quest=q;
  document.getElementById('questText').textContent=QUEST_TEXTS[q]();
  /* 章节进度星并入右上角木牌 HUD 绘制, 不再用 DOM 星星 */
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
/* interact(probe)：probe=true 时只探测「面前有没有可互动目标」(返回真值)，
 * 不产生任何副作用——供「A」提示气泡与按钮发光使用；probe 省略时正常派发互动 */
function interact(probe){
  if(!probe)ensureCtx();
  const[fx,fy]=facingPoint();
  if(game.scene==='world'){
    if(partner.scene==='world'&&near(partner,22))return probe||talkPartner();
    if(near(chicken,18))return probe||talkChicken();
    if(near(cat,20))return probe||talkCat();
    if(near(dog,20))return probe||petDog();
    /* 采石点：面前是矿岩 → 镐子开采(有几率掉宝石) */
    { const mkey=(fx/TILE|0)+','+(fy/TILE|0); if(mineAlive(fx/TILE|0,fy/TILE|0))return probe||mineRock(mkey); }
    /* 路障：面前有石头/杂草/树枝 → 用对应工具清除 */
    { const okey=(fx/TILE|0)+','+(fy/TILE|0); if(obstacles[okey])return probe||clearObstacle(okey); }
    if(inRect(fx,fy,WOBJ.mailbox,8)||inRect(player.x+6,player.y+12,WOBJ.mailbox,10))return probe||openMailbox();
    if(inRect(fx,fy,WOBJ.chest,8))return probe||openChest();
    if(inRect(fx,fy,WOBJ.well,8))return probe||useWell();
    if(inRect(fx,fy,WOBJ.bush,6))return probe||pokeBush();
    /* 建筑门 */
    for(const b of BUILDINGS){
      const door=bldDoorRect(b);
      if(inRect(fx,fy,door,4)||inRect(player.x+6,player.y+12,door,6))return probe||doorAction(b);
    }
    /* 觅食灌木(谷粒) / 野花采摘 */
    const t=tileAt(fx,fy), tx=fx/TILE|0, ty=fy/TILE|0;
    if(t==='G')return probe||forageBush(tx,ty);
    if(t==='F')return probe||pickFlower(tx,ty);
    /* 湖边/栈道 */
    if(t==='~'){
      if(tileAt(player.x+6,player.y+12)==='='&&player.dir==='up')return probe||tryFish();
      return probe||fillCan('湖');
    }
    /* 耕地 */
    const key=tx+','+ty;
    const myKey=((player.x+6)/TILE|0)+','+((player.y+12)/TILE|0);
    const k=plots[key]?key:(plots[myKey]?myKey:null);
    if(k)return probe||farmAction(k);
  }
  else if(game.scene==='museum'){
    if(partner.scene==='museum'&&near(partner,24))return probe||talkPartner();
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
      if(RT.museum[idx])return probe||showExhibit(idx);
      return probe||startDialog([{who:'me',text:'这张展台还空着，等待布展。（DEBUG 模式可以添加展品）'}]);
    }
    /* 家具小互动 */
    if(inRect(fx,fy,MOBJ.skel,6))return probe||startDialog([{who:'me',text:'「远古海兽骨架」——据说是从矿井深处挖出来的。婚礼也要有镇馆之宝！'}]);
    if(inRect(fx,fy,MOBJ.bookL,8)||inRect(fx,fy,MOBJ.bookR,8))return probe||startDialog([{who:'me',text:'书架上摆着我们读过的书。有一本的折角，停在第一次见面那天。'}]);
    if(inRect(fx,fy,MOBJ.guest,8)){
      if(probe)return true;
      sfx('choice');flyHearts(innerWidth/2,innerHeight/2,2);
      return startDialog([{who:'me',text:'「宾客留言簿」——翻开第一页，是 TA 写的：「谢谢你来，往后的故事一起写。」'},{who:'me',text:'（我也提笔，在下一行画了一颗小爱心。）'}]);
    }
    for(const k of ['plantA','plantB','plantC','plantD'])
      if(inRect(fx,fy,MOBJ[k],6))return probe||startDialog([{who:'me',text:'盆栽被照顾得很好，叶子绿油油的。展厅里有了生气。'}]);
    /* 上墙矿物大展架：宝石捐赠（星露谷博物馆玩法） */
    if(fy<3.2*TILE && Math.abs(fx-13*TILE)<70)return probe||museumShelf();
  }
  else if(game.scene==='hall'){
    if(partner.scene==='hall'&&near(partner,26))return probe||talkPartner();
    /* 主持人镇长 */
    if(near(HALL_MAYOR,22))return probe||startDialog([{who:'mayor',
      text:ceremonyDone?'恭喜恭喜！这是我主持过最热闹的一场婚礼。记得去和每桌宾客碰杯！':'新人到齐就开始仪式。走上舞台来吧，全镇的人都等着呢！'}]);
    if(inRect(fx,fy,HOBJ.piano,8))return probe||playPiano();
    if(inRect(fx,fy,HOBJ.tower,8))return probe||champagne();
    if(inRect(fx,fy,HOBJ.poleL,6)||inRect(fx,fy,HOBJ.poleR,6)){
      if(probe)return true;
      sfx('quest');flyHearts(innerWidth/2,innerHeight/2,4);return toast('🎏 五月柱的彩带随风转了一圈');
    }
    if(inRect(fx,fy,HOBJ.popperL,8)||inRect(fx,fy,HOBJ.popperR,8))return probe||popper();
    /* 婚纱照展板 */
    for(let i=0;i<HALLPHOTO_POS.length;i++){
      const[tx2,ty2]=HALLPHOTO_POS[i];
      if(inRect(fx,fy,{x:tx2*TILE,y:ty2*TILE-40,w:36,h:50},6))return probe||showHallPhoto(i);
    }
    /* 桌子 */
    for(let i=0;i<TABLE_POS.length;i++){
      const[tx2,ty2]=TABLE_POS[i];
      if(inRect(fx,fy,{x:tx2*TILE,y:ty2*TILE,w:32,h:30},4))return probe||tableInfo(i);
    }
    /* 舞台 */
    if(tileAt(fx,fy)==='S'||tileAt(player.x+6,player.y+12)==='S'){
      if(probe)return game.quest>=5&&!ceremonyDone;   // 仪式可开时才提示
      return tryCeremony();
    }
  }
  return false;
}
/* —— 博物馆矿物大展架：四大宝石捐赠 —— */
function donateGem(key){
  if(game.gems[key]<=0||game.donated[key])return false;
  game.gems[key]--;game.donated[key]=1;game.donatedN++;
  updateItemBar();
  const g=gemOf(key);
  sfx('treasure');flyHearts(innerWidth/2,innerHeight/3,2);
  toast(`💎 「${g.name}」已入驻展架！（${game.donatedN}/4）`);
  if(game.donatedN>=2&&!game.donateLv2){
    game.donateLv2=true;game.coins+=10;sfx('coin');updateItemBar();
    setTimeout(()=>toast('🏛 馆长的谢礼：10 金币！'),900);
  }
  if(game.donatedN>=4&&!game.donateLv4){
    game.donateLv4=true;confetti(50);
    addHearts(1,'矿物学家');
    setTimeout(()=>{toast('🏆 隐藏成就：矿物学家 · 展架圆满！');maybeFrag(1);},1100);
  }
  return true;
}
function museumShelf(){
  const donatable=GEM_TYPES.filter(g=>g.key!=='diamond');
  const missing=donatable.filter(g=>!game.donated[g.key]);
  const canGive=missing.filter(g=>game.gems[g.key]>0);
  if(!missing.length)
    return startDialog([{who:'me',text:'「矿物与宝石标本架」四颗宝石已经集齐，在灯光下闪成一片星海。这就是我们的镇馆之宝！'}]);
  if(!canGive.length)
    return startDialog([{who:'me',text:`「矿物与宝石标本架」还差 ${missing.map(g=>g.name).join('、')}。听说镇子西边和湖东边的矿岩里能挖到（用镐子）。`}]);
  const opts=canGive.map(g=>[`「捐赠 ${g.name}」(存${game.gems[g.key]})`]).concat([['「先不捐」']]);
  startDialog([
    {who:'me',text:`展架上还空着 ${missing.length} 个格子。把挖到的宝石放上去吧？`,
     choices:opts,
     onPick:i=>{
       if(i>=canGive.length)return;
       const g=canGive[i];
       dlg.queue.splice(dlg.idx+1,0,{who:'me',text:`（小心翼翼把「${g.name}」摆进丝绒格子里，灯光下真好看）`});
       dlg.onDoneExtra=()=>donateGem(g.key);
     }},
  ],()=>{ const cb=dlg.onDoneExtra;dlg.onDoneExtra=null;cb&&cb(); });
}
/* —— 觅食灌木：采谷粒喂鸡 —— */
function forageBush(tx,ty){
  const key=tx+','+ty;
  if(forageT[key]&&game.time-forageT[key]<40)
    return startDialog([{who:'me',text:'这丛灌木刚被薅过，过一会儿再来吧。'}]);
  if(game.feed>=5)return toast('谷粒袋满了（5/5），先去喂鸡吧');
  forageT[key]=game.time;
  game.feed++;sfx('plant');updateItemBar();showGet('🌾');
  toast(`🌾 在灌木丛里翻到一把谷粒（${game.feed}/5）· 可以去喂鸡`);
}
/* —— 野花采摘：可卖钱 —— */
function pickFlower(tx,ty){
  const key=tx+','+ty;
  if(pickedF[key]&&game.time-pickedF[key]<60)
    return toast('这一株刚被摘过，等它再开');
  if(game.flowers>=9)return toast('野花已经抱不下了（9/9），去杂货店卖掉些吧');
  pickedF[key]=game.time;
  game.flowers++;sfx('plant');updateItemBar();showGet('🌼');
  flyHearts(innerWidth/2,innerHeight/2,1);
  toast(`🌼 摘下一朵野花（${game.flowers}/9）· 杂货店收购 2金/朵`);
}

/* —— 各互动实现 —— */
function doorAction(b){
  switch(b.door.act){
    case 'homeDoor': return startDialog([{who:'me',text:'这是我们婚后的小家。今天先不开放参观啦~'}]);
    case 'nbDoor':   return startDialog([{who:'me',text:'邻居家。门上贴着字条：「去喝喜酒了，不在家」。'}]);
    case 'coopDoor': return startDialog([{who:'me',text:'鸡舍里暖烘烘的，两只母鸡咕咕地打着招呼。运动场里好像还藏着个宝箱（跳过栅栏看看）。'}]);
    case 'shop':     return openShop();
    case 'enterMuseum': return gotoScene('museum',9.7*TILE,11.5*TILE);
    case 'enterHall':
      if(game.quest<5&&!DEBUG){startDialog([{who:'me',text:'殿堂的大门还没开。先把别的事办完吧（看顶部任务提示）。'}]);return;}
      return gotoScene('hall',12.5*TILE,20*TILE);
  }
}
function useWell(){
  /* 任务获取水壶：TA 把水壶忘在了井边 */
  if(!game.hasCan){
    if(game.quest<1)return startDialog([{who:'me',text:'井边挂着一只旧水壶…是 TA 的。先去花田找 TA 吧。'}]);
    game.hasCan=true;game.water=3;sfx('harvest');updateItemBar();showGet('🪣');
    return startDialog([{who:'me',text:'井边果然挂着 TA 说的那只旧水壶！壶身上还刻着我们俩的名字缩写。'}],()=>{
      toast('🏆 获得 <b style="color:#7dc4ff">刻字水壶</b>（已接满 3 格水）');
      setQuest(1);
    });
  }
  if(game.water>=3){
    game.wellWish++;
    if(game.wellWish===3){
      sfx('coin');toast('🏆 隐藏彩蛋：井底的愿望');addHearts(1,'井底的愿望');
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
  if(game.bait<=0)return startDialog([{who:'me',text:'没有鱼饵了，空钩可钓不上「同心鱼」。杂货店 2 金币 3 份。'}]);
  startFishing();   // 鱼饵在鱼上钩时才消耗
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
      toast('🏆 隐藏彩蛋：草丛里的萤火虫为你们起舞');addHearts(1,'萤火虫起舞');
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
           dlg.onDoneExtra=()=>{toast('🏆 隐藏彩蛋：博物馆后巷的小猫');addHearts(1,'后巷小猫');maybeFrag(1);};
         }else flyHearts(innerWidth/2,innerHeight/2,2);
       }else if(label.startsWith('「喂它一颗鸡蛋')||label.startsWith('「喂它一条小鱼')){
         const isFish=label.includes('小鱼');
         if(isFish)consumeFish();else game.eggs--;
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
/* —— 农场狗「旺财」：摸头 —— */
function petDog(){
  sfx('blip');
  if(!dog.petted){
    dog.petted=true;
    flyHearts(innerWidth/2,innerHeight/2,3);
    return startDialog([
      {who:'me',text:'（蹲下来挠了挠它的下巴）它眯起眼睛，尾巴摇成了螺旋桨。'},
      {who:'me',text:'字牌上写着：「旺财 · 婚礼护卫队队长」。看来今天它也有重要任务。'},
    ],()=>{ addHearts(1,'旺财的认可'); toast('🐶 旺财允许你摸它的头了（随时可以再摸）'); });
  }
  flyHearts(innerWidth/2,innerHeight/2,2);
  startDialog([{who:'me',text:['汪！（它开心地拍了拍尾巴）','（它翻了个身，露出肚皮）这是最高级别的信任。','它把下巴搁在你的鞋面上，重量刚刚好。'][Math.random()*3|0]}]);
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
           game.eggs++;sfx('harvest');updateItemBar();showGet('🥚');
           toast('🥚 获得鸡蛋 ×1（可以送TA、喂猫、或卖4金）');
         };
       }else if(label.startsWith('「咯咯哒？')){
         game.chickenTalk++;
         if(game.chickenTalk<3)
           dlg.queue.splice(dlg.idx+1,0,{who:'chicken',text:['咯咯哒？','咯咯…咯咯哒！','（小鸡歪着头看你）'][game.chickenTalk%3]});
         else if(game.chickenTalk===3){
           dlg.queue.splice(dlg.idx+1,0,{who:'chicken',text:'咯咯哒——！（它郑重地拍了拍翅膀，送上鸡生最真挚的祝福）'});
           dlg.onDoneExtra=()=>{toast('🏆 隐藏成就：小鸡的祝福');addHearts(1,'小鸡的祝福');flyHearts(innerWidth/2,innerHeight/2,4);};
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
    toast('🏆 隐藏彩蛋：美人鱼吊坠');addHearts(1,'美人鱼吊坠');
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

/* —— 采石点：镐子开采, 有几率掉宝石 —— */
function gainGem(g){
  game.gems[g.key]++;showGet('💎');updateItemBar();
  sfx('treasure');
  toast(`💎 挖到「<b>${g.name}</b>」！可捐给博物馆展架、送TA或卖 ${g.price} 金`);
}
function mineRock(key){
  if(curTool().key!=='pickaxe'){ sfx('blip'); return toast('这是矿岩，需要用「镐子」开采（点底部装备栏切换工具）'); }
  showOver('tool','pickaxe',0.5);
  mines[key].t=game.time;                      // 进入重生倒计时
  if(Math.random()<0.62){ gainGem(rollGem()); }
  else{ game.coins++;sfx('coin');updateItemBar(); toast('⛏ 敲开了矿岩…只有一堆碎石（+1 金）。这附近还会再长出来'); }
}
/* —— 清除路障(石头/杂草/树枝)；碎石头有小概率掉宝石 —— */
function clearObstacle(key){
  const ob=obstacles[key], tool=curTool();
  const cn={rock:'石头',weed:'杂草',branch:'树枝'}[ob.type];
  const need={rock:'镐子',weed:'镰刀',branch:'斧头'}[ob.type];
  if(tool.clears!==ob.type){ sfx('blip'); return toast(`这是${cn}，需要用「${need}」清除（点底部装备栏切换工具）`); }
  showOver('tool', tool.key, 0.5); sfx('harvest');
  delete obstacles[key];
  if(ob.type==='rock'&&Math.random()<0.25){ gainGem(rollGem()); return; }
  toast(`🧹 用${need}清除了${cn}，路通了！`);
}
/* —— 农务 —— */
function farmAction(key){
  const p=plots[key];
  if(game.quest<1)return startDialog([{who:'me',text:'先去花田找 TA 吧（跟着金色箭头）。'}]);
  /* 0) 开垦：用锄头翻土两下即成可种地块（星露谷一锄成田, 这里保留一点进度感） */
  if(p.till<2){
    if(curTool().key!=='hoe'){ sfx('blip'); return toast('这块地还没开垦——请选「锄头」翻土（点底部装备栏切换）'); }
    p.till++; showOver('tool','hoe',0.5); sfx('plant');
    return toast(p.till>=2?'🟫 翻好一块松软的地！现在可以播种了':`⛏ 翻土中…（${p.till}/2，再翻一下）`);
  }
  if(p.st===0){
    /* 选种：只有一种直接种, 多种弹选择 */
    const opts=[];
    if(game.seeds>0)opts.push(['sun',`向日葵种子 ×${game.seeds}`]);
    if(game.seedBag.straw>0)opts.push(['straw',`草莓种子 ×${game.seedBag.straw}`]);
    if(game.seedBag.blue>0)opts.push(['blue',`蓝莓种子 ×${game.seedBag.blue}`]);
    if(!opts.length)return startDialog([{who:'me',text:'没有种子了。杂货店有卖：向日葵 3 金、草莓 4 金、蓝莓 5 金。'}]);
    if(opts.length===1)return plantCrop(key,opts[0][0]);
    return startDialog([
      {who:'me',text:'这块地种点什么好呢？',
       choices:opts.map(o=>['「种'+CROP_DEFS[o[0]].name+'」('+o[1].split('×')[1]+')']),
       onPick:i=>{ dlg.onDoneExtra=()=>plantCrop(key,opts[i][0]); }},
    ],()=>{ const cb=dlg.onDoneExtra;dlg.onDoneExtra=null;cb&&cb(); });
  }else if(p.st===1){
    if(!game.hasCan)return startDialog([{who:'me',text:'还没有水壶。TA 说忘在水井边了，去拿吧（跟着箭头）。'}]);
    if(game.water<=0)return startDialog([{who:'me',text:'水壶空了。去水井或湖边按 A 接水。'}]);
    game.water--;p.st=2;p.t=game.time;sfx('water');updateItemBar();
    toast(`💧 浇水完毕（剩 ${game.water} 次）`);
  }else{
    const def=CROP_DEFS[p.crop||'sun'];
    const ripeT=p.fert?def.fertRipe:def.ripe;
    const stage=Math.min(3,1+((game.time-p.t)/ripeT|0));
    if(stage<3){
      if(game.fert>0&&!p.fert){
        game.fert--;p.fert=1;sfx('plant');updateItemBar();
        return toast('💜 施肥成功！生长加速，还会闪闪发光');
      }
      sfx('blip');return toast(p.fert?'金灿灿的，马上就熟！':'长得很好，再等等…（杂货店的肥料可加速）');
    }
    const golden=p.fert===1, kind=p.crop||'sun';
    p.st=0;p.fert=0;p.crop=null;sfx('harvest');
    flyHearts(innerWidth/2,innerHeight/2,3);
    updateItemBar();
    if(kind!=='sun'){                          // 经济作物：入包, 商店收购
      game.cropInv[kind]++;showGet(def.icon);
      toast(`${def.icon} 收获${golden?'「金」品质':''}${def.name}！（杂货店 ${def.sell} 金收购）`);
      if(golden)addHearts(1,'金品质'+def.name);
      updateItemBar();maybeFrag(golden?0.5:0.15);
      return;
    }
    game.fruits++;showGet(golden?'🌟':'🌻');
    toast(`🌻 收获${golden?'「金色」':''}向日葵！（${game.fruits}/3）`);
    if(golden)addHearts(1,'金色向日葵');
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
/* 播种（选定作物） */
function plantCrop(key,kind){
  const p=plots[key]; if(!p||p.st!==0)return;
  if(kind==='sun'){ if(game.seeds<=0)return; game.seeds--; }
  else{ if(game.seedBag[kind]<=0)return; game.seedBag[kind]--; }
  p.st=1;p.crop=kind;p.fert=0;
  sfx('plant');updateItemBar();showGet('🌱');
  const left=kind==='sun'?game.seeds:game.seedBag[kind];
  toast(`🌱 种下${CROP_DEFS[kind].name}种子（剩 ${left}）· 浇灌它吧`);
}

/* —— 杂货店 v4：买卖双列，渔具/种子/肥料 + 分鱼种收购（完美品相 ×1.5）—— */
function fishSellRows(){
  return FISH_SPECIES.map(sp=>{
    const all=game.fishInv.filter(f=>f.sp===sp.key);
    if(!all.length)return '';
    const pf=all.filter(f=>f.perfect).length;
    const cnt=`×${all.length}${pf?`（✨完美${pf}）`:''}`;
    return `<div class="trade-row"><div class="nm"><img class="ticon" src="assets/elem/${sp.icon}.png" alt="">${sp.name} ${cnt}</div><div class="pr">+${sp.price}${pf?'/'+Math.round(sp.price*1.5):''} 金</div><button class="sdv-btn small" data-sell="fish:${sp.key}">卖</button></div>`;
  }).join('');
}
function shopRows(){
  return `
  <div class="body" style="text-align:center;font-size:12px;color:#8a5a2b">—— 购买 ——</div>
  <div class="trade-row"><div class="nm">🌱 向日葵种子</div><div class="pr">3 金</div><button class="sdv-btn small" data-buy="seed">买</button></div>
  <div class="trade-row"><div class="nm"><img class="ticon" src="assets/elem/iconStraw.png" alt="">草莓种子</div><div class="pr">4 金</div><button class="sdv-btn small" data-buy="seedS">买</button></div>
  <div class="trade-row"><div class="nm"><img class="ticon" src="assets/elem/iconBlue.png" alt="">蓝莓种子</div><div class="pr">5 金</div><button class="sdv-btn small" data-buy="seedB">买</button></div>
  <div class="trade-row"><div class="nm">💜 魔法肥料（催熟+金花）</div><div class="pr">5 金</div><button class="sdv-btn small" data-buy="fert">买</button></div>
  <div class="trade-row"><div class="nm">🎣 鱼竿${game.rod?'（已拥有）':''}</div><div class="pr">12 金</div>${game.rod?'':'<button class="sdv-btn small" data-buy="rod">买</button>'}</div>
  <div class="trade-row"><div class="nm">🪱 鱼饵 ×3（咬钩才消耗）</div><div class="pr">2 金</div><button class="sdv-btn small" data-buy="bait">买</button></div>
  <div class="body" style="text-align:center;font-size:12px;color:#8a5a2b;margin-top:6px">—— 收购 ——</div>
  ${fishSellRows()}
  ${['straw','blue'].filter(k=>game.cropInv[k]>0).map(k=>{
    const d=CROP_DEFS[k], ic=k==='straw'?'iconStraw':'iconBlue';
    return `<div class="trade-row"><div class="nm"><img class="ticon" src="assets/elem/${ic}.png" alt="">${d.name} ×${game.cropInv[k]}</div><div class="pr">+${d.sell} 金</div><button class="sdv-btn small" data-sell="crop:${k}">卖</button></div>`;
  }).join('')}
  ${GEM_TYPES.filter(g=>game.gems[g.key]>0).map(g=>
    `<div class="trade-row"><div class="nm"><img class="ticon" src="assets/elem/${g.icon}.png" alt="">${g.name} ×${game.gems[g.key]}</div><div class="pr">+${g.price} 金</div><button class="sdv-btn small" data-sell="gem:${g.key}">卖</button></div>`).join('')}
  <div class="trade-row"><div class="nm">🥚 鸡蛋 ×${game.eggs}</div><div class="pr">+4 金</div><button class="sdv-btn small" data-sell="egg">卖</button></div>
  <div class="trade-row"><div class="nm">🌼 野花 ×${game.flowers}</div><div class="pr">+2 金</div><button class="sdv-btn small" data-sell="flower">卖</button></div>
  <div class="trade-row"><div class="nm">🌻 多余向日葵 ×${Math.max(0,game.fruits-3)}</div><div class="pr">+5 金</div><button class="sdv-btn small" data-sell="sun">卖</button></div>
  <div class="trade-row"><div class="nm">💰 当前金币</div><div class="pr" id="shopCoins">${game.coins}</div></div>`;
}
function openShop(){
  sfx('coin');
  game.mode='ui';
  const greets=[
    '欢迎光临！婚礼用品一应俱全～',
    '听说你们的婚礼快到了？种子给你算老价钱！',
    '新鲜的种子、结实的鱼竿——都是给新人的好货！',
    '收购价公道，童叟无欺。恭喜恭喜！',
  ];
  showOverlay(`<h3>🏪 杂货店</h3>
  <div class="shop-keeper">
    <img src="assets/elem/portPierre.png" alt="皮埃尔">
    <div class="sk-line"><b>皮埃尔</b>：${greets[Math.random()*greets.length|0]}</div>
  </div>
  <div id="shopBody">${shopRows()}</div>`,null,'离开 ▶');
}
/* 商店按钮：全局事件委托（只绑一次，避免重复触发） */
overlayInner.addEventListener('click',e=>{
  const b=e.target.closest('button[data-buy],button[data-sell]');
  if(!b)return;
  const buy=b.dataset.buy, sell=b.dataset.sell;
  if(buy==='seed'){
    if(game.coins<3)return toast('金币不够…卖点鸡蛋/野花/鱼吧');
    game.coins-=3;game.seeds++;sfx('coin');showGet('🌱');toast('购买成功：向日葵种子 +1');
  }else if(buy==='seedS'){
    if(game.coins<4)return toast('金币不够…卖点鸡蛋/野花/鱼吧');
    game.coins-=4;game.seedBag.straw++;sfx('coin');toast('购买成功：草莓种子 +1');
  }else if(buy==='seedB'){
    if(game.coins<5)return toast('金币不够…卖点鸡蛋/野花/鱼吧');
    game.coins-=5;game.seedBag.blue++;sfx('coin');toast('购买成功：蓝莓种子 +1');
  }else if(buy==='fert'){
    if(game.coins<5)return toast('金币不够…卖点鸡蛋/野花/鱼吧');
    game.coins-=5;game.fert++;sfx('coin');toast('购买成功：魔法肥料 +1');
  }else if(buy==='rod'){
    if(game.rod)return toast('已经有鱼竿了');
    if(game.coins<12)return toast(`还差 ${12-game.coins} 金币…喂鸡下蛋、采野花都能换钱`);
    game.coins-=12;game.rod=true;sfx('quest');showGet('🎣');toast('🎣 购得鱼竿！再备点鱼饵就能开钓');
  }else if(buy==='bait'){
    if(game.coins<2)return toast('金币不够…卖点东西吧');
    game.coins-=2;game.bait+=3;sfx('coin');toast('购买成功：鱼饵 +3');
  }else if(sell&&sell.startsWith('fish:')){
    const key=sell.slice(5), sp=FISH_SPECIES.find(s=>s.key===key);
    /* 先卖普通品相，完美的留到最后（也许玩家想送人） */
    let idx=game.fishInv.findIndex(f=>f.sp===key&&!f.perfect);
    if(idx<0)idx=game.fishInv.findIndex(f=>f.sp===key);
    if(idx<0||!sp)return toast('背包里没有这种鱼了');
    const sold=game.fishInv.splice(idx,1)[0];
    game.fishN=game.fishInv.length;
    const gain=Math.round(sp.price*(sold.perfect?1.5:1));
    game.coins+=gain;sfx('coin');
    toast(`卖出「${sp.name}」${sold.perfect?'(完美✨)':''} +${gain} 金币`);
  }else if(sell&&sell.startsWith('crop:')){
    const k=sell.slice(5), d=CROP_DEFS[k];
    if(!d||game.cropInv[k]<=0)return toast('没有'+(d?d.name:'这种作物')+'了');
    game.cropInv[k]--;game.coins+=d.sell;sfx('coin');
    toast(`卖出「${d.name}」 +${d.sell} 金币`);
  }else if(sell&&sell.startsWith('gem:')){
    const g=gemOf(sell.slice(4));
    if(!g||game.gems[g.key]<=0)return toast('没有这种宝石了');
    game.gems[g.key]--;game.coins+=g.price;sfx('coin');
    toast(`卖出「${g.name}」 +${g.price} 金币`);
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

