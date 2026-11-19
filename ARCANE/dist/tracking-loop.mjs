// Camera scheduling is independent of visual frame caps; Detector still permits one in-flight image.
export class TrackingLoop{
 constructor(tick,interval,{clock=()=>performance.now(),schedule=(callback,ms)=>globalThis.setTimeout(callback,ms),cancel=id=>globalThis.clearTimeout(id)}={}){this.tick=tick;this.interval=interval;this.clock=clock;this.schedule=schedule;this.cancel=cancel;this.timer=null;this.generation=0}
 start(){this.stop();const generation=this.generation;const run=()=>{if(generation!==this.generation)return;this.tick(this.clock());if(generation===this.generation)this.timer=this.schedule(run,Math.max(16,this.interval()))};run()}
 stop(){this.generation++;if(this.timer!==null)this.cancel(this.timer);this.timer=null}
}
