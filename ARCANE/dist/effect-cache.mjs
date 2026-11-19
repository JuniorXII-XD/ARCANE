// Small reusable soft-light textures. Animated positions stay live; gradients do not rebuild each frame.
export class EffectCache{
 constructor(limit=8){this.limit=limit;this.items=new Map();this.builds=0}
 get(key,stops){if(this.items.has(key))return this.items.get(key);let image;if(typeof OffscreenCanvas!=='undefined')image=new OffscreenCanvas(256,256);else if(typeof document!=='undefined'){image=document.createElement('canvas');image.width=image.height=256}else return null;const c=image.getContext('2d');if(!c)return null;const g=c.createRadialGradient(128,128,0,128,128,128);for(const [offset,color]of stops)g.addColorStop(offset,color);c.fillStyle=g;c.fillRect(0,0,256,256);if(this.items.size>=this.limit)this.items.delete(this.items.keys().next().value);this.items.set(key,image);this.builds++;return image}
 draw(c,key,x,y,radius,stops){const image=typeof c.drawImage==='function'?this.get(key,stops):null;if(image)c.drawImage(image,x-radius,y-radius,radius*2,radius*2);else{const g=c.createRadialGradient(x,y,0,x,y,radius);for(const [offset,color]of stops)g.addColorStop(offset,color);c.fillStyle=g;c.fillRect(x-radius,y-radius,radius*2,radius*2)}}
}
export const effectCache=new EffectCache();
export const GLOWS=Object.freeze({cube:[[0,'#aa56eb22'],[.5,'#ff42bd09'],[1,'#61e8ff00']],aura:[[0,'#f8beff25'],[.32,'#c138eb23'],[.65,'#2876d810'],[1,'#61e8ff00']],heart:[[0,'#ff42bd20'],[.45,'#dd37b511'],[1,'#61e8ff00']]});
