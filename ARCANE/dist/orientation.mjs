const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const unit=v=>{const n=Math.hypot(...v);return n>1e-7?v.map(x=>x/n):null};
export const normalizeQ=q=>{const n=Math.hypot(...q);return n>1e-8?q.map(x=>x/n):[0,0,0,1]};
export const multiplyQ=(a,b)=>normalizeQ([a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]);
export const inverseQ=q=>[-q[0],-q[1],-q[2],q[3]];
export function eulerQ(x,y,z=0){const a=[Math.sin(x/2),0,0,Math.cos(x/2)],b=[0,Math.sin(y/2),0,Math.cos(y/2)],c=[0,0,Math.sin(z/2),Math.cos(z/2)];return multiplyQ(multiplyQ(a,b),c)}
export function slerpQ(a,b,t){let c=dot(a,b),q=b;if(c<0){q=b.map(n=>-n);c=-c}if(c>.9995)return normalizeQ(a.map((n,i)=>n+(q[i]-n)*t));const angle=Math.acos(Math.min(1,c)),den=Math.sin(angle);return a.map((n,i)=>(n*Math.sin((1-t)*angle)+q[i]*Math.sin(t*angle))/den)}
export const angleQ=(a,b)=>2*Math.acos(Math.min(1,Math.abs(dot(a,b))));
export function matrixQ(q){const[x,y,z,w]=q;return [1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w),2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w),2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]}
export function palmQ(lm){
 if(!Array.isArray(lm)||lm.length!==21||lm.some(p=>![p?.x,p?.y,p?.z].every(Number.isFinite)))return null;
 // Mirror camera X and convert image Y to an upright rendering coordinate system.
 const p=i=>[-lm[i].x,-lm[i].y,lm[i].z],A=p(5),B=p(17),M=p(9),O=p(0);
 const X=unit(A.map((v,k)=>v-B[k])),rawY=M.map((v,k)=>v-O[k]);if(!X)return null;
 const projection=dot(rawY,X),Y=unit(rawY.map((v,k)=>v-X[k]*projection));if(!Y)return null;
 const Z=[X[1]*Y[2]-X[2]*Y[1],X[2]*Y[0]-X[0]*Y[2],X[0]*Y[1]-X[1]*Y[0]];
 const m=[X[0],Y[0],Z[0],X[1],Y[1],Z[1],X[2],Y[2],Z[2]],trace=m[0]+m[4]+m[8];let q;
 if(trace>0){const s=Math.sqrt(trace+1)*2;q=[(m[7]-m[5])/s,(m[2]-m[6])/s,(m[3]-m[1])/s,s/4]}
 else if(m[0]>m[4]&&m[0]>m[8]){const s=Math.sqrt(1+m[0]-m[4]-m[8])*2;q=[s/4,(m[1]+m[3])/s,(m[2]+m[6])/s,(m[7]-m[5])/s]}
 else if(m[4]>m[8]){const s=Math.sqrt(1+m[4]-m[0]-m[8])*2;q=[(m[1]+m[3])/s,s/4,(m[5]+m[7])/s,(m[2]-m[6])/s]}
 else{const s=Math.sqrt(1+m[8]-m[0]-m[4])*2;q=[(m[2]+m[6])/s,(m[5]+m[7])/s,s/4,(m[3]-m[1])/s]}
 return normalizeQ(q);
}
