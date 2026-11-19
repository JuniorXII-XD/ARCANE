// Full-scene geometry choreography; deterministic trajectories avoid frame noise.
export function drawUltra(c,{W,H,now,x,y,r,alpha=1,formation=1,compression=0,burst=0,reduced=false}){
 const t=reduced?0:now/1000,energy=alpha*Math.min(1,formation*2);if(energy<=0)return;
 c.save();c.globalCompositeOperation='lighter';
 const aura=c.createRadialGradient(x,y,r*.25,x,y,r*3.8);aura.addColorStop(0,'#b849f000');aura.addColorStop(.25,'#dd39bc12');aura.addColorStop(.5,'#279ed510');aura.addColorStop(1,'#163acd00');c.fillStyle=aura;c.globalAlpha=energy;c.fillRect(0,0,W,H);
 // Concentric segmented seals with counter-rotating geometric inscriptions.
 for(let ring=0;ring<5;ring++){const radius=r*(1.15+ring*.34+burst*3)*(1-compression*.25),tilt=.35+ring*.14,phase=t*(ring%2?-.16:.12)+ring;
 c.strokeStyle=ring%2?'#ff78d5':'#8aeeff';c.lineWidth=ring===0?1.5:.7;c.globalAlpha=energy*(.3-ring*.035);
 for(let part=0;part<12;part++){const a=part*Math.PI/6+phase;c.beginPath();c.ellipse(x,y,radius,radius*tilt,ring*.38,a,a+.37);c.stroke()}
 for(let j=0;j<18;j++){const a=j*Math.PI/9+phase,px=x+Math.cos(a)*radius,py=y+Math.sin(a)*radius*tilt;c.save();c.translate(px,py);c.rotate(a+t*.1);c.strokeRect(-2.5,-2.5,5,5);c.restore()}
 }
 // Long streams of cubical light curve towards the focal object.
 for(let i=0;i<1000;i++){const phase=(i*.61803398875+t*(.018+(i%5)*.004))%1,a=i*2.399963+t*.08,depth=.5+(i%13)/13,spread=r*(.9+phase*3.1+burst*5),angle=a+phase*.75*(1-compression),px=x+Math.cos(angle)*spread,py=y+Math.sin(angle)*spread*.7+(phase-.5)*r*.5,size=(.6+(i%7)*.35)*depth;
 c.globalAlpha=energy*Math.sin(phase*Math.PI)*(.12+depth*.32);c.fillStyle=i%3?'#72dcff':'#fb70d0';c.fillRect(px,py,size,size);
 if(i%8===0&&!reduced){c.strokeStyle=i%3?'#72dcff':'#fb70d0';c.lineWidth=.5;c.globalAlpha*=.3;c.beginPath();c.moveTo(px,py);c.lineTo(px-Math.cos(angle+.5)*r*.09,py-Math.sin(angle+.5)*r*.05);c.stroke()}
 }
 // Suspended faceted shards, with distinct silhouettes from the point field.
 for(let i=0;i<36;i++){const a=i*2.399+t*(i%2?.08:-.06),band=1.7+(i%7)*.16+burst*4,px=x+Math.cos(a)*r*band,py=y+Math.sin(a)*r*band*.65,s=3+i%6;c.save();c.translate(px,py);c.rotate(a+t*.2);c.globalAlpha=energy*.25;c.strokeStyle=i%2?'#efa1ec':'#a0eeff';c.fillStyle=i%2?'#fa5ccf18':'#64eaff18';c.lineWidth=.8;c.beginPath();c.moveTo(0,-s*1.7);c.lineTo(s,s);c.lineTo(-s,s*.5);c.closePath();c.fill();c.stroke();c.restore()}
 if(formation<1&&!reduced){const wave=1-formation;c.globalAlpha=alpha*wave*.65;c.strokeStyle='#d2faff';c.lineWidth=1.2;for(let j=0;j<3;j++){const radius=r*(1+formation*(4+j));c.beginPath();c.ellipse(x,y,radius,radius*.55,-.25+j*.25,0,Math.PI*2);c.stroke()}}
 c.restore();
}
