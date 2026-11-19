import assert from 'node:assert/strict';
import {palmQ,angleQ,eulerQ,multiplyQ,inverseQ,slerpQ,matrixQ} from './dist/orientation.mjs';
import {SpellState} from './dist/logic.mjs';
import {solids,shapes,vertexPoints} from './dist/geometry.mjs';
function hand(n){const lm=Array.from({length:21},()=>({x:.5,y:.8}));lm[0]={x:.5,y:.9};for(const [i,b]of[5,9,13,17].entries()){lm[b]={x:.4+i*.07,y:.7};lm[b+1]={x:.4+i*.07,y:.6};lm[b+3]={x:.4+i*.07,y:i<n?.3:.76}}return lm}
const world=Array.from({length:21},()=>({x:0,y:0,z:0}));world[0]={x:0,y:.09,z:0};world[5]={x:-.04,y:.02,z:0};world[9]={x:0,y:0,z:0};world[17]={x:.04,y:.02,z:0};
const q=palmQ(world);assert(q&&Math.abs(Math.hypot(...q)-1)<1e-10);const translated=world.map(p=>({x:p.x*3+4,y:p.y*3-5,z:p.z*3+6}));assert(angleQ(q,palmQ(translated))<1e-7);assert.equal(palmQ([]),null);assert.equal(palmQ(Array.from({length:21},()=>({x:0,y:0,z:0}))),null);
assert(angleQ(multiplyQ(q,inverseQ(q)),[0,0,0,1])<1e-7);assert(Math.abs(Math.hypot(...slerpQ(q,eulerQ(.3,.2),.3))-1)<1e-10);
for(let axis=0;axis<3;axis++){
 const s=new SpellState(),right=hand(1),left=hand(4);let now=0;
 for(;now<=800;now+=50)s.update(right,left,now,1280,720,{leftWorld:world});const base=[...s.rotationQ];assert(angleQ(base,eulerQ(.45,.35))<1e-7,'enter rotation without jumping');
 const a=.2,rotated=world.map(p=>{const v=[p.x,p.y,p.z],u=(axis+1)%3,w=(axis+2)%3;const out=[...v];out[u]=v[u]*Math.cos(a)-v[w]*Math.sin(a);out[w]=v[u]*Math.sin(a)+v[w]*Math.cos(a);return{x:out[0],y:out[1],z:out[2]}});
 s.update(right,left,now,1280,720,{leftWorld:rotated});assert(Math.abs(angleQ(base,s.rotationQ)-.2)<1e-7,'all three axes respond');const last=[...s.rotationQ];
 s.update(right,left,now+50,1280,720);assert(angleQ(last,s.rotationQ)<1e-7,'missing pose freezes rotation');s.update(right,left,now+100,1280,720,{leftWorld:world});assert(angleQ(last,s.rotationQ)<1e-7,'reacquire rebaselines');
 const size=s.target;assert.equal(size,1,'rotation never resizes');
 const m=matrixQ(s.rotationQ);assert(m.every(Number.isFinite));
}
for(const[name,solid]of Object.entries(solids)){const points=vertexPoints(shapes[name],name);assert.equal(points.length,solid.vertices.length);points.forEach((p,i)=>assert(Math.hypot(...p.map((v,k)=>v-solid.vertices[i][k]))<1e-8))}
console.log('PASS: three-axis palm orientation, no entry/reacquisition jump, missing-pose freeze, rotation/scale isolation, identical vertex samples for 3D and Light');
