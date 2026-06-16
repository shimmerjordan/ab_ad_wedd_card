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
function coupleHTML(){
  return `<h3>♥ 新人介绍 ♥</h3>`+
  (CONFIG.couplePhoto?`<div class="couple-photo"><img src="${esc(resolveImg(CONFIG.couplePhoto))}" alt="合照"></div>`:'')+
  `<div class="couple-row">
    <div><div class="frame"><canvas class="pcg" width="64" height="64"></canvas></div>
      <div class="nm">${CONFIG.groom}</div><div class="ds">${CONFIG.groomDesc}</div></div>
    <span class="px-heart"></span>
    <div><div class="frame"><canvas class="pcb" width="64" height="64"></canvas></div>
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
    <div><div class="frame"><canvas class="pcg" width="64" height="64"></canvas></div>
      <div class="role-tag">新 郎</div>
      <div class="nm">${esc(CONFIG.groom)}</div><div class="ds">${CONFIG.groomDesc}</div></div>
    <span class="px-heart"></span>
    <div><div class="frame"><canvas class="pcb" width="64" height="64"></canvas></div>
      <div class="role-tag">新 娘</div>
      <div class="nm">${esc(CONFIG.bride)}</div><div class="ds">${CONFIG.brideDesc}</div></div>
  </div>`;
}
/* 海报内像素画布上色：相框肖像 + 气泡头像（主婚纱照用真实图片，不再用立绘拼接） */
function drawPosterArt(){
  drawOverlayPortraits();
  document.querySelectorAll('.chat-ava[data-port]').forEach(c=>portraitInto(c,c.dataset.port));
  const rb=document.getElementById('rsvpBtn'); if(rb) rb.onclick=openRsvp;
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
  const chips=[`💰${game.coins}`];
  if(game.seeds)chips.push(`🌱${game.seeds}`);
  if(game.hasCan)chips.push(`💧${game.water}/3`);
  if(game.fert)chips.push(`💜${game.fert}`);
  if(game.feed)chips.push(`🌾${game.feed}`);
  if(game.eggs)chips.push(`🥚${game.eggs}`);
  if(game.flowers)chips.push(`🌼${game.flowers}`);
  if(game.bait)chips.push(`🪱${game.bait}`);
  if(game.quest===1||game.fruits)chips.push(`🌻${Math.min(game.fruits,3)}/3${game.fruits>3?'+'+(game.fruits-3):''}`);
  if(game.fishN)chips.push(`🐟${game.fishN}`);
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

