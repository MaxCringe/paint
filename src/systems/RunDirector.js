import {BROOM_CONFIG} from '../powerups/BroomRide.js';
import {JUMP_VELOCITY,GRAVITY} from '../player/DoubleJump.js';
import {SLIDE_DURATION} from '../player/Slide.js';

// Public tuning data, independent of UI and meshes. Durations are world units,
// so the authored phase boundaries are deterministic even across power-up speed changes.
export const RUN_DIRECTOR_CONFIG=Object.freeze({
 version:1,
 spacing:{lavaLog:52,fullWidth:32,laneRepeat:22,laneAfterFull:18},
 lava:{firstEligible:110,firstGuaranteed:154,minGap:132,maxGap:220,chance:.18},
 obstacleWeights:{pineLog:.10,fish:.18,pee:.16,knot:.56},
 timingSearch:{firstOffsets:5,secondOffsets:4},
 recognitionDistance:40,recognitionSeconds:.35,safetySeconds:.12,inputSeconds:.04,
 maxTravelSpeed:29*Math.max(BROOM_CONFIG.speedMultiplier,BROOM_CONFIG.ultimateSpeedMultiplier),flight:{broomDuration:BROOM_CONFIG.duration,broomMultiplier:BROOM_CONFIG.speedMultiplier,ultimateMultiplier:BROOM_CONFIG.ultimateSpeedMultiplier},lookahead:85,maxRoutes:12,maxSimulationSteps:6000,maxSectionSteps:18000,maxPickupChecks:3,
 maneuvers:{laneLead:-Math.log(.05)/12+.12,lowJumpLead:2*(JUMP_VELOCITY-Math.sqrt(JUMP_VELOCITY**2-2*GRAVITY*.62))/GRAVITY,pineFirstLead:1.5*JUMP_VELOCITY/GRAVITY,pineSecondLead:.5*JUMP_VELOCITY/GRAVITY},
 // A full jump/landing + slide + the lateral settling margin, not centre gaps.
 recoverySeconds:2*JUMP_VELOCITY/GRAVITY+SLIDE_DURATION+.25,
 phases:[
  {id:'warmup',duration:180,density:.72,souls:5,powerup:.14,weights:{single:1}},
  {id:'build',duration:260,density:.88,souls:4,powerup:.10,weights:{single:2,jumpSlide:2,slalom:2,riverPine:1}},
  {id:'tension',duration:260,density:1,souls:4,powerup:.08,weights:{slalom:3,jumpSlide:3,riverPine:2,doubleLog:2}},
  {id:'recovery',duration:140,density:.18,souls:8,powerup:.40,weights:{single:1}}
 ]
});
export function chooseRunWeight(weights,random){const entries=Object.entries(weights);let roll=random()*entries.reduce((n,[,w])=>n+w,0);for(const [id,w] of entries){roll-=w;if(roll<0)return id;}return entries.at(-1)[0];}
export function createRunDirector(config=RUN_DIRECTOR_CONFIG){
 if(!Number.isInteger(config.timingSearch?.firstOffsets)||config.timingSearch.firstOffsets<1||config.timingSearch.firstOffsets>8||!Number.isInteger(config.timingSearch?.secondOffsets)||config.timingSearch.secondOffsets<1||config.timingSearch.secondOffsets>8||!Number.isInteger(config.maxSectionSteps)||config.maxSectionSteps<config.maxSimulationSteps||config.maxSectionSteps>4*config.maxSimulationSteps)throw Error('Invalid search budget');
 if(Object.keys(config.obstacleWeights??{}).some(k=>!['pineLog','knot','pee','fish'].includes(k))||config.phases?.some(p=>Object.keys(p.weights??{}).some(k=>!['single','slalom','jumpSlide','riverPine','doubleLog'].includes(k))))throw Error('Unknown obstacle or pattern');
 const positive=['maxTravelSpeed','lookahead','recognitionDistance','inputSeconds','recoverySeconds'];
 const validWeights=w=>w&&Object.keys(w).length>0&&Object.values(w).every(n=>Number.isFinite(n)&&n>0);
 if(positive.some(k=>!Number.isFinite(config[k])||config[k]<=0)||!Number.isInteger(config.maxSimulationSteps)||config.maxSimulationSteps<1||config.maxSimulationSteps>20000||!Number.isInteger(config.maxRoutes)||config.maxRoutes<1||config.maxRoutes>32||!Number.isInteger(config.maxPickupChecks)||config.maxPickupChecks<1||config.maxPickupChecks>8||config.lookahead<config.recognitionDistance||![config.recognitionSeconds,config.safetySeconds].every(n=>Number.isFinite(n)&&n>=0)||!validWeights(config.obstacleWeights))throw Error('Invalid Run Director limits');
 if(config.phases?.length!==4||config.phases.some((p,i)=>p.id!==['warmup','build','tension','recovery'][i]||!Number.isFinite(p.duration)||p.duration<=0||!Number.isFinite(p.density)||p.density<0||p.density>1||!Number.isInteger(p.souls)||p.souls<0||p.souls>12||!Number.isFinite(p.powerup)||p.powerup<0||p.powerup>1||!validWeights(p.weights)))throw Error('Invalid Run Director phases');
 const cycle=config.phases.reduce((n,p)=>n+p.duration,0);
 function phaseAt(path){let offset=((path%cycle)+cycle)%cycle,start=Math.floor(path/cycle)*cycle;for(const phase of config.phases){if(offset<phase.duration)return {...phase,start,end:start+phase.duration,cycle:Math.floor(path/cycle),progress:offset/phase.duration};offset-=phase.duration;start+=phase.duration;}}
 const choose=(phase,random)=>chooseRunWeight(phase.weights,random);
 return {config,phaseAt,choose};
}
