import {effectCache,GLOWS} from './effect-cache.mjs';
import {matrixQ} from './orientation.mjs';
const smooth=p=>{p=Math.max(0,Math.min(1,p));return p*p*(3-2*p)};
export class HeartView{
 constructor(count=640){this.quality='balanced';this.sprites=null;this.count=count;this.particles=[];this.at=null;this.burstAt=null}
 setQuality(quality,count){this.quality=quality;this.count=count;if(this.particles.length>count)this.particles.length=count;else if(this.particles.length&&this.particles.length<count&&this.burstAt===null){const old=this.particles,at=this.at;this.seed(at);for(let i=0;i<old.length;i++)this.particles[i]=old[i]}if(quality==='high'&&!this.sprites&&typeof OffscreenCanvas!=='undefined')this.sprites=['#ff64c5','#70eaff','#ffe4fa'].map(color=>{const sprite=new OffscreenCanvas(32,32),c=sprite.getContext('2d'),g=c.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,color);g.addColorStop(.16,color+'aa');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(0,0,32,32);return sprite})}
 reset(){this.at=null;this.burstAt=null;this.particles=[]}
 seed(at){this.at=at;this.burstAt=null;
  const rings=this.quality==='low'?9:25,columns=Math.ceil(this.count/rings),hash=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n)};
  this.particles=Array.from({length:this.count},(_,i)=>{const ring=Math.floor(i/columns),column=i%columns,t=column/columns*Math.PI*2,latitude=((ring+.5)/rings-.5)*Math.PI,fill=Math.cos(latitude),x=Math.pow(Math.sin(t),3),y=(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/16;
   return{x:x*fill,y:-(y*fill+.08),z:Math.sin(latitude)*.42,ring,column,sx:hash(i+1),sy:hash(i+17),depth:hash(i+51),twinkle:hash(i+23)*6.28,size:.8+hash(i+39)*1.4,px:0,py:0,alpha:0,vx:0,vy:0,bx:0,by:0};});
 }
 render(c,{now,W,H,phase,at,releaseAt,quaternion,scale=1,reduced=false}){
  if(this.at!==at)this.seed(at);const age=(now-at)/1000,m=matrixQ(quaternion),gather=smooth((age-1.4)/2.6),radius=Math.min(W,H)*.26*scale,cx=W*.5,cy=H*.46;
  if(phase==='burst'&&this.burstAt!==releaseAt){this.burstAt=releaseAt;for(const p of this.particles){p.bx=p.px;p.by=p.py;const a=Math.atan2(p.py-cy,p.px-cx)+(Math.random()-.5)*.6,speed=.4+Math.random()*.65;p.vx=Math.cos(a)*W*speed;p.vy=Math.sin(a)*H*speed}}
  c.save();c.globalCompositeOperation='lighter';
  const high=this.quality==='high',low=this.quality==='low';
  if(high&&gather>.1){c.globalAlpha=phase==='burst'?1-smooth((now-releaseAt)/1000):gather;effectCache.draw(c,'heart',cx,cy,radius*1.8,GLOWS.heart)}
  if(high&&phase==='burst'&&!reduced){const t=(now-releaseAt)/2800;c.strokeStyle='#ff8fdd';c.lineWidth=1.5;c.globalAlpha=Math.max(0,(1-t*2)*.6);c.beginPath();c.ellipse(cx,cy,radius*(1+t*7),radius*(.65+t*5),0,0,Math.PI*2);c.stroke()}

  for(let i=0;i<this.particles.length;i++){const p=this.particles[i],previousX=p.px,previousY=p.py;let alpha,size=p.size;
   if(phase==='burst'){const t=Math.max(0,(now-releaseAt)/2800),travel=1-Math.exp(-t*3);p.px=p.bx+(reduced?0:p.vx*travel);p.py=p.by+(reduced?0:p.vy*travel);alpha=p.alpha*(1-smooth(t));}
   else{const pulse=1+(reduced?0:Math.pow(Math.max(0,Math.sin(age*2.2)),8)*.035*gather),x=p.x*pulse,y=p.y*pulse,z=p.z,X=m[0]*x-m[1]*y+m[2]*z,Y=m[3]*x-m[4]*y+m[5]*z,Z=m[6]*x-m[7]*y+m[8]*z,perspective=3/(3-Z),tx=cx+X*radius*perspective,ty=cy-Y*radius*perspective;
    const sx=p.sx*W+(reduced?0:Math.sin(age*.45+p.twinkle)*14),sy=p.sy*H+(reduced?0:Math.cos(age*.5+p.twinkle)*16);const swirl=reduced?0:Math.sin(gather*Math.PI)*(1-gather)*radius*.65,angle=age*.7+p.twinkle;p.px=sx+(tx-sx)*gather+Math.cos(angle)*swirl;p.py=sy+(ty-sy)*gather+Math.sin(angle)*swirl;
    alpha=smooth(age/1.2-p.depth*.45)*(.32+.32*(Z+.5)+.22*Math.pow(.5+.5*Math.sin(p.y*12-age*3),6));p.alpha=alpha;size*=(1+gather*.2)*perspective;
   }
   if(high&&phase==='burst'&&i%4===0&&!reduced){c.globalAlpha=Math.max(0,alpha*.4);c.strokeStyle=i%2?'#ff8cda':'#92f1ff';c.lineWidth=.8;c.beginPath();c.moveTo(previousX,previousY);c.lineTo(p.px,p.py);c.stroke()}
   // Faceted meridians knit the square particles into a readable crystal heart.
   if(!low&&phase!=='burst'&&gather>.7&&p.column>0&&i%(high?2:4)===0){const q=this.particles[i-1];c.globalAlpha=alpha*(gather-.7)*.65;c.strokeStyle=p.z>0?'#75eaff':'#ff5dc8';c.lineWidth=.55;c.beginPath();c.moveTo(q.px,q.py);c.lineTo(p.px,p.py);c.stroke()}
   c.globalAlpha=Math.max(0,alpha);if(high&&this.sprites){const glow=size*5;c.globalAlpha*=.45;c.drawImage(this.sprites[i%19===0?2:p.x>0?1:0],p.px-glow/2,p.py-glow/2,glow,glow);c.globalAlpha=Math.max(0,alpha)}c.fillStyle=i%19===0?'#ffe4fa':p.x>0?'#38ddff':'#ff36b8';c.fillRect(p.px-size/2,p.py-size/2,size,size);
   if(!low&&i%(high?4:8)===0){c.globalAlpha*=.12;c.fillRect(p.px-size*2,p.py-size*2,size*4,size*4)}
  }c.restore();
 }
}
