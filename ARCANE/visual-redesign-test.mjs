import assert from 'node:assert/strict';
import {drawCrystalDetail} from './dist/crystal-detail.mjs';
import {HeartView} from './dist/heart-view.mjs';
const context=new Proxy({},{get:(o,k)=>o[k]??((...args)=>{for(const v of args)if(typeof v==='number')assert(Number.isFinite(v),k)}),set:(o,k,v)=>{if(k==='globalAlpha')assert(v>=0&&v<=1);o[k]=v;return true}});
for(const quality of ['high','balanced','low']){
 for(const shape of ['cube','sphere','pyramid'])for(const compression of [0,.5,1])for(const formation of [0,.5,1])for(const style of ['facets','wire','nodes'])drawCrystalDetail(context,{x:300,y:250,r:100,shape,quaternion:[0,.70710678,0,.70710678],now:2000,formation,compression,quality,style});
 const view=new HeartView(180);view.setQuality(quality,180);
 const options={W:800,H:600,at:0,quaternion:[0,0,0,1],phase:'active'};
 // Avoid sprite cache creation in Node; low exercises the particle path for every orientation.
 view.quality='low';
 for(const quaternion of [[0,0,0,1],[0,Math.SQRT1_2,0,Math.SQRT1_2]])for(const now of [0,1500,3000,5000])view.render(context,{...options,quaternion,now});
 assert(Math.max(...view.particles.map(p=>p.z))-Math.min(...view.particles.map(p=>p.z))>.7,'heart has real thickness');
 view.render(context,{...options,phase:'burst',now:5100,releaseAt:5100});view.render(context,{...options,phase:'burst',now:7900,releaseAt:5100});assert.equal(context.globalAlpha,0);
 view.reset();assert.equal(view.particles.length,0);assert.equal(view.burstAt,null);
 view.render(context,{...options,at:8000,now:8000});assert(view.particles.every(p=>p.alpha===0),'restart has no stale burst');
}
console.log('PASS: crystal detail tiers, all solids, formation/compression/style combinations, volumetric heart, terminal fade, reset/restart');
