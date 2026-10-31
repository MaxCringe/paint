// Pure mechanics shared by the runner, broom and automated tests.
export const broomIgnoresHazard=type=>type==='pee'||type==='fish'||type==='lava';
export const lavaJumpCleared=(jumping,height)=>Boolean(jumping)&&height>.62;
export const travelSpeedMultiplier=(ultimate,broom,broomFactor=1.2,ultimateFactor=1.35)=>
 ultimate?ultimateFactor:broom?broomFactor:1;
