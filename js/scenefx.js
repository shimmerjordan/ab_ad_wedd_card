/* ============================================================
 * 互动(二)：博物馆展品/殿堂婚纱照/仪式 tryCeremony + 完整请帖入口 + 另一半对话
 * （由原 game.js 按职责拆分，多文件共享全局作用域；保持原加载顺序）
 * ============================================================ */
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
function showHallPhoto(i){
  const p=(RT.hallPhotos&&RT.hallPhotos[i])||{};
  sfx('choice');flyHearts(innerWidth/2,innerHeight/2,2);
  showOverlay(
    `<h3>💍 ${esc(p.title||('婚纱照 '+(i+1)))}</h3>
     ${p.img?`<img class="exhibit-img" src="${esc(resolveImg(p.img))}" onerror="this.outerHTML='<div style=\\'font-size:12px;color:#8a5a2b\\'>（图片未找到：把婚纱照放到 assets/imgs/ 并在 DEBUG 里填文件名）</div>'">`
            :`<div style="font-size:13px;color:#8a5a2b">把你们的婚纱照放进 <b>assets/imgs/</b>，在 ⚙ DEBUG「婚纱照展板」里填文件名即可显示在这里。</div>`}
     <div class="frag-card">${esc(p.text||'')}</div>`,
    null,'看完了 ▶');
}
function museumQuestCheck(){
  if(game.quest!==4||!game.exhibitSeen)return;
  if(partner.scene==='museum'){
    startDialog([
      {who:partnerRole(),text:'这里每一件展品，都是我们一步步走来的证据。'},
      {who:partnerRole(),text:'最后一站——婚礼殿堂。我先去把彩旗挂好，你随后就来！'},
    ],()=>{
      partner.scene='hall';partner.x=12.5*TILE;partner.y=4.6*TILE;partner.dir='down';
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
  const lines=['一张布置好的喜宴圆桌，红绸桌布、瓷盘和小花艺都摆好了。','随便坐——今天来的都是自家人。','桌上的喜糖是星之果实味的，记得尝一颗。'];
  startDialog([{who:'me',text:lines[i%lines.length]}],()=>{sfx('blip');});
}

/* —— 终幕仪式 —— */
let ceremonyDone=false;
function tryCeremony(){
  if(game.quest<5||ceremonyDone)return;
  ceremonyDone=true;
  const other=partnerRole();
  sfx('piano');
  startDialog([
    {who:'mayor',text:'咳咳——各位来宾请就座！鹈鹕镇最隆重的仪式，现在开始！'},
    {who:other,text:'你来了。今天的殿堂，是全星露谷最好看的地方。'},
    {who:'me',text:'因为你站在这里。'},
    {who:'mayor',text:'二位，在亲友的见证下——请交换信物，并说出你们的誓言。',
      choices:CONFIG.vowChoices.map(c=>[c[0]]),
      onPick:i=>{game.vowIdx=i;dlg.queue.splice(dlg.idx+1,0,
        {who:other,text:CONFIG.vowChoices[i][1]},
        {who:other,text:(game.chestOpened?'戴上你找到的那枚「美人鱼吊坠」——':'交换「美人鱼吊坠」——')+'从今天起，我们就是一家人啦！'},
        {who:'mayor',text:'我宣布：礼成——！撒花！🎉'});
      }},
  ],()=>{
    game.hearts=10;game.heartLv6=true;game.heartLv10=true;   // 礼成 = 十心圆满
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
    [game.catFed>=3,'猫粮赞助商'],[game.hearts>=10,'十心相印'],
  ].filter(a=>a[0]).map(a=>'🏆 '+a[1]);
  return list.length?`<br>${list.join(' · ')}`:'';
}
function finalSummary(opt){
  opt=opt||{};
  const back = opt.back ? `<div class="center" style="margin-top:10px"><button class="sdv-btn ghost" style="color:#8a5a2b;border-color:#8a5a2b" id="finBack">‹ 返回上一页</button></div>` : '';
  showOverlay(
    `<div class="poster">`+
    posterHeroHTML()+
    couplePosterHTML()+
    seatHTML()+
    '<hr>'+letterHTML()+
    '<hr>'+infoHTML()+
    '<hr>'+scheduleHTML()+
    rsvpHTML()+
    `<div class="body center" style="text-align:center;margin-top:14px;font-size:13px;color:#8a5a2b">
      你的誓言：「${CONFIG.vowChoices[game.vowIdx][0].replace(/[「」]/g,'')}」
      ${achHTML()}
      <br>💫 记忆碎片 ${game.fragGot.length}/${RT.frags.length}
    </div>`+
    `<div class="poster-foot"><b>${esc(CONFIG.groom)}</b> <span class="px-heart"></span> <b>${esc(CONFIG.bride)}</b> · ${esc(CONFIG.dateText)}
      <br><button class="sdv-btn ghost" style="color:#8a5a2b;border-color:#8a5a2b;margin-top:12px" id="finGate">↩ 返回入口（重新选择请帖）</button></div>`+
    `</div>`+back,
    opt.onClose||null, opt.btnText||'回到游戏 ▶');
  drawPosterArt();
  if(opt.back){const b=document.getElementById('finBack'); if(b)b.onclick=opt.back;}
  {const fg=document.getElementById('finGate'); if(fg)fg.onclick=backToGate;}
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
/* —— 心级奖励：好感 6 心 TA 回礼；10 心特别对话（各一次）—— */
function heartMilestone(other){
  if(game.hearts>=10&&!game.heartLv10){
    game.heartLv10=true;
    sfx('fanfare');confetti(60);
    startDialog([
      {who:other,text:'知道吗，好感度这种东西，其实早就满格啦。'},
      {who:other,text:'从你第一次来找我那天起，就一直是 10 颗心。💗'},
      {who:'me',text:'（成就解锁：十心相印）'},
    ],()=>{ toast('🏆 隐藏成就：十心相印'); flyHearts(innerWidth/2,innerHeight/2,10); });
    return true;
  }
  if(game.hearts>=6&&!game.heartLv6){
    game.heartLv6=true;
    const r=Math.random();
    startDialog([
      {who:other,text:'老收你的礼物，我也准备了回礼——闭上眼，伸出手！'},
      {who:other,text:'（TA 在你手心放了一样东西，还顺势捏了捏你的手）'},
    ],()=>{
      if(r<0.4){game.fert+=2;toast('🎁 回礼：魔法肥料 ×2');}
      else if(r<0.7){game.bait+=3;toast('🎁 回礼：鱼饵 ×3');}
      else{game.coins+=6;toast('🎁 回礼：6 金币');}
      sfx('coin');updateItemBar();flyHearts(innerWidth/2,innerHeight/2,5);
    });
    return true;
  }
  return false;
}
/* —— 礼物反应表（星露谷式：不同礼物不同喜爱度）—— */
function giveGift(other,kind){
  game.giftN++;
  if(kind==='egg'){
    game.eggs--;updateItemBar();
    const reward=game.giftN%2===1?'bait':'coin';
    dlg.queue.splice(dlg.idx+1,0,
      {who:other,text:'给我的？还热乎着！（TA 小心地把鸡蛋收进篮子）'},
      {who:other,text:reward==='bait'?'拿这个回礼——两份鱼饵，钓鱼时用得上！':'那我也不能小气——给你 3 金币零花！'});
    dlg.onDoneExtra=()=>{
      if(reward==='bait'){game.bait+=2;toast('🪱 获得鱼饵 ×2');}
      else{game.coins+=3;toast('💰 获得 3 金币');}
      sfx('coin');updateItemBar();
      addHearts(1,'送鸡蛋');
      flyHearts(innerWidth/2,innerHeight/2,4);
    };
  }else if(kind==='fish'){
    const f=consumeBestFish();
    if(!f)return;
    const sp=fishSpeciesOf(f.sp);
    updateItemBar();
    dlg.queue.splice(dlg.idx+1,0,
      f.perfect
        ? {who:other,text:`哇，一条品相完美的「${sp.name}」！鳞片亮得能照出人影…舍不得下锅了，先养起来！`}
        : {who:other,text:`「${sp.name}」！今晚就加菜——你负责钓，我负责煎，这分工不错吧？`});
    dlg.onDoneExtra=()=>{ addHearts(f.perfect?2:1,f.perfect?'完美鱼获':'送鱼'); };
  }else if(kind==='flower'){
    game.fruits--;updateItemBar();
    dlg.queue.splice(dlg.idx+1,0,
      {who:other,text:'向日葵！我们的定情花…（TA 把花别在耳边）好看吗？'},
      {who:'me',text:'好看。比太阳还亮。'});
    dlg.onDoneExtra=()=>{ addHearts(2,'定情花'); };
  }else if(kind==='gem'){
    /* 送出最贵的一颗宝石 */
    let best=null;
    for(const g of GEM_TYPES)if(game.gems[g.key]>0&&(!best||g.price>best.price))best=g;
    if(!best)return;
    game.gems[best.key]--;updateItemBar();
    dlg.queue.splice(dlg.idx+1,0,
      best.key==='diamond'
        ? {who:other,text:'钻、钻石？！你从矿岩里敲出了钻石还直接送我…（TA 攥紧了拳头又松开）好，婚戒的事就包在我身上了！'}
        : {who:other,text:`「${best.name}」！刚好配我婚礼那天的耳环…你怎么什么都想到了。（TA 把宝石对着阳光眯眼看了很久）`});
    dlg.onDoneExtra=()=>{ addHearts(2,best.key==='diamond'?'钻石恒久远':'心爱的宝石'); };
  }
}
function talkPartner(){
  const other=partnerRole();
  /* 心级奖励优先（不打断任务推进的关键节点） */
  if(game.quest>=1&&game.scene==='world'&&heartMilestone(other))return;
  /* 送礼菜单（1-5 章，户外）：鸡蛋/最好的鱼/多余的向日葵 */
  const gifts=[];
  if(game.eggs>0)gifts.push(['egg',`「送TA一颗鸡蛋」(🥚${game.eggs})`]);
  if(game.fishN>0)gifts.push(['fish',`「送TA一条鱼」(🐟${game.fishN})`]);
  if(game.fruits>3)gifts.push(['flower',`「送TA一朵向日葵」(🌻${game.fruits-3})`]);
  if(gemTotal()>0)gifts.push(['gem',`「送TA一颗宝石」(💎${gemTotal()})`]);
  if(game.quest>=1&&game.quest<6&&gifts.length&&game.scene==='world'){
    const opts=[['「聊聊进展」']].concat(gifts.map(g=>[g[1]]));
    startDialog([
      {who:other,text:'怎么啦？是来看我，还是有好东西要分享？',
       choices:opts,
       onPick:i=>{
         if(i===0)dlg.queue.splice(dlg.idx+1,0,{who:other,text:partnerHint(other)});
         else giveGift(other,gifts[i-1][0]);
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
      addHearts(2,'久别重逢');
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
    case 4: return '欢迎来到「我们的回忆博物馆」！墙上的画、玻璃柜里的展品，走近按 A 都能看。对了，上墙的矿物展架还缺四颗宝石——镇西和湖东的矿岩里挖得到！';
    case 5: return '就等你啦。走上舞台来——仪式马上开始！';
    default: return '婚礼达成 ♥ 香槟塔、钢琴、五月柱、礼花筒都可以玩玩！';
  }
}

