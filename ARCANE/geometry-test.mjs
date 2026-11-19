import assert from 'node:assert/strict';
import {solids,shapes} from './dist/geometry.mjs';
for(const[name,solid]of Object.entries(solids)){
 assert.equal(solid.vertices.length-solid.edges.length+solid.triangles.length,2,`${name}: closed topology`);
 assert.equal(shapes[name].length,240);
 const incidence=new Map();for(const triangle of solid.triangles){assert(triangle.every(i=>i>=0&&i<solid.vertices.length));for(let j=0;j<3;j++){const k=[triangle[j],triangle[(j+1)%3]].sort((a,b)=>a-b).join(':');incidence.set(k,(incidence.get(k)||0)+1)}}assert([...incidence.values()].every(n=>n===2),`${name}: manifold edges`);
 for(const n of solid.normals)assert(Math.abs(Math.hypot(...n)-1)<1e-10);
 for(const line of shapes[name])for(const point of line)assert(point.every(Number.isFinite));
}
assert.equal(solids.sphere.vertices.length,42);assert.equal(solids.sphere.triangles.length,80);assert(solids.sphere.vertices.every(p=>Math.abs(Math.hypot(...p)-1.3)<1e-10));
console.log('PASS: closed manifold solids, normalized normals, 42-vertex/80-face icosphere, fixed-size morph meshes');
