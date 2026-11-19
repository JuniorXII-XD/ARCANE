import assert from 'node:assert/strict';
import {HeartState,isMiniHeart} from './dist/heart-state.mjs';
import {SpellState} from './dist/logic.mjs';
import {HeartView} from './dist/heart-view.mjs';
function hand(n){const lm=Array.from({length:21},()=>({x:.5,y:.8}));lm[0]={x:.5,y:.9};for(const [i,b] of [5,9,13,17].entries()){lm[b]={x:.4+i*.07,y:.7};lm[b+1]={x:.4+i*.07,y:.6};lm[b+3]={x:.4+i*.07,y:i<n?.3:.76}}lm[4]={x:.39,y:.3};return lm}
const mini=hand(0);mini[6]={x:.4,y:.5};mini[7]={x:.46,y:.44};mini[8]={x:.51,y:.39};mini[3]={x:.54,y:.5};mini[4]={x:.42,y:.38};
assert(isMiniHeart(mini,1280,720));for(let n=0;n<5;n++)assert(!isMiniHeart(hand(n),1280,720));assert(!isMiniHeart(null));
const h=new HeartState();for(let t=0;t<3000;t+=50)h.update(mini,t,1280,720);assert.equal(h.phase,'arming');h.update(mini,3000,1280,720);assert.equal(h.phase,'active');h.update(null,3300,1280,720,{uncertain:true});assert.equal(h.phase,'active');for(let t=3350;t<=3850;t+=50)h.update(hand(4),t,1280,720);assert.equal(h.phase,'burst');h.update(mini,6650,1280,720);assert.equal(h.phase,'idle');h.update(mini,10000,1280,720);assert.equal(h.phase,'idle');
const s=new SpellState();for(let t=0;t<=3200;t+=50)s.update(mini,null,t,1280,720);assert.equal(s.heart.phase,'active');assert(s.on);const shape=s.shape;
for(let t=3250;t<=3550;t+=50)s.update(hand(3),hand(4),t,1280,720);assert.equal(s.shape,shape);assert.equal(s.leftMode,'rotate');assert.equal(s.heart.phase,'active');s.update(mini,hand(1),3600,1280,720);for(let t=3650;t<4000;t+=50)s.update(mini,hand(1),t,1280,720);assert.equal(s.leftMode,'scale');assert.equal(s.shape,shape);s.update(null,null,4500,1280,720);assert.equal(s.heart.phase,'active');s.update(null,null,6000,1280,720);assert.equal(s.heart.phase,'burst');assert(!s.on);
const v=new HeartView(320),c={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillRect(...a){assert(a.every(Number.isFinite))}};const args={W:390,H:700,phase:'active',at:0,quaternion:[0,0,0,1],scale:1};for(let now=0;now<5000;now+=50)v.render(c,{...args,now});assert.equal(v.particles.length,320);const before=v.particles.map(p=>[p.px,p.py]);v.render(c,{...args,phase:'burst',now:5000,releaseAt:5000});v.particles.forEach((p,i)=>assert.deepEqual([p.px,p.py],before[i]));v.render(c,{...args,phase:'burst',now:7800,releaseAt:5000});assert.equal(c.globalAlpha,0);v.reset();assert.equal(v.particles.length,0);
console.log('PASS: 3-second continuous hold, ordinary gestures rejected, grace/release/cooldown, shape lock, left control, particle continuity, cleanup');
// Emoji-like compact crossing at a joint must survive small landmark errors.
const joint=structuredClone(mini);joint[3]={x:.49,y:.47};joint[4]={x:.42,y:.38};
assert(isMiniHeart(joint,1280,720),'crossing near joint');
for(const angle of [-.5,0,.5])for(const scale of [.65,1,1.2]){
 const rotated=mini.map(p=>{const x=(p.x-.5)*1280,y=(p.y-.6)*720;return{x:.5+(x*Math.cos(angle)-y*Math.sin(angle))*scale/1280,y:.6+(x*Math.sin(angle)+y*Math.cos(angle))*scale/720}});
 assert(isMiniHeart(rotated,1280,720),'rotation and distance');
}
const pinch=structuredClone(mini);pinch[4]={...pinch[8]};assert(!isMiniHeart(pinch,1280,720),'touching pinch');
const palmFacing=mini.map(p=>({...p,x:1-p.x}));assert(!isMiniHeart(palmFacing,1280,720),'wrong face');
const flicker=new HeartState();for(let t=0;t<=2000;t+=50)flicker.update(mini,t,1280,720);const progress=flicker.progress;flicker.update(hand(0),2050,1280,720);assert.equal(flicker.progress,progress,'brief mismatch preserves evidence');flicker.update(mini,2100,1280,720);assert.equal(flicker.phase,'arming');flicker.update(hand(0),2150,1280,720);flicker.update(hand(0),2400,1280,720);assert.equal(flicker.phase,'idle','clear release resets hold');
console.log('PASS: joint crossing, rotated/scaled pose, pinch/face rejection, brief flicker and release reset');
