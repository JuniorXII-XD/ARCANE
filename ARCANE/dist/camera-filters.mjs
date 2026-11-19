const clamp=x=>Math.max(0,Math.min(1,x));
export function cameraRegion(W,H,fit,point,r){const cx=point?.x??W/2,cy=point?point.y-r*1.65-25:H*.45,pad=r*1.65+24,x=Math.max(0,fit.x,cx-pad),y=Math.max(0,fit.y,cy-pad),right=Math.min(W,fit.x+fit.w,cx+pad),bottom=Math.min(H,fit.y+fit.h,cy+pad);return right>x&&bottom>y?{x,y,w:right-x,h:bottom-y}:null}
export class CameraFilters{
 constructor(factory=()=>{if(typeof OffscreenCanvas!=='undefined')return new OffscreenCanvas(1,1);return document.createElement('canvas')}){this.factory=factory;this.options={vision:true,glitch:true,heart:true};this.enabled=true;this.buffers=null;this.reset()}
 reset(){this.last=0;this.heartMix=0;this.shape=null;this.visible=false;this.glitchAt=-Infinity;this.cachedAt=-Infinity;this.cachedRegion=null}
 update(now,{shape,visible,heartPhase='idle',reduced=false}={}){const dt=this.last?Math.min(250,Math.max(0,now-this.last)):16;this.last=now;const target=this.enabled&&this.options.heart&&(heartPhase==='active'||heartPhase==='burst')?1:0;this.heartMix+=(target-this.heartMix)*(1-Math.exp(-dt/600));if(this.visible&&visible&&shape!==this.shape&&this.enabled&&this.options.glitch&&!reduced)this.glitchAt=now;this.shape=shape;this.visible=visible;return this.heartMix}
 setEnabled(enabled){this.enabled=enabled;if(!enabled){this.heartMix=0;this.glitchAt=-Infinity}}
 grade(c,video,fit,W,H,now,{quality='balanced',point,r=80,reduced=false}={}){
  const vision=this.enabled&&this.options.vision,heart=this.enabled&&this.options.heart?this.heartMix:0;
  c.save();c.translate(W,0);c.scale(-1,1);if(vision)c.filter=quality==='low'?'saturate(.72)':'saturate(.68) contrast(1.06)';c.drawImage(video,fit.x,fit.y,fit.w,fit.h);c.restore();
  if(!this.enabled)return;
  c.save();c.beginPath();c.rect(fit.x,fit.y,fit.w,fit.h);c.clip();
  if(vision){c.globalCompositeOperation='soft-light';c.globalAlpha=.2;c.fillStyle='#492963';c.fillRect(fit.x,fit.y,fit.w,fit.h);c.globalAlpha=.1;c.fillStyle='#43bdd7';c.fillRect(fit.x,fit.y,fit.w,fit.h)}
  if(heart>.002){c.globalCompositeOperation='soft-light';c.globalAlpha=heart*.48;c.fillStyle='#d65a9d';c.fillRect(fit.x,fit.y,fit.w,fit.h);c.globalCompositeOperation='source-over';c.globalAlpha=heart*.11;c.fillStyle='#66368f';c.fillRect(fit.x,fit.y,fit.w,fit.h)}
  c.restore();
  if(this.options.glitch&&!reduced&&quality!=='low'&&now-this.glitchAt<600){const region=cameraRegion(W,H,fit,point,r);if(region)this.glitch(c,W,H,now,region,quality)}
 }
 initBuffers(w,h){if(!this.buffers)this.buffers=Array.from({length:5},()=>this.factory());for(const b of this.buffers)if(b.width!==w||b.height!==h){b.width=w;b.height=h}return this.buffers}
 glitch(c,W,H,now,region,quality){const age=(now-this.glitchAt)/600;if(age<0||age>=1)return;const envelope=Math.sin(age*Math.PI)*.65,refresh=quality==='high'?33:66;
  if(now-this.cachedAt>=refresh||!this.cachedRegion){const limit=quality==='high'?448:288,scale=Math.min(1,limit/region.w,limit/region.h),w=Math.max(1,Math.round(region.w*scale)),h=Math.max(1,Math.round(region.h*scale)),[sample,red,green,blue,mix]=this.initBuffers(w,h),s=sample.getContext('2d');
   s.clearRect(0,0,w,h);s.drawImage(c.canvas,region.x*c.canvas.width/W,region.y*c.canvas.height/H,region.w*c.canvas.width/W,region.h*c.canvas.height/H,0,0,w,h);
   for(const [image,color]of [[red,'#ff0000'],[green,'#00ff00'],[blue,'#0000ff']]){const q=image.getContext('2d');q.globalCompositeOperation='source-over';q.clearRect(0,0,w,h);q.drawImage(sample,0,0);q.globalCompositeOperation='multiply';q.fillStyle=color;q.fillRect(0,0,w,h);q.globalCompositeOperation='source-over'}
   const m=mix.getContext('2d');m.clearRect(0,0,w,h);m.globalCompositeOperation='lighter';const shift=(2+envelope*8)*scale;
   for(let i=0;i<6;i++){const y=Math.floor(i*h/6),height=i===5?h-y:Math.ceil(h/6),direction=i%2?1:-1;m.drawImage(red,0,y,w,height,direction*shift,y,w,height);m.drawImage(green,0,y,w,height,0,y,w,height);m.drawImage(blue,0,y,w,height,-direction*shift,y,w,height)}m.globalCompositeOperation='source-over';this.cachedAt=now;this.cachedRegion=region;
  }
  const q=this.cachedRegion;c.save();c.beginPath();c.rect(region.x,region.y,region.w,region.h);c.clip();c.globalAlpha=envelope;c.drawImage(this.buffers[4],q.x,q.y,q.w,q.h);c.restore();
 }
}
