import {worldFingers,usableWorld} from './hand-analysis.mjs';
import {EvidenceHold} from './temporal.mjs';
function normal(lm){const a=lm[5],b=lm[17],o=lm[0],u=[a.x-o.x,a.y-o.y,a.z-o.z],v=[b.x-o.x,b.y-o.y,b.z-o.z],n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...n);return length>1e-7?n.map(x=>x/length):null}
const visible=lm=>lm?.length===21&&lm.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>.005&&p.x<.995&&p.y>.005&&p.y<.995);
const allowed=q=>q?.commands!==false||q.reason?.startsWith('มือเอียงจนบังนิ้ว');
export function blackHoleEvidence(right,left,w,h,pose={}){
 if(!visible(right)||!visible(left)||!allowed(pose.rightQuality)||!allowed(pose.leftQuality))return null;
 const rw=pose.rightWorld,lw=pose.leftWorld;if(!usableWorld(rw)||!usableWorld(lw))return null;
 const rf=worldFingers(rw),lf=worldFingers(lw);if(rf.filter(x=>x===1).length<3||lf.filter(x=>x===1).length<3||rf.includes(0)||lf.includes(0))return null;
 const center=lm=>({x:(lm[0].x+lm[5].x+lm[9].x+lm[17].x)/4,y:(lm[0].y+lm[5].y+lm[9].y+lm[17].y)/4}),r=center(right),l=center(left),dx=l.x-r.x,dy=(l.y-r.y)*h;
 const palm=lm=>Math.hypot((lm[0].x-lm[9].x)*w,(lm[0].y-lm[9].y)*h),size=(palm(right)+palm(left))/2,gap=Math.abs(dx*w);
 if(size<Math.min(w,h)*.035||gap<size*.8||gap>size*5||Math.abs(dy)>size*.85)return null;
 const rn=normal(rw),ln=normal(lw),direction=Math.sign(dx);
 // Right palm normal is opposite the wrist/index/pinky winding; left is aligned.
 // Require inward-facing palms, not two open hands facing the camera.
 if(!rn||!ln||-rn[0]*direction<.35||ln[0]*-direction<.35)return null;
 return{x:(r.x+l.x)/2,y:(r.y+l.y)/2,gap:Math.abs(dx)};
}
export class BlackHoleState{
 constructor(){this.reset()}
 reset(){this.phase='idle';this.hold=new EvidenceHold({minSamples:8,grace:220});this.release=new EvidenceHold();this.progress=0;this.point=null;this.gap=.3;this.at=0;this.exitAt=0;this.lastSeen=0;this.cooldown=false}
 update(right,left,now,w,h,pose={}){
 const evidence=blackHoleEvidence(right,left,w,h,pose);
 if(this.phase==='closing'){if(now-this.exitAt>=1500){this.phase='idle';this.cooldown=true;this.hold.clear()}return}
 if(this.cooldown){if(!evidence)this.cooldown=false;return}
 if(this.phase==='active'){
  if(evidence){this.point=evidence;this.gap=evidence.gap;this.lastSeen=now;this.release.clear()}
  else if(!right||!left){this.release.clear();if(now-this.lastSeen>700)this.close(now)}
  else if(this.release.update('release',now,350))this.close(now);
  return;
 }
 if(evidence){this.point=evidence;this.gap=evidence.gap;this.lastSeen=now;if(this.hold.update('pair',now,1000)){this.phase='active';this.at=now;this.release.clear()}else this.phase='arming'}
 else{this.hold.update(null,now,1000);this.phase=this.hold.key?'arming':'idle'}
 this.progress=this.hold.progress;
 }
 close(now){this.phase='closing';this.exitAt=now;this.release.clear()}
 get locked(){return this.phase==='active'||this.phase==='closing'}
}
