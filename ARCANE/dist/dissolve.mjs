// Fixed-size fragment field: no allocations while the exit animation runs.
export const DISSOLVE_DURATION=1700;
export function createDissolve(segments,now,{width,height,alpha=1,reduced=false,count:limit=120}={}){
 const count=Math.min(segments.length,limit),fragments=[];
 for(let k=0;k<count;k++){const i=Math.floor(k*segments.length/count),[a,b]=segments[i],seed=Math.sin(i*127.1+311.7)*43758.5453,random=seed-Math.floor(seed),angle=k*2.399963;
  fragments.push({a:{x:a.x/width,y:a.y/height},b:{x:b.x/width,y:b.y/height},vx:Math.cos(angle)*(.035+random*.07),vy:-.07-random*.12,spin:(random-.5)*5,delay:random*.16,pink:k%2===0});
 }
 return {at:now,duration:reduced?240:DISSOLVE_DURATION,alpha,reduced,fragments};
}
export function fragmentPose(fragment,progress,width,height,reduced=false){
 const p=Math.max(0,Math.min(1,(progress-fragment.delay)/(1-fragment.delay))),ease=p*p*(3-2*p),motion=reduced?0:ease;
 const cx=(fragment.a.x+fragment.b.x)*width/2+fragment.vx*width*motion,cy=(fragment.a.y+fragment.b.y)*height/2+fragment.vy*height*motion;
 return {x:cx,y:cy,angle:fragment.spin*motion,scale:1-ease*.95,alpha:(1-p)*(1-p),dust:p>.28};
}

// Capture the displayed vertices, rather than recycling the edge fragments.
export function createVertexDissolve(points,now,options={}){
 const field=createDissolve(points.map(p=>[p,p]),now,options);
 field.style='nodes';
 const cx=points.reduce((n,p)=>n+p.x,0)/(points.length||1)/(options.width||1),cy=points.reduce((n,p)=>n+p.y,0)/(points.length||1)/(options.height||1);
 for(const f of field.fragments){const dx=f.a.x-cx,dy=f.a.y-cy,length=Math.hypot(dx,dy)||1;
 f.vx=dx/length*.12+f.vx*.4;f.vy=dy/length*.12+f.vy*.4;f.size=3.5+f.delay*10;
 }
 return field;
}
