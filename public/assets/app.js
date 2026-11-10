/* Side by Side Player v1.1.1 — keep APP_VERSION and CHANGELOG in step with CHANGELOG.md */
(function(){
/* ---------- Version control ---------- */
const APP_VERSION='1.1.1';
const APP_BUILD='2026-11-10';
const CHANGELOG=[
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
const $=id=>document.getElementById(id);
$('verBtn').textContent='v'+APP_VERSION;
$('buildLine').textContent='Side by Side Player v'+APP_VERSION+' · build '+APP_BUILD;
$('changelog').innerHTML=CHANGELOG.map((r,i)=>'<div class="rel"><h3>v'+r.v+' <span>'+r.date+'</span>'+(i===0?'<span class="cur">Current</span>':'')+'</h3><ul>'+r.items.map(x=>'<li>'+x+'</li>').join('')+'</ul></div>').join('');
const openSheet=()=>{$('sheet').hidden=false;$('sheetClose').focus()};
$('verBtn').onclick=openSheet;$('verBtn2').onclick=openSheet;
$('sheetClose').onclick=()=>$('sheet').hidden=true;
$('sheet').addEventListener('click',e=>{if(e.target===$('sheet'))$('sheet').hidden=true});

/* ---------- Preferences ---------- */
const PREF_KEY='sbs-player-prefs';
let P={split:50,height:null,link:true,stacked:false};
try{Object.assign(P,JSON.parse(localStorage.getItem(PREF_KEY)||'{}'))}catch(e){}
const savePrefs=()=>{try{localStorage.setItem(PREF_KEY,JSON.stringify(P))}catch(e){}};

/* ---------- Playback ---------- */
const vids={A:$('vA'),B:$('vB')};
const S={t:0,playing:false,rate:1,offset:0,loop:false,fps:30,last:0,urls:{},names:{A:'',B:''}};
const fmt=s=>{if(!isFinite(s))return'--:--.---';const neg=s<0;s=Math.abs(s);const m=Math.floor(s/60),r=s-m*60;return(neg?'-':'')+String(m).padStart(2,'0')+':'+r.toFixed(3).padStart(6,'0')};
const dur=k=>{const d=vids[k].duration;return isFinite(d)?d:0};
const loaded=k=>vids[k].readyState>=1&&dur(k)>0;
function total(){let d=0;if(loaded('A'))d=Math.max(d,dur('A'));if(loaded('B'))d=Math.max(d,dur('B')-S.offset);return Math.max(0,d)}
function startT(){return loaded('B')?Math.min(0,-S.offset):0}
const local=k=>k==='A'?S.t:S.t+S.offset;

function load(k,file){
  if(!file||!file.type.startsWith('video')&&!/\.(mp4|mov|m4v|webm|mkv|ogv)$/i.test(file.name))return;
  if(S.urls[k])URL.revokeObjectURL(S.urls[k]);
  S.urls[k]=URL.createObjectURL(file);S.names[k]=file.name;
  const v=vids[k];v.src=S.urls[k];v.load();
  $('name'+k).textContent=file.name;$('drop'+k).hidden=true;
  v.onerror=()=>{$('name'+k).textContent=file.name+' — this browser can’t play this format. Try MP4 (H.264) or WebM.';$('drop'+k).hidden=false};
}
function wire(k){
  [$('file'+k),$('file'+k+'2')].forEach(i=>i.addEventListener('change',e=>{load(k,e.target.files[0]);e.target.value=''}));
  const scr=$('scr'+k);
  scr.addEventListener('dragover',e=>{e.preventDefault();$('drop'+k).classList.add('over')});
  scr.addEventListener('dragleave',()=>$('drop'+k).classList.remove('over'));
  scr.addEventListener('drop',e=>{e.preventDefault();$('drop'+k).classList.remove('over');load(k,e.dataTransfer.files[0])});
  vids[k].addEventListener('loadedmetadata',()=>{if(k==='B')setOffRange();pause();seek(Math.max(startT(),Math.min(S.t,total())));ui()});
  $('mute'+k).addEventListener('click',()=>{const v=vids[k];v.muted=!v.muted;$('mute'+k).setAttribute('aria-pressed',v.muted);$('mute'+k).textContent=v.muted?'Muted':'Sound on'});
}
wire('A');wire('B');
function setOffRange(){const r=Math.max(10,Math.ceil(Math.max(dur('A'),dur('B'))));const o=$('off');o.min=-r;o.max=r}

function place(k,exact){
  const v=vids[k];if(!loaded(k))return;
  const lt=local(k),d=dur(k),inside=lt>=0&&lt<d-0.01;
  $('out'+k).hidden=inside;
  if(!inside){$('out'+k).textContent=lt<0?'starts in '+(-lt).toFixed(2)+' s':'ended';
    if(!v.paused)v.pause();const c=Math.min(Math.max(lt,0),d);if(Math.abs(v.currentTime-c)>0.02)v.currentTime=c;return}
  if(S.playing){
    if(v.paused){v.currentTime=lt;v.playbackRate=S.rate;v.play().catch(()=>{})}
    const drift=v.currentTime-lt;
    if(Math.abs(drift)>0.25){v.currentTime=lt;v.playbackRate=S.rate}
    else v.playbackRate=Math.min(4,Math.max(0.0625,S.rate*(1-drift*0.6)));
  }else{if(!v.paused)v.pause();if(exact||Math.abs(v.currentTime-lt)>0.001)v.currentTime=lt}
}
function seek(t){S.t=Math.max(startT(),Math.min(t,total()));place('A',true);place('B',true);ui()}
function play(){if(!total())return;if(S.t>=total()-0.01)S.t=startT();S.playing=true;S.last=performance.now();ui();tick()}
function pause(){S.playing=false;Object.values(vids).forEach(v=>{if(!v.paused)v.pause()});ui()}
function tick(){
  if(!S.playing)return;
  const now=performance.now(),dt=(now-S.last)/1000;S.last=now;
  S.t+=Math.min(dt,0.25)*S.rate;
  // when A is playing normally it is the clock, so B follows A exactly
  if(loaded('A')&&!vids.A.paused&&!vids.A.seeking&&Math.abs(vids.A.currentTime-S.t)<0.25)S.t=vids.A.currentTime;
  if(S.t>=total()){if(S.loop){seek(startT());S.playing=true}else{S.t=total();pause();place('A',true);place('B',true);return}}
  place('A');place('B');ui();requestAnimationFrame(tick);
}
function step(n){pause();seek(S.t+n/S.fps)}

function ui(){
  const T=total(),any=T>0;
  ['play','back','fwd','start','scrub'].forEach(id=>$(id).disabled=!any);
  $('play').textContent=S.playing?'Pause':'Play';
  $('tc').innerHTML=fmt(S.t)+' <small>/ '+fmt(T)+'</small>';
  const sc=$('scrub');sc.min=startT();sc.max=T;if(!S.dragging)sc.value=S.t;
  $('tcA').textContent=loaded('A')?fmt(Math.max(0,Math.min(local('A'),dur('A')))):'--:--.---';
  $('tcB').textContent=loaded('B')?fmt(Math.max(0,Math.min(local('B'),dur('B')))):'--:--.---';
  $('offVal').textContent=(S.offset>=0?'+':'−')+Math.abs(S.offset).toFixed(3)+' s';
}
function setOffset(o){S.offset=Math.round(o*1000)/1000;$('off').value=S.offset;seek(S.t)}

$('play').onclick=()=>S.playing?pause():play();
$('back').onclick=()=>step(-1);$('fwd').onclick=()=>step(1);
$('start').onclick=()=>{pause();seek(startT())};
$('scrub').addEventListener('input',e=>{S.dragging=true;const was=S.playing;if(was)pause();S.resume=S.resume||was;seek(+e.target.value)});
$('scrub').addEventListener('change',()=>{S.dragging=false;if(S.resume){S.resume=false;play()}});
$('rate').onchange=e=>{S.rate=+e.target.value;Object.values(vids).forEach(v=>v.playbackRate=S.rate)};
$('fps').onchange=e=>S.fps=+e.target.value;
$('loop').onclick=()=>{S.loop=!S.loop;$('loop').setAttribute('aria-pressed',S.loop)};
$('off').addEventListener('input',e=>{pause();setOffset(+e.target.value)});
$('offM').onclick=()=>{pause();setOffset(S.offset-1/S.fps)};
$('offP').onclick=()=>{pause();setOffset(S.offset+1/S.fps)};
$('offZero').onclick=()=>{pause();setOffset(0)};
$('offMark').onclick=()=>{pause();if(loaded('A')&&loaded('B')){const a=vids.A.currentTime,b=vids.B.currentTime;S.t=a;setOffset(b-a)}};
$('swap').onclick=()=>{
  pause();const fa=S.urls.A,fb=S.urls.B,na=S.names.A,nb=S.names.B,t=S.t+S.offset;
  S.urls={A:fb,B:fa};S.names={A:nb,B:na};
  ['A','B'].forEach(k=>{const v=vids[k];if(S.urls[k]){v.src=S.urls[k];v.load();$('name'+k).textContent=S.names[k];$('drop'+k).hidden=true}else{v.removeAttribute('src');v.load();$('name'+k).textContent='No video loaded';$('drop'+k).hidden=false;$('out'+k).hidden=true}});
  const za=Z.A;Z.A=Z.B;Z.B=za;applyZoom('A');applyZoom('B');
  S.offset=-S.offset;$('off').value=S.offset;S.t=t;ui();
};

/* ---------- Layout: split, stack, height ---------- */
const bay=$('bay'),divider=$('divider');
const isOne=()=>P.stacked||window.innerWidth<720;
function fitHeight(){
  const w=bay.clientWidth;
  if(document.fullscreenElement===bay){const rows=isOne()?2:1;return Math.max(160,(window.innerHeight-20-(isOne()?10:0))/rows-82)}
  const colW=isOne()?w:Math.max(P.split,100-P.split)/100*(w-10);
  return Math.round(Math.max(160,Math.min(colW*9/16,window.innerHeight*(isOne()?0.42:0.7))));
}
function layout(){
  const one=isOne();
  bay.classList.toggle('one',one);divider.hidden=one;
  bay.style.gridTemplateColumns=one?'minmax(0,1fr)':'minmax(0,'+P.split+'fr) 10px minmax(0,'+(100-P.split)+'fr)';
  const h=(P.height&&document.fullscreenElement!==bay)?P.height:fitHeight();
  bay.style.setProperty('--sh',h+'px');
  $('height').value=Math.round(h);
  $('hVal').textContent=P.height?Math.round(h)+' px':'Fit';
  $('fit').setAttribute('aria-pressed',!P.height);
  $('layout').setAttribute('aria-pressed',P.stacked);
  $('split50').disabled=one;
  $('link').setAttribute('aria-pressed',P.link);
  applyZoom('A');applyZoom('B');
}
$('layout').onclick=()=>{P.stacked=!P.stacked;savePrefs();layout()};
$('split50').onclick=()=>{P.split=50;savePrefs();layout()};
$('fit').onclick=()=>{P.height=null;savePrefs();layout()};
$('height').addEventListener('input',e=>{P.height=+e.target.value;layout()});
$('height').addEventListener('change',savePrefs);
window.addEventListener('resize',layout);
document.addEventListener('fullscreenchange',layout);
$('full').onclick=()=>{try{if(document.fullscreenElement)document.exitFullscreen();else bay.requestFullscreen().catch(()=>{})}catch(e){}};

function dragHandle(el,onMove){
  el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);el.classList.add('drag');
    const mv=ev=>onMove(ev,e);const up=()=>{el.classList.remove('drag');el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);savePrefs()};
    el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)});
}
dragHandle(divider,ev=>{const r=bay.getBoundingClientRect();P.split=Math.round(Math.min(85,Math.max(15,(ev.clientX-r.left)/r.width*100))*10)/10;layout()});
divider.addEventListener('dblclick',()=>{P.split=50;savePrefs();layout()});
divider.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();P.split=Math.min(85,Math.max(15,P.split+(e.key==='ArrowLeft'?-2:2)));savePrefs();layout()}});
const grip=$('grip');let gripStart=0;
grip.addEventListener('pointerdown',()=>{gripStart=parseFloat(getComputedStyle(bay).getPropertyValue('--sh'))||320});
dragHandle(grip,(ev,down)=>{P.height=Math.round(Math.min(1400,Math.max(160,gripStart+ev.clientY-down.clientY)));layout()});
grip.addEventListener('dblclick',()=>{P.height=null;savePrefs();layout()});
grip.addEventListener('keydown',e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();e.stopPropagation();const cur=parseFloat(getComputedStyle(bay).getPropertyValue('--sh'))||320;P.height=Math.min(1400,Math.max(160,cur+(e.key==='ArrowUp'?-20:20)));savePrefs();layout()}});

/* ---------- Zoom and pan ---------- */
// Pan offsets are stored as fractions of the panel size, so linked panels of different sizes stay on the same spot.
const Z={A:{s:1,x:0,y:0},B:{s:1,x:0,y:0}};
const ZMAX=8;
function clampZ(z){z.s=Math.min(ZMAX,Math.max(1,z.s));z.x=Math.min(0,Math.max(1-z.s,z.x));z.y=Math.min(0,Math.max(1-z.s,z.y))}
function applyZoom(k){
  const z=Z[k],scr=$('scr'+k);clampZ(z);
  const w=scr.clientWidth,h=scr.clientHeight;
  vids[k].style.transform=z.s===1?'':'translate('+(z.x*w)+'px,'+(z.y*h)+'px) scale('+z.s+')';
  const pct=Math.round(z.s*100)+'%';
  $('zr'+k).textContent=pct;$('zb'+k).textContent=pct;$('zb'+k).hidden=z.s===1;
  scr.classList.toggle('zoomed',z.s>1);
}
const targets=k=>P.link?['A','B']:[k];
function zoomAt(k,factor,u,v){
  targets(k).forEach(t=>{const z=Z[t],ns=Math.min(ZMAX,Math.max(1,z.s*factor)),r=ns/z.s;
    z.x=u-(u-z.x)*r;z.y=v-(v-z.y)*r;z.s=ns;applyZoom(t)});
}
function panBy(k,du,dv){targets(k).forEach(t=>{Z[t].x+=du;Z[t].y+=dv;applyZoom(t)})}
function resetZoom(k){(k?targets(k):['A','B']).forEach(t=>{Z[t]={s:1,x:0,y:0};applyZoom(t)})}

['A','B'].forEach(k=>{
  const scr=$('scr'+k);
  $('zi'+k).onclick=()=>zoomAt(k,1.25,.5,.5);
  $('zo'+k).onclick=()=>zoomAt(k,1/1.25,.5,.5);
  $('zr'+k).onclick=()=>resetZoom(k);
  scr.addEventListener('wheel',e=>{
    if(!loaded(k))return;e.preventDefault();
    const r=scr.getBoundingClientRect();
    zoomAt(k,Math.exp(-e.deltaY*(e.deltaMode===1?0.05:0.0015)),(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);
  },{passive:false});
  scr.addEventListener('dblclick',e=>{if(loaded(k)&&e.target.tagName==='VIDEO')resetZoom(k)});
  const pts=new Map();let last=null;
  scr.addEventListener('pointerdown',e=>{
    if(!loaded(k)||e.target.closest('.drop'))return;
    scr.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});last=null;
    if(Z[k].s>1)scr.classList.add('panning');
  });
  scr.addEventListener('pointermove',e=>{
    if(!pts.has(e.pointerId))return;
    const prev=pts.get(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const r=scr.getBoundingClientRect();
    if(pts.size===2){
      const [p1,p2]=[...pts.values()];const d=Math.hypot(p1.x-p2.x,p1.y-p2.y);
      const mx=((p1.x+p2.x)/2-r.left)/r.width,my=((p1.y+p2.y)/2-r.top)/r.height;
      if(last){zoomAt(k,d/last.d,mx,my);panBy(k,mx-last.mx,my-last.my)}
      last={d,mx,my};
    }else if(pts.size===1&&Z[k].s>1){panBy(k,(e.clientX-prev.x)/r.width,(e.clientY-prev.y)/r.height)}
  });
  const end=e=>{pts.delete(e.pointerId);last=null;if(!pts.size)scr.classList.remove('panning')};
  scr.addEventListener('pointerup',end);scr.addEventListener('pointercancel',end);
});
$('link').onclick=()=>{P.link=!P.link;savePrefs();if(P.link){Z.B={...Z.A};applyZoom('B')}layout()};
$('zReset').onclick=()=>resetZoom();

/* ---------- Keyboard ---------- */
document.addEventListener('keydown',e=>{
  if(!$('sheet').hidden){if(e.key==='Escape')$('sheet').hidden=true;return}
  if(e.target.tagName==='SELECT'||(e.target.tagName==='INPUT'&&e.target.type!=='range'))return;
  if(e.key===' '){e.preventDefault();S.playing?pause():play()}
  else if(e.key===','){e.preventDefault();step(-1)}else if(e.key==='.'){e.preventDefault();step(1)}
  else if(e.key==='ArrowLeft'&&e.target.type!=='range'){e.preventDefault();pause();seek(S.t-1)}
  else if(e.key==='ArrowRight'&&e.target.type!=='range'){e.preventDefault();pause();seek(S.t+1)}
  else if(e.key==='+'||e.key==='='){e.preventDefault();P.link?zoomAt('A',1.25,.5,.5):['A','B'].forEach(k=>zoomAt(k,1.25,.5,.5))}
  else if(e.key==='-'||e.key==='_'){e.preventDefault();P.link?zoomAt('A',1/1.25,.5,.5):['A','B'].forEach(k=>zoomAt(k,1/1.25,.5,.5))}
  else if(e.key==='0'){e.preventDefault();resetZoom()}
});

layout();ui();
})();
