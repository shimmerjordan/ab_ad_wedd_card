/* ============================================================
 * HUD 与系统：任务目标/边缘指引 + 主循环 loop + 音频(sfx/bgm) + 浮层/吐司/粒子工具 + 对话系统
 * （由原 game.js 按职责拆分，多文件共享全局作用域；保持原加载顺序）
 * ============================================================ */
/* ============================================================
 * 任务目标 + 指引
 * ============================================================ */
function questTarget(){
  switch(game.quest){
    case 0: return {scene:'world', x:partner.x+6, y:partner.y-14};
    case 1:
      if(!game.hasCan) return {scene:'world', x:WOBJ.well.x+15, y:WOBJ.well.y-16};
      return {scene:'world', x:11.5*TILE, y:7*TILE};
    case 2:
      if(!game.rod||game.bait<=0) return {scene:'world', x:7*TILE, y:20*TILE};   // 先去杂货店购置
      return {scene:'world', x:29.5*TILE, y:7*TILE};
    case 3: return {scene:'world', x:WOBJ.mailbox.x+4, y:WOBJ.mailbox.y-20};
    case 4: return {scene:'museum', x:13*TILE, y:5*TILE};
    case 5: return {scene:'hall', x:12.5*TILE, y:6*TILE};
    default: return null;
  }
}
function drawMarker(){
  let t=questTarget();if(!t)return;
  if(t.scene!==game.scene)t=Object.assign({},routeDoor(game.scene,t.scene),{viaDoor:1});
  const px=t.x-cam.x|0,py=(t.y-cam.y+Math.sin(game.time*4)*2)|0;
  if(px<-8||py<-8||px>VW+8||py>VH+8)return;
  ctx.fillStyle='#ffd84d';
  ctx.fillRect(px-1,py-8,3,6);ctx.fillRect(px-1,py,3,2);
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(px-2,py-9,1,8);ctx.fillRect(px+2,py-9,1,8);
}
const edgeArrow=document.getElementById('edgeArrow');
function updateArrow(){
  let t=questTarget();
  if(!t||game.mode!=='play'){edgeArrow.style.display='none';return;}
  if(t.scene!==game.scene)t=routeDoor(game.scene,t.scene);
  const sx=(t.x-cam.x)*SCALE,sy=(t.y-cam.y)*SCALE;
  const m=30,w=lastW,h=lastH;
  if(sx>m&&sx<w-m&&sy>m&&sy<h-m){edgeArrow.style.display='none';return;}
  const cxx=w/2,cyy=h/2;
  const ang=Math.atan2(sy-cyy,sx-cxx);
  const rx=Math.min(cxx-26,Math.abs((cxx-26)/Math.cos(ang)||1e9)),
        ry=Math.min(cyy-26,Math.abs((cyy-26)/Math.sin(ang)||1e9));
  const rr=Math.min(rx/Math.abs(Math.cos(ang)||1e-9),ry/Math.abs(Math.sin(ang)||1e-9),Math.hypot(cxx,cyy));
  let ex=cxx+Math.cos(ang)*Math.min(rr,Math.hypot(sx-cxx,sy-cyy)),
      ey=cyy+Math.sin(ang)*Math.min(rr,Math.hypot(sx-cxx,sy-cyy));
  ex=Math.max(26,Math.min(w-26,ex));ey=Math.max(70,Math.min(h-26,ey));
  edgeArrow.style.display='block';
  edgeArrow.style.left=(ex-11)+'px';edgeArrow.style.top=(ey-9)+'px';
  edgeArrow.style.transform=`rotate(${ang*180/Math.PI+90}deg)`;
}

/* ============================================================
 * 主循环
 * ============================================================ */
let lastT=0;
function loop(t){
  const dt=Math.min(0.05,(t-lastT)/1000||0);lastT=t;
  const _r=cv.getBoundingClientRect();
  if(lastW!==_r.width||lastH!==_r.height){resize();updateCam();}
  update(dt);
  if(game.mode!=='title'){ctx.clearRect(0,0,VW,VH);drawWorld();}
  /* 装备栏：首帧渲染(并在 slotBox 素材加载完成后重渲一次)，仅户外游玩时显示 */
  const tb=document.getElementById('toolBar');
  if(tb){
    if(!tb._init||(!tb._img&&img('slotBox'))){renderToolbar();tb._init=1;tb._img=!!img('slotBox');}
    const show=game.mode==='play'&&game.scene==='world';
    if(tb._show!==show){tb.style.display=show?'flex':'none';tb._show=show;}
  }
  requestAnimationFrame(loop);
}
/* 主循环的启动放到最后一个模块(boot.js)末尾，确保各模块函数都已就绪 */

/* ============================================================
 * 音频
 * ============================================================ */
let actx=null,bgmOn=false,sfxOn=true,loopTimer=null;
const BPM=152,BEAT=60/BPM;
const fq=m=>440*Math.pow(2,(m-69)/12);
const MELODY=[[64,1],[67,1],[72,1],[71,1.5],[69,.5],[67,1],[69,1],[67,1],[64,1],[67,3],
              [64,1],[67,1],[72,1],[74,1.5],[76,.5],[74,1],[72,1],[69,1],[71,1],[72,3]];
const BASSL=[[48,55,55],[43,50,50],[45,52,52],[48,55,55],[48,55,55],[43,50,50],[41,48,53],[48,52,55]];
function tone(type,midi,t,dur,vol){
  const o=actx.createOscillator(),gg=actx.createGain();
  o.type=type;o.frequency.value=fq(midi);
  gg.gain.setValueAtTime(0,t);
  gg.gain.linearRampToValueAtTime(vol,t+.02);
  gg.gain.setValueAtTime(vol,t+dur*.6);
  gg.gain.linearRampToValueAtTime(0,t+dur*.95);
  o.connect(gg).connect(actx.destination);
  o.start(t);o.stop(t+dur);
}
function ensureCtx(){if(!actx)actx=new (window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume();}
function bgmLoop(){
  let t=actx.currentTime+.05;const t0=t;
  MELODY.forEach(([m,b])=>{if(m)tone('square',m,t,b*BEAT,.04);t+=b*BEAT;});
  BASSL.forEach((bar,bi)=>{const bt=t0+bi*3*BEAT;bar.forEach((m,i)=>tone('triangle',m,bt+i*BEAT,BEAT*.9,i===0?.06:.035));});
  loopTimer=setTimeout(bgmLoop,(t-t0-.15)*1000);
}
function toggleBgm(force){
  const want=force!==undefined?force:!bgmOn;
  if(want&&!bgmOn){ensureCtx();bgmOn=true;bgmLoop();}
  else if(!want&&bgmOn){bgmOn=false;clearTimeout(loopTimer);}
  document.getElementById('bgmBtn').textContent=bgmOn?'♪':'✕';
}
document.getElementById('bgmBtn').addEventListener('click',()=>toggleBgm());
function sfx(name){
  if(!actx||!sfxOn)return;
  const t=actx.currentTime;
  if(name==='blip')tone('square',86,t,.05,.03);
  else if(name==='jump'){tone('square',70,t,.06,.04);tone('square',77,t+.06,.08,.04);}
  else if(name==='plant'){tone('triangle',60,t,.06,.06);tone('triangle',67,t+.07,.08,.05);}
  else if(name==='water'){tone('sine',55,t,.1,.06);tone('sine',52,t+.08,.12,.05);}
  else if(name==='harvest'){[72,76,79].forEach((m,i)=>tone('square',m,t+i*.07,.09,.045));}
  else if(name==='quest'){[60,64,67,72].forEach((m,i)=>tone('square',m,t+i*.09,.12,.05));}
  else if(name==='choice')tone('square',79,t,.06,.04);
  else if(name==='coin'){tone('square',88,t,.05,.04);tone('square',93,t+.05,.08,.04);}
  else if(name==='piano'){[60,64,67,72,76].forEach((m,i)=>tone('sine',m,t+i*.12,.4,.06));}
  else if(name==='pop'){tone('square',96,t,.04,.05);tone('square',60,t+.03,.1,.04);}
  else if(name==='fanfare'){[60,64,67,72,76,79,84].forEach((m,i)=>tone('square',m,t+i*.1,.16,.05));[48,52,55,60].forEach((m,i)=>tone('triangle',m,t+i*.2,.3,.06));}
}

/* ============================================================
 * UI 工具
 * ============================================================ */
function toast(msg){
  const d=document.createElement('div');
  d.className='toast';d.innerHTML=msg;
  document.getElementById('toasts').appendChild(d);
  setTimeout(()=>d.remove(),3200);
}
const HEARTC=['%23e0457b','%23ff7daa','%23f0a94e','%23a06ee0'];
function flyHearts(x,y,n){
  for(let i=0;i<n;i++){
    const h=document.createElement('div');
    h.className='fly-heart';
    const c=HEARTC[Math.random()*HEARTC.length|0],sz=12+Math.random()*12;
    h.style.cssText=`left:${x-sz/2+(Math.random()*40-20)}px;top:${y-sz/2}px;width:${sz}px;height:${sz}px;animation-delay:${i*.07}s;`+
      `background:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 13 12" shape-rendering="crispEdges"><path fill="${c}" d="M2 1h3v1h1v1h1V2h1V1h3v1h1v3h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v-1H4V9H3V8H2V7H1V6H0V2h1V1h1z"/></svg>') no-repeat center/contain`;
    document.body.appendChild(h);
    setTimeout(()=>h.remove(),1500);
  }
}
function confetti(n){
  const colors=['#e0457b','#ffd84d','#7dc4ff','#a06ee0','#ff8a5c','#7ec850'];
  for(let i=0;i<n;i++){
    const d=document.createElement('div');
    d.className='confetti';
    const sz=4+Math.random()*5;
    d.style.cssText=`left:${Math.random()*100}vw;width:${sz}px;height:${sz*1.4}px;background:${colors[i%colors.length]};animation-duration:${2.2+Math.random()*2.5}s;animation-delay:${Math.random()*1.2}s`;
    document.body.appendChild(d);
    setTimeout(()=>d.remove(),6000);
  }
}
function fade(b){document.getElementById('fade').style.opacity=b?1:0;}

/* ============================================================
 * 对话系统
 * ============================================================ */
const dlg={el:document.getElementById('dialog'),txt:document.getElementById('dlgText'),
  name:document.getElementById('dlgName'),choices:document.getElementById('dlgChoices'),
  next:document.getElementById('dlgNext'),queue:[],idx:0,typing:false,full:'',onDone:null,timer:null};
function portraitFor(who){
  portraitInto(document.querySelector('#dlgPortrait canvas'), who);
}
function nameFor(who){return who==='groom'?CONFIG.groom:who==='bride'?CONFIG.bride:who==='cat'?'小猫':'小鸡';}
function startDialog(lines,onDone){
  game.mode='dialog';
  dlg.queue=lines;dlg.idx=0;dlg.onDone=onDone||null;
  dlg.el.style.display='block';
  showLine();
}
function showLine(){
  const line=dlg.queue[dlg.idx];
  dlg.choices.style.display='none';dlg.choices.innerHTML='';dlg.next.style.display='none';
  const who=line.who==='me'?game.playerRole:line.who;
  portraitFor(who);
  dlg.name.textContent=line.who==='me'?nameFor(game.playerRole)+'（你）':nameFor(line.who);
  dlg.full=line.text;dlg.txt.textContent='';
  dlg.typing=true;
  let i=0;
  clearInterval(dlg.timer);
  dlg.timer=setInterval(()=>{
    dlg.txt.textContent=dlg.full.slice(0,++i);
    if(i%3===0)sfx('blip');
    if(i>=dlg.full.length){clearInterval(dlg.timer);dlg.typing=false;endOfLine(line);}
  },26);
}
function endOfLine(line){
  if(line.choices){
    dlg.choices.style.display='flex';
    line.choices.forEach((c,ci)=>{
      const b=document.createElement('button');
      b.textContent='» '+c[0];
      b.onclick=e=>{e.stopPropagation();sfx('choice');line.onPick&&line.onPick(ci);advance();};
      dlg.choices.appendChild(b);
    });
  }else dlg.next.style.display='block';
}
function advance(){
  dlg.idx++;
  if(dlg.idx>=dlg.queue.length){
    dlg.el.style.display='none';
    game.mode='play';
    const cb=dlg.onDone;dlg.onDone=null;
    cb&&cb();
  }else showLine();
}
document.getElementById('dlgBox').addEventListener('click',()=>{
  const line=dlg.queue[dlg.idx];
  if(dlg.typing){clearInterval(dlg.timer);dlg.txt.textContent=dlg.full;dlg.typing=false;endOfLine(line);}
  else if(!line.choices)advance();
});

