// Accumulate observed evidence, never infer a held pose from two widely spaced samples.
export class EvidenceHold{
 constructor({minSamples=3,grace=160,capMs=180,maxGap=750}={}){this.options={minSamples,grace,capMs,maxGap};this.clear()}
 clear(){this.key=null;this.since=0;this.ready=false;this.progress=0;this.elapsed=0;this.samples=0;this.lastAt=null;this.lastValid=null;this.wasValid=false}
 update(key,now,ms){const {minSamples,grace,capMs,maxGap}=this.options;const gap=this.lastAt===null?0:now-this.lastAt;if(gap>maxGap||gap<0)this.clear();
  if(!key){if(this.lastValid!==null&&now-this.lastValid>grace)this.clear();this.ready=false;this.lastAt=now;this.wasValid=false;return false}
  if(key!==this.key||!this.wasValid&&this.lastValid!==null&&now-this.lastValid>grace){this.clear();this.key=key;this.since=now}
  if(this.wasValid&&this.lastAt!==null)this.elapsed+=Math.min(capMs,Math.max(0,now-this.lastAt));this.samples++;this.lastAt=this.lastValid=now;this.wasValid=true;this.progress=Math.min(1,this.elapsed/ms);this.ready=this.progress>=1&&this.samples>=minSamples;return this.ready;
 }
}
export class ScalarFilter{
 constructor(){this.value=null;this.last=0}
 reset(){this.value=null;this.last=0}
 update(value,now,deadzone=.012){if(!Number.isFinite(value))return this.value;if(this.value===null||now-this.last>600){this.value=value;this.last=now;return value}const dt=Math.max(1,now-this.last),delta=value-this.value;this.last=now;if(Math.abs(delta)<=deadzone)return this.value;const a=1-Math.exp(-dt/(Math.abs(delta)>.12?35:90));this.value+=delta*a;return this.value}
}
