import * as THREE from 'three';
// EXPERIMENTAL animation prototypes. These are authored keyframes, NOT Mixamo assets.
// They animate the existing bone hierarchy; no character scaling, no gameplay physics.
const p=(duration,loop,frames)=>({duration,loop,frames});
const BROOM={Spine:[-.24,0,0],LeftArm:[-.78,0,-.20],RightArm:[-.78,0,.20],LeftForeArm:[-.45,0,0],RightForeArm:[-.45,0,0],LeftUpLeg:[-.55,0,0],RightUpLeg:[-.55,0,0],LeftLeg:[.65,0,0],RightLeg:[.65,0,0]};
const FLY={Spine:[-.12,0,0],LeftArm:[0,0,-1.05],RightArm:[0,0,1.05],LeftForeArm:[-.15,0,0],RightForeArm:[-.15,0,0],LeftUpLeg:[.14,0,0],RightUpLeg:[-.12,0,0]};
const CROUCH={Spine:[.62,0,0],Spine1:[.2,0,0],LeftUpLeg:[-1.05,0,0],RightUpLeg:[-1.05,0,0],LeftLeg:[1.22,0,0],RightLeg:[1.22,0,0],LeftArm:[.50,0,-.18],RightArm:[.50,0,.18]};
const DOWN={Spine:[.85,0,.18],Spine1:[.3,0,.12],Head:[.13,0,0],LeftUpLeg:[-.75,0,0],RightUpLeg:[-.75,0,0],LeftLeg:[1.0,0,0],RightLeg:[1.0,0,0]};
const IDLE={Spine:[.03,0,0],LeftArm:[-.03,0,-.04],RightArm:[-.03,0,.04]};
const POSES={
 idle:p(2.2,true,[[0,{}],[.5,IDLE],[1,{}]]),
 moveLeft:p(.33,false,[[0,{}],[.35,{Spine:[0,0,.23],Spine1:[0,0,.13],LeftArm:[-.19,0,-.16]}],[.7,{Spine:[0,0,.12]}],[1,{}]]),
 moveRight:p(.33,false,[[0,{}],[.35,{Spine:[0,0,-.23],Spine1:[0,0,-.13],RightArm:[-.19,0,.16]}],[.7,{Spine:[0,0,-.12]}],[1,{}]]),
 doubleJump:p(.72,false,[[0,{}],[.24,{Spine:[-.10,0,0],LeftUpLeg:[-.58,0,0],RightUpLeg:[-.58,0,0],LeftLeg:[.62,0,0],RightLeg:[.62,0,0],LeftArm:[-.65,0,-.40],RightArm:[-.65,0,.40]}],[.66,{Spine:[.09,0,0],LeftArm:[-.24,0,-.30],RightArm:[-.24,0,.30]}],[1,{}]]),
 land:p(.29,false,[[0,{Spine:[.16,0,0],LeftUpLeg:[-.20,0,0],RightUpLeg:[-.20,0,0],LeftLeg:[.35,0,0],RightLeg:[.35,0,0]}],[.44,{Spine:[.10,0,0],LeftLeg:[.16,0,0],RightLeg:[.16,0,0]}],[1,{}]]),
 slide:p(.85,true,[[0,CROUCH],[.46,{...CROUCH,Spine:[.66,0,.025]}],[1,CROUCH]]),
 slideEnd:p(.39,false,[[0,CROUCH],[.45,{Spine:[.29,0,0],LeftUpLeg:[-.55,0,0],RightUpLeg:[-.55,0,0],LeftLeg:[.63,0,0],RightLeg:[.63,0,0]}],[1,{}]]),
 slip:p(.75,true,[[0,{Spine:[0,0,.12],LeftArm:[-.55,0,-.70],RightArm:[-.55,0,.66]}],[.5,{Spine:[0,0,-.12],LeftArm:[-.57,0,-.32],RightArm:[-.57,0,.95]}],[1,{Spine:[0,0,.12],LeftArm:[-.55,0,-.70],RightArm:[-.55,0,.66]}]]),
 broomStart:p(.62,false,[[0,{}],[.6,BROOM],[1,BROOM]]),
 broomFly:p(1.25,true,[[0,BROOM],[.50,{...BROOM,Spine:[-.21,0,.018]}],[1,BROOM]]),
 broomDuck:p(.9,true,[[0,{...BROOM,Spine:[.48,0,0],Spine1:[.39,0,0],Head:[.24,0,0]}],[.5,{...BROOM,Spine:[.52,0,0],Spine1:[.38,0,0],Head:[.25,0,0]}],[1,{...BROOM,Spine:[.48,0,0],Spine1:[.39,0,0],Head:[.24,0,0]}]]),
 broomLand:p(.5,false,[[0,BROOM],[.45,{Spine:[-.10,0,0],LeftArm:[-.34,0,-.12],RightArm:[-.34,0,.12],LeftUpLeg:[-.22,0,0],RightUpLeg:[-.22,0,0]}],[1,{}]]),
 ultimateStart:p(.75,false,[[0,{}],[.67,{Spine:[-.12,0,0],LeftArm:[-1.9,0,-.4],RightArm:[-1.9,0,.4],LeftForeArm:[-.24,0,0],RightForeArm:[-.24,0,0]}],[1,FLY]]),
 ultimateFly:p(1.65,true,[[0,FLY],[.5,{...FLY,Spine:[-.18,0,0],LeftArm:[.06,0,-1.12],RightArm:[.06,0,1.12]}],[1,FLY]]),
 ultimateEnd:p(.58,false,[[0,FLY],[.48,{Spine:[.05,0,0],LeftArm:[-.28,0,-.4],RightArm:[-.28,0,.4]}],[1,{}]]),
 soulPickup:p(.30,false,[[0,{}],[.48,{RightArm:[-.20,0,.14],RightForeArm:[-.38,0,0]}],[1,{}]]),
 hatPickup:p(.58,false,[[0,{}],[.53,{RightArm:[-1.07,0,.25],RightForeArm:[-.65,0,0],Head:[-.07,0,0]}],[1,{}]]),
 scarfPickup:p(.65,false,[[0,{}],[.55,{Spine:[.22,0,0],RightArm:[-.70,0,.35],RightForeArm:[-.55,0,0]}],[1,{}]]),
 hitTree:p(.53,false,[[0,{}],[.26,{Spine:[.38,0,-.14],Spine1:[.22,0,0],Head:[.18,0,0],LeftArm:[-1.1,0,-.4],RightArm:[-1.0,0,.44]}],[1,{Spine:[.21,0,-.04],Head:[-.06,0,0]}]]),
 death:p(1.35,false,[[0,{}],[.33,{Spine:[.40,0,0],LeftArm:[-.7,0,-.4],RightArm:[-.7,0,.4]}],[.74,DOWN],[1,{...DOWN,Spine:[1.2,0,.18],Spine1:[.48,0,0]}]]),
 revive:p(1.18,false,[[0,{...DOWN,Spine:[1.2,0,.18]}],[.55,CROUCH],[.85,{Spine:[.13,0,0],LeftUpLeg:[-.22,0,0],RightUpLeg:[-.22,0,0]}],[1,{}]])
};
// A dynamically generated Three.js AnimationClip uses Fiona's actual rest rotations.
export function generateFionaPrototypeClips(bones,model,alreadyLoaded){
 const generated=new Map();
 for(const [id,motion] of Object.entries(POSES)){
  if(alreadyLoaded.has(id))continue;
  const tracks=[];
  const names=new Set(motion.frames.flatMap(([,poses])=>Object.keys(poses)));
  for(const name of names){
   const bone=bones.get(name)||bones.get('mixamorig:'+name);
   if(!bone)continue;
   const values=[],times=[];
   for(const [fraction,frame] of motion.frames){
    const euler=new THREE.Euler(...(frame[name]||[0,0,0]),'XYZ');
    const offset=new THREE.Quaternion().setFromEuler(euler);
    const rotation=bone.quaternion.clone().multiply(offset);
    times.push(motion.duration*fraction);
    values.push(rotation.x,rotation.y,rotation.z,rotation.w);
   }
   tracks.push(new THREE.QuaternionKeyframeTrack(bone.name+'.quaternion',times,values));
  }
  if(tracks.length)generated.set(id,new THREE.AnimationClip(id,motion.duration,tracks));
 }
 return generated;
}
