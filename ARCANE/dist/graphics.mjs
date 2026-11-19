export const GRAPHICS=Object.freeze({
 high:Object.freeze({label:'โหด',fps:60,pixelRatio:2,canvasRatio:1.5,heart:6000,fragments:480,glow:36,glitch:5,orbit:480,trackingMs:50,trackingWidth:640,webgl:true}),
 balanced:Object.freeze({label:'กลาง',fps:60,pixelRatio:1.5,canvasRatio:1.25,heart:2200,fragments:220,glow:24,glitch:3,orbit:160,trackingMs:50,trackingWidth:640,webgl:true}),
 low:Object.freeze({label:'ต่ำ',fps:30,pixelRatio:.65,canvasRatio:.7,heart:180,fragments:40,glow:0,glitch:0,orbit:0,trackingMs:100,trackingWidth:480,webgl:false})
});
export function graphicsFor(value){return GRAPHICS[value]||GRAPHICS.balanced}
