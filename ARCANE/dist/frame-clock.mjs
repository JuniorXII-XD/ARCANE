// Retain fractional frame time instead of losing it on every rendered frame.
export class FrameClock{
 constructor(){this.reset()}
 reset(){this.next=null;this.last=null;this.fps=null}
 tick(now,fps){const interval=1000/fps;if(this.fps!==fps){this.next=now;this.fps=fps}
 if(this.next!==null&&now+.5<this.next)return null;
 const dt=this.last===null?.016:Math.min(.06,Math.max(0,(now-this.last)/1000));this.last=now;
 const scheduled=this.next??now;this.next=scheduled+(Math.floor(Math.max(0,now-scheduled+.5)/interval)+1)*interval;
 return dt;
 }
}
