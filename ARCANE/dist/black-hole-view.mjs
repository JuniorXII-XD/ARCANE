const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
export class BlackHoleView{
 constructor(){this.reset()}
 reset(){this.x=null;this.y=null;this.r=null;this.last=null}
 render(c,{now,W,H,x,y,r,phase,at,exitAt,quality='balanced',reduced=false}){
 const dt=this.last===null?.016:Math.min(.06,(now-this.last)/1000);this.last=now;const a=1-Math.exp(-dt*9);this.x=this.x===null?x:this.x+(x-this.x)*a;this.y=this.y===null?y:this.y+(y-this.y)*a;this.r=this.r===null?r:this.r+(r-this.r)*a;x=this.x;y=this.y;r=this.r;
 const closing=phase==='closing',fade=closing?1-smooth((now-exitAt)/1500):1,form=reduced?1:smooth((now-at)/1100);r*=Math.max(.001,form*(closing?fade:1));const t=reduced?0:now/1000,high=quality==='high',count=high?18000:quality==='low'?480:5000;
 c.save();c.translate(x,y);c.rotate(-.17);c.globalAlpha=fade;
 const halo=c.createRadialGradient(0,0,r*.4,0,0,r*3.8);halo.addColorStop(0,'#662be022');halo.addColorStop(.4,'#db47b31c');halo.addColorStop(1,'#38106b00');c.fillStyle=halo;c.fillRect(-r*4,-r*4,r*8,r*8);
 // Rear accretion disk, gravitationally lensed upper image, then the horizon.
 const particle=(px,py,size,color,alpha)=>{c.globalAlpha=alpha*fade;c.fillStyle=color;c.fillRect(px-size/2,py-size/2,size,size)};
 const hash=i=>{const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v)};
 const disk=front=>{c.globalCompositeOperation='lighter';for(let i=0;i<count;i++){const band=hash(i),rad=r*(1.16+Math.pow(band,1.4)*2.3),angle=hash(i+7891)*Math.PI*2+t*(.22+1.1/(1+band*3)),z=Math.sin(angle);if((z>=0)!==front)continue;const px=Math.cos(angle)*rad,py=z*rad*.24+(Math.sin(i*7.1)*r*.025),size=(high?1.4:1.1)+(i%5)*.25,flux=.65+.35*Math.sin(angle*5-band*24-t*2),color=band<.18?'#e6faff':i%3?'#7adfff':'#ff6ecb';particle(px,py,size,color,(.12+.55*(1-band))*flux*(front?1:.65));if(high&&i%11===0)particle(px,py,size*4,color,.025*flux)}};
 disk(false);
 // Bent light above the event horizon is a projected second image of the disk.
 c.globalCompositeOperation='lighter';for(let image=0;image<2;image++)for(let i=0;i<count*.28;i++){const angle=hash(i+201)*Math.PI,band=hash(i+101),rad=r*(1.02+band*.65),px=Math.cos(angle)*rad,py=(image===0?-1:1)*Math.sin(angle)*rad*(image===0?1.08:1.02),flux=.6+.4*Math.sin(angle*8+band*30-t*1.4);particle(px,py,.9+(i%3)*.45,i%3?'#b8f5ff':'#ff8cda',(.1+(1-band)*.3)*flux*(image===0?1:.45))}
 c.globalCompositeOperation='source-over';c.globalAlpha=fade;c.fillStyle='#03020b';c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();
 c.globalCompositeOperation='lighter';for(let j=0;j<3;j++){c.globalAlpha=fade*(.65-j*.16);c.strokeStyle=j%2?'#ed71cf':'#b6f1ff';c.lineWidth=j===0?1.8:.7;c.beginPath();c.ellipse(0,0,r*(1.01+j*.055),r*(1.01+j*.055),0,0,Math.PI*2);c.stroke()}
 // Front disk occludes the lower half of the horizon, giving real depth.
 disk(true);
 if(high&&!reduced){for(let i=0;i<260;i++){const phase=(hash(i+405)+t*.1)%1,angle=i*2.399+t*.15,rad=r*(1.3+phase*4),px=Math.cos(angle)*rad,py=Math.sin(angle)*rad*.45;c.globalAlpha=fade*Math.sin(phase*Math.PI)*.14;c.strokeStyle=i%2?'#78eaff':'#f784d8';c.lineWidth=.6;c.beginPath();c.moveTo(px,py);c.lineTo(px-Math.cos(angle+.8)*r*.1,py-Math.sin(angle+.8)*r*.055);c.stroke()}}
 if(high){for(let i=0;i<1200;i++){const k=(i*.618+t*.08)%1,angle=i*2.399+t*.12,rad=r*(1.3+4*(1-k));particle(Math.cos(angle)*rad,Math.sin(angle)*rad*.7,.6+i%3*.5,i%2?'#74dfff':'#ff7cdb',Math.sin(k*Math.PI)*.28)}}
 c.restore();
 }
}
