// Distances use camera pixels, so portrait frames and hand rotation are supported.
const distance = (a, b, w, h) => Math.hypot((a.x-b.x)*w, (a.y-b.y)*h);
export function pinchRatio(lm, w=1, h=1) {
  return distance(lm[4], lm[8], w, h) / Math.max(distance(lm[0], lm[9], w, h), 0.00001);
}
function angle(a,b,c,w,h) {
  const u=[(a.x-b.x)*w,(a.y-b.y)*h], v=[(c.x-b.x)*w,(c.y-b.y)*h];
  return Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/(Math.hypot(...u)*Math.hypot(...v)||1))))*180/Math.PI;
}
export function gestureLabel(lm,w=1,h=1) {
  if (pinchRatio(lm,w,h)<0.28) return "🤏 บีบนิ้ว";
  const ext=[5,9,13,17].map(b => angle(lm[b],lm[b+1],lm[b+3],w,h)>155 && distance(lm[0],lm[b+3],w,h)>distance(lm[0],lm[b+1],w,h)*1.12);
  const thumb=angle(lm[2],lm[3],lm[4],w,h)>150 && distance(lm[4],lm[9],w,h)>distance(lm[3],lm[9],w,h)*1.15;
  if(ext.every(Boolean)) return "🖐 แบมือ";
  if(!ext.some(Boolean)) return thumb ? "👍 ชูนิ้วโป้ง" : "✊ กำมือ";
  if(ext[0] && ext[1] && !ext[2] && !ext[3]) return "✌️ สองนิ้ว";
  if(ext[0] && !ext[1] && !ext[2] && !ext[3]) return "☝️ ชี้นิ้ว";
  return `${ext.filter(Boolean).length+Number(thumb)} นิ้ว`;
}
