import assert from 'node:assert/strict';
import {BlackHoleState,blackHoleEvidence} from './dist/black-hole-state.mjs';
import {SpellState} from './dist/logic.mjs';
import {BlackHoleView} from './dist/black-hole-view.mjs';
const world=Array.from({length:21},()=>({x:0,y:0,z:0}));
for(const [i,b]of [5,9,13,17].entries())for(let j=0;j<4;j++)world[b+j]={x:0,y:.04+j*.025,z:.03-i*.02};
const image=x=>world.map(p=>({x:x+p.z*.1,y:.75-p.y*4,z:p.z}));const right=image(.3),left=image(.7),pose={rightWorld:world,leftWorld:world};
assert(blackHoleEvidence(right,left,1280,720,pose));
assert(!blackHoleEvidence(right,null,1280,720,pose));assert(!blackHoleEvidence(right,left,1280,720,{}));
assert(!blackHoleEvidence(right,left,1280,720,{...pose,rightQuality:{commands:false,reason:'ระบุมือไม่แน่ใจ'}}));
assert(blackHoleEvidence(right,left,1280,720,{...pose,rightQuality:{commands:false,reason:'มือเอียงจนบังนิ้ว · คงสถานะ'}}));
const front=world.map(p=>({x:p.z,y:p.y,z:0}));assert(!blackHoleEvidence(right,left,1280,720,{rightWorld:front,leftWorld:front}));
const reversed=world.map(p=>({...p,z:-p.z}));assert(!blackHoleEvidence(right,left,1280,720,{rightWorld:reversed,leftWorld:reversed}));
assert(!blackHoleEvidence(right,image(.31),1280,720,pose));
const b=new BlackHoleState();for(let t=0;t<=1000;t+=50)b.update(right,left,t,1280,720,pose);assert.equal(b.phase,'active');b.update(null,null,1300,1280,720);assert.equal(b.phase,'active');b.update(null,null,1800,1280,720);assert.equal(b.phase,'closing');b.update(null,null,3400,1280,720);assert.equal(b.phase,'idle');
const spell=new SpellState();for(let t=0;t<=1100;t+=50)spell.update(right,left,t,1280,720,pose);assert(spell.blackHole.locked);assert(!spell.on);assert.equal(spell.leftMode,'idle');assert(!spell.heart.locked);
const c=new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(...args)=>assert(args.filter(x=>typeof x==='number').every(Number.isFinite))});
for(const quality of ['high','balanced','low'])for(const reduced of [false,true]){const v=new BlackHoleView();for(const now of [0,300,1200,2000,3500])v.render(c,{now,W:390,H:700,x:195,y:300,r:80,phase:now>=2000?'closing':'active',at:0,exitAt:2000,quality,reduced})}
console.log('PASS: paired inward palms, front/outward/single/ambiguous rejection, hold/release, spell priority, all tiers finite');
