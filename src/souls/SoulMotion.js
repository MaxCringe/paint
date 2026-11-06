// Collection motion shared by the visual runtime and numeric route replay.
// Positions are plain x/y/z records or existing Vector3s; nothing is allocated here.
export function advanceSoulMotion(c,p,runner,dt,timeMs,magnetRemaining,roadZ){
 const phase=c.phase||c.z*.2,ahead=runner.z-p.z;
 if(magnetRemaining>0&&!c.magnetFlight&&ahead>-.9&&ahead<11.5){c.magnetFlight=true;c.magnetProgress=0;}
 if(c.magnetFlight){
  c.magnetProgress=Math.min(1,(c.magnetProgress||0)+dt*1.55);
  const arc=Math.sin(Math.PI*c.magnetProgress),easing=1-Math.exp(-dt*(3.4+c.magnetProgress*3.5));
  p.x+=(runner.x+Math.sin(timeMs*.006+phase)*.23*arc-p.x)*easing;
  p.z+=(runner.z+.08-p.z)*easing;
  p.y=c.baseY+Math.sin(timeMs*.004+phase)*.11+arc*.85;
 }else{p.z=roadZ;p.y=c.baseY+Math.sin(timeMs*.004+phase)*.14;}
}
export function soulCaught(c,p,runner,lane){
 return c.magnetFlight?c.magnetProgress>.25&&Math.hypot(p.x-runner.x,p.z-runner.z)<.65:
 p.z>1&&p.z<3.7&&c.lane===lane&&Math.abs(runner.x-(c.lane-1)*2.55)<1.1;
}
