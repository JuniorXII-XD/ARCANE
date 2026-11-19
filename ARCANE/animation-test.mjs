import assert from 'node:assert/strict';
import {FrameClock} from './dist/frame-clock.mjs';
import {shapes,interpolate,interpolateInto} from './dist/geometry.mjs';
for(const hz of [60,90,120,144])for(const fps of [30,60]){const c=new FrameClock();let n=0;for(let i=0;i<hz*10;i++){const dt=c.tick(i*1000/hz,fps);if(dt!==null){n++;assert(dt>=0&&dt<=.06)}}assert(Math.abs(n-fps*10)<=1,`${hz}Hz / ${fps}: ${n}`)}
const c=new FrameClock();c.tick(0,60);assert.equal(c.tick(1,60),null);assert.equal(c.tick(2000,60),.06);assert.equal(c.tick(2001,60),null);c.reset();assert.equal(c.tick(5000,30),.016);
const out=structuredClone(shapes.cube),line=out[0],point=out[0][0];for(const t of [0,.25,.5,1]){assert.equal(interpolateInto(shapes.cube,shapes.sphere,t,out),out);assert.deepEqual(out,interpolate(shapes.cube,shapes.sphere,t));assert.equal(out[0],line);assert.equal(out[0][0],point)}
console.log('PASS: steady cadence across 60/90/120/144Hz, resume clamp, quality reset, reusable morph buffer');
