import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.174.0/build/three.module.js';
import {solids,vertexPoints,deformVertex} from './geometry.mjs';
const VERTEX=`
varying vec2 vUv; varying vec3 vN; varying vec3 vView; varying vec3 vLocal;
void main(){vUv=uv;mat3 m=mat3(instanceMatrix);vec3 scales=max(vec3(dot(m[0],m[0]),dot(m[1],m[1]),dot(m[2],m[2])),vec3(0.000001));vN=normalize(normalMatrix*m*(normal/scales));vec4 p=instanceMatrix*vec4(position,1.0);vLocal=p.xyz;vec4 mv=modelViewMatrix*p;vView=-mv.xyz;gl_Position=projectionMatrix*mv;}`;
const FRAGMENT=`
varying vec2 vUv; varying vec3 vN; varying vec3 vView; varying vec3 vLocal;
uniform float uTime;uniform float uEnergy;uniform float uOpacity;uniform float uNode;
void main(){vec3 N=normalize(vN),V=normalize(vView);float rim=pow(1.0-abs(dot(N,V)),2.2);float shift=clamp(vLocal.x*.38+.5,0.0,1.0);vec3 pink=vec3(1.0,.09,.55),cyan=vec3(.16,.85,1.0);vec3 tint=mix(pink,cyan,shift);float phase=fract(vUv.y*1.8-uTime*(.65+uEnergy*.9)+vLocal.y*.12);float wave=exp(-pow((phase-.5)*7.0,2.0));float heartbeat=.5+.5*sin(uTime*3.5+length(vLocal)*3.0);float energy=wave*(.7+uEnergy*1.8);float lighting=.2+.8*max(0.0,dot(N,normalize(vec3(-.5,.7,1.0))));vec3 color=tint*(.48+lighting*.5+rim*.85+energy);color=mix(color,vec3(.85,.97,1.0),wave*.45+uNode*lighting*.25);float alpha=(.42+rim*.43+wave*.15)*uOpacity;gl_FragColor=vec4(color*(1.0+uEnergy*.7+uNode*.22),alpha);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const coreVerts=[ [1,1,0],[1,-1,0],[-1,1,0],[-1,-1,0],[1,0,1],[1,0,-1],[-1,0,1],[-1,0,-1],[0,1,1],[0,1,-1],[0,-1,1],[0,-1,-1] ];
const coreEdges=[];for(let i=0;i<12;i++)for(let j=i+1;j<12;j++)if(coreVerts[i].reduce((s,v,k)=>s+(v-coreVerts[j][k])**2,0)===2)coreEdges.push([i,j]);
export class EnergyView{
 constructor(container){
  this.quality='balanced';this.healthy=true;this.width=0;this.height=0;this.style='facets';
  this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance',premultipliedAlpha:true});this.renderer.setClearColor(0x000000,0);this.renderer.setPixelRatio(1);this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
  this.canvas=this.renderer.domElement;this.canvas.className='energy-canvas';this.canvas.setAttribute('aria-hidden','true');container.appendChild(this.canvas);
  this.renderer.debug.onShaderError=()=>{this.healthy=false;this.canvas.hidden=true};
  this.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.healthy=false;this.canvas.hidden=true});
  this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(35,1,.1,5000);this.group=new THREE.Group();this.scene.add(this.group);
  this.nodeMat=this.material(1);this.beamMat=this.material(0);
  this.nodes=new THREE.InstancedMesh(new THREE.OctahedronGeometry(1,0),this.nodeMat,253);
  this.beams=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,6,1),this.beamMat,276);
  for(const mesh of [this.nodes,this.beams]){mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.group.add(mesh)}
  this.faceGeometries={};
  for(const[key,solid]of Object.entries(solids)){
   const positions=[],centers=[],barys=[];
   for(const face of solid.triangles){const center=[0,1,2].map(k=>face.reduce((sum,i)=>sum+solid.vertices[i][k],0)/3);
    face.forEach((index,j)=>{const v=solid.vertices[index];positions.push(v[0],-v[1],v[2]);centers.push(center[0],-center[1],center[2]);barys.push(j===0?1:0,j===1?1:0,j===2?1:0)})}
   const geometry=new THREE.BufferGeometry();for(const[name,data]of [['position',positions],['aCenter',centers],['aBary',barys]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(data,3));geometry.computeVertexNormals();this.faceGeometries[key]=geometry;
  }
  this.faceMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
   uniforms:{uTime:{value:0},uOpacity:{value:0},uFormation:{value:0},uCompression:{value:0}},
   vertexShader:`attribute vec3 aCenter;attribute vec3 aBary;varying vec3 vBary;varying vec3 vP;varying vec3 vNormal;varying vec3 vEye;uniform float uFormation;uniform float uCompression;
   void main(){vBary=aBary;float unfold=1.0-uFormation;vec3 p=aCenter+(position-aCenter)*.86;float delay=.6+.4*sin(dot(aCenter,vec3(2.,4.,3.)));p+=normalize(aCenter)*unfold*(.7+delay);float turn=unfold*1.3+uCompression*.8;mat2 spin=mat2(cos(turn),-sin(turn),sin(turn),cos(turn));p.xz=spin*p.xz;p*=1.0-uCompression*.84;vP=p;vNormal=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(p,1.);vEye=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
   fragmentShader:`varying vec3 vBary;varying vec3 vP;varying vec3 vNormal;varying vec3 vEye;uniform float uTime;uniform float uOpacity;uniform float uCompression;
   void main(){float edge=min(vBary.x,min(vBary.y,vBary.z));float border=1.-smoothstep(.006,.023,edge);float inset=1.-smoothstep(.003,.012,abs(edge-.095));float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vEye))),2.);float scan=pow(.5+.5*sin(vP.y*16.-uTime*2.8),18.);vec3 color=mix(vec3(1.,.055,.52),vec3(.1,.8,1.),smoothstep(-1.,1.,vP.x+vP.z*.3));vec3 light=color*(.13+rim*.35+scan*.22+inset*.3)+vec3(.65,.9,1.)*border*.65;gl_FragColor=vec4(light,uOpacity*(.35+border*.5+rim*.15)*(1.-uCompression*.4));
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   }`});
  this.surface=new THREE.Mesh(this.faceGeometries.cube,this.faceMat);this.group.add(this.surface);
  this.scene.add(new THREE.AmbientLight(0xc1c9ff,1.5));const pink=new THREE.DirectionalLight(0xff42bd,3);pink.position.set(-3,3,5);const cyan=new THREE.DirectionalLight(0x61e8ff,3);cyan.position.set(4,-1,4);this.scene.add(pink,cyan);
  this.temp=new THREE.Object3D();this.a=new THREE.Vector3();this.b=new THREE.Vector3();this.direction=new THREE.Vector3();this.up=new THREE.Vector3(0,1,0);this.positions=new Float32Array(720);this.lastShape='cube';
 }
 material(node){return new THREE.ShaderMaterial({vertexShader:VERTEX,fragmentShader:FRAGMENT,uniforms:{uTime:{value:0},uEnergy:{value:0},uOpacity:{value:0},uNode:{value:node}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})}
 resize(W,H){if(W===this.width&&H===this.height)return;this.width=W;this.height=H;this.renderer.setSize(W,H,false);this.camera.aspect=W/H;this.camera.position.z=H/(2*Math.tan(35*Math.PI/360));this.camera.updateProjectionMatrix()}
 clear(){if(this.healthy)this.renderer.clear()}
 setQuality(quality){this.quality=quality;this.renderer.setPixelRatio(quality==='high'?1.5:quality==='low'?.65:1);this.renderer.toneMappingExposure=quality==='high'?1.55:1.2;this.width=0}
 cylinder(a,b,radius,index){this.direction.subVectors(b,a);const length=this.direction.length();this.temp.position.addVectors(a,b).multiplyScalar(.5);if(length>.000001){this.direction.multiplyScalar(1/length);this.temp.quaternion.setFromUnitVectors(this.up,this.direction);this.temp.scale.set(radius,length,radius)}else this.temp.scale.set(0,0,0);this.temp.updateMatrix();this.beams.setMatrixAt(index,this.temp.matrix)}
 node(a,size,index){this.temp.position.copy(a);this.temp.quaternion.identity();this.temp.scale.setScalar(size);this.temp.updateMatrix();this.nodes.setMatrixAt(index,this.temp.matrix)}
 render({W,H,point,r,opacity,formation,compression,rotation,time,mesh,shape,morph,style,quaternion}){
  if(!this.healthy)return;this.resize(W,H);
  this.group.position.set(point.x-W/2,H/2-(point.y-r*1.65-25),0);if(quaternion)this.group.quaternion.set(...quaternion);else this.group.rotation.set(.45+Math.sin(rotation*.5)*.3,rotation+.35,0);this.group.scale.setScalar(r*.6);
  const shrink=1-compression*.84;
  for(const mat of [this.nodeMat,this.beamMat]){mat.uniforms.uTime.value=time;mat.uniforms.uEnergy.value=Math.max(compression,1-morph);mat.uniforms.uOpacity.value=opacity}
  this.nodes.visible=style!=='wire'||compression>.1;this.beams.visible=style!=='nodes';
  this.surface.visible=style==='facets'&&morph>=1;
  if(shape!==this.lastShape){this.surface.geometry=this.faceGeometries[shape];this.lastShape=shape}
  this.surface.scale.setScalar(1);this.faceMat.uniforms.uTime.value=time;this.faceMat.uniforms.uOpacity.value=opacity*formation;this.faceMat.uniforms.uFormation.value=formation;this.faceMat.uniforms.uCompression.value=compression;
  if(style==='nodes'){
   const points=vertexPoints(mesh,shape);
   for(let i=0;i<points.length;i++){const p=deformVertex(points[i],i,compression,time);this.a.set(p[0],-p[1],p[2]);this.node(this.a,(.04+compression*.018)*formation,i)}
   this.nodes.count=points.length;this.beams.count=0;this.nodes.instanceMatrix.needsUpdate=true;
   this.renderer.render(this.scene,this.camera);return;
  }
  let nodeIndex=0,beamIndex=0;
  for(let i=0;i<mesh.length;i++){
   const line=mesh[i],angle=i*2.399+time*1.2,drift=compression*.24;
   const dx=Math.cos(angle)*drift,dy=Math.sin(angle)*drift,dz=Math.sin(i*1.7)*drift;
   this.a.set(line[0][0]*shrink+dx,-line[0][1]*shrink-dy,line[0][2]*shrink+dz);
   this.b.set(line[1][0]*shrink+dx,-line[1][1]*shrink-dy,line[1][2]*shrink+dz);
   const reveal=Math.max(0,Math.min(1,formation*1.5-i/mesh.length*.5));this.b.lerp(this.a,1-reveal);
   this.node(this.a,(.026+compression*.012)*reveal,nodeIndex++);this.cylinder(this.a,this.b,.012*(1+compression*.5),beamIndex++);
  }
  const coreScale=.19+compression*.13,coreNode=(.042+compression*.035)*formation;
  for(let i=0;i<12;i++){const p=coreVerts[i];this.a.set(p[0]*coreScale,p[1]*coreScale,p[2]*coreScale);this.node(this.a,coreNode,nodeIndex++)}
  this.a.set(0,0,0);this.node(this.a,(.06+compression*.12)*formation,nodeIndex++);
  for(const[i,j]of coreEdges){const a=coreVerts[i],b=coreVerts[j];this.a.set(a[0]*coreScale,a[1]*coreScale,a[2]*coreScale);this.b.set(b[0]*coreScale,b[1]*coreScale,b[2]*coreScale);this.cylinder(this.a,this.b,.008*formation,beamIndex++)}
  for(const p of coreVerts){this.a.set(p[0]*coreScale,p[1]*coreScale,p[2]*coreScale);this.b.set(0,0,0);this.cylinder(this.a,this.b,.006*formation,beamIndex++)}
  this.nodes.count=nodeIndex;this.beams.count=beamIndex;this.nodes.instanceMatrix.needsUpdate=true;this.beams.instanceMatrix.needsUpdate=true;
  this.renderer.render(this.scene,this.camera);
 }
}
