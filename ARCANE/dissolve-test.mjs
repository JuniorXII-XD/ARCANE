import assert from 'node:assert/strict';
import {createDissolve,fragmentPose} from './dist/dissolve.mjs';
const segments=Array.from({length:240},(_,i)=>[{x:100+i,y:120},{x:140+i,y:160}]);
const field=createDissolve(segments,1000,{width:1000,height:500,alpha:.7});
assert.equal(field.fragments.length,120);assert.equal(field.duration,1700);
for(const f of field.fragments){const first=fragmentPose(f,0,1000,500),end=fragmentPose(f,1,1000,500);assert.equal(first.alpha,1);assert.equal(first.scale,1);assert.equal(end.alpha,0);assert.ok([end.x,end.y,end.angle].every(Number.isFinite));assert.equal(first.x,(f.a.x+f.b.x)*500);assert.equal(first.y,(f.a.y+f.b.y)*250);const reduced=fragmentPose(f,.5,1000,500,true);assert.ok(reduced.angle===0);assert.equal(reduced.x,first.x);assert.equal(reduced.y,first.y)}
assert.equal(createDissolve(segments,0,{width:1000,height:500,reduced:true}).duration,240);
assert.equal(createDissolve([] ,0,{width:1000,height:500}).fragments.length,0);
console.log('PASS: capped fragments, exact departure pose, finite trajectories, terminal fade, motion reduction');
const {createVertexDissolve}=await import('./dist/dissolve.mjs');
const points=[{x:200,y:150},{x:400,y:150},{x:300,y:300}];
const nodes=createVertexDissolve(points,1000,{width:600,height:400});assert.equal(nodes.style,'nodes');assert.equal(nodes.fragments.length,3);
nodes.fragments.forEach((f,i)=>{const pose=fragmentPose(f,0,600,400);assert.equal(pose.x,points[i].x);assert.equal(pose.y,points[i].y);assert.deepEqual(f.a,f.b);assert(Number.isFinite(f.size));assert.equal(fragmentPose(f,1,600,400).alpha,0)});
assert.equal(createVertexDissolve([],0,{width:600,height:400}).fragments.length,0);
console.log('PASS: vertex-only departure positions, finite scatter, no edge fragments, empty geometry');
