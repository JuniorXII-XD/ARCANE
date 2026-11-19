const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0));
export function usableWorld(world){if(!world||world.length!==21||world.some(p=>!finite(p)||!Number.isFinite(p.z)))return false;const palm=distance(world[0],world[9]);return palm>1e-5&&[5,9,13,17].every(b=>[b,b+1,b+2].every(i=>{const d=distance(world[i],world[i+1])/palm;return d>.015&&d<1.5}))}
function jointDot(a,b,c){const u=[a.x-b.x,a.y-b.y,a.z-b.z],v=[c.x-b.x,c.y-b.y,c.z-b.z];return u.reduce((s,x,i)=>s+x*v[i],0)/(Math.hypot(...u)*Math.hypot(...v)||1)}
export function worldFingers(world){if(!usableWorld(world))return null;return [5,9,13,17].map(b=>{const a=world[b],p=world[b+1],d=world[b+2],t=world[b+3],length=distance(a,p)+distance(p,d)+distance(d,t),reach=distance(a,t)/length,pip=jointDot(a,p,d),dip=jointDot(p,d,t);if(pip<-.75&&dip<-.55&&reach>.8)return 1;if(pip>-.38||reach<.58)return 0;return -1})}
export function assessHand(lm,world,w=1,h=1){
 if(!lm||lm.length!==21||lm.some(p=>!finite(p)))return{commands:false,position:false,reason:'ข้อมูลมือไม่ครบ',visible:0};
 const visible=lm.map(p=>p.x>=.005&&p.x<=.995&&p.y>=.005&&p.y<=.995);
 const count=visible.filter(Boolean).length,position=visible[8]&&visible[0];
 if(count<21)return{commands:false,position,reason:'มือใกล้ขอบ / เห็นมือไม่ครบ',visible:count};
 const dx=(lm[5].x-lm[0].x)*w,dy=(lm[5].y-lm[0].y)*h,ex=(lm[17].x-lm[0].x)*w,ey=(lm[17].y-lm[0].y)*h,area=Math.abs(dx*ey-dy*ex),length=Math.hypot((lm[9].x-lm[0].x)*w,(lm[9].y-lm[0].y)*h),span=Math.hypot((lm[17].x-lm[5].x)*w,(lm[17].y-lm[5].y)*h);
 if(length<.012*Math.min(w,h))return{commands:false,position:false,reason:'มือเล็กเกินไป',visible:count};
 if(area/Math.max(length*length,1e-8)<.09||span/Math.max(length,1e-8)<.18)return{commands:false,position:false,reason:'มือเอียงจนบังนิ้ว · คงสถานะ',visible:count};
 // Landmark visibility/presence are not a calibrated per-finger confidence here.
 // Missing or degenerate world coordinates fall back to image geometry.
 const fingers=worldFingers(world);

 if(fingers?.some(v=>v===1)){const palm=Math.max(length,span);for(let a=0;a<4;a++)for(let b=a+1;b<4;b++){if(fingers[a]!==1&&fingers[b]!==1)continue;const i=8+a*4,j=8+b*4,d=Math.hypot((lm[i].x-lm[j].x)*w,(lm[i].y-lm[j].y)*h);if(d/palm<.09&&distance(world[i],world[j])/distance(world[0],world[9])>.25)return{commands:false,position:false,reason:'นิ้วซ้อนกัน · คงสถานะ',visible:count}}}
 return{commands:true,position,reason:'',visible:count};
}
export function worldPinch(world){if(!usableWorld(world))return null;return distance(world[4],world[8])/distance(world[0],world[9])}
