import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=readFileSync('dist/app.js','utf8'),start=source.indexOf('let energyLoading=null'),end=source.indexOf('\n}',start)+2,loader=source.slice(start,end).replace("import('./energy-view.mjs')",'load()');
let loads=0,resolveLoad;class View{constructor(){this.canvas={}}setQuality(q){this.quality=q}resize(){}}
const env={graphics:{webgl:false},energyView:null,quality:'low',W:800,H:600,$:()=>({}),load:()=>{loads++;return new Promise(resolve=>resolveLoad=resolve)}};vm.createContext(env);vm.runInContext(loader,env);vm.runInContext('ensureEnergyView()',env);assert.equal(loads,0);
env.graphics.webgl=true;env.quality='high';vm.runInContext('ensureEnergyView();ensureEnergyView()',env);assert.equal(loads,1);
env.graphics.webgl=false;env.quality='low';resolveLoad({EnergyView:View});await vm.runInContext('energyLoading',env);assert(env.energyView.canvas.hidden);assert.equal(env.energyView.quality,'low');
const failed={...env,graphics:{webgl:true},energyView:null,load:()=>{loads++;return Promise.reject(Error('unavailable'))}};vm.createContext(failed);vm.runInContext(loader+'\nensureEnergyView()',failed);await vm.runInContext('energyLoading',failed);const count=loads;vm.runInContext('ensureEnergyView()',failed);assert.equal(loads,count);
console.log('PASS: low skips 3D, one import, quality changes during load, bounded failure');
