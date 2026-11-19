// Detection latency and hand presence are separate from gesture confidence.
export function trackingFrame(age){return{usable:Number.isFinite(age)&&age>=0&&age<=1500,commands:Number.isFinite(age)&&age>=0&&age<=900}}
export function resultTimeout(latency){return Math.min(1600,Math.max(900,latency*2.5))}
