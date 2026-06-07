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

/* ---------- streaming agent log ---------- */
(function agentLog(){
  const log=document.getElementById('log'); if(!log) return;
  const script=[
    ['think','goal received: <b>push the red block into the left zone</b>'],
    ['cmd','hwexec observe --cameras front,wrist'],
    ['out','→ joints[0.02,-1.11,1.34,0.08,-0.55] · block@(0.41,0.18) · zone@(0.22,0.20)'],
    ['think','block is right of the target. plan: approach from the right face, push left along x.'],
    ['cmd','hwexec move --pose approach --speed 0.3'],
    ['out','→ moving … contact in 3 waypoints'],
    ['ok','✓ reached approach pose · gripper closed'],
    ['cmd','hwexec move --delta x=-0.19 --speed 0.25'],
    ['out','→ pushing … block displacement 0.17m'],
    ['cmd','hwexec observe --verify zone=left'],
    ['out','→ block@(0.23,0.20) · inside zone bounds'],
    ['ok','✓ verified: block in left zone · run complete (7/7)'],
    ['think','logging trajectory → execution feeds the data flywheel.'],
  ];
  let i=0,ln=1;
  function add(){
    const [k,txt]=script[i%script.length];
    const row=document.createElement('div'); row.className='ln';
    const body=({
      think:`<span class="think"><span class="k">think</span> ${txt}</span>`,
      cmd:`<span class="cmd"><span class="p">$</span> ${txt}</span>`,
      out:`<span class="out">${txt}</span>`,
      ok:`<span class="ok">${txt}</span>`
    })[k];
    row.innerHTML=`<span class="gut">${String(ln).padStart(2,'0')}</span>${body}`;
    log.appendChild(row); log.scrollTop=log.scrollHeight; ln++; i++;
    while(log.children.length>40) log.removeChild(log.firstChild);
  }
  for(let j=0;j<7;j++) add();
  setInterval(add,1500);
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
