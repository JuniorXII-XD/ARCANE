import assert from 'node:assert/strict';
import {Detector} from './dist/detector.mjs';
let transfers=0,lastBitmap,finish;
globalThis.createImageBitmap=async()=>lastBitmap={close(){this.closed=true}};
globalThis.Worker=class{postMessage(message){if(message.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready'}}));else{transfers++;finish=()=>this.onmessage({data:{type:'result',id:message.id,result:{landmarks:[],handedness:[]}}})}}terminate(){}};
const d=await Detector.create();assert(d.worker);const p=d.detect({videoWidth:1280,videoHeight:720},100);await Promise.resolve();await assert.rejects(()=>d.detect({videoWidth:1280,videoHeight:720},101),/already in flight/);assert.equal(transfers,1);finish();assert.deepEqual(await p,{landmarks:[],handedness:[]});assert(!d.busy);const next=d.detect({videoWidth:640,videoHeight:480},200);await Promise.resolve();finish();await next;assert.equal(transfers,2);console.log('PASS: worker init, one in-flight frame, result delivery, slot release');
