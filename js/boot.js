/* ============================================================
 * 启动与入口：设置/DEBUG 编辑器 + 标题屏/startGame + 入口门(gate)/暗夜请帖(lux) + 测试钩子
 * （由原 game.js 按职责拆分，多文件共享全局作用域；保持原加载顺序）
 * ============================================================ */
/* ============================================================
 * 设置 / DEBUG
 * ============================================================ */
let verTaps=0,verTapT=0;
function openSettings(){
  if(game.mode==='dialog'||game.mode==='fish')return;
  const dbgBtns=DEBUG?`
    <div class="ed-btns">
      <button class="sdv-btn small" id="edMuseum">🖼 博物馆展品配置</button>
      <button class="sdv-btn small" id="edPhotos">💍 婚纱照展板配置</button>
      <button class="sdv-btn small" id="edSeats">🪑 婚宴桌位配置</button>
      <button class="sdv-btn small" id="edFrags">💫 记忆碎片配置</button>
      <button class="sdv-btn small" id="edExport">⬇ 导出配置 JSON</button>
      <button class="sdv-btn small danger" id="edClear">清除本地配置</button>
    </div>
    <div class="body" style="font-size:12px;color:#8a5a2b;text-align:center;margin-top:6px">— 任务直达（自动补齐所需道具）—</div>
    <div class="ed-btns" id="dbgJump">
      ${[0,1,2,3,4,5].map(q=>`<button class="sdv-btn small" data-jq="${q}">Q${q}</button>`).join('')}
      <button class="sdv-btn small" data-jq="6">礼成</button>
    </div>`:'';
  showOverlay(
    `<h3>⚙ 设置</h3>
     <div class="set-row"><div class="lab">背景音乐</div><div class="toggle ${bgmOn?'on':''}" id="tgBgm"></div></div>
     <div class="set-row"><div class="lab">音效</div><div class="toggle ${sfxOn?'on':''}" id="tgSfx"></div></div>
     <div class="set-row"><div class="lab">操作说明</div><button class="sdv-btn small" id="helpBtn">查看</button></div>
     <div class="set-row"><div class="lab">关于</div><button class="sdv-btn small" id="aboutBtn">GitHub 开源地址</button></div>
     <div class="set-row"><div class="lab">返回入口</div><button class="sdv-btn small" id="toGate">重新选择请帖</button></div>
     <div class="set-row"><div class="lab">重新开始</div><button class="sdv-btn small danger" id="restartBtn">清除存档 · 从头玩</button></div>
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
  document.getElementById('toGate').onclick=backToGate;
  { const rb=document.getElementById('restartBtn'); if(rb)rb.onclick=()=>{
    overlay.style.display='none';
    startDialog([{who:'me',text:'确定清除当前存档、从头开始这段旅程吗？',
      choices:[['「确定，重新开始」'],['「先不了」']],
      onPick:i=>{ if(i===0){ clearSave(); dlg.onDoneExtra=()=>location.reload(); } }}],
      ()=>{ const cb=dlg.onDoneExtra;dlg.onDoneExtra=null;cb&&cb(); });
  }; }
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
    document.getElementById('edPhotos').onclick=()=>openListEditor('hallPhotos');
    document.getElementById('edSeats').onclick=()=>openSeatsEditor();
    document.getElementById('edFrags').onclick=()=>openListEditor('frags');
    document.getElementById('edExport').onclick=exportConfig;
    document.getElementById('edClear').onclick=()=>{
      for(const k of ['museum','seats','frags','hallPhotos'])lsDel(LS[k]);
      RT.museum=CONFIG.museum;RT.seats=CONFIG.seats;RT.frags=CONFIG.frags;RT.hallPhotos=CONFIG.hallPhotos||[];
      toast('已恢复默认配置');openSettings();
    };
    document.querySelectorAll('#dbgJump [data-jq]').forEach(b=>b.onclick=()=>debugJump(+b.dataset.jq));
  }
}
/* DEBUG：任务直达（补齐道具与 NPC 位置，并传送到对应场景） */
function debugJump(q){
  overlay.style.display='none';game.mode='play';
  game.seeds=Math.max(game.seeds,3);
  if(q>=1){game.hasCan=true;game.water=3;}
  if(q>=2){game.fruits=Math.max(game.fruits,3);game.rod=true;game.bait=Math.max(game.bait,3);game.coins+=8;}
  if(q>=3){game.fishQ=true;}
  partner.scene='world';partner.x=30*TILE;partner.y=27*TILE;
  if(q>=4){partner.scene='museum';partner.x=13*TILE;partner.y=4.5*TILE;}
  if(q>=5){partner.scene='hall';partner.x=12.5*TILE;partner.y=4.6*TILE;}
  ceremonyDone=false;
  game.scene='world';
  const spots={0:[28,27],1:[11,8],2:[7,23],3:[9,7],4:[24,23],5:[17.5,38],6:[17.5,38]};
  const [sx,sy]=spots[q]||spots[0];
  player.x=sx*TILE;player.y=sy*TILE;
  if(q>=6){setQuest(6);ceremonyDone=true;}
  else setQuest(q);
  updateCam();
  toast(`🛠 已跳转到任务 Q${q}`);
}
document.getElementById('setBtn').addEventListener('click',openSettings);

/* —— 通用列表编辑器（博物馆/碎片）—— */
function openListEditor(kind){
  const isMu=kind==='museum', isPhoto=kind==='hallPhotos', hasTitle=isMu||isPhoto;
  const items=JSON.parse(JSON.stringify(RT[kind]));
  function render(){
    const rows=items.map((it,i)=>`
      <div class="ed-item" data-i="${i}">
        <button class="ed-del" data-del="${i}">✕</button>
        ${hasTitle?`<label>标题</label><input type="text" data-f="title" data-i="${i}" value="${esc(it.title||'')}">`:''}
        <label>文字内容</label><textarea data-f="text" data-i="${i}">${esc(it.text||'')}</textarea>
        <label>图片：填 assets/imgs/ 下的<b>文件名</b>（如 合照.jpg），或完整URL，或上传转存</label>
        <input type="text" data-f="img" data-i="${i}" value="${(it.img||'').startsWith('data:')?'(已存入本地图片)':esc(it.img||'')}" placeholder="https://... 或留空">
        <input type="file" accept="image/*" data-file="${i}" style="font-size:11px;margin-top:4px">
        ${it.img?`<img class="ed-thumb" src="${esc(resolveImg(it.img))}" onerror="this.style.opacity=.25">`:''}
      </div>`).join('');
    const hd=isMu?'🖼 博物馆展品配置':isPhoto?'💍 婚纱照展板配置':'💫 记忆碎片配置';
    const tip=isMu?'1-4 = 上墙挂画区 · 5-12 = 中央玻璃展柜':isPhoto?'婚礼殿堂里的婚纱照展板(共 4 块, 把照片放进 assets/imgs/)':'农作/钓鱼/彩蛋时随机掉落';
    showOverlay(
      `<h3>${hd} <span style="font-size:11px;color:#8a5a2b">(${items.length}${isMu?'/12':isPhoto?'/4':''})</span></h3>
       <div class="body" style="font-size:12px;color:#8a5a2b;text-align:center">${tip}</div>
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
      if(isPhoto&&items.length>=4)return toast('婚纱照展板最多 4 块');
      items.push(hasTitle?{title:'',text:'',img:''}:{text:'',img:''});render();
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
     <div class="body" style="font-size:12px;color:#8a5a2b;text-align:center">每行一位宾客：<b>姓名,桌号</b>（桌号 1-15 对应殿堂里的圆桌）</div>
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
  const json=JSON.stringify({museum:RT.museum,seats:RT.seats,frags:RT.frags,hallPhotos:RT.hallPhotos},null,2);
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
function startGame(role,resume){
  ensureCtx();toggleBgm(true);
  if(!resume){ game.playerRole=role; clearSave(); }
  partner.role=partnerRole();
  document.body.classList.remove('lux-bg');
  if(typeof luxFxStop==='function')luxFxStop();
  document.getElementById('gate').style.display='none';
  document.getElementById('lux').style.display='none';
  document.getElementById('title').style.display='none';
  document.getElementById('hud').style.display='block';
  if(matchMedia('(pointer:coarse)').matches){
    document.getElementById('padL').style.display='block';
    document.getElementById('btns').style.display='flex';
    const ph=document.getElementById('padHint');
    ph.style.display='flex';
    setTimeout(()=>toast('👈 屏幕左下角拖动 = 移动 · 右下 A 互动 / B 跳'),900);
    setTimeout(()=>{ if(!ph.classList.contains('gone')){ph.classList.add('gone');setTimeout(()=>ph.style.display='none',600);} },9000);
  }
  game.mode='play';
  /* 彩蛋②深夜访问 / 彩蛋⑧纪念日（继续与新开都检测一次） */
  try{
    const now=new Date(), h=now.getHours();
    if((h>=23||h<5)&&!game.nightSeen){ game.nightSeen=true; setTimeout(()=>toast('🌙 这么晚还在看请帖呀…早点休息，我们婚礼上见！'),2600); }
    const md=String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
    const anv=(CONFIG.anniversaries||[]).find(a=>a&&a.date===md);
    if(anv&&!game.annivSeen){ game.annivSeen=true; setTimeout(()=>showOverlay(`<h3>💗 今天是特别的日子</h3><div class="frag-card">${esc(anv.text)}</div>`,null,'❤ 收下'),3400); }
  }catch(e){}
  if(resume){
    setQuest(game.quest);            // 刷新任务文案(不重置进度)
    updateItemBar();
    if(typeof renderToolbar==='function')renderToolbar();
    updateCam();
    setTimeout(()=>toast('⏳ 已恢复上次进度（在 ⚙ 设置里可重新开始）'),400);
    return;
  }
  setQuest(0);updateCam();
  if(!QS.get('nodlg'))setTimeout(()=>startDialog([
    {who:'me',text:`（天气真好。${nameFor(partnerRole())} 在东南边的花田等我——跟着金色箭头走吧。）`},
    {who:'me',text:'（镇上多了好几栋房子：杂货店、博物馆…南边还有座挂满彩旗的婚礼殿堂！）'},
  ]),350);
}
/* 继续上次旅程：恢复存档后进入游戏(不重置状态) */
function continueGame(){
  const s=lsGet(SAVE_KEY);
  if(!s||!applySave(s)){ toast('存档已失效，将开始新旅程'); clearSave(); return; }
  startGame((s.g&&s.g.playerRole)||'groom', true);
}
document.getElementById('pickGroom').addEventListener('click',()=>startGame('groom'));
document.getElementById('pickBride').addEventListener('click',()=>startGame('bride'));
/* 标题屏：有存档时置顶「继续上次旅程」 */
if(typeof hasSave==='function'&&hasSave()){
  const tt=document.getElementById('title'), pk=tt&&tt.querySelector('.pick');
  if(tt&&pk){
    const cb=document.createElement('button');
    cb.className='sdv-btn'; cb.id='continueBtn';
    cb.style.cssText='margin:2px auto 12px;display:block';
    cb.textContent='▶ 继续上次旅程';
    cb.onclick=continueGame;
    tt.insertBefore(cb,pk);
  }
}
document.getElementById('skipBtn').addEventListener('click',()=>{
  /* 直接查看请帖：看完关闭→以新郎身份正式开始游戏；另设「返回」回到角色选择 */
  game.vowIdx=game.vowIdx||0;
  document.getElementById('title').style.display='none';
  finalSummary({
    btnText:'看完啦，开始游戏（扮演新郎）▶',
    onClose:()=>startGame('groom'),
    back:()=>{
      overlay.style.display='none'; overlayOnClose=null;
      document.getElementById('title').style.display='flex';
      game.mode='title';
    },
  });
});
document.addEventListener('pointerdown',e=>{
  if(game.mode==='title')flyHearts(e.clientX,e.clientY,2);
});

/* ============================================================
 * 入口选择门 + 低调奢华·典雅请帖
 * ============================================================ */
const gateEl=document.getElementById('gate'), luxEl=document.getElementById('lux');
document.getElementById('gateNames').innerHTML=`${esc(CONFIG.groom)} <span class="amp">&amp;</span> ${esc(CONFIG.bride)}`;
document.body.classList.add('lux-bg');   // 默认先进入口页, 米色底
/* 返回入口：重载回到最初的入口选择页(剥离调试/直达参数, 保留宾客 ?gn/?gt 链接) */
function backToGate(){
  const u=new URL(location.href); let changed=false;
  ['auto','scene','q','at','show','lux','debug'].forEach(k=>{ if(u.searchParams.has(k)){u.searchParams.delete(k);changed=true;} });
  if(changed) location.replace(u.pathname+u.search+u.hash); else location.reload();
}
/* 入口浮动金尘(与暗夜星座呼应) */
if(!matchMedia('(prefers-reduced-motion:reduce)').matches){
  for(let i=0;i<7;i++){ const m=document.createElement('i'); m.className='gate-mote';
    const s=2+Math.random()*4; m.style.width=m.style.height=s+'px';
    m.style.left=(6+Math.random()*88)+'%'; m.style.bottom=(-8+Math.random()*28)+'%';
    m.style.animationDuration=(7+Math.random()*7)+'s'; m.style.animationDelay=(-Math.random()*10)+'s';
    gateEl.appendChild(m); }
}
/* 离场淡出：先把目标页(标题/请帖)显示在入口之下, 再淡出入口露出它——
 * 全程目标页都是不透明的, 绝不会露出底层绿色画布 */
function gateLeave(show){ show&&show(); gateEl.classList.add('fade');
  setTimeout(()=>{ gateEl.style.display='none'; gateEl.classList.remove('fade'); },440); }
/* 我是18岁 → 进入星露谷像素请帖(确保露出标题屏, 即使之前进过老登版被隐藏) */
document.getElementById('gate18').onclick=()=>{ sfx&&sfx('blip'); document.body.classList.remove('lux-bg');
  luxEl.style.display='none'; gateLeave(()=>{ document.getElementById('title').style.display='flex'; }); };
/* 我是老登 → 进入典雅请帖 */
document.getElementById('gateOld').onclick=()=>{ sfx&&sfx('blip'); document.getElementById('title').style.display='none'; gateLeave(openLux); };
function openLux(){ buildLux(); luxEl.style.display='block'; luxEl.scrollTop=0; luxReveal(); luxFxStart(); }
/* 暗夜流光：金色粒子星座背景(科技感, 低调) */
let _luxFxRAF=null, _luxFxResize=null;
function luxFxStart(){
  const cv=document.getElementById('luxFx'); if(!cv)return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const g=cv.getContext('2d'); let W,H,parts;
  const resize=()=>{ W=cv.width=innerWidth; H=cv.height=innerHeight; };
  resize(); _luxFxResize=resize; addEventListener('resize',resize);
  const N=Math.max(28, Math.min(72, Math.round(innerWidth*innerHeight/15000)));
  parts=Array.from({length:N},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.22,vy:(Math.random()-.5)*.22,r:Math.random()*1.5+.5,a:Math.random()*.5+.35}));
  const frame=()=>{
    g.clearRect(0,0,W,H);
    for(const p of parts){ p.x+=p.vx;p.y+=p.vy; if(p.x<0)p.x+=W; if(p.x>W)p.x-=W; if(p.y<0)p.y+=H; if(p.y>H)p.y-=H; }
    for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){
      const a=parts[i],b=parts[j],dx=a.x-b.x,dy=a.y-b.y,d=dx*dx+dy*dy;
      if(d<8500){ g.strokeStyle='rgba(216,179,106,'+(1-d/8500)*.16+')'; g.lineWidth=.6; g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke(); }
    }
    for(const p of parts){ g.beginPath();g.arc(p.x,p.y,p.r,0,7); g.fillStyle='rgba(243,220,160,'+p.a+')'; g.shadowColor='rgba(243,220,160,.8)'; g.shadowBlur=6; g.fill(); g.shadowBlur=0; }
    _luxFxRAF=requestAnimationFrame(frame);
  };
  frame();
}
function luxFxStop(){ if(_luxFxRAF)cancelAnimationFrame(_luxFxRAF); _luxFxRAF=null; if(_luxFxResize){removeEventListener('resize',_luxFxResize);_luxFxResize=null;} }
function buildLux(){
  const c=CONFIG, R=RT.hallPhotos&&RT.hallPhotos.length?RT.hallPhotos:(c.hallPhotos||[]);
  const heroSrc=c.luxHero?esc(resolveImg(c.luxHero)):'';   // 有图才给「轻触看大图」入口
  const gallery=R.map((p,i)=>{
    const src=p&&p.img?esc(resolveImg(p.img)):'';
    return `<figure class="lux-photo" ${src?`data-full="${src}"`:''}>
      ${src?`<img src="${src}" alt="" draggable="false">`:`<div class="lux-photo-ph">婚纱照 ${i+1}</div>`}
      ${p&&p.title?`<figcaption>${esc(p.title)}</figcaption>`:''}</figure>`;
  }).join('');
  const sched=(c.schedule||[]).map(([t,w])=>`<div class="lux-tl"><span class="lux-tl-t">${esc(t)}</span><span class="lux-tl-w">${esc(w)}</span></div>`).join('');
  document.getElementById('luxInner').innerHTML=`
    <header class="lux-hero">
      <div class="lux-kicker">THE WEDDING OF</div>
      <h1 class="lux-names">${esc(c.groom)}<span class="amp">&amp;</span>${esc(c.bride)}</h1>
      <div class="lux-date">${esc(c.dateText)}</div>
      <div class="lux-divider"><span>❦</span></div>
      <div class="lux-hero-photo"${heroSrc?` data-full="${heroSrc}"`:''}>${heroSrc
        ? `<img src="${heroSrc}" alt="" draggable="false">`
        : `<div class="lux-hero-ph"><span class="orn">❦</span><span class="t">主 婚 纱 照</span></div>`}</div>
      ${heroSrc?`<div class="lux-tap">轻触照片 · 查看大图</div>`:''}
    </header>
    <section class="lux-sec reveal"><p class="lux-letter">${c.luxLetter||c.letterHTML}</p>
      <div class="lux-sign">— ${esc(c.groom)} &amp; ${esc(c.bride)} 敬上</div></section>
    ${R.length?`<section class="lux-sec reveal"><h2 class="lux-h">浮 光 剪 影</h2><div class="lux-gallery">${gallery}</div></section>`:''}
    <section class="lux-sec reveal"><h2 class="lux-h">婚 礼 信 息</h2>
      <div class="lux-info">
        <div class="lux-row"><span class="lux-lab">日期</span><span class="lux-val">${c.dateDetail}</span></div>
        <div class="lux-row"><span class="lux-lab">时间</span><span class="lux-val">${c.timeDetail}</span></div>
        <div class="lux-row"><span class="lux-lab">地点</span><span class="lux-val">${c.place}</span></div>
        <div class="lux-row"><span class="lux-lab">联系</span><span class="lux-val">${contactsText()}</span></div>
      </div>
      <div class="countdown lux-cd" data-cd="1">
        <div class="cd-cell"><b class="cdD">--</b><span>天</span></div>
        <div class="cd-cell"><b class="cdH">--</b><span>时</span></div>
        <div class="cd-cell"><b class="cdM">--</b><span>分</span></div>
        <div class="cd-cell"><b class="cdS">--</b><span>秒</span></div>
      </div>
    </section>
    <section class="lux-sec reveal"><h2 class="lux-h">当 日 流 程</h2><div class="lux-timeline">${sched}</div></section>
    <section class="lux-sec reveal lux-rsvp-sec"><h2 class="lux-h">敬 请 回 复</h2>
      <p class="lux-rsvp-desc">${(c.rsvp&&c.rsvp.desc)||'恳请拨冗莅临，赐复为盼。'}</p>
      <button class="lux-btn" id="luxRsvp">填写回执 · RSVP</button></section>
    <footer class="lux-foot"><div class="lux-divider"><span>❦</span></div>
      <div class="lux-foot-names">${esc(c.groom)} &amp; ${esc(c.bride)}</div>
      <div class="lux-foot-date">${esc(c.dateText)}</div>
      <button class="lux-back" id="luxBack">← 返回入口</button></footer>`;
  const rb=document.getElementById('luxRsvp'); if(rb)rb.onclick=openRsvp;
  const bk=document.getElementById('luxBack'); if(bk)bk.onclick=()=>{ luxFxStop(); luxEl.style.display='none'; gateEl.style.display='flex'; };
  /* 婚纱照(顶部主图 + 画廊)：点开看大图 */
  luxEl.querySelectorAll('[data-full]').forEach(f=>{ f.onclick=()=>luxLightbox(f.dataset.full); });
  /* 画廊图另加指针 3D 倾斜(互动感)；主图压顶不动，免得跟入场动画打架 */
  luxEl.querySelectorAll('.lux-photo').forEach(f=>{
    f.addEventListener('pointermove',e=>{ const r=f.getBoundingClientRect(); const px=(e.clientX-r.left)/r.width-.5, py=(e.clientY-r.top)/r.height-.5;
      f.style.transform=`rotateY(${px*11}deg) rotateX(${-py*11}deg) translateZ(8px)`; });
    f.addEventListener('pointerleave',()=>{ f.style.transform=''; });
  });
}
let _luxObs=null;
function luxReveal(){
  if(_luxObs)_luxObs.disconnect();
  if(!('IntersectionObserver' in window)){ luxEl.querySelectorAll('.reveal').forEach(el=>el.classList.add('in')); return; }
  _luxObs=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){e.target.classList.add('in');_luxObs.unobserve(e.target);} }),{root:luxEl,threshold:.12});
  luxEl.querySelectorAll('.reveal').forEach(el=>_luxObs.observe(el));
  /* 兜底：若观察器未触发(极端情况)，2s 后强制显示所有区块, 内容永不卡在隐藏态 */
  setTimeout(()=>luxEl.querySelectorAll('.reveal:not(.in)').forEach(el=>el.classList.add('in')),2000);
}
/* 老登版灯箱：与星露谷版同一套规则——全屏看、可放大到 200%、不许下载(lockMedia/attachZoom 见 invite.js) */
function luxLightbox(src){ if(!src)return; const b=document.getElementById('luxBox');
  document.getElementById('luxBoxImg').src=src; b.style.display='flex'; if(b._zoom)b._zoom.reset(); }
function luxBoxHide(){ const b=document.getElementById('luxBox'); b.style.display='none';
  document.getElementById('luxBoxImg').removeAttribute('src'); if(b._zoom)b._zoom.reset(); }
{
  const lb=document.getElementById('luxBox');
  lockMedia(lb);
  attachZoom(lb,document.getElementById('luxBoxImg'),luxBoxHide);   // 点击关闭/缩放都由它接管(含 ✕)
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&lb.style.display==='flex')luxBoxHide(); });
}

/* 测试钩子 */
const _q=QS;
/* ?lux=1 直开老登版；再带 &big=1 摊开它的灯箱，&zoom=300 可验证 200% 上限(截图用) */
if(_q.get('lux'))setTimeout(()=>{ gateEl.style.display='none'; document.getElementById('title').style.display='none'; openLux();
  if(_q.get('big'))setTimeout(()=>{ luxLightbox(resolveImg(CONFIG.luxHero));
    const b=document.getElementById('luxBox');
    if(_q.get('zoom'))setTimeout(()=>b._zoom.zoom(+_q.get('zoom')/100,1),500);
  },300); },200);
if(_q.get('auto'))setTimeout(()=>startGame(_q.get('auto')==='bride'?'bride':'groom'),200);
if(_q.get('at')){const[ax,ay]=_q.get('at').split(',').map(Number);setTimeout(()=>{player.x=ax*TILE;player.y=ay*TILE;updateCam();},350);}
if(_q.get('scene'))setTimeout(()=>{game.scene=_q.get('scene');updateCam();},340);
if(_q.get('hearts'))setTimeout(()=>{game.hearts=Math.min(10,+_q.get('hearts')||0);},400);
if(_q.get('dlg'))setTimeout(()=>{   // 对话预览: ?dlg=mayor|cat|chicken|groom|bride
  if(game.mode==='dialog'){clearInterval(dlg.timer);dlg.el.style.display='none';game.mode='play';}
  startDialog([{who:_q.get('dlg'),text:'（头像与名字预览）今天，我们在此见证两位新人喜结连理！'}]);
},1200);
if(_q.get('gems'))setTimeout(()=>{for(const g of GEM_TYPES)game.gems[g.key]=1;updateItemBar();},400);
if(_q.get('hen'))setTimeout(()=>{    // 母鸡定位(遮挡关系截图用): ?hen=x,y
  const[hx,hy]=_q.get('hen').split(',').map(Number);
  chickens[0].x=hx*TILE;chickens[0].y=hy*TILE;chickens[0].pause=true;chickens[0].t=99;
},600);
if(_q.get('crop'))setTimeout(()=>{   // 作物渲染预览: ?crop=straw|blue|sun 在农田种满各阶段
  const kind=_q.get('crop'), keys=Object.keys(plots).slice(0,4);
  keys.forEach((k,i)=>{ plots[k]={till:2,st:i===0?1:2,crop:kind,fert:0,t:game.time-(i*CROP_DEFS[kind].ripe+0.1)}; });
},500);
if(_q.get('donated'))setTimeout(()=>{
  _q.get('donated').split(',').forEach(k=>{ if(game.donated[k]!==undefined&&!game.donated[k]){game.donated[k]=1;game.donatedN++;} });
},400);
if(_q.get('q'))setTimeout(()=>{
  const q=+_q.get('q');
  if(q>=1){game.seeds=3;game.hasCan=true;game.water=3;}
  if(q>=2){game.fruits=3;game.rod=true;game.bait=3;}
  if(q>=4){partner.scene='museum';partner.x=13*TILE;partner.y=4.5*TILE;}
  if(q>=5){partner.scene='hall';partner.x=12.5*TILE;partner.y=4.6*TILE;}
  setQuest(q);
},400);
if(_q.get('show'))setTimeout(()=>{
  const s=_q.get('show');
  gateEl.style.display='none'; document.getElementById('title').style.display='none';
  if(game.mode==='dialog'){clearInterval(dlg.timer);dlg.el.style.display='none';game.mode='play';}
  if(s==='final'){game.vowIdx=0;finalSummary();}
  else if(s==='info')showOverlay(infoHTML());
  else if(s==='couple'){showOverlay(coupleHTML());drawOverlayPortraits();}
  else if(s==='letter')showOverlay(letterHTML());
  else if(s==='photo')showHallPhoto(0);            // 殿堂婚纱照展板浮层(截图用)
  else if(s==='big'){                              // 直接摊开灯箱(截图用)；再带 &zoom=300 可验证 200% 上限
    openLightbox(resolveImg(CONFIG.archPhoto));
    if(_q.get('zoom'))setTimeout(()=>lightbox._zoom.zoom(+_q.get('zoom')/100,1),500);
  }
  else if(s==='settings')openSettings();
  else if(s==='shop')openShop();
  else if(s==='fish'){
    /* 钓鱼调试：传送到栈道尽头, 可用 fphase=wait|bite|reel 强制阶段, fsp=carp… 强制鱼种, ftr=1 出宝箱 */
    game.rod=true;game.bait=Math.max(game.bait,3);
    player.x=29*TILE;player.y=7.4*TILE;player.dir='up';updateCam();
    startFishing();
    const ph=_q.get('fphase');
    if(ph==='bite'){fish.waitT=0.01;}
    else if(ph==='reel'){
      fish.waitT=0;fishBite();
      if(_q.get('fsp')){fish.junk=null;fish.sp=FISH_SPECIES.find(f=>f.key===_q.get('fsp'))||FISH_HEART;}
      startReel();
      if(_q.get('ftr')){fish.trAt=0;fish.t=1;}
    }
  }
},650);

/* —— 彩蛋③ Konami 秘技：↑↑↓↓←→←→ B A（桌面键盘）——
 * 每步接受一组等价键；末尾 B/A 对应游戏内「跳」(Shift/X/B) 与「互动」(空格/E/Z/Enter/A)，与操作键位一致 */
const KONAMI=[
  ['arrowup'],['arrowup'],['arrowdown'],['arrowdown'],
  ['arrowleft'],['arrowright'],['arrowleft'],['arrowright'],
  ['b','x','shift'],              // B = 跳
  ['a',' ','e','z','enter'],      // A = 互动
];
let _konI=0;
addEventListener('keydown',e=>{
  const k=(e.key||'').toLowerCase();
  if(KONAMI[_konI].includes(k)) _konI++;
  else if(KONAMI[0].includes(k)) _konI=1;   // 按错则回退，但若按的是起始键则从第 2 步续上
  else _konI=0;
  if(_konI>=KONAMI.length){ _konI=0; triggerKonami(); }
});
function triggerKonami(){
  if(game.konami)return;
  game.konami=true;
  if(typeof ensureCtx==='function')ensureCtx();
  sfx('fanfare'); confetti(120);
  if(typeof addHearts==='function'&&game.mode!=='title')addHearts(1,'资深玩家');
  toast('🎉 ↑↑↓↓←→←→BA · 资深玩家彩蛋解锁！漫天烟花为你们绽放');
}

/* —— 所有模块就绪后启动主循环 —— */
requestAnimationFrame(loop);
