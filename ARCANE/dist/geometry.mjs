const count=240;
const normalize=(v,r=1.3)=>{const n=Math.hypot(...v);return v.map(x=>x/n*r)};
const cube={vertices:Array.from({length:8},(_,i)=>[i&1?1:-1,i&2?1:-1,i&4?1:-1]),triangles:[[0,1,3],[0,3,2],[4,5,7],[4,7,6],[0,4,5],[0,5,1],[2,6,7],[2,7,3],[0,2,6],[0,6,4],[1,3,7],[1,7,5]]};
const pyramid={vertices:[[-1,.8,-1],[1,.8,-1],[1,.8,1],[-1,.8,1],[0,-1.3,0]],triangles:[[0,1,2],[0,2,3],[0,1,4],[1,2,4],[2,3,4],[3,0,4]]};
const phi=(1+Math.sqrt(5))/2;
const sphere={vertices:[[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]].map(v=>normalize(v)),triangles:[]};
const base=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
const midpointCache=new Map();function midpoint(a,b){const key=[a,b].sort((x,y)=>x-y).join(':');if(midpointCache.has(key))return midpointCache.get(key);const i=sphere.vertices.length;sphere.vertices.push(normalize(sphere.vertices[a].map((x,k)=>(x+sphere.vertices[b][k])/2)));midpointCache.set(key,i);return i}
for(const[a,b,c]of base){const ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);sphere.triangles.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca])}
export const solids={cube,sphere,pyramid};
for(const solid of Object.values(solids)){
 solid.edges=[];solid.normals=[];const seen=new Set();
 solid.triangles=solid.triangles.map(face=>{let[a,b,c]=face;const A=solid.vertices[a],B=solid.vertices[b],C=solid.vertices[c],u=B.map((v,k)=>v-A[k]),v=C.map((n,k)=>n-A[k]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];if(normal.reduce((sum,n,k)=>sum+n*(A[k]+B[k]+C[k]),0)<0){[b,c]=[c,b];normal.forEach((n,k)=>normal[k]=-n)}solid.normals.push(normalize(normal,1));return[a,b,c]});
 for(const[a,b,c]of solid.triangles)for(const[x,y]of [[a,b],[b,c],[c,a]]){const key=[x,y].sort((a,b)=>a-b).join(':');if(!seen.has(key)){seen.add(key);solid.edges.push([x,y])}}
}
function segments(solid){const result=[];for(let e=0;e<solid.edges.length;e++){const[a,b]=solid.edges[e],A=solid.vertices[a],B=solid.vertices[b],n=Math.floor((e+1)*count/solid.edges.length)-Math.floor(e*count/solid.edges.length);for(let i=0;i<n;i++)result.push([A.map((v,k)=>v+(B[k]-v)*i/n),A.map((v,k)=>v+(B[k]-v)*(i+1)/n)])}return result}
export const shapes=Object.fromEntries(Object.entries(solids).map(([name,solid])=>[name,segments(solid)]));
export function interpolate(a,b,t){return a.map((line,i)=>line.map((p,j)=>p.map((n,k)=>n+(b[i][j][k]-n)*t)))}

const vertexSamples={};
for(const[name,solid]of Object.entries(solids))vertexSamples[name]=solid.vertices.map(vertex=>{
 for(let i=0;i<shapes[name].length;i++)for(let k=0;k<2;k++)if(Math.hypot(...vertex.map((n,j)=>n-shapes[name][i][k][j]))<1e-8)return[i,k];
 throw Error('Geometry vertex has no morph sample');
});
export function vertexPoints(mesh,shape){return vertexSamples[shape].map(([i,k])=>mesh[i][k])}
export function deformVertex(p,i,compression,time){const shrink=1-compression*.84,a=i*2.399+time*1.2,d=compression*.24;return[p[0]*shrink+Math.cos(a)*d,p[1]*shrink+Math.sin(a)*d,p[2]*shrink+Math.sin(i*1.7)*d]}

export function interpolateInto(a,b,t,out){for(let i=0;i<a.length;i++)for(let j=0;j<2;j++)for(let k=0;k<3;k++)out[i][j][k]=a[i][j][k]+(b[i][j][k]-a[i][j][k])*t;return out}
