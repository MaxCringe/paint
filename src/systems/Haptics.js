// Optional browser vibration. iPhone Safari typically does not implement
// navigator.vibrate; its setting is disabled rather than faking haptic feedback.
const KEY='knottyPineVibrationEnabled';
const PULSES=Object.freeze({
 soul:8,
 item:22,
 ultimate:[26,38,42],
 hit:80
});
export function createGameHaptics(){
 const supported=typeof navigator!=='undefined'&&
  typeof navigator.vibrate==='function'&&
  typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches;
 let enabled=supported;
 try{
  const saved=localStorage.getItem(KEY);
  if(saved!==null)enabled=supported&&saved==='1';
 }catch{}
 let last=0;
 function setEnabled(next){
  enabled=supported&&Boolean(next);
  try{localStorage.setItem(KEY,enabled?'1':'0');}catch{}
  if(!enabled&&supported)navigator.vibrate(0);
 }
 function play(kind){
  if(!supported||!enabled||!Object.hasOwn(PULSES,kind))return;
  const now=performance.now();
  // Soul chains can be dense; do not turn them into continuous vibration.
  if(kind==='soul'&&now-last<160)return;
  last=now;
  try{navigator.vibrate(PULSES[kind]);}catch{}
 }
 return {supported,get enabled(){return enabled;},setEnabled,play};
}
