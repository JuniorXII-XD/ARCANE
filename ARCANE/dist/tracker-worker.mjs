import {loadModel} from './model.mjs';
let model;
self.onmessage=async({data})=>{
 if(data.type==='init'){try{model=await loadModel();self.postMessage({type:'ready'})}catch(e){self.postMessage({type:'error',error:e.message})}return}
 const {bitmap,timestamp,id}=data;
 try{const result=model.detectForVideo(bitmap,timestamp);self.postMessage({type:'result',id,result:{landmarks:result.landmarks,worldLandmarks:result.worldLandmarks,handedness:result.handedness||result.handednesses}})}
 catch(e){self.postMessage({type:'error',id,error:e.message})}finally{bitmap?.close()}
};
