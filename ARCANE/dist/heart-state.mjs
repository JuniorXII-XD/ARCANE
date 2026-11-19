import {EvidenceHold} from './temporal.mjs';
import {worldFingers} from './hand-analysis.mjs';
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
// Image landmarks wobble at occlusion: allow a crossing just outside a joint,
// but retain a substantial angle so parallel fingers and an ordinary pinch fail.
function intersection(a,b,c,d){const ux=b.x-a.x,uy=b.y-a.y,vx=d.x-c.x,vy=d.y-c.y,cross=ux*vy-uy*vx,length=Math.hypot(ux,uy)*Math.hypot(vx,vy);if(length<1e-6||Math.abs(cross)/length<.28)return false;const dx=c.x-a.x,dy=c.y-a.y,t=(dx*vy-dy*vx)/cross,s=(dx*uy-dy*ux)/cross;return t>-.18&&t<1.18&&s>-.18&&s<1.18}
export function miniHeartEvidence(lm,w=1,h=1,world){
 if(!lm||lm.length!==21||lm.some(p=>!finite(p)))return{match:false,uncertain:true,crossed:false,reason:'กำลังรอมือขวา'};
 const pixel=lm.map(p=>({x:p.x*w,y:p.y*h})),d=(a,b)=>Math.hypot(pixel[a].x-pixel[b].x,pixel[a].y-pixel[b].y),palm=d(0,9);if(palm<5)return{match:false,uncertain:true,crossed:false,reason:'ขยับมือให้ใกล้กล้อง'};
 if([0,3,4,5,6,7,8,9,13,17,20].some(i=>lm[i].x<.005||lm[i].x>.995||lm[i].y<.005||lm[i].y>.995))return{match:false,uncertain:true,crossed:false,reason:'นำมือให้อยู่ในจอครบ'};
 const v=worldFingers(world);
 // Curled fingers may be labelled indeterminate in world space when occluded.
 // Accept that only when image-space reach also supports a folded finger.
 const folded=[9,13,17].every((b,i)=>v?.[i+1]!==1&&(v?.[i+1]===0||d(0,b+3)<d(0,b+1)*1.12));
 const tipGap=d(4,8)/palm;
 const crossing=intersection(pixel[3],pixel[4],pixel[6],pixel[7])||intersection(pixel[3],pixel[4],pixel[7],pixel[8]);
 const crossed=folded&&crossing&&tipGap>.12&&tipGap<.9&&d(0,8)/palm>1.03&&d(0,4)/palm>.98;
 // Raw, unmirrored camera coordinates: the right-hand dorsal face has this winding.
 const a=pixel[5],b=pixel[17],o=pixel[0],signed=((a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x))/(palm*Math.max(d(5,17),1));
 if(Math.abs(signed)<.13)return{match:false,uncertain:true,crossed,reason:'หันหลังมือเข้ากล้องให้ชัด'};
 return{match:crossed&&signed>.13,uncertain:false,crossed,reason:!crossed?'ไขว้นิ้วโป้งกับนิ้วชี้':signed<0?'หันหลังมือเข้ากล้อง':'มินิฮาร์ท · ค้าง 3 วินาที'};
}
export const isMiniHeart=(lm,w=1,h=1,world)=>miniHeartEvidence(lm,w,h,world).match;
export class HeartState{
 constructor(){this.reset()}
 reset(){this.phase='idle';this.progress=0;this.at=0;this.lastSeen=0;this.releaseAt=0;this.cooldown=false;this.activation=new EvidenceHold({minSamples:12,grace:160,capMs:180});this.release=new EvidenceHold();this.evidence=null}
 update(right,now,w,h,{uncertain=false,present=false,world}={}){const e=this.evidence=miniHeartEvidence(right,w,h,world);
  if(this.phase==='burst'){if(now-this.releaseAt>=2800){this.phase='idle';this.progress=0;this.activation.clear();this.release.clear();this.cooldown=true}return}
  if(this.phase==='active'){
   if((uncertain&&present)||right&&e.uncertain){this.lastSeen=now;this.release.clear();return}
   if(e.crossed){this.lastSeen=now;this.release.clear();return}
   if(!right){this.release.clear();if(now-this.lastSeen>1800){this.phase='burst';this.releaseAt=now}return}
   if(this.release.update('release',now,450)){this.phase='burst';this.releaseAt=now}return;
  }
  if(this.cooldown){if(!right||!e.crossed&&!e.uncertain)this.cooldown=false;return}
  if(e.match){if(this.activation.update('heart',now,3000)){this.phase='active';this.at=now;this.lastSeen=now;this.release.clear()}else this.phase='arming'}
  else if(e.uncertain){this.activation.update(null,now,3000);this.phase=this.activation.key?'arming':'idle'}
  else{this.activation.update(null,now,3000);this.phase=this.activation.key?'arming':'idle'}this.progress=this.activation.progress;
 }
 get locked(){return this.phase==='active'||this.phase==='burst'}
}
