import assert from 'node:assert/strict';
import {drawUltra} from './dist/ultra-view.mjs';
import {GRAPHICS} from './dist/graphics.mjs';
let draws=0;const c=new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(...args)=>{assert(args.filter(x=>typeof x==='number').every(Number.isFinite));if(k==='fillRect')draws++}});
for(const reduced of [false,true])for(const burst of [0,.5,1])drawUltra(c,{W:390,H:700,now:6000,x:195,y:300,r:80,formation:.5,compression:.5,burst,reduced});
assert(draws>=6000);assert.equal(GRAPHICS.balanced.heart,2200);assert.equal(GRAPHICS.balanced.glow,24);assert(GRAPHICS.high.heart>GRAPHICS.balanced.heart);
console.log('PASS: ultra geometry finite in burst/reduced-motion, previous high preserved in balanced');
