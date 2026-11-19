import assert from 'node:assert/strict';
import {SpellState,HandRouter,classify} from './dist/logic.mjs';
import {shapes,interpolate} from './dist/geometry.mjs';
function hand(n){const lm=Array.from({length:21},()=>({x:.5,y:.8}));lm[0]={x:.5,y:.9};for(const [i,b] of [5,9,13,17].entries()){lm[b]={x:.4+i*.07,y:.7};lm[b+1]={x:.4+i*.07,y:.6};lm[b+3]={x:.4+i*.07,y:i<n?.3:.76}}lm[4]={x:.39,y:.3};return lm}
const cube=hand(1),sphere=hand(2),pyramid=hand(3),fist=hand(0),open=hand(4);
for(const [n,name] of ['fist','cube','sphere','pyramid','open'].entries())assert.equal(classify(hand(n),1280,720),name);
let now=0;const s=new SpellState();function feed(r,l,ms){for(let i=0;i<ms;i+=50){s.update(r,l,now,1280,720);now+=50}}
feed(null,sphere,600);assert(!s.on,'left must never summon');feed(cube,null,400);assert(s.on);assert.equal(s.shape,'cube');
feed(sphere,null,150);feed(cube,null,150);assert.equal(s.shape,'cube','brief transition must not switch shape');feed(sphere,null,400);assert.equal(s.shape,'sphere');feed(pyramid,null,400);assert.equal(s.shape,'pyramid');
feed(fist,open,500);assert(s.compressed);const rot=s.rotation,sz=s.target;feed(fist,cube,500);assert.equal(s.rotation,rot);assert.equal(s.target,sz,'left frozen while compressed');feed(cube,null,400);assert(!s.compressed);assert.equal(s.shape,'cube');
feed(cube,cube,350);const resized=s.target;feed(cube,open,350);assert.equal(s.leftMode,'rotate');assert.equal(s.target,resized,'rotation must not resize');
const tilted=open.map(p=>{const x=(p.x-.5)*1280,y=(p.y-.9)*720,a=.25;return {x:.5+(x*Math.cos(a)-y*Math.sin(a))/1280,y:.9+(x*Math.sin(a)+y*Math.cos(a))/720}});feed(cube,tilted,100);assert.notEqual(s.rotation,0);const rotated=s.rotation;feed(cube,cube,350);assert.equal(s.rotation,rotated,'scaling must not rotate');
feed(null,null,500);assert(s.on,'brief dropout grace');feed(null,null,1500);assert(!s.on,'long dropout dismisses');feed(cube,null,400);assert(s.on);feed(open,null,800);assert(!s.on,'open dismiss');
const r=new HandRouter();const detection=(lm,score=.99)=>({landmarks:[lm],handedness:[[{categoryName:'Left',score}]]});assert(!r.update(detection(cube,.6),0).Right);assert(!r.update(detection(cube),10).Right);assert(r.update(detection(cube),210).Right);const jump=cube.map(p=>({...p,x:p.x+.4}));assert(!r.update(detection(jump),250).Right);assert(!r.update({landmarks:[cube,cube],handedness:[[{categoryName:'Left',score:.99}],[{categoryName:'Left',score:.99}]]},300).Right);
const swapped=new HandRouter();swapped.update(detection(cube),0,true);assert(swapped.update(detection(cube),200,true).Left);
for(const mesh of Object.values(shapes)){assert.equal(mesh.length,240);assert(mesh.flat(2).every(Number.isFinite))}assert(interpolate(shapes.cube,shapes.sphere,1).flat(2).every((n,i)=>Math.abs(n-shapes.sphere.flat(2)[i])<1e-12));
console.log('PASS: right-only commands, gesture holds, shape changes, compress/rebuild, exclusive left modes, dropout timeout, uncertain/duplicate/jumping hands, handedness override, mesh morph');
