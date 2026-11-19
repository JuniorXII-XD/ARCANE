import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {drawCrystalDetail} from './dist/crystal-detail.mjs';
const trace=[];
const context=new Proxy({},{get:(_,key)=>(...args)=>trace.push([key,...args]),set:(_,key,value)=>{trace.push([key,value]);return true}});
for(const shape of ['cube','sphere','pyramid'])for(const quality of ['low','balanced','high'])for(const compression of [0,.5,1])for(const style of ['wire','nodes','facets'])drawCrystalDetail(context,{shape,quality,compression,style,x:500,y:300,r:150,quaternion:[0,.6,0,.8],now:2345,formation:.7});
const digest=createHash('sha256').update(JSON.stringify(trace,(_,v)=>typeof v==='number'?Math.round(v*1e6)/1e6:v)).digest('hex');
assert.equal(digest,'19914ea1b1105463b65a615629e70f01f4f70ba389c875fad05115ce88b9a7b8');console.log('PASS: 81 rendering traces preserved, no Git history required');
