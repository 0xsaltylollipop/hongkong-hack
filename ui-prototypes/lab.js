/* TENDON control plane — shared "live" interactions for the prototypes.
   Mock motion to make the static views feel alive, plus the real camera
   wiring hook the backend will drive. */

/* ---------- background glyph texture ---------- */
(function texture(){
  const host=document.getElementById('texture'); if(!host) return;
  const glyphs=['⊥','T','L','⌐','¬','::','—','│','▦','◦','+','/','▚','·','∟'];
  const n=Math.min(140,Math.floor(window.innerWidth*window.innerHeight/9500));
  let html='';
  for(let i=0;i<n;i++){
    const x=(Math.random()*100).toFixed(2), y=(Math.random()*100).toFixed(2);
    const g=glyphs[(Math.random()*glyphs.length)|0];
    const s=(9+Math.random()*7).toFixed(0);
    const o=(0.03+Math.random()*0.06).toFixed(3);
    html+=`<span style="left:${x}%;top:${y}%;font-size:${s}px;opacity:${o}">${g}</span>`;
  }
  host.innerHTML=html;
})();

/* ---------- live clock ---------- */
function tick(){
  const t=new Date();
  const s=[t.getHours(),t.getMinutes(),t.getSeconds()].map(n=>String(n).padStart(2,'0')).join(':')
        +'.'+String(t.getMilliseconds()).padStart(3,'0');
  document.querySelectorAll('[data-clock]').forEach(e=>e.textContent=s);
}
setInterval(tick,71); tick();

/* ---------- CAMERA WIRING (the real hook) -------------------------------
   Each camera slot is  <div class="cam" data-cam="front">…<video class="vid">…
   Backend / integration code calls:
     TENDON.wireCamera('front', 'https://…/stream.m3u8')     // HLS / WebRTC src
     TENDON.wireCameraMJPEG('front', 'http://arm-01:8080/?action=stream')
     TENDON.wireCameraStream('front', mediaStream)           // WebRTC MediaStream
   Until wired, the stylized arm placeholder shows.
------------------------------------------------------------------------- */
window.TENDON=window.TENDON||{};
function camEl(id){return document.querySelector(`.cam[data-cam="${id}"]`);}
TENDON.wireCamera=function(id,url){
  const cam=camEl(id); if(!cam) return;
  let v=cam.querySelector('video.vid'); if(!v){v=document.createElement('video');v.className='vid';v.autoplay=v.muted=v.playsInline=true;cam.appendChild(v);}
  v.src=url; cam.classList.add('streaming');
};
TENDON.wireCameraMJPEG=function(id,url){
  const cam=camEl(id); if(!cam) return;
  let img=cam.querySelector('img.vid'); if(!img){img=document.createElement('img');img.className='vid';cam.appendChild(img);}
  img.src=url; cam.classList.add('streaming');
};
TENDON.wireCameraStream=function(id,stream){
  const cam=camEl(id); if(!cam) return;
  let v=cam.querySelector('video.vid'); if(!v){v=document.createElement('video');v.className='vid';v.autoplay=v.muted=v.playsInline=true;cam.appendChild(v);}
  v.srcObject=stream; cam.classList.add('streaming');
};

/* ---------- auto-connect cameras (no-op if no backend) ---------- */
(async function connectCameras(){
  try{
    const r=await fetch('/api/cameras'); if(!r.ok) return;
    const cams=await r.json();
    Object.entries(cams||{}).forEach(([id,url])=>{ if(url) TENDON.wireCameraMJPEG(id,url); });
  }catch(e){/* no backend → keep placeholders */}
})();

/* ---------- goal → draft → RUN (agent runs hands-off) ---------- */
(function runUI(){
  const btn=document.getElementById('runbtn');
  const log=document.getElementById('log');
  const goalEl=document.getElementById('goal');
  const stepsEl=document.getElementById('steps');
  const statusEl=document.getElementById('runstatus');
  if(!btn||!log||!stepsEl) return;            /* only on run-detail */
  const TOTAL=7; let running=false, es=null;

  function steps(done,active){
    let h='';
    for(let i=0;i<TOTAL;i++) h+=`<span class="s ${i<done?'done':(i===done&&active?'now':'')}"></span>`;
    const note = active?`step ${Math.min(done+1,TOTAL)} / ${TOTAL}` : (done>=TOTAL?'complete':'draft · ready to run');
    stepsEl.innerHTML=h+`<span class="mono" style="font-size:11px;color:var(--ink-2);margin-left:6px">${note}</span>`;
  }
  function status(t,c){ if(statusEl){statusEl.textContent=t;statusEl.style.color=c;} }
  function line(k,txt,ln){
    const row=document.createElement('div'); row.className='ln';
    const b=({think:`<span class="think"><span class="k">think</span> ${txt}</span>`,cmd:`<span class="cmd"><span class="p">$</span> ${txt}</span>`,out:`<span class="out">${txt}</span>`,ok:`<span class="ok">${txt}</span>`,err:`<span class="err">${txt}</span>`})[k]||`<span class="out">${txt}</span>`;
    row.innerHTML=`<span class="gut">${String(ln).padStart(2,'0')}</span>${b}`;
    log.appendChild(row); log.scrollTop=log.scrollHeight;
    while(log.children.length>60) log.removeChild(log.firstChild);
  }
  function finish(){ running=false; btn.classList.remove('running'); btn.disabled=false; btn.querySelector('.lbl').textContent='Run again'; status('complete','var(--ink)'); steps(TOTAL,false); if(es){es.close();es=null;} }
  steps(0,false);

  function mockRun(goal){
    const s=[
      ['think',`goal received: <b>${goal}</b>`],
      ['cmd','hwexec observe --cameras front,side,wrist'],
      ['out','→ joints[0.02,-1.11,1.34,0.08,-0.55] · block@(0.41,0.18) · zone@(0.22,0.20)'],
      ['think','I can do this with direct control. plan: approach from the right, push left along x.'],
      ['cmd','hwexec move --pose approach --speed 0.3'],
      ['ok','✓ reached approach pose · gripper closed'],
      ['cmd','hwexec move --delta x=-0.19 --speed 0.25'],
      ['out','→ pushing … block displacement 0.17m'],
      ['think','target needs a learned skill next — invoking the trained ACT policy.'],
      ['cmd','hwexec run-policy sort'],
      ['out','→ ACT policy executing on real arm …'],
      ['cmd','hwexec observe --verify'],
      ['ok','✓ verified from camera · task complete'],
    ];
    let i=0,ln=1,done=0;
    (function nxt(){
      if(i>=s.length){ finish(); return; }
      const [k,t]=s[i++]; line(k,t,ln++);
      if(k==='cmd'||k==='ok'){ done=Math.min(TOTAL,done+1); steps(done,true); }
      setTimeout(nxt, 850+Math.random()*650);
    })();
  }

  async function backendRun(goal){
    try{
      const r=await fetch('/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({goal})});
      if(!r.ok) throw 0;
      es=new EventSource('/api/events'); let ln=1;
      es.onmessage=(e)=>{ try{
        const d=JSON.parse(e.data);
        if(d.kind==='log') line(d.type,d.text,ln++);
        else if(d.kind==='run'){ steps(d.step||0, d.status!=='complete'); if(d.status==='complete') finish(); }
      }catch(_){} };
      return true;
    }catch(e){ return false; }
  }

  btn.addEventListener('click', async ()=>{
    if(running) return; running=true;
    const goal=(goalEl&&goalEl.value.trim())||'run the demo';
    log.innerHTML=''; btn.classList.add('running'); btn.disabled=true;
    btn.querySelector('.lbl').textContent='Running…';
    status('running','var(--live)'); steps(0,true);
    const ok=await backendRun(goal);
    if(!ok) mockRun(goal);
  });
  if(goalEl) goalEl.addEventListener('input',()=>{ if(!running) status('draft','var(--roadmap)'); });
})();

/* ---------- telemetry + counters ---------- */
(function telemetry(){
  document.querySelectorAll('[data-spark]').forEach(sp=>{
    let html=''; for(let i=0;i<10;i++) html+='<i style="height:40%"></i>'; sp.innerHTML=html;
  });
  function jit(){
    document.querySelectorAll('[data-spark] i').forEach(b=>b.style.height=(20+Math.random()*78|0)+'%');
    const lat=document.querySelector('[data-latency]'); if(lat) lat.textContent=(34+Math.random()*16|0);
    const rate=document.querySelector('[data-rate]'); if(rate) rate.textContent=(92+Math.random()*5).toFixed(1);
  }
  jit(); setInterval(jit,900);
})();
(function flywheel(){
  document.querySelectorAll('[data-count]').forEach(c=>{
    let v=parseInt(c.dataset.count,10)||1248; c.textContent=v.toLocaleString();
    setInterval(()=>{v+=(Math.random()<0.6?1:0);c.textContent=v.toLocaleString();},1400);
  });
})();
