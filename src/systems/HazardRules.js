// Pure mechanics shared by the runner, broom and automated tests.
export const broomIgnoresHazard=type=>type==='pee'||type==='fish'||type==='lava'||type==='pineLog';
export const lavaJumpCleared=(jumping,height)=>Boolean(jumping)&&height>.62;
export const travelSpeedMultiplier=(ultimate,broom,broomFactor=1.2,ultimateFactor=1.35)=>
 ultimate?ultimateFactor:broom?broomFactor:1;

// The transverse pine log rests at y=1.88, with a .36-radius trunk.
// Fiona must get her feet above its top (~2.24), plus a safety margin.
export const PINE_LOG_DOUBLE_JUMP_CLEARANCE=2.45;
export const PINE_LOG_COLLISION_HALF_DEPTH=.85;

// Requiring BOTH the second jump and enough height prevents a late second press
// from creating invulnerability while Fiona physically intersects the trunk.
export const pineLogDoubleJumpCleared=(jumpsUsed,height)=>
 jumpsUsed===2&&Number.isFinite(height)&&height>=PINE_LOG_DOUBLE_JUMP_CLEARANCE;

// Detect contact across the entire trunk and Fiona's body depth, including a
// frame that moves from before the front edge to inside the crossing corridor.
export const pineLogCrossingTouchesRunner=(previousGap,currentGap)=>
 Number.isFinite(previousGap)&&Number.isFinite(currentGap)&&
 previousGap<=PINE_LOG_COLLISION_HALF_DEPTH&&currentGap>=-PINE_LOG_COLLISION_HALF_DEPTH;

// On foot: slide BELOW the log, or double-jump OVER it at sufficient altitude.
// Broom and revival protection still work exactly as before.
export const clearsPineLog=(sliding,broomFlight,revivalProtected,jumpsUsed=0,height=0)=>
 Boolean(sliding||broomFlight||revivalProtected||pineLogDoubleJumpCleared(jumpsUsed,height));

// Crouch starts ahead of the log, stays low while passing beneath it,
// then smoothly releases. Never lift the broom upward.
export function pineLogBroomDuck(logZ,runnerZ){
 const gap=logZ-runnerZ;
 const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
 return smooth((gap+16)/12)*(1-smooth((gap-3)/6));
}

// How long an ongoing ultimate needs to keep flying to finish a nearby log crossing.
// The interval matches the crossing corridor; empty road never prolongs flight.
export function pineLogFlightGuardDuration(gap,travelSpeed){
 if(!Number.isFinite(gap)||!Number.isFinite(travelSpeed)||travelSpeed<=0||gap< -16||gap>=9)return 0;
 return (9-gap)/travelSpeed+.08;
}
