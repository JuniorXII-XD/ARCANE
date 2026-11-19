import {BlackHoleState} from './black-hole-state.mjs';
import {EvidenceHold,ScalarFilter} from './temporal.mjs';
import {assessHand,worldFingers,worldPinch,usableWorld} from './hand-analysis.mjs';
import {HeartState} from './heart-state.mjs';
import {palmQ,multiplyQ,inverseQ,eulerQ,angleQ} from './orientation.mjs';
import {pinchRatio} from './tracking.mjs';
const names={cube:'ลูกบาศก์',sphere:'ไอโคสเฟียร์',pyramid:'พีระมิด',fist:'บีบอัด',open:'คลายมนตร์'};
const dist=(a,b,w,h)=>Math.hypot((a.x-b.x)*w,(a.y-b.y)*h);
function finger(lm,b,w,h){const a=lm[b],p=lm[b+1],t=lm[b+3];const u=[(a.x-p.x)*w,(a.y-p.y)*h],v=[(t.x-p.x)*w,(t.y-p.y)*h];const dot=(u[0]*v[0]+u[1]*v[1])/(Math.hypot(...u)*Math.hypot(...v)||1);const ratio=dist(lm[0],t,w,h)/Math.max(dist(lm[0],p,w,h),.00001);if(dot<-.84&&ratio>1.12)return 1;if(dot>-.5||ratio<.95)return 0;return -1}
export function classify(lm,w,h,world){if(!lm||lm.length!==21||lm.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return 'unknown';const imageFingers=[5,9,13,17].map(b=>finger(lm,b,w,h)),spatial=worldFingers(world);const f=spatial?spatial.map((v,i)=>v===-1?imageFingers[i]:v):imageFingers;if(f.some(x=>x===-1))return 'unknown';const key=f.join('');return ({'1000':'cube','1100':'sphere','1110':'pyramid','0000':'fist','1111':'open'})[key]||'unknown'}
export const isPoint=(lm,w,h)=>classify(lm,w,h)==='cube';
export const sizeFromHand=(lm,w,h)=>Math.max(.45,Math.min(2.3,.45+(pinchRatio(lm,w,h)-.12)/1.25*1.85));
export class Hold extends EvidenceHold{}
// Conservative identity routing: uncertain, overlapping, duplicate, and jumping tracks never issue commands.
export class HandRouter{
 constructor(){this.tracks={};this.holds={Right:new Hold({minSamples:2}),Left:new Hold({minSamples:2})};this.warning='';this.feedback={}}
 update(result,now,swap=false,w=1,h=1){const found={};this.warning='';this.feedback={};const cats=result.handedness||result.handednesses||[];
 (result.landmarks||[]).forEach((lm,i)=>{const c=cats[i]?.[0];if(!c||c.score<.55||!['Left','Right'].includes(c.categoryName)||lm?.length!==21||lm.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return;let hand=c.categoryName==='Left'?'Right':'Left';if(swap)hand=hand==='Right'?'Left':'Right';
 const nearest=Object.entries(this.tracks).filter(([,t])=>now-t.time<1200).map(([role,t])=>({role,d:dist(t.wrist,lm[0],1,1)})).sort((a,b)=>a.d-b.d);
 // Keep a uniquely nearby existing identity through a handedness-label flicker.
 if(nearest[0]?.d<.13&&(!nearest[1]||nearest[1].d-nearest[0].d>.08))hand=nearest[0].role;
 // Low-confidence candidates remain visible while their identity is confirmed.
 (found[hand]??=[]).push({raw:lm,lm,world:result.worldLandmarks?.[i],score:c.score,quality:assessHand(lm,result.worldLandmarks?.[i],w,h)});
 });
 const r=found.Right?.[0],l=found.Left?.[0],overlap=r&&l&&dist(r.lm[0],l.lm[0],1,1)<.14;
 const ambiguous=overlap||Object.values(found).some(c=>c.length>1);if(ambiguous){this.tracks={};this.holds.Right.clear();this.holds.Left.clear()}
 const out={};for(const hand of ['Right','Left']){const candidates=found[hand]||[],c=candidates[0],prev=this.tracks[hand];let valid=candidates.length===1&&!ambiguous;
 if(valid&&prev&&now-prev.time<800&&dist(prev.wrist,c.lm[0],1,1)>.23)valid=false;
 const other=this.tracks[hand==='Right'?'Left':'Right'];if(valid&&prev&&other&&now-other.time<800&&dist(other.wrist,c.lm[0],1,1)+.07<dist(prev.wrist,c.lm[0],1,1))valid=false;
 if(valid){const dt=prev?now-prev.time:1000,jump=prev?dist(prev.wrist,c.lm[0],1,1):1,a=dt>250||jump>.09?1:1-Math.exp(-dt/(jump>.018?28:65));if(prev?.lm&&dt<250)c.lm=c.lm.map((p,i)=>({...p,x:prev.lm[i].x+(p.x-prev.lm[i].x)*a,y:prev.lm[i].y+(p.y-prev.lm[i].y)*a,z:Number.isFinite(p.z)&&Number.isFinite(prev.lm[i].z)?prev.lm[i].z+(p.z-prev.lm[i].z)*a:p.z}));
 if(usableWorld(c.world)&&usableWorld(prev?.world)&&dt<250)c.world=c.world.map((p,i)=>({x:prev.world[i].x+(p.x-prev.world[i].x)*a,y:prev.world[i].y+(p.y-prev.world[i].y)*a,z:prev.world[i].z+(p.z-prev.world[i].z)*a}));
 this.tracks[hand]={wrist:{...c.raw[0]},lm:c.lm,world:c.world,time:now};if(c.score<.65)c.quality={...c.quality,commands:false,reason:'ระบุมือไม่แน่ใจ · คงสถานะ'};
 if(this.holds[hand].update(hand,now,180))out[hand]=c;
 }else this.holds[hand].clear();
 if(c){const blocked=!valid||!c.quality.commands;this.feedback[hand]={lm:c.lm,ready:valid&&this.holds[hand].ready,progress:valid?this.holds[hand].progress:0,blocked,quality:c.quality,reason:!valid?'มือบังกัน / ระบุตัวมือไม่แน่ใจ':c.quality.reason};if(blocked)this.warning=this.feedback[hand].reason+' — พักคำสั่ง'}
 }
 return out;
 }
}
export class SpellState{
 constructor(){this.reset()}
 reset(){this.scaleFilter=new ScalarFilter();this.pinchOrigin=null;this.pinchBase=1;this.pinchSource=null;this.heart=new HeartState();this.blackHole=new BlackHoleState();this.on=false;this.target=1;this.point=null;this.shape='cube';this.compressed=false;this.rotation=0;this.rotationQ=null;this.poseOrigin=null;this.poseLast=null;this.poseBase=null;this.poseCandidate=null;this.poseCandidateAt=0;this.lastObserved=-Infinity;this.lastValid=-Infinity;this.rightHold=new Hold();this.leftHold=new Hold();this.leftMode='idle';this.rightText='ไม่พบมือ';this.leftText='ไม่พบมือ';this.rotationOrigin=null;this.rotationBase=0;this.lastUpdate=0;this.pending=''}
 update(right,left,now,w,h,pose={}){if(now-this.lastUpdate>1200){this.rightHold.clear();this.leftHold.clear();this.rotationOrigin=null;this.poseOrigin=null;this.poseLast=null;this.leftMode='idle'}this.lastUpdate=now;
 const wasBlackHole=this.blackHole.locked||this.blackHole.phase==='arming';
 if(!this.heart.locked)this.blackHole.update(right,left,now,w,h,pose);
 if(this.blackHole.locked||this.blackHole.phase==='arming'){
 this.rightHold.clear();this.leftHold.clear();this.leftMode='idle';this.heart.activation.clear();this.heart.phase='idle';
 this.on=false;this.compressed=false;this.point=null;
 const message=this.blackHole.phase==='arming'?'รวมพลังสองมือ '+Math.round(this.blackHole.progress*100)+'%':this.blackHole.phase==='closing'?'หลุมดำกำลังยุบตัว':'ประคองหลุมดำ';
 this.rightText=this.leftText=message;this.pending=message;return{on:false,target:this.target,shape:this.shape,compressed:false};
 }
 if(wasBlackHole){this.rightHold.clear();this.leftHold.clear();this.rotationOrigin=null;this.poseOrigin=null;this.pinchOrigin=null;this.scaleFilter.reset()}
 const rightQuality=pose.rightQuality,leftQuality=pose.leftQuality,rightReliable=rightQuality?.commands!==false,leftReliable=leftQuality?.commands!==false;if(right||pose.rightPresent)this.lastObserved=now;
 this.heart.update(rightReliable?right:null,now,w,h,{uncertain:!rightReliable||(!right&&this.heart.phase==='active'),present:!!right||!!pose.rightPresent,world:pose.rightWorld});const heartMode=this.heart.locked,heartArming=this.heart.phase==='arming';
 const gesture=heartMode||heartArming||this.heart.evidence?.crossed||!rightReliable?'unknown':classify(right,w,h,pose.rightWorld);this.pending='';this.rightText=right?(gesture==='unknown'?'ท่าไม่ชัด — คงสถานะ':'รอยืนยัน: '+names[gesture]):'ไม่พบมือ';
 const holdMs=gesture==='open'?750:gesture==='fist'?450:350;
 if(gesture!=='unknown'){
  if(this.rightHold.update(gesture,now,holdMs)){
   this.lastValid=now;
   if(['cube','sphere','pyramid'].includes(gesture)){this.on=true;this.shape=gesture;this.compressed=false;this.point=right[8];this.rightText='ยืนยัน: '+names[gesture]}
   if(gesture==='fist'){if(this.on)this.compressed=true;this.rightText=this.on?'บีบอัดพลังงาน':'กำมือ — ยังไม่มีวัตถุ'}
   if(gesture==='open'){this.on=false;this.compressed=false;this.rightText='คลายมนต์'}
  }else this.pending=`ยืนยันมือขวา ${Math.round(this.rightHold.progress*100)}%`;
 }else this.rightHold.update(null,now,holdMs);
 if(!heartMode&&this.on&&now-Math.max(this.lastObserved,this.lastValid)>1800){this.on=false;this.compressed=false;this.rightText='พักมนต์ — ไม่พบท่าที่ชัดเจน'}
 if(this.on&&right&&!this.compressed&&(gesture===this.shape||rightQuality?.position))this.point=right[8];if(rightQuality?.commands===false)this.rightText=rightQuality.reason+' · คงวัตถุ';
 if(heartMode){this.on=this.heart.phase==='active';this.compressed=false;this.point=null;this.lastValid=now;this.rightText=this.on?'หัวใจ · ค้างมินิฮาร์ทไว้':'ปลดปล่อยหัวใจ';this.pending=''}else if(heartArming){this.rightText='นิ้วไขว้ · หลังมือ '+Math.round(this.heart.progress*100)+'%';this.pending='ค้างมินิฮาร์ท 3 วินาที'}
 if(!heartMode&&this.heart.evidence?.crossed&&!this.heart.evidence.match){this.rightText=this.heart.evidence.reason;this.pending=this.heart.evidence.reason}
 // Shape commands belong only to the right hand. Left modes are mutually exclusive.
 const leftGesture=leftReliable?classify(left,w,h,pose.leftWorld):'unknown';let mode='idle';
 if(this.on&&!this.compressed&&left){if(leftGesture==='open')mode='rotate';else if(['cube','fist'].includes(leftGesture))mode='scale'}
 if(mode==='idle'){this.leftHold.update(null,now,250);if(!this.leftHold.key){this.leftMode='idle';this.rotationOrigin=null;this.poseOrigin=null;this.poseLast=null;this.pinchOrigin=null;this.scaleFilter.reset()}this.leftText=!left?'ไม่พบมือ':this.compressed?'พักระหว่างบีบอัด':!this.on?'รอเสกรูปทรง':'ท่าไม่ชัด — พักควบคุม'}
 else if(this.leftHold.update(mode,now,250)){
  if(this.leftMode!==mode){this.leftMode=mode;this.rotationOrigin=null;this.poseOrigin=null;this.poseLast=null;this.rotationBase=this.rotation;this.pinchOrigin=null;this.pinchSource=null;this.scaleFilter.reset()}
  if(mode==='scale'){const spatial=worldPinch(pose.leftWorld),source=spatial===null?'image':'world',ratio=spatial===null?pinchRatio(left,w,h):spatial;if(this.pinchOrigin===null||this.pinchSource!==source){this.pinchOrigin=ratio;this.pinchBase=this.target;this.pinchSource=source;this.scaleFilter.reset()}this.target=this.scaleFilter.update(Math.max(.45,Math.min(2.3,this.pinchBase+(ratio-this.pinchOrigin)*1.48)),now);this.leftText='ปรับขนาด'}
  else{
   const q=palmQ(pose.leftWorld);
   if(q){
    if(this.poseOrigin===null){this.poseOrigin=q;this.poseLast=q;this.poseBase=this.rotationQ||eulerQ(.45+Math.sin(this.rotation*.5)*.3,this.rotation+.35)}
    if(angleQ(this.poseLast,q)<.9){this.rotationQ=multiplyQ(multiplyQ(q,inverseQ(this.poseOrigin)),this.poseBase);this.poseLast=q;this.leftText='หมุนฝ่ามือ 3D'}else{if(!this.poseCandidate||angleQ(this.poseCandidate,q)>.15){this.poseCandidate=q;this.poseCandidateAt=now}if(now-this.poseCandidateAt>180){this.poseOrigin=q;this.poseLast=q;this.poseBase=this.rotationQ;this.poseCandidate=null}this.leftText='กำลังตั้งมุมมือใหม่ · คงมุม'};
   }else if(this.rotationQ){this.poseOrigin=null;this.poseLast=null;this.leftText='มุมมือไม่ชัด — คงมุม'}
   else{const a=Math.atan2((left[5].y-left[17].y)*h,(left[5].x-left[17].x)*w);if(this.rotationOrigin===null){this.rotationOrigin=a;this.rotationBase=this.rotation}let delta=a-this.rotationOrigin;delta=Math.atan2(Math.sin(delta),Math.cos(delta));this.rotation=this.rotationBase+delta;this.leftText='เอียงมือในภาพ'}
  }
 }else{this.leftText=`รอยืนยัน ${mode} ${Math.round(this.leftHold.progress*100)}%`}
 if(leftQuality?.commands===false)this.leftText=leftQuality.reason+' · พักควบคุม';
 return {on:this.on,target:this.target,shape:this.shape,compressed:this.compressed};
 }
}
