/* Side by Side Player v1.2.0 — keep APP_VERSION and CHANGELOG in step with CHANGELOG.md */
(function(){
/* ---------- Version control ---------- */
const APP_VERSION='1.2.0';
const APP_BUILD='2026-11-11';
const CHANGELOG=[
  {v:'1.2.0',date:'2026-11-11',items:[
    'Up to four videos at once: add panels one at a time, or open or drop several files in one go',
    'Layout choices: Auto, Row, 2 × 2 grid and Stack',
    'Drag the handles between panels to resize every column',
    'Each video has its own offset against A, with Sync to A',
    'Reorder panels with ◀ ▶ and remove one with ✕'
  ]},
  {v:'1.1.1',date:'2026-11-10',items:[
    'Packaged as a GitHub repository ready to deploy on Cloudflare',
    'Separate stylesheet and script files, favicon, and security headers'
  ]},
  {v:'1.1.0',date:'2026-11-10',items:[
    'Zoom and pan on each video: scroll wheel, pinch, drag, or the − / + buttons (up to 800%)',
    'Link zoom keeps both videos zoomed to the same spot',
    'Drag the divider between A and B to resize the panels; double-click it for 50/50',
    'Viewer height slider and drag grip, with a Fit option that sizes to the window',
    'Version number and this history shown in the app'
  ]},
  {v:'1.0.0',date:'2026-11-10',items:[
    'Synced playback of two local videos with shared play, pause and scrub',
    'Frame stepping at 24–60 fps and speed from 0.25× to 2×',
    'B offset with frame nudging and Sync here',
    'Loop, stacked layout, swap A/B and full screen'
  ]}
];
const MAX=4, LETTERS='ABCD';
const $=id=>document.getElementById(id);
$('verBtn').textContent='v'+APP_VERSION;
$('buildLine').textContent='Side by Side Player v'+APP_VERSION+' · build '+APP_BUILD;
$('changelog').innerHTML=CHANGELOG.map((r,i)=>'<div class="rel"><h3>v'+r.v+' <span>'+r.date+'</span>'+(i===0?'<span class="cur">Current</span>':'')+'</h3><ul>'+r.items.map(x=>'<li>'+x+'</li>').join('')+'</ul></div>').join('');
const openSheet=()=>{$('sheet').hidden=false;$('sheetClose').focus()};
$('verBtn').onclick=openSheet;$('verBtn2').onclick=openSheet;
$('sheetClose').onclick=()=>$('sheet').hidden=true;
$('sheet').addEventListener('click',e=>{if(e.target===$('sheet'))$('sheet').hidden=true});
let statusTimer;
function status(msg){const s=$('status');s.textContent=msg;s.hidden=false;clearTimeout(statusTimer);statusTimer=setTimeout(()=>s.hidden=true,6000)}

/* ---------- Preferences ---------- */
const PREF_KEY='sbs-player-prefs-v2';
let P={mode:'auto',weights:null,g:50,height:null,link:true};
try{Object.assign(P,JSON.parse(localStorage.getItem(PREF_KEY)||'{}'))}catch(e){}
const savePrefs=()=>{try{localStorage.setItem(PREF_KEY,JSON.stringify(P))}catch(e){}};

/* ---------- Panels ---------- */
// Each panel keeps its own offset on a shared timeline: panel time = S.t + p.off. Panel A is rebased to offset 0.
const bay=$('bay'),handlesEl=$('handles');
const panels=[];let uid=0;
const S={t:0,playing:false,rate:1,loop:false,fps:30,last:0};
const isVideo=f=>f&&(f.type.startsWith('video')||/\.(mp4|mov|m4v|webm|mkv|ogv)$/i.test(f.name));
const fmt=s=>{if(!isFinite(s))return'--:--.---';const neg=s<0;s=Math.abs(s);const m=Math.floor(s/60),r=s-m*60;return(neg?'-':'')+String(m).padStart(2,'0')+':'+r.toFixed(3).padStart(6,'0')};
const dur=p=>{const d=p.v.duration;return isFinite(d)?d:0};
const loaded=p=>p.v.readyState>=1&&dur(p)>0;
const local=p=>S.t+p.off;
const rel=p=>p.off-(panels[0]?panels[0].off:0);
function startT(){const l=panels.filter(loaded);return l.length?Math.min(...l.map(p=>-p.off)):0}
function total(){const l=panels.filter(loaded);return l.length?Math.max(0,...l.map(p=>dur(p)-p.off)):0}
function rebase(){const o=panels[0]?panels[0].off:0;if(o){panels.forEach(p=>p.off-=o);S.t+=o}}

function createPanel(){
  const id=++uid;
  const el=document.createElement('section');el.className='mon';
  el.innerHTML=
   '<div class="mon-bar"><span class="tag">A</span><span class="fname">No video loaded</span><span class="tc-small">--:--.---</span></div>'+
   '<div class="screen"><video playsinline preload="auto"></video>'+
   '<label class="drop" for="file-'+id+'"><strong>Drop video here</strong><span>or click to choose · pick several to fill more panels</span></label>'+
   '<div class="out" hidden></div><div class="zbadge" hidden></div>'+
   '<input type="file" id="file-'+id+'" accept="video/*" multiple hidden></div>'+
   '<div class="mon-tools">'+
   '<button data-act="mute">Muted</button>'+
   '<label class="btn" for="rep-'+id+'">Replace…</label><input type="file" id="rep-'+id+'" accept="video/*" hidden>'+
   '<button class="icon" data-act="left" title="Move left" aria-label="Move left">◀</button>'+
   '<button class="icon" data-act="right" title="Move right" aria-label="Move right">▶</button>'+
   '<button class="icon" data-act="remove" title="Remove this panel" aria-label="Remove this panel">✕</button>'+
   '<span class="spacer"></span>'+
   '<span class="zoomset"><button data-act="zo" title="Zoom out" aria-label="Zoom out">−</button><button class="zval" data-act="zr" title="Reset zoom">100%</button><button data-act="zi" title="Zoom in" aria-label="Zoom in">+</button></span>'+
   '</div>';
  const q=s=>el.querySelector(s);
  const p={id,el,v:q('video'),scr:q('.screen'),drop:q('.drop'),out:q('.out'),zb:q('.zbadge'),fname:q('.fname'),tc:q('.tc-small'),tag:q('.tag'),
    mute:q('[data-act=mute]'),url:null,name:'',off:0,z:{s:1,x:0,y:0}};
  p.v.muted=true;
  q('#file-'+id).addEventListener('change',e=>{fill(p,[...e.target.files]);e.target.value=''});
  q('#rep-'+id).addEventListener('change',e=>{if(e.target.files[0])load(p,e.target.files[0]);e.target.value=''});
  p.scr.addEventListener('dragover',e=>{e.preventDefault();p.drop.classList.add('over')});
  p.scr.addEventListener('dragleave',()=>p.drop.classList.remove('over'));
  p.scr.addEventListener('drop',e=>{e.preventDefault();p.drop.classList.remove('over');fill(p,[...e.dataTransfer.files])});
  p.v.addEventListener('loadedmetadata',()=>{pause();updateOffRanges();seek(Math.max(startT(),Math.min(S.t,total())));layout()});
  p.v.addEventListener('error',()=>{if(!p.url)return;p.fname.textContent=p.name+' — this browser can’t play this format. Try MP4 (H.264) or WebM.';p.drop.hidden=false});
  p.mute.onclick=()=>{p.v.muted=!p.v.muted;renderMute(p)};
  q('[data-act=left]').onclick=()=>move(p,-1);
  q('[data-act=right]').onclick=()=>move(p,1);
  q('[data-act=remove]').onclick=()=>removePanel(p);
  q('[data-act=zi]').onclick=()=>zoomAt(p,1.25,.5,.5);
  q('[data-act=zo]').onclick=()=>zoomAt(p,1/1.25,.5,.5);
  q('[data-act=zr]').onclick=()=>resetZoom(p);
  bindZoom(p);
  return p;
}
function renderMute(p){p.mute.setAttribute('aria-pressed',p.v.muted);p.mute.textContent=p.v.muted?'Muted':'Sound on'}

function addPanel(){
  if(panels.length>=MAX)return null;
  const p=createPanel();
  if(P.link&&panels[0])p.z={...panels[0].z};
  if(!panels.length)p.v.muted=false;
  panels.push(p);
  P.weights=null;
  render();return p;
}
function load(p,file){
  if(!isVideo(file)){status(file.name+' is not a video file.');return}
  if(p.url)URL.revokeObjectURL(p.url);
  p.url=URL.createObjectURL(file);p.name=file.name;
  p.v.src=p.url;p.v.load();
  p.fname.textContent=file.name;p.fname.title=file.name;p.drop.hidden=true;
}
function fill(p,files){
  files=files.filter(isVideo);if(!files.length)return;
  load(p,files.shift());
  let skipped=0;
  for(const f of files){
    let t=panels.find(x=>x!==p&&!x.url);
    if(!t)t=addPanel();
    if(!t){skipped++;continue}
    load(t,f);
  }
  if(skipped)status('Up to '+MAX+' videos can play at once, so '+skipped+(skipped===1?' file was':' files were')+' left out.');
}
function removePanel(p){
  pause();
  if(p.url)URL.revokeObjectURL(p.url);
  if(panels.length===1){
    p.url=null;p.name='';p.v.removeAttribute('src');p.v.load();p.off=0;p.z={s:1,x:0,y:0};
    p.fname.textContent='No video loaded';p.drop.hidden=false;p.out.hidden=true;S.t=0;render();return;
  }
  const hadSound=!p.v.muted;
  p.el.remove();panels.splice(panels.indexOf(p),1);
  if(hadSound&&panels.every(x=>x.v.muted))panels[0].v.muted=false;
  P.weights=null;rebase();render();seek(S.t);
}
function move(p,dir){
  const i=panels.indexOf(p),j=i+dir;if(j<0||j>=panels.length)return;
  pause();[panels[i],panels[j]]=[panels[j],panels[i]];
  if(P.weights){[P.weights[i],P.weights[j]]=[P.weights[j],P.weights[i]]}
  rebase();render();seek(S.t);
}

function render(){
  panels.forEach((p,i)=>{
    bay.insertBefore(p.el,handlesEl);
    p.el.dataset.pos=i;const L=LETTERS[i];
    p.tag.textContent=L;
    p.drop.querySelector('strong').textContent='Drop video '+L+' here';
    p.el.querySelector('[data-act=left]').disabled=i===0;
    p.el.querySelector('[data-act=right]').disabled=i===panels.length-1;
    p.el.querySelector('[data-act=remove]').disabled=panels.length===1&&!p.url;
    p.el.setAttribute('aria-label','Video '+L);
    renderMute(p);
  });
  $('addPanel').disabled=panels.length>=MAX;
  $('addPanel').textContent='+ Add video ('+panels.length+'/'+MAX+')';
  buildOffsets();layout();ui();
}

/* ---------- Offsets ---------- */
function offRange(){return Math.max(10,Math.ceil(Math.max(0,...panels.map(dur))))}
function buildOffsets(){
  const box=$('offsets');box.innerHTML='';
  if(panels.length<2){box.hidden=true;return}
  box.hidden=false;
  const r=offRange();
  panels.slice(1).forEach((p,k)=>{
    const i=k+1,L=LETTERS[i];
    const row=document.createElement('div');row.className='offrow';row.dataset.pos=i;
    row.innerHTML='<span class="lbl tight">Offset</span><span class="tag">'+L+'</span>'+
      '<button data-a="m">−1 frame</button>'+
      '<input type="range" id="off-'+p.id+'" min="'+(-r)+'" max="'+r+'" step="0.001" value="'+rel(p)+'" aria-label="Offset of video '+L+' against A, in seconds">'+
      '<button data-a="p">+1 frame</button><span class="val" data-a="v"></span>'+
      '<button data-a="sync" title="Treat the current frame of '+L+' and of A as the same moment">Sync to A</button><button data-a="z">Reset</button>';
    const rng=row.querySelector('input');
    rng.addEventListener('input',e=>{pause();setRel(p,+e.target.value)});
    row.querySelector('[data-a=m]').onclick=()=>{pause();setRel(p,rel(p)-1/S.fps)};
    row.querySelector('[data-a=p]').onclick=()=>{pause();setRel(p,rel(p)+1/S.fps)};
    row.querySelector('[data-a=z]').onclick=()=>{pause();setRel(p,0)};
    row.querySelector('[data-a=sync]').onclick=()=>{pause();const A=panels[0];if(loaded(A)&&loaded(p)){const a=A.v.currentTime,b=p.v.currentTime;S.t=a-A.off;setRel(p,b-a)}};
    p.offRow=row;box.appendChild(row);
  });
  const note=document.createElement('p');note.className='note';
  note.textContent='Every video is timed against A. A positive offset means that video runs ahead of A. To line up takes, pause on a key moment in A, step the other video to the same moment, then press Sync to A.';
  box.appendChild(note);
}
function updateOffRanges(){const r=offRange();panels.forEach(p=>{const i=p.offRow&&p.offRow.querySelector('input');if(i){i.min=-r;i.max=r}})}
function setRel(p,v){p.off=(panels[0]?panels[0].off:0)+Math.round(v*1000)/1000;const i=p.offRow&&p.offRow.querySelector('input');if(i)i.value=rel(p);seek(S.t)}

/* ---------- Playback ---------- */
function place(p,exact){
  const v=p.v;if(!loaded(p))return;
  const lt=local(p),d=dur(p),inside=lt>=0&&lt<d-0.01;
  p.out.hidden=inside;
  if(!inside){p.out.textContent=lt<0?'starts in '+(-lt).toFixed(2)+' s':'ended';
    if(!v.paused)v.pause();const c=Math.min(Math.max(lt,0),d);if(Math.abs(v.currentTime-c)>0.02)v.currentTime=c;return}
  if(S.playing){
    if(v.paused){v.currentTime=lt;v.playbackRate=S.rate;v.play().catch(()=>{})}
    const drift=v.currentTime-lt;
    if(Math.abs(drift)>0.25){v.currentTime=lt;v.playbackRate=S.rate}
    else v.playbackRate=Math.min(4,Math.max(0.0625,S.rate*(1-drift*0.6)));
  }else{if(!v.paused)v.pause();if(exact||Math.abs(v.currentTime-lt)>0.001)v.currentTime=lt}
}
const placeAll=exact=>panels.forEach(p=>place(p,exact));
function seek(t){S.t=Math.max(startT(),Math.min(t,total()));placeAll(true);ui()}
function play(){if(!total())return;if(S.t>=total()-0.01)S.t=startT();S.playing=true;S.last=performance.now();ui();tick()}
function pause(){S.playing=false;panels.forEach(p=>{if(!p.v.paused)p.v.pause()});ui()}
function tick(){
  if(!S.playing)return;
  const now=performance.now(),dt=(now-S.last)/1000;S.last=now;
  S.t+=Math.min(dt,0.25)*S.rate;
  // the first video that is playing normally is the clock; the others follow it
  for(const p of panels){
    if(!loaded(p)||p.v.paused||p.v.seeking)continue;
    const c=p.v.currentTime-p.off;
    if(Math.abs(c-S.t)<0.25){S.t=c;break}
  }
  if(S.t>=total()){if(S.loop){seek(startT());S.playing=true}else{S.t=total();pause();placeAll(true);return}}
  placeAll(false);ui();requestAnimationFrame(tick);
}
function step(n){pause();seek(S.t+n/S.fps)}

function ui(){
  const T=total(),any=T>0;
  ['play','back','fwd','start','scrub'].forEach(id=>$(id).disabled=!any);
  $('play').textContent=S.playing?'Pause':'Play';
  $('tc').innerHTML=fmt(S.t)+' <small>/ '+fmt(T)+'</small>';
  const sc=$('scrub');sc.min=startT();sc.max=T;if(!S.dragging)sc.value=S.t;
  panels.forEach(p=>{
    p.tc.textContent=loaded(p)?fmt(Math.max(0,Math.min(local(p),dur(p)))):'--:--.---';
    if(p.offRow){const r=rel(p);p.offRow.querySelector('[data-a=v]').textContent=(r>=0?'+':'−')+Math.abs(r).toFixed(3)+' s'}
  });
}

$('play').onclick=()=>S.playing?pause():play();
$('back').onclick=()=>step(-1);$('fwd').onclick=()=>step(1);
$('start').onclick=()=>{pause();seek(startT())};
$('scrub').addEventListener('input',e=>{S.dragging=true;const was=S.playing;if(was)pause();S.resume=S.resume||was;seek(+e.target.value)});
$('scrub').addEventListener('change',()=>{S.dragging=false;if(S.resume){S.resume=false;play()}});
$('rate').onchange=e=>{S.rate=+e.target.value;panels.forEach(p=>p.v.playbackRate=S.rate)};
$('fps').onchange=e=>S.fps=+e.target.value;
$('loop').onclick=()=>{S.loop=!S.loop;$('loop').setAttribute('aria-pressed',S.loop)};
$('addPanel').onclick=()=>addPanel();
$('addFiles').addEventListener('change',e=>{
  const files=[...e.target.files].filter(isVideo);e.target.value='';if(!files.length)return;
  let t=panels.find(x=>!x.url)||addPanel();
  if(!t){status('All '+MAX+' panels are in use. Remove one or use Replace on a panel.');return}
  fill(t,files);
});

/* ---------- Layout: mode, column widths, height ---------- */
function mode(){
  const n=panels.length;
  if(window.innerWidth<720||P.mode==='stack')return n>1?'stack':'row';
  if(n<=2)return'row';
  if(P.mode==='auto')return n===3&&bay.clientWidth>1100?'row':'grid';
  return P.mode;
}
function weights(){const n=panels.length;if(!Array.isArray(P.weights)||P.weights.length!==n)P.weights=Array(n).fill(1);return P.weights}
function rowsFor(m){const n=panels.length;return m==='row'?1:m==='grid'?Math.ceil(n/2):n}
function fitHeight(m){
  const rows=rowsFor(m),w=bay.clientWidth,n=panels.length;
  if(document.fullscreenElement===bay)return Math.max(140,(window.innerHeight-20-(rows-1)*10)/rows-82);
  let colW=w;
  if(m==='row'){const ws=weights(),sum=ws.reduce((a,b)=>a+b,0);colW=(w-(n-1)*10)*Math.max(...ws)/sum}
  else if(m==='grid')colW=(w-10)*Math.max(P.g,100-P.g)/100;
  const cap=rows===1?window.innerHeight*0.7:window.innerHeight*0.88/rows-82;
  return Math.round(Math.max(140,Math.min(colW*9/16,cap)));
}
function layout(){
  const m=mode(),n=panels.length;
  if(m==='row')bay.style.gridTemplateColumns=weights().map(w=>'minmax(0,'+w+'fr)').join(' ');
  else if(m==='grid')bay.style.gridTemplateColumns='minmax(0,'+P.g+'fr) minmax(0,'+(100-P.g)+'fr)';
  else bay.style.gridTemplateColumns='minmax(0,1fr)';
  panels.forEach((p,i)=>p.el.classList.toggle('span2',m==='grid'&&n===3&&i===2));
  const h=(P.height&&document.fullscreenElement!==bay)?P.height:fitHeight(m);
  bay.style.setProperty('--sh',h+'px');
  $('height').value=Math.round(h);
  $('hVal').textContent=P.height?Math.round(h)+' px':'Fit';
  $('fit').setAttribute('aria-pressed',!P.height);
  $('layoutMode').value=P.mode;
  $('even').disabled=m==='stack'||n<2;
  $('link').setAttribute('aria-pressed',P.link);
  placeHandles(m);
  panels.forEach(applyZoom);
}
function boundaries(m){
  const n=panels.length;
  if(m==='row')return panels.slice(0,-1).map((p,i)=>i);
  if(m==='grid'&&n>=2)return[0];
  return[];
}
function placeHandles(m){
  const bs=boundaries(m);
  while(handlesEl.children.length>bs.length)handlesEl.lastChild.remove();
  while(handlesEl.children.length<bs.length){
    const h=document.createElement('div');h.className='handle';h.tabIndex=0;h.setAttribute('role','separator');h.setAttribute('aria-orientation','vertical');
    h.title='Drag to resize · double-click for even widths';
    bindHandle(h);handlesEl.appendChild(h);
  }
  const br=bay.getBoundingClientRect();
  bs.forEach((i,k)=>{
    const h=handlesEl.children[k];h.dataset.i=i;
    h.setAttribute('aria-label','Resize between '+LETTERS[i]+' and '+LETTERS[i+1]);
    const a=panels[i].el.getBoundingClientRect(),b=panels[i+1].el.getBoundingClientRect();
    h.style.left=((a.right+b.left)/2-br.left-7)+'px';
  });
}
function adjust(i,frac){
  if(mode()==='grid'){P.g=Math.round(Math.min(85,Math.max(15,frac*100))*10)/10}
  else{const w=weights(),W=w[i]+w[i+1],f=Math.min(.88,Math.max(.12,frac));w[i]=W*f;w[i+1]=W*(1-f)}
  layout();
}
function bindHandle(h){
  h.addEventListener('pointerdown',e=>{
    e.preventDefault();h.setPointerCapture(e.pointerId);h.classList.add('drag');
    const i=+h.dataset.i,br=bay.getBoundingClientRect();
    let L,R;
    if(mode()==='grid'){L=br.left;R=br.right}else{L=panels[i].el.getBoundingClientRect().left;R=panels[i+1].el.getBoundingClientRect().right}
    const mv=ev=>adjust(i,(ev.clientX-L)/(R-L));
    const up=()=>{h.classList.remove('drag');h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);savePrefs()};
    h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up);
  });
  h.addEventListener('dblclick',()=>{evenOut()});
  h.addEventListener('keydown',e=>{
    if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();e.stopPropagation();
    const i=+h.dataset.i,d=e.key==='ArrowLeft'?-.02:.02;
    if(mode()==='grid')adjust(i,P.g/100+d);else{const w=weights();adjust(i,w[i]/(w[i]+w[i+1])+d)}
    savePrefs();
  });
}
function evenOut(){P.weights=null;P.g=50;savePrefs();layout()}
$('even').onclick=evenOut;
$('layoutMode').onchange=e=>{P.mode=e.target.value;savePrefs();layout()};
$('fit').onclick=()=>{P.height=null;savePrefs();layout()};
$('height').addEventListener('input',e=>{P.height=+e.target.value;layout()});
$('height').addEventListener('change',savePrefs);
window.addEventListener('resize',layout);
document.addEventListener('fullscreenchange',layout);
$('full').onclick=()=>{try{if(document.fullscreenElement)document.exitFullscreen();else bay.requestFullscreen().catch(()=>{})}catch(e){}};

const grip=$('grip');
grip.addEventListener('pointerdown',e=>{
  e.preventDefault();grip.setPointerCapture(e.pointerId);grip.classList.add('drag');
  const start=parseFloat(getComputedStyle(bay).getPropertyValue('--sh'))||320,y0=e.clientY;
  const mv=ev=>{P.height=Math.round(Math.min(1400,Math.max(140,start+ev.clientY-y0)));layout()};
  const up=()=>{grip.classList.remove('drag');grip.removeEventListener('pointermove',mv);grip.removeEventListener('pointerup',up);grip.removeEventListener('pointercancel',up);savePrefs()};
  grip.addEventListener('pointermove',mv);grip.addEventListener('pointerup',up);grip.addEventListener('pointercancel',up);
});
grip.addEventListener('dblclick',()=>{P.height=null;savePrefs();layout()});
grip.addEventListener('keydown',e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();e.stopPropagation();const cur=parseFloat(getComputedStyle(bay).getPropertyValue('--sh'))||320;P.height=Math.min(1400,Math.max(140,cur+(e.key==='ArrowUp'?-20:20)));savePrefs();layout()}});

/* ---------- Zoom and pan ---------- */
// Pan offsets are fractions of the panel size, so linked panels of different sizes stay on the same spot.
const ZMAX=8;
function clampZ(z){z.s=Math.min(ZMAX,Math.max(1,z.s));z.x=Math.min(0,Math.max(1-z.s,z.x));z.y=Math.min(0,Math.max(1-z.s,z.y))}
function applyZoom(p){
  const z=p.z;clampZ(z);
  const w=p.scr.clientWidth,h=p.scr.clientHeight;
  p.v.style.transform=z.s===1?'':'translate('+(z.x*w)+'px,'+(z.y*h)+'px) scale('+z.s+')';
  const pct=Math.round(z.s*100)+'%';
  p.el.querySelector('[data-act=zr]').textContent=pct;p.zb.textContent=pct;p.zb.hidden=z.s===1;
  p.scr.classList.toggle('zoomed',z.s>1);
}
const targets=p=>P.link?panels:[p];
function zoomAt(p,factor,u,v){
  targets(p).forEach(t=>{const z=t.z,ns=Math.min(ZMAX,Math.max(1,z.s*factor)),r=ns/z.s;
    z.x=u-(u-z.x)*r;z.y=v-(v-z.y)*r;z.s=ns;applyZoom(t)});
}
function panBy(p,du,dv){targets(p).forEach(t=>{t.z.x+=du;t.z.y+=dv;applyZoom(t)})}
function resetZoom(p){(p?targets(p):panels).forEach(t=>{t.z={s:1,x:0,y:0};applyZoom(t)})}
function bindZoom(p){
  const scr=p.scr;
  scr.addEventListener('wheel',e=>{
    if(!loaded(p))return;e.preventDefault();
    const r=scr.getBoundingClientRect();
    zoomAt(p,Math.exp(-e.deltaY*(e.deltaMode===1?0.05:0.0015)),(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);
  },{passive:false});
  scr.addEventListener('dblclick',e=>{if(loaded(p)&&e.target.tagName==='VIDEO')resetZoom(p)});
  const pts=new Map();let last=null;
  scr.addEventListener('pointerdown',e=>{
    if(!loaded(p)||e.target.closest('.drop'))return;
    scr.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});last=null;
    if(p.z.s>1)scr.classList.add('panning');
  });
  scr.addEventListener('pointermove',e=>{
    if(!pts.has(e.pointerId))return;
    const prev=pts.get(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const r=scr.getBoundingClientRect();
    if(pts.size===2){
      const [p1,p2]=[...pts.values()];const d=Math.hypot(p1.x-p2.x,p1.y-p2.y);
      const mx=((p1.x+p2.x)/2-r.left)/r.width,my=((p1.y+p2.y)/2-r.top)/r.height;
      if(last){zoomAt(p,d/last.d,mx,my);panBy(p,mx-last.mx,my-last.my)}
      last={d,mx,my};
    }else if(pts.size===1&&p.z.s>1){panBy(p,(e.clientX-prev.x)/r.width,(e.clientY-prev.y)/r.height)}
  });
  const end=e=>{pts.delete(e.pointerId);last=null;if(!pts.size)scr.classList.remove('panning')};
  scr.addEventListener('pointerup',end);scr.addEventListener('pointercancel',end);
}
$('link').onclick=()=>{P.link=!P.link;savePrefs();if(P.link&&panels[0])panels.forEach(t=>t.z={...panels[0].z});layout()};
$('zReset').onclick=()=>resetZoom();

/* ---------- Keyboard ---------- */
const zoomAll=f=>P.link?zoomAt(panels[0],f,.5,.5):panels.forEach(p=>zoomAt(p,f,.5,.5));
document.addEventListener('keydown',e=>{
  if(!$('sheet').hidden){if(e.key==='Escape')$('sheet').hidden=true;return}
  if(e.target.tagName==='SELECT'||(e.target.tagName==='INPUT'&&e.target.type!=='range'))return;
  if(e.key===' '){e.preventDefault();S.playing?pause():play()}
  else if(e.key===','){e.preventDefault();step(-1)}else if(e.key==='.'){e.preventDefault();step(1)}
  else if(e.key==='ArrowLeft'&&e.target.type!=='range'){e.preventDefault();pause();seek(S.t-1)}
  else if(e.key==='ArrowRight'&&e.target.type!=='range'){e.preventDefault();pause();seek(S.t+1)}
  else if(e.key==='+'||e.key==='='){e.preventDefault();zoomAll(1.25)}
  else if(e.key==='-'||e.key==='_'){e.preventDefault();zoomAll(1/1.25)}
  else if(e.key==='0'){e.preventDefault();resetZoom()}
});

addPanel();addPanel();
})();
