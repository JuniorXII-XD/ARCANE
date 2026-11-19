import {solids} from './geometry.mjs';
import {matrixQ} from './orientation.mjs';
// Build immutable model-space details once instead of once per frame.
const details=Object.fromEntries(Object.entries(solids).map(([name,solid])=>{
 const insets=solid.triangles.map(indices=>{const face=indices.map(i=>solid.vertices[i]),center=[0,1,2].map(k=>face.reduce((sum,p)=>sum+p[k],0)/3);return [.58,.35].map(scale=>face.map(p=>p.map((v,k)=>center[k]+(v-center[k])*scale)))});
 const core=solid.edges.map(edge=>edge.map(i=>{const p=solid.vertices[i];return name==='pyramid'?[p[0],-p[1],p[2]]:p}));
 return [name,{insets,core}];
}));
// Stateless decoration: every pixel belongs to the current model/frame.
export function drawCrystalDetail(c,{x,y,r,shape,quaternion,now,formation=1,compression=0,alpha=1,quality='balanced',style='facets',reduced=false}){
 if(alpha<=0||formation<=0||style==='nodes')return;
 const m=matrixQ(quaternion),t=reduced?0:now/1000,solid=solids[shape],detail=details[shape],shrink=1-compression*.84;
 let px=0,py=0;
 const project=(a,b,d,scale=1)=>{const X=m[0]*a-m[1]*b+m[2]*d,Y=m[3]*a-m[4]*b+m[5]*d,Z=m[6]*a-m[7]*b+m[8]*d,f=4/(4-Z*scale);px=x+X*r*.6*scale*f;py=y-Y*r*.6*scale*f};
 const path=(points,scale,close=true)=>{c.beginPath();for(let i=0;i<points.length;i++){const p=points[i];project(p[0],p[1],p[2],scale);i?c.lineTo(px,py):c.moveTo(px,py)}if(close)c.closePath();c.stroke()};
 c.save();c.globalCompositeOperation='lighter';c.lineWidth=quality==='low'?.65:.85;
 // Inset face inscriptions preserve each solid's silhouette.
 if(style==='facets')for(let i=0;i<solid.triangles.length;i++){
  if(quality==='low'&&i%2)continue;

  c.strokeStyle=i%2?'#ff67ca':'#70eaff';c.globalAlpha=alpha*formation*.32*(1-compression);
  path(detail.insets[i][0],shrink);
  if(quality==='high'){c.globalAlpha*=.6;path(detail.insets[i][1],shrink)}
 }
 // Nested core: a cube, a geodesic lattice, or a suspended inverted pyramid.
 c.globalAlpha=alpha*formation*(.28+compression*.3);c.strokeStyle='#c9eaff';
 const coreScale=(.48+.06*Math.sin(t*.8))*shrink;for(const edge of detail.core)path(edge,coreScale,false);
 // Travelling square charges follow the actual edges rather than screen orbits.
 const stride=quality==='low'?4:quality==='high'?1:2;
 for(let i=0;i<solid.edges.length;i+=stride){const[a,b]=solid.edges[i],A=solid.vertices[a],B=solid.vertices[b],u=(t*.22+i*.618)%1,size=(quality==='high'?2.6:1.8)*(1+compression);
 project(A[0]+(B[0]-A[0])*u,A[1]+(B[1]-A[1])*u,A[2]+(B[2]-A[2])*u,shrink);
 c.globalAlpha=alpha*formation*(.4+.5*Math.sin(u*Math.PI));c.fillStyle=i%2?'#ffb6ea':'#c5faff';c.fillRect(px-size/2,py-size/2,size,size)}
 c.restore();
}
