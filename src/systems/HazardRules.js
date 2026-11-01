// Pure mechanics shared by the runner, broom and automated tests.
export const broomIgnoresHazard=type=>type==='pee'||type==='fish'||type==='lava'||type==='pineLog';
export const lavaJumpCleared=(jumping,height)=>Boolean(jumping)&&height>.62;
export const travelSpeedMultiplier=(ultimate,broom,broomFactor=1.2,ultimateFactor=1.35)=>
 ultimate?ultimateFactor:broom?broomFactor:1;

// Full-width pine logs are slide-only on foot; jumping into the trunk is unsafe.
// Broom flight (above the log) and revival protection also clear it.
export const clearsPineLog=(sliding,broomFlight,revivalProtected)=>
 Boolean(sliding||broomFlight||revivalProtected);

// Smooth, frame-rate-independent approach and descent based on world-space Z.
export function pineLogBroomLift(logZ,runnerZ){
 const gap=logZ-runnerZ;
 const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
 return 1.90*smooth((gap+16)/12)*(1-smooth((gap-3)/6));
}
