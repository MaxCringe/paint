// Visual-only broom tuning approved for KNOTTY PINE.
// Values are percentages relative to the previous smoke/spark rendering.
// Keep flight mechanics and UI independent from these settings.
export const BROOM_VISUAL_PROFILES=Object.freeze({
 flight:Object.freeze({density:150,opacity:100,size:80,length:95,sparks:65}),
 landing:Object.freeze({density:45,opacity:30,size:65,length:35,sparks:200})
});
export const BROOM_LANDING_TRANSITION_SECONDS=3;

export function broomVisualProfile(remaining){
 const seconds=Number.isFinite(remaining)?Math.max(0,remaining):0;
 const elapsed=Math.max(0,Math.min(1,(BROOM_LANDING_TRANSITION_SECONDS-seconds)/BROOM_LANDING_TRANSITION_SECONDS));
 // Smoothstep: both ends have zero derivative, so no visual jump at 3s.
 const transition=elapsed*elapsed*(3-2*elapsed);
 const flight=BROOM_VISUAL_PROFILES.flight;
 const landing=BROOM_VISUAL_PROFILES.landing;
 const lerp=(a,b)=>a+(b-a)*transition;
 return {
  density:lerp(flight.density,landing.density),
  opacity:lerp(flight.opacity,landing.opacity),
  size:lerp(flight.size,landing.size),
  length:lerp(flight.length,landing.length),
  sparks:lerp(flight.sparks,landing.sparks),
  transition
 };
}
