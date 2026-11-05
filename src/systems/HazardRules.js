// Pure mechanics shared by the runner, broom and automated tests.
export const broomIgnoresHazard=type=>type==='pee'||type==='fish'||type==='lava'||type==='pineLog';
export const lavaJumpCleared=(jumping,height)=>Boolean(jumping)&&height>.62;
// Lava occupies a full-depth corridor, not just its front edge.
// Check the swept segment each frame so landing mid-river (or a frame skip)
// cannot turn an initially safe jump into permanent immunity.
export const lavaCrossingTouchesRunner=(previousGap,currentGap,halfDepth)=>
 Number.isFinite(previousGap)&&Number.isFinite(currentGap)&&
 Number.isFinite(halfDepth)&&halfDepth>0&&
 previousGap<=halfDepth&&currentGap>=-halfDepth;

// The small lane-specific pine has a 2.55-unit trunk, higher than the
// horizontal log's upper surface. A genuine SECOND jump must carry Fiona's
// feet above it; being airborne on the first jump is no longer sufficient.
export const SMALL_PINE_DOUBLE_JUMP_CLEARANCE=2.7;
export const SMALL_PINE_COLLISION_HALF_DEPTH=.75;
export const smallPineDoubleJumpCleared=(jumpsUsed,height)=>
 jumpsUsed===2&&Number.isFinite(height)&&height>=SMALL_PINE_DOUBLE_JUMP_CLEARANCE;

// A swept intersection stops a large frame step from skipping the tree,
// and continues to require clearance until Fiona is past its back edge.
export const smallPineCrossingTouchesRunner=(previousGap,currentGap)=>
 Number.isFinite(previousGap)&&Number.isFinite(currentGap)&&
 previousGap<=SMALL_PINE_COLLISION_HALF_DEPTH&&
 currentGap>=-SMALL_PINE_COLLISION_HALF_DEPTH;
export const travelSpeedMultiplier=(ultimate,broom,broomFactor=1.2,ultimateFactor=1.35)=>
 ultimate?ultimateFactor:broom?broomFactor:1;

// The transverse pine log rests at y=1.88, with a .36-radius trunk.
// Fiona must get her feet above its top (~2.24), plus a safety margin.
export const PINE_LOG_DOUBLE_JUMP_CLEARANCE=2.45;
export const PINE_LOG_COLLISION_HALF_DEPTH=.85;
// Prevent early takeoff while inside (or just approaching) the full-width tree.
export const PINE_LOG_SLIDE_JUMP_APPROACH=5;
export const pineLogBlocksSlideJump=(gap,passed=false)=>
 !passed&&Number.isFinite(gap)&&
 gap>=-PINE_LOG_SLIDE_JUMP_APPROACH&&gap<=PINE_LOG_COLLISION_HALF_DEPTH;

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
