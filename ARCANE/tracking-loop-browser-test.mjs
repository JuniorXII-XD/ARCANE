import assert from 'node:assert/strict';
import {TrackingLoop} from './dist/tracking-loop.mjs';
// Model Window timers' required receiver; ordinary Node timers do not enforce this.
const savedSet=globalThis.setTimeout,savedClear=globalThis.clearTimeout;let id=0,ticks=0;const pending=new Map();
globalThis.setTimeout=function(callback,ms){assert.equal(this,globalThis,'setTimeout must be called on the browser global');assert(ms>=16);pending.set(++id,callback);return id};
globalThis.clearTimeout=function(id){assert.equal(this,globalThis,'clearTimeout must be called on the browser global');pending.delete(id)};
try{const loop=new TrackingLoop(()=>ticks++,()=>50,{clock:()=>100});loop.start();assert.equal(ticks,1);let [key,next]=pending.entries().next().value;pending.delete(key);next();assert.equal(ticks,2);assert.equal(pending.size,1);loop.stop();assert.equal(pending.size,0);next();assert.equal(ticks,2);loop.start();assert.equal(ticks,3);loop.stop();assert.equal(pending.size,0);console.log('PASS: browser timer receiver, start/tick/stop/restart, stale callbacks cancelled')}finally{globalThis.setTimeout=savedSet;globalThis.clearTimeout=savedClear}
