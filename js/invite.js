/* ============================================================
 * 请帖与浮层：新人/信息/邀请函/流程 HTML + 海报版 finalSummary 渲染 + RSVP + 物品栏/装备栏
 * （由原 game.js 按职责拆分，多文件共享全局作用域；保持原加载顺序）
 * ============================================================ */
/* ============================================================
 * 浮层
 * ============================================================ */
const overlay=document.getElementById('overlay'),overlayInner=document.getElementById('overlayInner');
let overlayOnClose=null;
function showOverlay(html,onClose,btnText){
  game.mode='ui';
  overlayOnClose=onClose||null;
  overlayInner.innerHTML=html+`<div class="center ok"><button class="sdv-btn" id="ovOk">${btnText||'继续 ▶'}</button></div>`;
  overlay.style.display='flex';
  document.getElementById('ovOk').onclick=()=>{
    overlay.style.display='none';
    game.mode='play';
    const cb=overlayOnClose;overlayOnClose=null;
    cb&&cb();
  };
}
/* 联系方式：手机→tel: / 邮箱→mailto:，留空的不显示(支持多人) */
function contactsText(){
  const rows=(CONFIG.contacts||[]).map(p=>{
    const bits=[];
    if(p.phone) bits.push(`<a href="tel:${esc(p.phone)}" style="color:inherit">${esc(p.phone)}</a>`);
    if(p.email) bits.push(`<a href="mailto:${esc(p.email)}" style="color:inherit">✉ ${esc(p.email)}</a>`);
    return bits.length ? (p.label?esc(p.label)+'　':'')+bits.join('　') : '';
  }).filter(Boolean);
  return rows.join('<br>') || '—';
}
/* 头像大图源(自定义头像优先；无则回退像素肖像素材) */
function avatarBig(who){
  const v=who==='groom'?CONFIG.groomAvatar:CONFIG.brideAvatar;
  if(v) return resolveImg(v);
  const im=img(who==='groom'?'portGroom':'portBride');
  return im&&im.src||'';
}
/* 新人相框：有大图源时挂 data-big，可点开查看大图 */
function avatarFrame(who,cls){
  const big=avatarBig(who);
  const a=big?`class="frame zoomable" data-big="${esc(big)}"`:`class="frame"`;
  return `<div ${a}><canvas class="${cls}" width="64" height="64"></canvas></div>`;
}
function coupleHTML(){
  const cp=CONFIG.couplePhoto?resolveImg(CONFIG.couplePhoto):'';
  return `<h3>♥ 新人介绍 ♥</h3>`+
  (cp?`<div class="couple-photo"><span class="zoomable" data-big="${esc(cp)}"><img src="${esc(cp)}" alt="合照"></span></div>`:'')+
  `<div class="zoom-hint">🔍 点头像或合照可看大图</div>
  <div class="couple-row">
    <div>${avatarFrame('groom','pcg')}
      <div class="nm">${CONFIG.groom}</div><div class="ds">${CONFIG.groomDesc}</div></div>
    <span class="px-heart"></span>
    <div>${avatarFrame('bride','pcb')}
      <div class="nm">${CONFIG.bride}</div><div class="ds">${CONFIG.brideDesc}</div></div>
  </div>`;
}
function infoHTML(){
  return `<h3>✦ ${esc(CONFIG.eventName||'婚礼')}信息 ✦</h3>
  <div class="info-row"><div class="info-ico">日</div><div>${CONFIG.dateDetail}</div></div>
  <div class="info-row"><div class="info-ico">时</div><div>${CONFIG.timeDetail}</div></div>
  <div class="info-row"><div class="info-ico">地</div><div>${CONFIG.place}</div></div>
  <div class="info-row"><div class="info-ico">系</div><div>${contactsText()}</div></div>
  <div class="countdown" data-cd="1">
    <div class="cd-cell"><b class="cdD">--</b><span>天</span></div>
    <div class="cd-cell"><b class="cdH">--</b><span>时</span></div>
    <div class="cd-cell"><b class="cdM">--</b><span>分</span></div>
    <div class="cd-cell"><b class="cdS">--</b><span>秒</span></div>
  </div>`;
}
function letterHTML(){
  return `<h3>✉ 邀请函 ✉</h3>
  <div class="letter-paper">
  <div class="letter-ico">🌻 🍓 🐟 🎁 🌷 🍰</div>
  ${CONFIG.letterHTML}
  <div class="sign">${CONFIG.groom} &amp; ${CONFIG.bride}<br>敬邀</div>
  <div class="letter-ico">🌼 🥂 💍 🌙 ⭐ 🌸</div></div>`;
}
function scheduleHTML(){
  return `<h3>⚑ 当日流程 ⚑</h3>`+
    CONFIG.schedule.map(([t,w])=>`<div class="tl-row"><div class="tl-time">${t}</div><div class="tl-what">${w}</div></div>`).join('');
}
function seatHTML(){
  if(!GUEST)return '';
  return `<div class="seat-card">🎫 ${esc(GUEST.name)}，您的桌位是 <b>${esc(GUEST.table)} 号桌</b><br>
  <span style="font-size:12px;color:#8a5a2b">婚礼殿堂里有金色标记，当天凭此入座～</span></div>`;
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function drawOverlayPortraits(){
  document.querySelectorAll('.pcg').forEach(c=>portraitInto(c,'groom'));
  document.querySelectorAll('.pcb').forEach(c=>portraitInto(c,'bride'));
}
/* ============================================================
 * 点击头像 / 合照 → 查看大图（灯箱）
 * ============================================================ */
const lightbox=document.getElementById('lightbox');
const lightboxImg=document.getElementById('lightboxImg');
function openLightbox(src){ if(!src||!lightbox)return; lightboxImg.src=src; lightbox.classList.add('on'); }
function closeLightbox(){ if(!lightbox)return; lightbox.classList.remove('on'); lightboxImg.removeAttribute('src'); }
if(lightbox){
  lightbox.addEventListener('click',closeLightbox);   // 点背景/大图/✕ 任意处关闭
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&lightbox.classList.contains('on'))closeLightbox(); });
  /* 委托：浮层内任意 [data-big] 元素（头像相框 / 合照）点开大图 */
  overlayInner.addEventListener('click',e=>{
    const z=e.target.closest('[data-big]');
    if(z&&z.dataset.big){ e.preventDefault(); openLightbox(z.dataset.big); }
  });
}
/* —— 完整请帖·海报版 —— */
/* 顶部：木牌大标题 + 花拱门新人合影(真素材) + 双对话气泡 */
function posterHeroHTML(){
  return `<div class="poster-sky">
    <img class="sky-cloud a" src="assets/elem/svCloud.png" alt="">
    <img class="sky-cloud b" src="assets/elem/svCloud.png" alt="">
    <img class="poster-sign" src="assets/elem/wedSign.png" alt="WEDDING INVITATION">
  </div>
  <div class="poster-sub">❀ ${esc(CONFIG.groom)} &amp; ${esc(CONFIG.bride)} 的${esc(CONFIG.eventName||'婚礼')}请帖 ❀</div>
  <div class="hero-photo">
    <div class="hero-frame">
      ${CONFIG.archPhoto
        ? `<img src="${esc(resolveImg(CONFIG.archPhoto))}" alt="主婚纱照">`
        : `<div class="hero-ph"><span class="o">❀</span><span class="t">主婚纱照</span></div>`}
    </div>
    <img class="hero-garland" src="assets/elem/garland.png" alt="">
    <img class="hero-vine l" src="assets/elem/hangVine.png" alt="">
    <img class="hero-vine r" src="assets/elem/hangVine.png" alt="">
    <img class="hero-sun l" src="assets/elem/sunflower.png" alt="">
    <img class="hero-sun r" src="assets/elem/sunflower.png" alt="">
  </div>
  <div class="chat-wrap">
    <div class="chat-bubble"><canvas class="chat-ava" data-port="groom" width="64" height="64"></canvas><div>${esc((CONFIG.posterLines||[])[0]||'')}</div></div>
    <div class="chat-bubble r"><canvas class="chat-ava" data-port="bride" width="64" height="64"></canvas><div>${esc((CONFIG.posterLines||[])[1]||'')}</div></div>
  </div>`;
}
/* 新人相框 + 新郎/新娘木牌标签 */
function couplePosterHTML(){
  return `<div class="couple-row">
    <div>${avatarFrame('groom','pcg')}
      <div class="role-tag">新 郎</div>
      <div class="nm">${esc(CONFIG.groom)}</div><div class="ds">${CONFIG.groomDesc}</div></div>
    <span class="px-heart"></span>
    <div>${avatarFrame('bride','pcb')}
      <div class="role-tag">新 娘</div>
      <div class="nm">${esc(CONFIG.bride)}</div><div class="ds">${CONFIG.brideDesc}</div></div>
  </div>`;
}
/* 海报内像素画布上色：相框肖像 + 气泡头像（主婚纱照用真实图片，不再用立绘拼接） */
function drawPosterArt(){
  drawOverlayPortraits();
  document.querySelectorAll('.chat-ava[data-port]').forEach(c=>portraitInto(c,c.dataset.port));
  const rb=document.getElementById('rsvpBtn'); if(rb) rb.onclick=openRsvp;
  const sb=document.getElementById('shareBtn'); if(sb) sb.onclick=shareCard;
}
/* —— 婚礼回执 RSVP（第三方问卷平台：金数据/腾讯问卷/问卷星；来宾免登录） —— */
function rsvpHTML(){
  const r=CONFIG.rsvp||{};
  const inner = r.url
    ? `<button class="sdv-btn rsvp-btn" id="rsvpBtn">📝 填写回执 ▶</button>
       <div class="rsvp-hint">约 30 秒 · 免登录 · 提交后我们即可收到</div>`
    : `<div class="rsvp-setup">在 <b>js/config.js → rsvp.url</b> 填入问卷链接后，这里会出现「填写回执」按钮。</div>`;
  return `<div class="rsvp-card">
    <div class="rsvp-title">📮 ${esc(r.title||'婚礼回执 · RSVP')}</div>
    <div class="rsvp-desc">${r.desc||'麻烦填一下：贵姓 · 来宾人数 · 祝福（选填）'}</div>
    ${inner}
  </div>`;
}
function openRsvp(){
  const r=CONFIG.rsvp||{};
  let url=r.url||'';
  if(!url){ toast('💡 请先在 js/config.js 的 rsvp.url 填入问卷链接'); return; }
  /* 带宾客参数的链接时，可把姓名预填进问卷（需在 config.rsvp.nameParam 配置字段参数名） */
  if(GUEST&&GUEST.name&&r.nameParam){
    url+=(url.includes('?')?'&':'?')+encodeURIComponent(r.nameParam)+'='+encodeURIComponent(GUEST.name);
  }
  sfx('blip');
  if(r.embed){ showRsvpFrame(url); }
  else{ window.open(url,'_blank','noopener'); }
}
function showRsvpFrame(url){
  let m=document.getElementById('rsvpModal');
  if(!m){
    m=document.createElement('div'); m.id='rsvpModal';
    m.innerHTML=`<div class="rsvp-frame-wrap">
      <button class="rsvp-close" id="rsvpClose">✕ 关闭</button>
      <iframe id="rsvpIframe" referrerpolicy="no-referrer" title="婚礼回执"></iframe>
      <div class="rsvp-fallback">表单没显示？<a id="rsvpOpenNew" target="_blank" rel="noopener">点此在新窗口打开 ▶</a></div>
    </div>`;
    document.body.appendChild(m);
    m.querySelector('#rsvpClose').onclick=()=>{ m.style.display='none'; m.querySelector('#rsvpIframe').src='about:blank'; };
  }
  m.querySelector('#rsvpIframe').src=url;
  m.querySelector('#rsvpOpenNew').href=url;
  m.style.display='flex';
}
const target=new Date(CONFIG.weddingISO).getTime();
const pad2=n=>String(n).padStart(2,'0');
setInterval(()=>{
  const diff=target-Date.now();
  document.querySelectorAll('[data-cd]').forEach(cd=>{
    if(diff<=0){cd.innerHTML='<div style="font-size:16px;color:var(--red)">♥ 今天就是大喜之日 ♥</div>';return;}
    cd.querySelector('.cdD').textContent=Math.floor(diff/864e5);
    cd.querySelector('.cdH').textContent=pad2(Math.floor(diff/36e5)%24);
    cd.querySelector('.cdM').textContent=pad2(Math.floor(diff/6e4)%60);
    cd.querySelector('.cdS').textContent=pad2(Math.floor(diff/1e3)%60);
  });
},500);

/* ============================================================
 * 物品栏 / 记忆碎片
 * ============================================================ */
function updateItemBar(){
  const bar=document.getElementById('itemBar');
  const chips=[];                       // 金币显示在右上角木牌 HUD 上
  if(game.seeds)chips.push(`🌱${game.seeds}`);
  if(game.hasCan)chips.push(`💧${game.water}/3`);
  if(game.fert)chips.push(`💜${game.fert}`);
  if(game.feed)chips.push(`🌾${game.feed}`);
  if(game.eggs)chips.push(`🥚${game.eggs}`);
  if(game.flowers)chips.push(`🌼${game.flowers}`);
  if(game.bait)chips.push(`🪱${game.bait}`);
  if(game.quest===1||game.fruits)chips.push(`🌻${Math.min(game.fruits,3)}/3${game.fruits>3?'+'+(game.fruits-3):''}`);
  if(game.fishN){
    const pf=game.fishInv.filter(f=>f.perfect).length;
    chips.push(`🐟${game.fishN}${pf?'✨':''}`);
  }
  if(gemTotal())chips.push(`💎${gemTotal()}`);
  if(game.seedBag.straw||game.cropInv.straw)chips.push(`🍓${game.cropInv.straw}${game.seedBag.straw?'/籽'+game.seedBag.straw:''}`);
  if(game.seedBag.blue||game.cropInv.blue)chips.push(`🫐${game.cropInv.blue}${game.seedBag.blue?'/籽'+game.seedBag.blue:''}`);
  if(typeof updateBoard==='function')updateBoard();
  if(game.fishQ)chips.push(`💞鱼`);
  bar.innerHTML=chips.map(c=>`<span class="chip">${c}</span>`).join('');
}
/* —— 装备栏(工具) —— */
/* 在任意 canvas 上下文里画一个工具图标(以 16 单元为基准, 缩放到 size) */
function drawToolIcon(g,x,y,key,size){
  const s=size/16, R=(a,b,w,h)=>g.fillRect(x+a*s|0,y+b*s|0,Math.max(1,Math.round(w*s)),Math.max(1,Math.round(h*s)));
  if(key==='hoe'){
    g.fillStyle='#9a6a3a';R(7,3,2,11); g.fillStyle='#7a4a2a';R(7,3,1,11);
    g.fillStyle='#8a8f9a';R(4,2,7,3); g.fillStyle='#b8bdc8';R(4,2,7,1);
  }else if(key==='pickaxe'){
    g.fillStyle='#9a6a3a';R(7,5,2,9); g.fillStyle='#7a4a2a';R(7,5,1,9);
    g.fillStyle='#8a8f9a';R(2,4,12,2);R(2,4,2,2);R(12,4,2,2);R(3,6,2,1);R(11,6,2,1);
    g.fillStyle='#b8bdc8';R(2,4,12,1);
  }else if(key==='axe'){
    g.fillStyle='#9a6a3a';R(6,3,2,11); g.fillStyle='#7a4a2a';R(6,3,1,11);
    g.fillStyle='#8a8f9a';R(7,2,6,6); g.fillStyle='#b8bdc8';R(7,2,6,1); g.fillStyle='#6b7079';R(7,7,6,1);
  }else{ /* scythe 镰刀 */
    g.fillStyle='#9a6a3a';R(5,4,2,10); g.fillStyle='#7a4a2a';R(5,4,1,10);
    g.fillStyle='#cfd4dc';R(5,3,8,2);R(11,4,2,3);R(12,6,1,2); g.fillStyle='#eef1f5';R(5,3,8,1);
  }
}
function renderToolbar(){
  const bar=document.getElementById('toolBar'); if(!bar)return;
  bar.innerHTML='';
  TOOLS.forEach((t,i)=>{
    const slot=document.createElement('div');
    slot.className='tool-slot'+(i===game.tool?' sel':'');
    const cv=document.createElement('canvas'); cv.width=cv.height=40;
    const g=cv.getContext('2d'); g.imageSmoothingEnabled=false;
    const sb=img('slotBox');
    if(sb)g.drawImage(sb,0,0,sb.width,sb.height,0,0,40,40);
    else{ g.fillStyle='#7a3b16';g.fillRect(0,0,40,40); g.fillStyle='#e8943a';g.fillRect(3,3,34,34); g.fillStyle='#ffd9a8';g.fillRect(6,6,28,28); }
    const ti=t.icon&&img(t.icon);
    if(ti)g.drawImage(ti,0,0,ti.width,ti.height,8,8,24,24); else drawToolIcon(g,10,9,t.key,22);
    slot.appendChild(cv);
    slot.appendChild(Object.assign(document.createElement('span'),{className:'tname',textContent:t.name}));
    slot.onclick=()=>selectTool(i);
    bar.appendChild(slot);
  });
}
function selectTool(i){ game.tool=((i%TOOLS.length)+TOOLS.length)%TOOLS.length; renderToolbar(); sfx&&sfx('blip'); }
function curTool(){ return TOOLS[game.tool]; }
function maybeFrag(prob,after){
  const left=RT.frags.map((f,i)=>i).filter(i=>!game.fragGot.includes(i));
  if(!left.length||Math.random()>prob){after&&after();return;}
  const i=left[Math.random()*left.length|0];
  game.fragGot.push(i);
  const f=RT.frags[i];
  sfx('quest');
  showOverlay(
    `<h3>💫 收获了一片记忆碎片</h3>
     ${f.img?`<img class="exhibit-img" src="${esc(resolveImg(f.img))}" onerror="this.style.display='none'">`:''}
     <div class="frag-card">${esc(f.text)}</div>
     <div class="center" style="margin-top:8px;font-size:12px;color:#8a5a2b">已收集 ${game.fragGot.length} / ${RT.frags.length} · 在 📜 里可回看</div>`,
    after,'收下 ♥');
}

/* ============================================================
 * 通关结算卡 + 分享图（玩法③ + UI 分享图）
 * ============================================================ */
function scoreCardHTML(){
  const s=computeScore();
  return `<div class="score-card">
    <div class="score-title">🏅 ${esc(s.title)}</div>
    <div class="score-num"><b>${s.score}</b><span>分</span></div>
    <div class="score-bar"><i style="width:${s.score}%"></i></div>
    <div class="score-stats">
      <span>💫 碎片 ${s.frags}/${s.fragTot}</span>
      <span>🏆 成就 ${s.ach}/${s.achTot}</span>
      <span>❤ 好感 ${s.hearts}/10</span>
      <span>⏱ ${s.mins}分${s.secs}秒</span>
    </div>
    <button class="sdv-btn small" id="shareBtn">📸 生成分享图</button>
  </div>`;
}
/* 程序化绘制竖版分享图（星露谷风），返回后由 shareCard 展示/下载 */
function buildShareCard(cv){
  const g=cv.getContext('2d'), W=cv.width, H=cv.height, CX=W/2;
  const F=n=>`${n}px "Fusion Pixel 12px Proportional SC","Noto Serif SC",serif`;
  g.textAlign='center'; g.textBaseline='alphabetic';
  /* 背景：天空→草地 + 木框 + 米色内芯 */
  const sky=g.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#8fd3ff');sky.addColorStop(.46,'#c8ecff');sky.addColorStop(.46,'#6fbf5c');sky.addColorStop(1,'#4c9b3c');
  g.fillStyle=sky;g.fillRect(0,0,W,H);
  g.fillStyle='#5b2c0e';g.fillRect(0,0,W,H);
  g.fillStyle='#8c4615';g.fillRect(10,10,W-20,H-20);
  g.fillStyle='#ffe9c4';g.fillRect(18,18,W-36,H-36);
  /* 标题 */
  g.fillStyle='#b04a3a';g.font=F(20);g.fillText('★ WEDDING INVITATION ★',CX,64);
  g.fillStyle='#5b2c0e';g.font=F(30);g.fillText(`${CONFIG.groom}  ${CONFIG.bride}`,CX,112);
  g.fillStyle='#e0457b';drawPixHeart(g,CX-9,90,3);   // 名字之间的爱心
  /* 头像双框（用程序化像素画，避免外部/跨域图片污染 canvas 导致无法 toDataURL 导出） */
  const AV=120;
  g.imageSmoothingEnabled=false;
  g.fillStyle='#fff';g.fillRect(CX-AV-24,150,AV+8,AV+8);g.fillRect(CX+16,150,AV+8,AV+8);
  g.fillStyle='#caa86a';g.fillRect(CX-AV-24,150,AV+8,3);g.fillRect(CX+16,150,AV+8,3);
  drawShareAvatar(g,CX-AV-20,154,AV,'groom');
  drawShareAvatar(g,CX+20,154,AV,'bride');
  g.fillStyle='#e0457b';drawPixHeart(g,CX-11,206,4);
  /* 日期 */
  g.fillStyle='#5b2c0e';g.font=F(22);g.fillText(CONFIG.dateText,CX,316);
  /* 称号 + 分数 */
  const s=computeScore();
  g.fillStyle='#b04a3a';g.font=F(22);g.fillText('🏅 '+s.title,CX,360);
  g.fillStyle='#e8943a';g.font=F(46);g.fillText(String(s.score),CX,418);
  g.fillStyle='#a3572b';g.font=F(16);g.fillText('分',CX+38,418);
  /* 统计两行 */
  g.fillStyle='#5b2c0e';g.font=F(17);
  g.fillText(`💫 碎片 ${s.frags}/${s.fragTot}      🏆 成就 ${s.ach}/${s.achTot}`,CX,456);
  g.fillText(`❤ 好感 ${s.hearts}/10      ⏱ ${s.mins}分${s.secs}秒`,CX,484);
  /* 誓言 */
  const vow=(CONFIG.vowChoices[game.vowIdx||0]||['','' ])[0].replace(/[「」]/g,'');
  g.fillStyle='#8a5a2b';g.font=F(16);g.fillText('「'+vow+'」',CX,524);
  /* 桌位 */
  if(typeof GUEST!=='undefined'&&GUEST){
    g.fillStyle='#c0392b';g.font=F(20);g.fillText(`🎫 ${GUEST.name} · ${GUEST.table} 号桌`,CX,566);
  }
  /* 领奖码：需「礼成 + 全成就 + 全碎片」才解锁，否则印进度提示 */
  const el=giftEligible();
  g.fillStyle='#fff6e2';g.fillRect(46,H-134,W-92,38);g.lineWidth=2;
  if(el.ok){
    g.strokeStyle='#b04a3a';g.strokeRect(46,H-134,W-92,38);
    g.fillStyle='#b04a3a';g.font=F(19);g.fillText('🎁 领奖码  '+giftCode(),CX,H-109);
  }else{
    g.strokeStyle='#9a6a3a';g.strokeRect(46,H-134,W-92,38);
    g.fillStyle='#8a5a2b';g.font=F(15);g.fillText(`🔒 成就 ${el.ach}/${el.need}·碎片 ${el.frags}/${el.fragTot} 后解锁领奖`,CX,H-109);
  }
  /* 底部落款 */
  g.fillStyle='#3a7a2c';g.font=F(15);g.fillText('🌻 在星露谷，等你来玩这份请帖',CX,H-74);
  g.fillStyle='#5b2c0e';g.font=F(14);g.fillText(`${CONFIG.groom} & ${CONFIG.bride} · ${CONFIG.dateText}`,CX,H-50);
}
function drawPixHeart(g,x,y,s){
  const P=[[1,0],[2,0],[4,0],[5,0],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[1,2],[2,2],[3,2],[4,2],[5,2],[2,3],[3,3],[4,3],[3,4]];
  P.forEach(([a,b])=>g.fillRect(x+a*s,y+b*s,s,s));
}
/* 分享图头像：程序化像素画(不污染 canvas)，居中填入相框 */
function drawShareAvatar(g,x,y,size,role){
  const map=role==='groom'?PORTRAIT_GROOM:PORTRAIT_BRIDE, w=map[0].length, s=size/16;
  g.save();
  g.fillStyle='#cfe6f4';g.fillRect(x,y,size,size);
  g.translate(x+(size-w*s)/2, y+s);
  g.scale(s,s);
  blit(g,map,0,0,false);
  g.restore();
}
/* 领奖码：有宾客身份→确定性短码(同一宾客跨设备一致，防换设备复用)；否则本机持久随机码。
 * 格式 XXXX-XXXX，存 localStorage 保证同一玩家稳定(不会每次点都变) */
function shortCode(str){
  let h1=0x811c9dc5>>>0, h2=5381>>>0;
  for(let i=0;i<str.length;i++){ const c=str.charCodeAt(i);
    h1=((h1^c)>>>0); h1=(h1*0x01000193)>>>0;
    h2=(((h2<<5)+h2)+c)>>>0; }
  const seg=n=>(n>>>0).toString(36).toUpperCase().padStart(5,'0').slice(-4);
  return seg(h1)+'-'+seg(h2);
}
function giftCode(){
  const saved=lsGet('wedd_giftcode');
  if(saved&&typeof saved==='string')return saved;
  let seed;
  if(typeof GUEST!=='undefined'&&GUEST&&GUEST.name) seed='G:'+GUEST.name+'#'+GUEST.table;
  else seed='R:'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
  const c=shortCode(seed);
  lsSet('wedd_giftcode',c);
  return c;
}
function shareCard(){
  const cv=document.createElement('canvas'); cv.width=480; cv.height=760;
  try{ buildShareCard(cv); }catch(e){ toast('分享图生成失败：'+e.message); return; }
  let url;
  try{ url=cv.toDataURL('image/png'); }
  catch(e){ toast(location.protocol==='file:'?'本地 file:// 暂无法导出图片，部署到网址后即可正常保存':'分享图导出失败：'+e.name); return; }
  const el=giftEligible();
  const codeBlock = el.ok
    ? `<div class="gift-code">🎁 领奖码 <b>${esc(giftCode())}</b><br><span>凭此码（或整张分享图）向新人领取小礼物 · 每码限一份</span></div>`
    : `<div class="gift-code locked">🔒 领奖码未解锁<br><span>需 <b>完成婚礼</b> + 集齐 <b>全部记忆碎片</b> + 成就达 <b>${el.need}</b> 项方可领取小礼物<br>当前：🏆 成就 ${el.ach}/${el.need} · 💫 碎片 ${el.frags}/${el.fragTot}${el.questOk?'':' · 需先完成婚礼仪式'}</span></div>`;
  const dl = el.ok ? `星露谷婚礼请帖-${esc(giftCode())}.png` : '星露谷婚礼请帖.png';
  showOverlay(
    `<h3>📸 我的通关分享图</h3>
     <img class="share-img" src="${url}" alt="分享图">
     ${codeBlock}
     <div class="body center" style="font-size:12px;color:#8a5a2b;margin-top:6px">长按图片可保存 · 或点下方按钮下载后发给亲友</div>
     <div class="center" style="margin-top:10px"><a class="sdv-btn" href="${url}" download="${dl}" style="text-decoration:none">⬇ 下载分享图</a></div>`,
    null,'返回 ▶');
}
/* ============================================================
 * 小地图（UI：📜 菜单里）——世界缩略 + 建筑标注 + 玩家位置
 * ============================================================ */
function drawMinimap(cv){
  if(!cv)return;
  const s=SCENES.world, g=cv.getContext('2d'), W=cv.width, H=cv.height;
  const sx=W/s.w, sy=H/s.h;
  g.clearRect(0,0,W,H);
  const COL={'~':'#3f7fc4','=':'#a8743c',':':'#d8b06a','T':'#2f6b24','F':'#ff9eb5','P':'#8a5a2f','f':'#9a6433','n':'#e8d6a0','B':'#5aa04a','G':'#6ab04a'};
  for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){
    g.fillStyle=COL[s.g[y][x]]||'#5fae52';
    g.fillRect(x*sx,y*sy,Math.ceil(sx),Math.ceil(sy));
  }
  /* 建筑：红点 + 名称首字 */
  g.textAlign='center';g.textBaseline='middle';g.font='8px "Fusion Pixel 12px Proportional SC",monospace';
  const LB={home:'家',shop:'店',museum:'馆',nb1:'邻',coop:'鸡',hall:'殿'};
  BUILDINGS.forEach(b=>{
    const cx=(b.x+b.w/2)*sx, cy=(b.y+b.h/2)*sy;
    g.fillStyle='rgba(91,44,14,.85)';g.fillRect(cx-6,cy-6,12,12);
    g.fillStyle='#ffe6b0';g.fillText(LB[b.key]||'?',cx,cy+1);
  });
  /* 玩家位置(黄点闪) */
  const pmx=(player.x/TILE)*sx, pmy=(player.y/TILE)*sy;
  g.fillStyle='#ffd84d';g.fillRect(pmx-3,pmy-3,6,6);
  g.strokeStyle='#c0392b';g.lineWidth=1.5;g.strokeRect(pmx-4,pmy-4,8,8);
}

/* ============================================================
 * 祝福墙（拓展②）——内置可配置(CONFIG.wishWall) + 开关(show)
 * ============================================================ */
function wishWallHTML(){
  const w=CONFIG.wishWall;
  if(!w||!w.show||!(w.messages&&w.messages.length))return '';
  const items=w.messages.map(m=>
    `<div class="wish-item"><div class="wish-text">${esc(m.text||'')}</div><div class="wish-from">— ${esc(m.from||'匿名')}</div></div>`).join('');
  return `<hr><h3>${esc(w.title||'💌 亲友祝福墙')}</h3><div class="wish-wall">${items}</div>`;
}

