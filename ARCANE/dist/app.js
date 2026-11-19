import {drawCrystalDetail} from './crystal-detail.mjs';
import {BlackHoleView} from './black-hole-view.mjs';
import {drawUltra} from './ultra-view.mjs';
import {FrameClock} from './frame-clock.mjs';
import {CameraFilters} from './camera-filters.mjs';
import {TrackingLoop} from './tracking-loop.mjs';
import {trackingFrame,resultTimeout} from './tracking-frame.mjs';
import {effectCache,GLOWS} from './effect-cache.mjs';
import {Cinematic,effectRegion} from './cinematic.mjs';
import {graphicsFor} from './graphics.mjs';
import {HeartView} from './heart-view.mjs';
import {createDissolve,createVertexDissolve,fragmentPose} from './dissolve.mjs';
import {icon} from './icons.mjs';
import {eulerQ,slerpQ,matrixQ} from './orientation.mjs';
import {Detector} from './detector.mjs';
import {SpellState,HandRouter} from './logic.mjs';
import {shapes,interpolate,interpolateInto,solids,vertexPoints,deformVertex} from './geometry.mjs';
const domCache=new Map();
const $=id=>{if(!domCache.has(id))domCache.set(id,document.getElementById(id));return domCache.get(id)},canvas=$('scene'),video=$('video'),feedbackCanvas=$('feedback'),feedback=feedbackCanvas.getContext('2d'),spell=new SpellState();
let ctx=canvas.getContext('2d');
const cinematic=new Cinematic();
const cameraFilters=new CameraFilters();try{const settings=JSON.parse(localStorage.getItem('arcane-camera-filters')||'null');if(settings){cameraFilters.enabled=settings.enabled!==false;for(const key of ['vision','glitch','heart'])if(typeof settings[key]==='boolean')cameraFilters.options[key]=settings[key]}}catch{}
let quality='balanced';try{const saved=localStorage.getItem('arcane-quality');if(['high','balanced','low'].includes(saved))quality=saved}catch{}
let graphics=graphicsFor(quality);document.body.dataset.quality=quality;
const blackHoleView=new BlackHoleView();
const heartView=new HeartView(graphics.heart);heartView.setQuality(quality==='low'?'low':'high',graphics.heart);
let heartWasActive=false;
let energyView=null,displayQ=eulerQ(.45,.35),rotationMatrix=matrixQ(displayQ),handUI={},uiAt=0,lessonStep=1,lessonDismissed=false;
let model,stream,running=false,loading=false,demo=false,raf=0,lastVideo=-1,lastDetect=0,lastFrame=0,fpsStart=0,frames=0,W=1000,H=500,anchor=null,opacity=0,scale=1,results=null;
let trackingLatency=0,trackingMessage='';
let dissolution=null,lastObject=null,demoVisible=true;
let summonAt=-Infinity,previousOn=false,inFlight=false,session=0,lastResultAt=0,renderCount=0,renderStart=0,lastHud=0,detectInterval=50,renderCost=0;
const trackingLoop=new TrackingLoop(trackCamera,()=>detectInterval);
let router=new HandRouter(),rotation=0,compression=0,currentShape='cube',shapeFrom=shapes.cube,shapeAt=-Infinity,mesh=shapes.cube,demoEpoch=0;
const edges=[[0,1],[1,3],[3,2],[2,0],[4,5],[5,7],[7,6],[6,4],[0,4],[1,5],[2,6],[3,7]];
const bones=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
function resize(){const r=canvas.getBoundingClientRect();W=r.width;H=r.height;const d=graphics.canvasRatio;canvas.width=Math.round(W*d);canvas.height=Math.round(H*d);ctx.setTransform(d,0,0,d,0,0);feedbackCanvas.width=canvas.width;feedbackCanvas.height=canvas.height;feedback.setTransform(d,0,0,d,0,0);energyView?.resize(W,H)}new ResizeObserver(resize).observe(canvas);
function fit(){const s=Math.min(W/video.videoWidth,H/video.videoHeight);return {w:video.videoWidth*s,h:video.videoHeight*s,x:(W-video.videoWidth*s)/2,y:(H-video.videoHeight*s)/2}}
function map(p,f){return {x:f.x+(1-p.x)*f.w,y:f.y+p.y*f.h}}
function line(a,b,color,width=1){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
function skeleton(lm,f,hand,uncertain=false){ctx.save();if(uncertain){ctx.globalAlpha=.35;ctx.setLineDash([3,5])}const pts=lm.map(p=>map(p,f));for(const [a,b]of bones)line(pts[a],pts[b],hand==='Right'?'#ff61c965':'#61e8ff65',1.2);for(const i of [0,4,12,16,20]){ctx.beginPath();ctx.arc(pts[i].x,pts[i].y,i===8?4:2,0,Math.PI*2);ctx.fillStyle='#b4f5ff';ctx.fill()}ctx.restore()}
let ca=1,sa=0,cb=1,sb=0;
function project(x,y,z,r,t,cx,cy,m=rotationMatrix){const X=m[0]*x-m[1]*y+m[2]*z,Y=m[3]*x-m[4]*y+m[5]*z,Z=m[6]*x-m[7]*y+m[8]*z,D=H/(2*Math.tan(35*Math.PI/360)),perspective=D/Math.max(1,D-Z*r);return {x:W/2+(cx-W/2+X*r)*perspective,y:H/2-(H/2-cy+Y*r)*perspective,z:Z}}
const glitchGlyphs='01∑∆∫π∞∇λθ⊗φ∂Ψ/[]{}#%_<>?';
const glitchWords=['CHROMA.FIELD','VECTOR_FIELD','REALITY.ERROR','SPELL_COMPILED','R³ / UNDEFINED','MATRIX.OVERFLOW','GEOMETRY.NULL','∑ ENERGY_SYNC','SPACE.FRACTURE','FORM.EXISTS'];
let glitchTick=-1,glitchLabels=[],glitchPositionTick=-1,glitchOffsets=[];
function drawGlitchText(t,cx,r,cy){
 if(!graphics.glitch)return;
 const tick=Math.floor(t*18);
 if(tick!==glitchTick){
  glitchTick=tick;
  glitchLabels=Array.from({length:3},()=>{
   const base=glitchWords[Math.floor(Math.random()*glitchWords.length)];
   return [...base].map(c=>Math.random()<.4?glitchGlyphs[Math.floor(Math.random()*glitchGlyphs.length)]:c).join('');
  });
 }
 const positionTick=Math.floor(t*9);
 if(positionTick!==glitchPositionTick){
  glitchPositionTick=positionTick;
  const phase=Math.random()*Math.PI*2;
  glitchOffsets=Array.from({length:3},(_,i)=>{
   const angle=phase+i*Math.PI*2/3+(Math.random()-.5)*.55;
   const radius=1.25+Math.random()*.65;
   return {x:Math.cos(angle)*radius,y:Math.sin(angle)*radius};
  });
 }
 ctx.save();ctx.shadowBlur=0;
 glitchLabels.slice(0,graphics.glitch).forEach((label,i)=>{
  const offset=glitchOffsets[i],tear=(tick+i*3)%11<2;
  ctx.font=`${i===2?9:10}px monospace`;
  const width=ctx.measureText(label).width;
  const x=Math.max(8,Math.min(W-width-8,cx+offset.x*r-(offset.x<0?width:0)));
  const y=Math.max(14,Math.min(H-12,cy+offset.y*r));
  const dx=tear?((tick%5)-2)*2:0;
  ctx.font=`${i===2?9:10}px monospace`;
  if(tear){ctx.fillStyle='#ff42bd88';ctx.fillText(label,x-2,y+1);ctx.fillStyle='#61e8ff88';ctx.fillText(label,x+2,y-1)}
  ctx.fillStyle=tear?'#fce5ffcc':i%2?'#ff75cd99':'#85ecff99';ctx.fillText(label,x+dx,y);
 });ctx.restore();
}
let renderStyle='facets';
function facets(t,cx,cy,r,alpha){
 if(renderStyle!=='facets')return;
 const solid=solids[currentShape];
 const points=solid.vertices.map(p=>project(...p,r*.6,t,cx,cy));
 const ordered=solid.triangles.map((indices,i)=>({indices,i,z:indices.reduce((z,k)=>z+points[k].z,0)/3})).sort((a,b)=>a.z-b.z);
 ctx.save();ctx.shadowBlur=0;ctx.globalCompositeOperation='source-over';
 for(const face of ordered){const n=solid.normals[face.i],m=rotationMatrix,nx=m[0]*n[0]-m[1]*n[1]+m[2]*n[2],ny=m[3]*n[0]-m[4]*n[1]+m[5]*n[2],nz=m[6]*n[0]-m[7]*n[1]+m[8]*n[2];
  const light=Math.max(0,nx*-.45+ny*.6+nz*.65);
  ctx.globalAlpha=alpha*(nz>0?.20+light*.32:.035);
  ctx.fillStyle=nx<0?'#e346ab':'#46cbe7';
  ctx.beginPath();face.indices.forEach((k,i)=>i?ctx.lineTo(points[k].x,points[k].y):ctx.moveTo(points[k].x,points[k].y));ctx.closePath();ctx.fill();
 }ctx.restore();
}
function cube(t,pt,r,alpha,formation=1){const cx=pt.x,cy=pt.y-r*1.65-25;ctx.save();ctx.globalAlpha=alpha;ctx.globalCompositeOperation='lighter';
effectCache.draw(ctx,'cube',cx,cy,r*2.8,GLOWS.cube);
ctx.shadowColor='#8b8dff';ctx.shadowBlur=graphics.glow;
const shrink=1-compression*.84;
const morph=smooth((t*1000-shapeAt)/700);
mesh=morph>=1?shapes[currentShape]:interpolateInto(shapeFrom,shapes[currentShape],morph,morphBuffer);
const a=rotation+.35,b=.45+Math.sin(rotation*.5)*.3;ca=Math.cos(a);sa=Math.sin(a);cb=Math.cos(b);sb=Math.sin(b);
if(morph>=1&&compression<.1)facets(t,cx,cy,r,alpha);
ctx.beginPath();
mesh.forEach((segment,i)=>{
 const form=Math.max(0,Math.min(1,formation*1.5-i/mesh.length*.5));
 if(form<=0)return;
 const drift=compression*.24,angle=i*2.399+t*1.2;
 const dx=Math.cos(angle)*drift,dy=Math.sin(angle)*drift,dz=Math.sin(i*1.7)*drift;
 const [a,b]=segment.map(p=>project(p[0]*shrink+dx,p[1]*shrink+dy,p[2]*shrink+dz,r*.6,t,cx,cy));
 ctx.globalAlpha=alpha*(compression>.05?.55:1);
 ctx.moveTo(a.x,a.y);ctx.lineTo(a.x+(b.x-a.x)*form,a.y+(b.y-a.y)*form);
 if(compression>.05&&i%5===0){ctx.fillStyle='#bdffff';ctx.fillRect(a.x-1,a.y-1,2,2)}
});const chroma=ctx.createLinearGradient(cx-r,cy-r*.6,cx+r,cy+r*.6);chroma.addColorStop(0,'#ff63cb');chroma.addColorStop(.45,'#efc6ff');chroma.addColorStop(1,'#60eaff');ctx.strokeStyle=chroma;ctx.lineWidth=currentShape==='sphere'?.8:1.2;if(renderStyle!=='nodes')ctx.stroke();ctx.globalAlpha=alpha;ctx.shadowBlur=0;
if(renderStyle!=='wire'){
 const points=renderStyle==='nodes'?vertexPoints(mesh,currentShape):solids[currentShape].vertices;
 if(renderStyle==='nodes'||morph>=1&&compression<.05){ctx.fillStyle='#f3e7ff';points.forEach((p,i)=>{const a=renderStyle==='nodes'?deformVertex(p,i,compression,t):p,v=project(...a,r*.6,t,cx,cy),size=renderStyle==='nodes'?4.8:2.8;ctx.fillRect(v.x-size/2,v.y-size/2,size,size)})}
}
if(compression>.01){const core=ctx.createRadialGradient(cx,cy,0,cx,cy,r*.45);core.addColorStop(0,`rgba(255,218,246,${compression*.8})`);core.addColorStop(.25,`rgba(255,66,189,${compression*.5})`);core.addColorStop(1,'#21bfff00');ctx.fillStyle=core;ctx.fillRect(cx-r*.45,cy-r*.45,r*.9,r*.9)}
ctx.beginPath();ctx.moveTo(cx-r*1.12,cy+r*.98);ctx.lineTo(cx-r*.97,cy+r*.98);ctx.lineTo(cx-r*.97,cy+r*1.12);ctx.moveTo(cx+r*1.12,cy-r*.98);ctx.lineTo(cx+r*.97,cy-r*.98);ctx.lineTo(cx+r*.97,cy-r*1.12);ctx.strokeStyle='#b39bd650';ctx.lineWidth=.7;ctx.stroke();
drawGlitchText(t,cx,r,cy);ctx.restore()}
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
function magic(t,pt,r,age,alpha){
 if(quality==='low')return;const fade=1-smooth((age-.7)/.9);if(fade<.001)return;
 const cx=pt.x,cy=pt.y-r*1.65-25,arrive=smooth(age/1.1);
 ctx.save();ctx.globalAlpha=alpha*fade;ctx.shadowBlur=0;
 // Drafting scaffold and converging vertices, with no orbit or fingertip tether.
 ctx.beginPath();const corners=Array.from({length:8},(_,i)=>project(i&1?1.3:-1.3,i&2?1.3:-1.3,i&4?1.3:-1.3,r*.6,t,cx,cy));
 for(const[a,b]of edges){ctx.moveTo(corners[a].x,corners[a].y);ctx.lineTo(corners[b].x,corners[b].y)}ctx.strokeStyle='#b599d95c';ctx.lineWidth=.7;ctx.setLineDash([3,7]);ctx.stroke();ctx.setLineDash([]);
 const vertices=solids[currentShape].vertices;
 for(let i=0;i<24;i++){const target=project(...vertices[i%vertices.length],r*.6,t,cx,cy),a=i*2.399+t*.2,spread=r*1.8*(1-arrive),x=target.x+Math.cos(a)*spread,y=target.y+Math.sin(a)*spread;ctx.fillStyle=i%2?'#ff9cdb':'#9cefff';ctx.fillRect(x-1.2,y-1.2,2.4,2.4)}
 ctx.restore();
}
function setText(id,text){const el=$(id);if(el.textContent!==text)el.textContent=text}
function updateHUD(on){if(spell.blackHole.locked){$('status').classList.toggle('on',spell.blackHole.phase==='active');setText('cube-state',spell.blackHole.phase==='closing'?'Collapsing':'Black Hole');return;}setText('cube-state',spell.heart.locked?(spell.heart.phase==='burst'?'Heart / Release':'Heart / On'):dissolution?'Dissolving':on?(spell.compressed?'Compressed':({cube:'Cube',sphere:'Icosphere',pyramid:'Pyramid'})[spell.shape]+' / On'):'Off');$('status').classList.toggle('on',on||spell.heart.phase==='active');setText('size',`${scale.toFixed(2)}×`);for(const button of document.querySelectorAll('[data-shape]')){const selected=button.dataset.shape===spell.shape;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected))}}
function stop(){blackHoleView.reset();frameClock.reset();cameraFilters.reset();trackingLoop.stop();trackingLatency=0;trackingMessage='';heartView.reset();heartWasActive=false;dissolution=null;lastObject=null;demoVisible=true;document.body.classList.remove('is-playing');handUI={};displayQ=eulerQ(.45,.35);rotationMatrix=matrixQ(displayQ);lessonStep=1;$('quick-guide').hidden=true;feedback.clearRect(0,0,W,H);energyView?.clear();session++;running=false;demo=false;cancelAnimationFrame(raf);stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;results=null;lastVideo=-1;spell.reset();router=new HandRouter();rotation=0;compression=0;currentShape='cube';shapeFrom=mesh=shapes.cube;shapeAt=-Infinity;$('demo-controls').hidden=true;summonAt=-Infinity;previousOn=false;anchor=null;opacity=0;scale=1;$('right').textContent='รอมือขวา';$('left').textContent='รอมือซ้าย';$('intro').classList.remove('hidden');cameraLabel('เปิดกล้อง','camera');$('fps').textContent='พร้อมใช้งาน';$('hint').textContent='พร้อมร่ายมนตร์';updateHUD(false);ctx.clearRect(0,0,W,H)}
async function start(){if(loading)return;stop();loading=true;$('start').disabled=$('camera').disabled=$('demo').disabled=true;try{if(!isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('กรุณาเปิดผ่าน HTTPS และใช้เบราว์เซอร์ที่รองรับกล้อง');if(!model){$('message').textContent='กำลังโหลดระบบตรวจจับมือ…';model=await Detector.create()}$('message').textContent='กรุณาอนุญาตกล้อง…';stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:graphics.trackingWidth},height:{ideal:Math.round(graphics.trackingWidth*.75)},frameRate:{ideal:30,max:30}},audio:false});video.srcObject=stream;await video.play();running=true;trackingLoop.start();document.body.classList.add('is-playing');$('quick-guide').hidden=lessonDismissed;$('intro').classList.add('hidden');cameraLabel('ปิดกล้อง','close');fpsStart=renderStart=performance.now();frames=renderCount=0;lastResultAt=performance.now();lastFrame=0;raf=requestAnimationFrame(render);stream.getVideoTracks()[0].addEventListener('ended',()=>{stop();$('message').textContent='กล้องถูกตัดการเชื่อมต่อ กรุณาเปิดใหม่'})}catch(e){stop();$('message').textContent=({NotAllowedError:'ยังไม่ได้รับอนุญาตกล้อง กรุณาอนุญาตในเบราว์เซอร์แล้วลองใหม่',NotFoundError:'ไม่พบกล้องบนอุปกรณ์นี้ — ลองดูตัวอย่างเอฟเฟกต์ก่อนได้',NotReadableError:'กล้องอาจถูกใช้งานโดยแอปอื่น กรุณาปิดแอปนั้นแล้วลองใหม่'})[e.name]||`เริ่มระบบไม่ได้: ${e.message}`;$('start').textContent='ลองอีกครั้ง'}finally{loading=false;$('start').disabled=$('camera').disabled=$('demo').disabled=false}}
function trackCamera(now){if(!running||!model||video.readyState<2)return;
if(video.currentTime!==lastVideo&&!inFlight&&now-lastDetect>detectInterval){
 lastVideo=video.currentTime;lastDetect=now;inFlight=true;const capturedSession=session,start=performance.now();model.maxWidth=trackingLatency>180?Math.min(480,graphics.trackingWidth):graphics.trackingWidth;
 model.detect(video,now).then(result=>{
  const received=performance.now();if(!running||session!==capturedSession)return;const latency=received-start,frame=trackingFrame(latency),rawCount=result.landmarks?.length||0;trackingLatency=trackingLatency?trackingLatency*.7+latency*.3:latency;
  results=result;frames++;lastResultAt=received;
  const hands=router.update(frame.usable?results:{landmarks:[]},received,$('swap-hands').checked,video.videoWidth,video.videoHeight);handUI=router.feedback;uiAt=received;
  const qualityFor=side=>{const entry=hands[side],seen=router.feedback[side];if(!frame.commands)return{commands:false,position:false,reason:rawCount?'พบมือ · ภาพตรวจจับล่าช้า':'กำลังประมวลผลภาพมือ'};return entry?.quality||(seen?{commands:false,position:false,reason:seen.reason||'พบมือ · กำลังยืนยันข้างมือ'}:undefined)};
  spell.update(hands.Right?.lm,hands.Left?.lm,received,video.videoWidth,video.videoHeight,{leftWorld:hands.Left?.world,rightWorld:hands.Right?.world,rightRaw:hands.Right?.raw,leftRaw:hands.Left?.raw,rightQuality:qualityFor('Right'),leftQuality:qualityFor('Left'),rightPresent:!!router.feedback.Right||(rawCount>0&&(!frame.commands||!Object.keys(handUI).length))});
  trackingMessage=!frame.commands?'ผลตรวจจับล่าช้า · กำลังตามภาพให้ทัน':rawCount&&!Object.keys(handUI).length?'พบมือ · กำลังระบุข้างมือ':'';
  const unassigned=rawCount>0&&!Object.keys(handUI).length;
  setText('right',unassigned?'พบมือ · '+(!frame.commands?'ภาพตรวจจับล่าช้า':'กำลังระบุข้าง'):spell.rightText);setText('left',unassigned?'พบมือ · '+(!frame.commands?'ภาพตรวจจับล่าช้า':'กำลังระบุข้าง'):spell.leftText);
 }).catch(()=>{if(session===capturedSession&&running){model?.worker?.terminate();model?.model?.close();model=null;stop();$('message').textContent='ระบบตรวจจับหยุดตอบสนอง กรุณาเปิดกล้องใหม่'}}).finally(()=>{inFlight=false});
}
}
const frameClock=new FrameClock();
const morphBuffer=shapes.cube.map(line=>line.map(p=>[...p]));
function render(now){if(!running&&!demo)return;ensureEnergyView();const frameDt=frameClock.tick(now,graphics.fps);if(frameDt===null){raf=requestAnimationFrame(render);return;}feedback.clearRect(0,0,W,H);const frameStart=performance.now();const dt=frameDt;lastFrame=now;ctx.clearRect(0,0,W,H);cameraFilters.update(now,{shape:spell.shape,visible:demo?demoVisible:spell.on,heartPhase:spell.heart.phase,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches});let on=false,point=null;
if(demo){point={x:W*.5+Math.sin(now*.0004)*W*.025,y:H*.76};on=demoVisible;spell.on=on;spell.point=null;spell.rotation=(now-demoEpoch)*.0004;setText('right',({cube:'ลูกบาศก์',sphere:'ไอโคสเฟียร์',pyramid:'พีระมิด'})[spell.shape]);setText('left',spell.compressed?'บีบอัด':'หมุนอัตโนมัติ');setText('hint','โหมดตัวอย่าง')}
else if(running&&video.readyState>=2){const f=fit();cameraFilters.grade(ctx,video,f,W,H,now,{quality:quality==='low'?'low':'high',point:anchor,r:Math.min(W,H)*.2*scale,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches});

if(now-lastResultAt>resultTimeout(trackingLatency)){results=null;spell.update(null,null,now,video.videoWidth,video.videoHeight);trackingMessage=inFlight?'กำลังประมวลผลภาพมือ…':'กำลังค้นหามือ…';if(!inFlight){setText('right',spell.rightText);setText('left',spell.leftText)}}
if($('skeleton').checked&&now-uiAt<350)for(const [side,entry]of Object.entries(handUI))skeleton(entry.lm,f,side,entry.blocked);on=spell.on;if(spell.point)point=map(spell.point,f);setText('hint',trackingMessage||router.warning||spell.pending||(on?(spell.compressed?'ชู 1–3 นิ้วเพื่อประกอบใหม่':'ขวาเลือกทรง · ซ้ายควบคุม'):'ชู 1–3 นิ้วมือขวา'));}
if(spell.heart.locked){on=false;point=null;dissolution=null;lastObject=null;previousOn=false;opacity=0;energyView?.clear();heartWasActive=true}else if(heartWasActive){heartWasActive=false;spell.on=false;on=false;anchor=null;opacity=0;heartView.reset()}
if(spell.blackHole.locked){on=false;point=null;dissolution=null;lastObject=null;previousOn=false;opacity=0;energyView?.clear()}
if(spell.shape!==currentShape){shapeFrom=mesh.map(line=>line.map(p=>[...p]));currentShape=spell.shape;shapeAt=now}
displayQ=slerpQ(displayQ,spell.rotationQ||eulerQ(.45+Math.sin(spell.rotation*.5)*.3,spell.rotation+.35),1-Math.exp(-dt*10));rotationMatrix=matrixQ(displayQ);
rotation+=(spell.rotation-rotation)*(1-Math.exp(-dt*9));compression+=((spell.compressed?1:0)-compression)*(1-Math.exp(-dt*5));
scale+=(spell.target-scale)*(1-Math.exp(-dt*9));opacity+=((on?1:0)-opacity)*(1-Math.exp(-dt*10));if(point){if(!anchor||!on&&opacity<.02)anchor={...point};else{const a=1-Math.exp(-dt*16);anchor.x+=(point.x-anchor.x)*a;anchor.y+=(point.y-anchor.y)*a}}if(on&&!previousOn){summonAt=now;dissolution=null}if(!on&&previousOn&&lastObject){dissolution=(lastObject.style==='nodes'?createVertexDissolve:createDissolve)(lastObject.style==='nodes'?departureVertices(lastObject):departureSegments(lastObject),now,{count:graphics.fragments,width:W,height:H,alpha:lastObject.alpha,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches});energyView?.clear()}previousOn=on;
const age=(now-summonAt)/1000;
const morph=smooth((now-shapeAt)/700);mesh=morph>=1?shapes[currentShape]:interpolateInto(shapeFrom,shapes[currentShape],morph,morphBuffer);
if(on&&anchor&&opacity>.01){
 const r=Math.min(W,H)*.2*scale;
 const form=smooth((age-.25)/.85);
 if(form>.01){lastObject={style:renderStyle,shape:currentShape,alpha:opacity*form,radius:r*(.3+.7*form),x:anchor.x,y:anchor.y,time:now/1000,compression,mesh,matrix:rotationMatrix}}else lastObject=null;
 magic(now/1000,anchor,r,age,opacity);
 if(form>.001){
  if(graphics.webgl&&energyView?.healthy){try{energyView.render({W,H,point:anchor,r:r*(.3+.7*form),opacity:opacity*form,formation:form,compression,rotation,time:now/1000,mesh,shape:currentShape,morph,style:renderStyle,quaternion:displayQ});if(quality!=='low'){cinematic.begin(W,H,graphics.canvasRatio);cinematic.composite(feedback,energyView.canvas,{base:false,strength:.9,region:effectRegion(W,H,anchor.x,anchor.y-r*(.3+.7*form)*1.65-25,r*(.3+.7*form)*1.6)})}}catch{energyView.healthy=false;energyView.canvas.hidden=true;renderFallback(now/1000,anchor,r*(.3+.7*form),opacity*form,form)}drawGlitchText(now/1000,anchor.x,r,anchor.y-r*1.65-25)}
  else renderFallback(now/1000,anchor,r*(.3+.7*form),opacity*form,form);
 }
}else energyView?.clear();
if(on&&anchor&&opacity>.01){const f=smooth((age-.25)/.85),r=Math.min(W,H)*.2*scale*(.3+.7*f);drawCrystalDetail(feedback,{x:anchor.x,y:anchor.y-r*1.65-25,r,shape:currentShape,quaternion:displayQ,now,formation:f,compression,alpha:opacity*morph,quality,style:renderStyle,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches})}
if(quality!=='low'&&on&&anchor&&opacity>.01)drawExtreme(now,anchor,Math.min(W,H)*.2*scale,opacity);
if(quality==='high'&&on&&anchor&&opacity>.01)drawUltra(feedback,{W,H,now,x:anchor.x,y:anchor.y-Math.min(W,H)*.2*scale*1.65-25,r:Math.min(W,H)*.2*scale,alpha:opacity,formation:smooth((now-summonAt)/1800),compression,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches});
if(dissolution){drawDissolution(now);if(dissolution&&now-dissolution.at>=dissolution.duration){dissolution=null;lastObject=null}}
if(spell.heart.locked){renderHeart({now,W,H,phase:spell.heart.phase,at:spell.heart.at,releaseAt:spell.heart.releaseAt,quaternion:displayQ,scale,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches});setText('hint',spell.heart.phase==='burst'?'ปลดปล่อยละอองหัวใจ':'ค้างมินิฮาร์ท · มือซ้ายควบคุม')}
if(spell.blackHole.locked){const b=spell.blackHole,p=demo?{x:W*.5,y:H*.47}:map(b.point,fit()),radius=demo?Math.min(W,H)*.14:Math.max(25,Math.min(Math.min(W,H)*.23,b.gap*fit().w*.28));renderBlackHole({now,W,H,x:p.x,y:p.y,r:radius,phase:b.phase,at:b.at,exitAt:b.exitAt,quality,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches});setText('cube-state',b.phase==='closing'?'Collapsing':'Black Hole');setText('hint',b.phase==='closing'?'หลุมดำกำลังยุบตัว':'ประคองฝ่ามือเข้าหากัน · คลายท่าเพื่อสลาย');if(demo&&b.phase==='closing'&&now-b.exitAt>=1500){b.reset();blackHoleView.reset();demoVisible=false}}
if(running&&now-uiAt<350){drawHandFeedback(now);updateLesson()}
renderCount++;
if(now-lastHud>100){updateHUD(on);lastHud=now}
if(now-renderStart>1000){const seconds=(now-renderStart)/1000;setText('fps',`${Math.round(renderCount/seconds)} FPS · ${demo?'DEMO':Math.round(frames/seconds)+' TRACK/s'}${!demo&&!model?.worker?' · COMPAT':''}${graphics.webgl&&energyView?.healthy?' · 3D':' · LIGHT'} · ${graphics.label}`);detectInterval=Math.max(graphics.trackingMs,renderCost>20?100:0);frames=renderCount=0;renderStart=now}
renderCost=renderCost*.9+(performance.now()-frameStart)*.1;
raf=requestAnimationFrame(render)}
$('start').addEventListener('click',start);$('camera').addEventListener('click',()=>running||demo?stop():start());$('demo').addEventListener('click',()=>{stop();demo=true;document.body.classList.add('is-playing');demoEpoch=performance.now();$('demo-controls').hidden=false;$('intro').classList.add('hidden');cameraLabel('ออกจากตัวอย่าง','close');lastFrame=0;renderStart=performance.now();renderCount=0;raf=requestAnimationFrame(render)});window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden&&!loading&&(running||demo))stop()});

$('swap-hands').addEventListener('change',()=>{session++;spell.reset();router=new HandRouter();anchor=null;previousOn=false});
for(const button of document.querySelectorAll('[data-shape]'))button.addEventListener('click',()=>{if(!demo)return;demoVisible=true;spell.shape=button.dataset.shape;spell.compressed=false});
$('demo-compress').addEventListener('click',()=>{if(demo&&demoVisible)spell.compressed=true});
$('demo-rebuild').addEventListener('click',()=>{if(demo){demoVisible=true;spell.compressed=false}});



$('render-style').addEventListener('change',()=>{renderStyle=$('render-style').value});

let energyLoading=null,energyLoadFailed=false;
function ensureEnergyView(){
 if(!graphics.webgl||energyView||energyLoading||energyLoadFailed)return;
 energyLoading=import('./energy-view.mjs').then(({EnergyView})=>{energyView=new EnergyView($('stage'));energyView.setQuality(quality==='low'?'low':'high');energyView.resize(W,H);energyView.canvas.hidden=!graphics.webgl}).catch(()=>{energyLoadFailed=true}).finally(()=>{energyLoading=null});
}
$('quality').value=quality;
function applyQuality(){quality=$('quality').value;document.body.dataset.quality=quality;graphics=graphicsFor(quality);detectInterval=graphics.trackingMs;energyView?.setQuality(quality==='low'?'low':'high');if(energyView){energyView.clear();energyView.canvas.hidden=!graphics.webgl||!energyView.healthy}heartView.setQuality(quality==='low'?'low':'high',graphics.heart);if(dissolution)dissolution.fragments=dissolution.fragments.slice(0,graphics.fragments);resize();syncQualityCards();try{localStorage.setItem('arcane-quality',quality)}catch{}}
$('quality').addEventListener('change',applyQuality);syncQualityCards();wireRadioPicker('.quality-picker','[data-quality]',button=>{$('quality').value=button.dataset.quality;applyQuality()});wireRadioPicker('.style-picker','[data-style]',button=>{renderStyle=button.dataset.style;$('render-style').value=renderStyle;for(const el of document.querySelectorAll('[data-style]')){const selected=el===button;el.setAttribute('aria-checked',String(selected));el.tabIndex=selected?0:-1}});

const commandNames={heart:'นิ้วไขว้ · หลังมือ 3 วิ',cube:'ลูกบาศก์',sphere:'ไอโคสเฟียร์',pyramid:'พีระมิด',fist:'บีบอัด',open:'คลายมนตร์',scale:'ปรับขนาด',rotate:'หมุนฝ่ามือ'};
function drawHandFeedback(now){
 if(!handFeedbackEnabled)return;
 const f=fit();
 for(const side of ['Right','Left']){
  const entry=handUI[side];if(!entry)continue;
  const hold=side==='Right'&&spell.heart.phase==='arming'?{key:'heart',ready:false,progress:spell.heart.progress}:side==='Right'?spell.rightHold:spell.leftHold;
  const progress=entry.ready?(hold.key?hold.progress:0):entry.progress*.2;
  const label=entry.blocked?(entry.reason||'พัก · มือไม่ชัด'):!entry.ready?'กำลังระบุข้างมือ':hold.key&&!hold.ready?'ค้างท่า · '+(commandNames[hold.key]||'ยืนยัน'):side==='Right'?spell.rightText:spell.leftText;
  const p=map(entry.lm[0],f),text=(side==='Right'?'ขวา':'ซ้าย')+' · '+label;
  feedback.save();feedback.font='11px "Noto Sans Thai", sans-serif';const width=Math.min(W-16,Math.max(130,feedback.measureText(text).width+22)),height=34,x=Math.max(8,Math.min(W-width-8,p.x-width/2)),y=Math.max(48,Math.min(H-height-12,p.y+18));
  feedback.fillStyle='rgba(18,12,28,.88)';feedback.beginPath();feedback.roundRect(x,y,width,height,9);feedback.fill();feedback.fillStyle=entry.blocked?'#ad96bc':side==='Right'?'#ff9bda':'#9cefff';feedback.fillText(text,x+11,y+19);
  feedback.fillStyle='#ffffff12';feedback.fillRect(x+10,y+height-7,width-20,2);feedback.fillStyle=side==='Right'?'#ff42bd':'#61e8ff';feedback.fillRect(x+10,y+height-7,(width-20)*(hold.ready&&entry.ready?1:progress),2);feedback.restore();
 }
}
function updateLesson(){
 if(lessonDismissed)return;
 if(lessonStep===1&&spell.on)lessonStep=2;
 if(lessonStep===2&&spell.leftMode!=='idle')lessonStep=3;
 if(lessonStep===3&&spell.compressed)lessonStep=4;
 if(lessonStep===4&&!spell.compressed&&spell.on){lessonDismissed=true;$('quick-guide').hidden=true;return}
 const labels={1:'1 / 4 · ชูนิ้วชี้มือขวาค้าง เพื่อเสก',2:'2 / 4 · แบมือซ้าย แล้วค่อย ๆ เอียงฝ่ามือ',3:'3 / 4 · กำมือขวาค้าง เพื่อบีบอัด',4:'4 / 4 · ชูนิ้วชี้มือขวากลับ เพื่อประกอบใหม่'};setText('lesson',labels[lessonStep]);
}
$('dismiss-guide').addEventListener('click',()=>{lessonDismissed=true;$('quick-guide').hidden=true});

// One utility panel at a time; keyboard and touch share the same controls.
const panels=[...document.querySelectorAll('.popover')], backdrop=$('panel-backdrop');
function closePanels(restore=true){const opened=panels.find(p=>p.open);panels.forEach(p=>p.open=false);backdrop.hidden=true;document.body.classList.remove('panel-open');if(restore)opened?.querySelector('summary').focus()}
for(const panel of panels){panel.addEventListener('toggle',()=>{if(panel.open){panels.filter(p=>p!==panel).forEach(p=>p.open=false);backdrop.hidden=false;document.body.classList.add('panel-open')}else if(!panels.some(p=>p.open)){backdrop.hidden=true;document.body.classList.remove('panel-open')}});panel.querySelector('.close-panel').addEventListener('click',()=>closePanels())}
backdrop.addEventListener('click',()=>closePanels());
$('focus-view').addEventListener('click',()=>{const focused=document.body.classList.toggle('focus-mode');$('focus-view').setAttribute('aria-pressed',String(focused));$('focus-view').setAttribute('aria-label',focused?'คืนขนาดพื้นที่เล่น':'ขยายพื้นที่เล่น');$('focus-view').innerHTML=icon(focused?'collapse':'expand')+'<span class="focus-label">'+(focused?'ย่อ':'ขยาย')+'</span>';closePanels(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(panels.some(p=>p.open))closePanels();else if(document.body.classList.contains('focus-mode'))$('focus-view').click()}if(e.key==='Tab'&&document.body.classList.contains('panel-open')&&matchMedia('(max-width: 700px)').matches){const panel=panels.find(p=>p.open);if(!panel)return;const items=[...panel.querySelectorAll('button,select,input')].filter(el=>!el.disabled&&el.type!=='hidden'&&el.getClientRects().length),first=items[0],last=items.at(-1);if(e.shiftKey&&(document.activeElement===first||!panel.contains(document.activeElement))){e.preventDefault();last.focus()}else if(!e.shiftKey&&(document.activeElement===last||!panel.contains(document.activeElement))){e.preventDefault();first.focus()}}});

function cameraLabel(label,symbol){$('camera').innerHTML=icon(symbol)+'<span>'+label+'</span>'}

$('demo-dissolve').addEventListener('click',()=>{if(demo)demoVisible=false});
function drawDissolution(now){
 const field=dissolution,p=(now-field.at)/field.duration;if(p>=1)return;
 const high=quality!=='low',c=high?cinematic.begin(W,H,graphics.canvasRatio):feedback;c.save();c.globalCompositeOperation='lighter';c.lineWidth=high?1.6:1.15;
 for(const f of field.fragments){const pose=fragmentPose(f,p,W,H,field.reduced);if(pose.alpha<.001)continue;c.save();c.translate(pose.x,pose.y);c.rotate(pose.angle);c.globalAlpha=field.alpha*pose.alpha;c.strokeStyle=f.pink?'#ff67cf':'#74edff';c.fillStyle=f.pink?'#ffb9e9':'#c4faff';
  const dx=(f.b.x-f.a.x)*W*pose.scale/2,dy=(f.b.y-f.a.y)*H*pose.scale/2;
  if(field.style==='nodes'){const size=Math.max(.4,f.size*pose.scale);c.fillRect(-size/2,-size/2,size,size);if(high&&!field.reduced){c.globalAlpha*=.18;c.fillRect(-size*1.5,-size*1.5,size*3,size*3)}}else if(!pose.dust||field.reduced){c.beginPath();c.moveTo(-dx,-dy);c.lineTo(dx,dy);c.stroke();if(high&&!field.reduced){c.globalAlpha*=.3;c.beginPath();c.moveTo(-dx,-dy);c.lineTo(dx,dy);c.lineTo(-dy*.4,dx*.4+3*(1-p));c.closePath();c.fill()}}else{const size=Math.max(.5,3*pose.scale);c.fillRect(-size/2,-size/2,size,size);if(p<.75){c.globalAlpha*=.25;c.fillRect(-size*1.8,-size*1.8,size*3.6,size*3.6)}}c.restore();
 }c.restore();if(high)cinematic.composite(feedback);
 if(quality==='high'&&lastObject)drawUltra(feedback,{W,H,now,x:lastObject.x,y:lastObject.y-lastObject.radius*1.65-25,r:lastObject.radius,alpha:field.alpha*(1-p)*(1-p),burst:p,formation:1,reduced:field.reduced});
 setText('cube-state','Dissolving');setText('hint','กำลังคลายมนตร์');
}

function departureVertices(object){const {radius,x,y,time,compression,mesh,matrix,shape}=object,cy=y-radius*1.65-25;return vertexPoints(mesh,shape).map((p,i)=>project(...deformVertex(p,i,compression,time),radius*.6,time,x,cy,matrix))}

function departureSegments(object){const {radius,x,y,time,compression,mesh,matrix}=object,cy=y-radius*1.65-25;return mesh.map((segment,i)=>segment.map(p=>project(...deformVertex(p,i,compression,time),radius*.6,time,x,cy,matrix)))}

function drawExtreme(now,point,r,alpha){
 const c=feedback,t=now/1000,cx=point.x,cy=point.y-r*1.65-25,formation=smooth((now-summonAt)/1400),energy=alpha*formation;c.save();c.globalCompositeOperation='lighter';
 c.globalAlpha=energy;effectCache.draw(c,'aura',cx,cy,r*2.35,GLOWS.aura);
 // Three tilted orbital currents share the model's 3D projection.
 for(let band=0;band<3;band++){const radius=1.45+band*.2,phase=t*(band%2?-.28:.22)+band*1.9,tilt=.5+band*.6;
  c.beginPath();for(let j=0;j<=80;j++){const a=j/80*Math.PI*2+phase,x=Math.cos(a)*radius,y=Math.sin(a)*radius*Math.cos(tilt),z=Math.sin(a)*radius*Math.sin(tilt),v=project(x,y,z,r*.6,t,cx,cy);j?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y)}c.strokeStyle=band%2?'#ff8ad932':'#83eaff32';c.lineWidth=.65;c.globalAlpha=energy;c.stroke();
  for(let j=0;j<48;j++){const a=j/48*Math.PI*2+phase*2,tail=(j%16)/16,v=project(Math.cos(a)*radius,Math.sin(a)*radius*Math.cos(tilt),Math.sin(a)*radius*Math.sin(tilt),r*.6,t,cx,cy),size=.8+tail*2.5;c.globalAlpha=energy*(.15+tail*.75);c.fillStyle=band%2?'#ff9be1':'#a8f5ff';c.fillRect(v.x-size/2,v.y-size/2,size,size);if(j%16===15){c.globalAlpha*=.15;c.fillRect(v.x-7,v.y-7,14,14)}}
 }
 // Peripheral motes add depth without covering the face or fingers.
 for(let i=0;i<180;i++){const a=i*2.399+t*(.05+i%3*.018),band=1.2+(i%29)/18,x=cx+Math.cos(a)*r*band,y=cy+Math.sin(a)*r*band*.72,size=.6+(i%7)*.23;c.globalAlpha=energy*(.08+.16*(.5+.5*Math.sin(t+i)));c.fillStyle=i%2?'#ff7ed3':'#8befff';c.fillRect(x,y,size,size)}
 const vertices=solids[currentShape].vertices;for(let i=0;i<vertices.length;i++){if(currentShape==='sphere'&&i%4)continue;const v=project(...deformVertex(vertices[i],i,compression,t),r*.6,t,cx,cy),size=3+Math.sin(t*1.6+i)*1.2;c.globalAlpha=energy*.7;c.strokeStyle=i%2?'#ffdbf4':'#e1fbff';c.lineWidth=.8;c.beginPath();c.moveTo(v.x-size*2,v.y);c.lineTo(v.x+size*2,v.y);c.moveTo(v.x,v.y-size*2);c.lineTo(v.x,v.y+size*2);c.stroke();c.globalAlpha=energy*.13;c.fillStyle=i%2?'#ff79ce':'#80edff';c.fillRect(v.x-7,v.y-7,14,14)}
 const age=(now-summonAt)/1000;if(age<1.8){const wave=age/1.8;c.globalAlpha=alpha*(1-wave)*.7;c.strokeStyle='#b1f4ff';c.lineWidth=1.4;c.beginPath();c.ellipse(cx,cy,r*(.3+wave*2.8),r*(.18+wave*1.6),-.3,0,Math.PI*2);c.stroke()}
 c.restore();
}

function renderFallback(...args){if(quality==='low'){cube(...args);return}const base=ctx;ctx=cinematic.begin(W,H,graphics.canvasRatio);try{cube(...args)}finally{ctx=base}cinematic.composite(feedback,cinematic.layer,{region:effectRegion(W,H,args[1].x,args[1].y-args[2]*1.65-25,args[2]*1.6)});}
function renderHeart(options){if(quality==='high')drawUltra(feedback,{W:options.W,H:options.H,now:options.now,x:options.W*.5,y:options.H*.46,r:Math.min(options.W,options.H)*.22*options.scale,alpha:options.phase==='burst'?Math.max(0,1-(options.now-options.releaseAt)/2800):Math.min(1,(options.now-options.at)/4200),formation:1,burst:options.phase==='burst'?(options.now-options.releaseAt)/2800:0,reduced:options.reduced});const high=quality!=='low';heartView.render(high?cinematic.begin(W,H,graphics.canvasRatio):feedback,options);if(high){const formed=options.phase==='active'&&options.now-options.at>=4200;cinematic.composite(feedback,cinematic.layer,{strength:.65,region:formed?effectRegion(W,H,W*.5,H*.46,Math.min(W,H)*.26*options.scale*2.1):undefined})}}

function syncQualityCards(){for(const button of document.querySelectorAll('[data-quality]')){const selected=button.dataset.quality===quality;button.setAttribute('aria-checked',String(selected));button.tabIndex=selected?0:-1}}
function wireRadioPicker(selector,itemSelector,select){const picker=document.querySelector(selector),items=[...picker.querySelectorAll(itemSelector)];for(const item of items)item.addEventListener('click',()=>select(item));picker.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;const current=items.indexOf(document.activeElement);if(current<0)return;event.preventDefault();const index=event.key==='Home'?0:event.key==='End'?items.length-1:(current+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)+items.length)%items.length;items[index].focus();select(items[index])})}

function syncFilters(){const master=$('camera-filter-toggle');master.setAttribute('aria-checked',String(cameraFilters.enabled));for(const button of document.querySelectorAll('[data-camera-filter]')){button.setAttribute('aria-pressed',String(cameraFilters.options[button.dataset.cameraFilter]));button.disabled=!cameraFilters.enabled}}
function saveFilters(){syncFilters();try{localStorage.setItem('arcane-camera-filters',JSON.stringify({enabled:cameraFilters.enabled,...cameraFilters.options}))}catch{}}
$('camera-filter-toggle').addEventListener('click',()=>{cameraFilters.setEnabled(!cameraFilters.enabled);saveFilters()});for(const button of document.querySelectorAll('[data-camera-filter]'))button.addEventListener('click',()=>{const key=button.dataset.cameraFilter;cameraFilters.options[key]=!cameraFilters.options[key];if(key==='glitch')cameraFilters.glitchAt=-Infinity;saveFilters()});syncFilters();

let handFeedbackEnabled=true;
try{handFeedbackEnabled=localStorage.getItem('arcane-hand-feedback')!=='off'}catch{}
const handFeedbackToggle=$('hand-feedback-toggle');
function syncHandFeedback(){handFeedbackToggle.setAttribute('aria-checked',String(handFeedbackEnabled))}
handFeedbackToggle.addEventListener('click',()=>{handFeedbackEnabled=!handFeedbackEnabled;syncHandFeedback();try{localStorage.setItem('arcane-hand-feedback',handFeedbackEnabled?'on':'off')}catch{}});
syncHandFeedback();

$('demo-black-hole').addEventListener('click',()=>{if(!demo)return;const b=spell.blackHole;if(b.locked){if(b.phase==='active')b.close(performance.now());return}b.reset();blackHoleView.reset();b.phase='active';b.at=performance.now();b.point={x:.5,y:.5};b.gap=.4;demoVisible=false});

function renderBlackHole(options){const high=quality!=='low',target=high?cinematic.begin(W,H,graphics.canvasRatio):feedback;blackHoleView.render(target,options);if(high)cinematic.composite(feedback,cinematic.layer,{strength:quality==='high'?1.15:.7,region:effectRegion(W,H,options.x,options.y,options.r*4.5)})}
