import * as THREE from 'three';
import { createUltimateAura } from '../effects/UltimateAura.js';

// Create Fiona's procedural model and return only the parts used by the animation loop.
export function createFiona(scene, mat, box) {
  const runner=new THREE.Group();scene.add(runner);
  // Fiona Goode: a more mature, elegant silhouette with ash-blonde hair and tailored black clothing.
  const bodyMat=mat(0x111016,.58), pantsMat=mat(0x17151a,.72), skinMat=mat(0xd7ad91,.78), shoeMat=mat(0x09080b,.42), packMat=mat(0x21141c,.65);
  const silverMat=mat(0x897b61,.5), silverLight=mat(0xc3ad7d,.43), dressTrim=mat(0x592b39,.58), eyeMat=mat(0x17110e,.4), lipMat=mat(0x713b43,.52), jewelryMat=mat(0xb99a61,.27,.48);
  const hairMat=mat(0x85704a,.48,.025), hairLightMat=mat(0xc2a977,.44,.02), hairDarkMat=mat(0x5c4a30,.57,.015), hairWarmMat=mat(0xa58a58,.46,.02);
  const ivoryMat=mat(0xf0ded0,.48), irisMat=mat(0x71523a,.4), skinShadeMat=mat(0xb9806d,.77), seamMat=mat(0x38232b,.72), velvetMat=mat(0x211820,.75);
  function sphere(radius, material, x,y,z, sx=1,sy=1,sz=1,parent=runner){
   const m=new THREE.Mesh(new THREE.SphereGeometry(radius,24,16),material);
   m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;
  }
  function characterTube(parent,points,radius,material,segments=12,radial=6){
   const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],p[1],p[2])));
   const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,segments,radius,radial,false),material);
   mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function characterCapsule(parent,radius,length,material,x,y,z,scaleX=1,scaleY=1,scaleZ=1){
   const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(radius,length,5,10),material);
   mesh.position.set(x,y,z);mesh.scale.set(scaleX,scaleY,scaleZ);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  
  // Long, tailored skirt with a soft flare, shaped waist and fine sewn panel lines.
  const skirtProfile=[
   new THREE.Vector2(.54,.10),new THREE.Vector2(.57,.16),new THREE.Vector2(.54,.25),
   new THREE.Vector2(.48,.39),new THREE.Vector2(.41,.54),new THREE.Vector2(.35,.68),
   new THREE.Vector2(.30,.80),new THREE.Vector2(.265,.91),new THREE.Vector2(.235,.99)
  ];
  const skirt=new THREE.Mesh(new THREE.LatheGeometry(skirtProfile,32),bodyMat);
  skirt.castShadow=true;skirt.receiveShadow=true;runner.add(skirt);
  const skirtOverlay=new THREE.Mesh(new THREE.LatheGeometry([
   new THREE.Vector2(.545,.115),new THREE.Vector2(.548,.18),new THREE.Vector2(.50,.32),
   new THREE.Vector2(.43,.49),new THREE.Vector2(.37,.63),new THREE.Vector2(.305,.80)
  ],32),velvetMat);
  skirtOverlay.castShadow=true;skirtOverlay.receiveShadow=true;runner.add(skirtOverlay);
  for(const sign of [-1,1]){
   for(const angle of [-1.02,-.62,-.24,.24,.62,1.02]){
    const pts=[];
    for(const [y,r] of [[.90,.27],[.70,.35],[.47,.43],[.25,.54],[.135,.56]]){
     pts.push([Math.sin(angle)*r,y,sign*Math.cos(angle)*r]);
    }
    characterTube(runner,pts,.0085,sign<0?seamMat:dressTrim,12,5);
   }
  }
  // A narrow waist belt and a small antique-gold clasp.
  const belt=new THREE.Mesh(new THREE.TorusGeometry(.245,.019,8,32),dressTrim);
  belt.rotation.x=Math.PI/2;belt.position.set(0,1.025,0);belt.castShadow=true;runner.add(belt);
  const beltClasp=new THREE.Mesh(new THREE.BoxGeometry(.082,.105,.035),jewelryMat);
  beltClasp.position.set(0,1.03,-.245);beltClasp.castShadow=true;runner.add(beltClasp);
  const claspInset=new THREE.Mesh(new THREE.BoxGeometry(.038,.059,.012),bodyMat);
  claspInset.position.set(0,1.03,-.267);runner.add(claspInset);
  
  // Pivoted upper body, so the existing running lean remains natural.
  const torso=new THREE.Group();torso.position.set(0,1.0,0);runner.add(torso);
  const bodiceProfile=[
   new THREE.Vector2(.17,0),new THREE.Vector2(.22,.075),new THREE.Vector2(.255,.20),
   new THREE.Vector2(.30,.37),new THREE.Vector2(.325,.48),new THREE.Vector2(.285,.60),
   new THREE.Vector2(.205,.72),new THREE.Vector2(.135,.82),new THREE.Vector2(.108,.89)
  ];
  const bodice=new THREE.Mesh(new THREE.LatheGeometry(bodiceProfile,28),bodyMat);
  bodice.castShadow=true;bodice.receiveShadow=true;torso.add(bodice);
  // Dark tailored side panels and a fine seam running down the back of the bodice.
  for(const sign of [-1,1]){
   characterTube(torso,[[sign*.17,.08,.14],[sign*.22,.28,.19],[sign*.245,.46,.22],[sign*.19,.63,.17]],.009,velvetMat,12,5);
   characterTube(torso,[[sign*.20,.50,-.18],[sign*.16,.35,-.22],[sign*.12,.17,-.205]],.008,dressTrim,10,5);
  }
  // High neckline, softly folded lapels and understated buttons.
  const neck=new THREE.Mesh(new THREE.CapsuleGeometry(.092,.16,5,12),skinMat);
  neck.position.set(0,.91,0);neck.castShadow=true;torso.add(neck);
  const collar=new THREE.Mesh(new THREE.LatheGeometry([
   new THREE.Vector2(.135,0),new THREE.Vector2(.17,.035),new THREE.Vector2(.15,.105),new THREE.Vector2(.115,.13)
  ],20),bodyMat);
  collar.position.set(0,.82,0);collar.castShadow=true;torso.add(collar);
  for(const sign of [-1,1]){
   const lapel=box(.105,.24,.025,velvetMat,sign*.105,.68,-.22,torso);
   lapel.rotation.z=sign*.24;
   const pin=new THREE.Mesh(new THREE.SphereGeometry(.018,12,8),jewelryMat);
   pin.position.set(sign*.19,.70,-.229);torso.add(pin);
  }
  for(const y of [.49,.38,.27]){
   const button=new THREE.Mesh(new THREE.SphereGeometry(.018,12,8),jewelryMat);
   button.position.set(0,y,-.292);torso.add(button);
  }
  const chain=new THREE.Mesh(new THREE.TorusGeometry(.14,.008,7,24),jewelryMat);
  chain.position.set(0,.57,-.235);chain.rotation.x=.17;torso.add(chain);
  const pendant=new THREE.Mesh(new THREE.DodecahedronGeometry(.039,0),jewelryMat);
  pendant.position.set(0,.43,-.269);pendant.rotation.set(.2,.25,Math.PI/4);pendant.castShadow=true;torso.add(pendant);
  const pendantDrop=new THREE.Mesh(new THREE.SphereGeometry(.012,10,8),dressTrim);
  pendantDrop.position.set(0,.38,-.27);torso.add(pendantDrop);
  
  // A shaped face with visible eyes and mature, understated features.
  const head=sphere(.225,skinMat,0,1.12,-.005,.91,1.10,.83,torso);
  sphere(.043,skinMat,-.222,1.095,-.005,.72,1.04,.82,torso);
  sphere(.043,skinMat,.222,1.095,-.005,.72,1.04,.82,torso);
  const earL=sphere(.029,skinShadeMat,-.229,1.10,-.035,.65,1.0,.8,torso);
  const earR=sphere(.029,skinShadeMat,.229,1.10,-.035,.65,1.0,.8,torso);
  // Eyes are layered rather than simple dark dots: ivory, hazel iris, pupil and a fine liner.
  for(const sign of [-1,1]){
   sphere(.035,ivoryMat,sign*.081,1.145,-.197,1.16,.68,.42,torso);
   sphere(.018,irisMat,sign*.081,1.145,-.214,.95,.95,.55,torso);
   sphere(.009,eyeMat,sign*.081,1.145,-.222,1,1,.55,torso);
   sphere(.0045,ivoryMat,sign*.075,1.153,-.227,1,1,1,torso);
   characterTube(torso,[[sign*.13,1.155,-.197],[sign*.09,1.178,-.208],[sign*.045,1.158,-.197]],.006,eyeMat,8,5);
   characterTube(torso,[[sign*.135,1.218,-.178],[sign*.09,1.235,-.192],[sign*.045,1.218,-.185]],.010,hairDarkMat,8,5);
   // Subtle cheek and smile-line shading.
   sphere(.045,skinShadeMat,sign*.135,1.065,-.167,.75,.42,.18,torso);
   characterTube(torso,[[sign*.145,1.045,-.187],[sign*.12,1.018,-.196],[sign*.095,1.012,-.198]],.0035,skinShadeMat,6,4);
   // Small gold earrings and pearl drops.
   const hoop=new THREE.Mesh(new THREE.TorusGeometry(.022,.005,6,12),jewelryMat);
   hoop.position.set(sign*.226,1.055,-.025);hoop.rotation.y=Math.PI/2;torso.add(hoop);
   sphere(.012,jewelryMat,sign*.226,1.018,-.025,1,1,1,torso);
  }
  // Natural nose bridge and tip, not an oversized cone.
  sphere(.028,skinMat,0,1.125,-.202,.70,1.45,.76,torso);
  sphere(.031,skinMat,0,1.085,-.222,.85,.65,.72,torso);
  sphere(.012,skinShadeMat,-.024,1.079,-.238,.9,.58,.5,torso);
  sphere(.012,skinShadeMat,.024,1.079,-.238,.9,.58,.5,torso);
  sphere(.034,lipMat,0,1.005,-.195,1.42,.48,.48,torso);
  sphere(.029,skinShadeMat,0,.989,-.195,1.16,.28,.42,torso);
  characterTube(torso,[[-.045,1.0,-.217],[0,.996,-.222],[.045,1.0,-.217]],.0028,eyeMat,8,4);
  
  // Full, softly rounded ash-blonde bob: overlapping hair masses, not a flat cap.
  // Slightly fuller crown and back volume conceal the scalp while keeping the face clear.
  sphere(.255,hairMat,0,1.315,.035,1.055,.91,1.02,torso);
  sphere(.235,hairDarkMat,0,.955,.13,1.08,1.42,.99,torso);
  sphere(.145,hairMat,0,1.39,.045,.96,.88,.92,torso);
  // Uneven overlapping crown tufts give the silhouette a natural, fluffy outline.
  sphere(.125,hairWarmMat,-.158,1.365,.025,.95,.96,.95,torso);
  sphere(.132,hairMat,-.055,1.418,.055,.92,.88,1.0,torso);
  sphere(.12,hairLightMat,.075,1.405,.045,.95,.91,.98,torso);
  sphere(.128,hairWarmMat,.176,1.36,.03,.93,.97,.94,torso);
  // Thick shoulder-length sides, with rounded, slightly irregular ends.
  for(const sign of [-1,1]){
   sphere(.135,hairDarkMat,sign*.202,1.105,.075,.88,1.50,1.02,torso);
   sphere(.118,hairMat,sign*.218,.875,.085,.98,1.05,1.02,torso);
   sphere(.087,hairWarmMat,sign*.252,.965,.015,.78,1.30,.93,torso);
   sphere(.065,hairLightMat,sign*.247,1.13,.0,.72,1.24,.94,torso);
  }
  // Layered curved locks across the back, deliberately varied in length and wave.
  for(let i=0;i<25;i++){
   const x=-.245+i*.0204;
   const wave=Math.sin(i*1.7)*.014;
   const endY=.735+(i%5)*.035;
   const hairTone=[hairDarkMat,hairMat,hairWarmMat,hairLightMat,hairMat][i%5];
   characterTube(torso,[
    [x*.47,1.43,.105],
    [x*.78+wave,1.28,.225],
    [x+wave,1.045,.315],
    [x*.98+wave,endY,.245+Math.cos(i*1.3)*.025]
   ],.010+(i%4)*.0025,hairTone,12,5);
  }
  // Side locks frame the face and hide the skin edge at the temples without covering the eyes.
  for(const sign of [-1,1]){
   for(let i=0;i<7;i++){
    const t=i/6;
    const x=sign*(.13+t*.115);
    const z=-.045+Math.sin(t*Math.PI)*-.065;
    characterTube(torso,[
     [sign*(.09+t*.045),1.405-t*.035,-.025],
     [sign*(.19+t*.035),1.255-t*.045,z],
     [sign*(.245+t*.012),1.035-t*.08,-.055],
     [sign*(.22+t*.035),.79+(i%3)*.045,.045+t*.045]
    ],.012+(i%3)*.0025,i%3===0?hairLightMat:(i%2?hairMat:hairWarmMat),12,5);
   }
  }
  // A loose side-swept fringe and a visible off-centre part.
  for(let i=0;i<10;i++){
   const t=i/9;
   const x=-.16+t*.31;
   const sweep=x+.075+Math.sin(t*Math.PI)*.018;
   characterTube(torso,[
    [x*.52,1.50,.005],
    [x*.72+.045,1.445,-.075],
    [sweep*.88,1.365,-.145],
    [sweep,1.275-(i%3)*.018,-.155]
   ],.010+(i%3)*.0018,i%4===0?hairLightMat:(i%2?hairMat:hairWarmMat),11,5);
  }
  // Fine highlights follow the direction of the hair instead of forming a hard helmet edge.
  for(let i=0;i<13;i++){
   const x=-.22+i*.036;
   characterTube(torso,[
    [x*.5,1.44,.17],
    [x*.78,1.28,.285],
    [x,1.08,.335],
    [x*.98,.87+(i%4)*.026,.275]
   ],.0045,i%3===0?hairLightMat:hairWarmMat,10,4);
  }
  
  // Long black sleeves with rounded shoulders, cuffs, articulated hands and tiny fingers.
  const armL=new THREE.Group(),armR=new THREE.Group();
  armL.position.set(-.315,.50,0);armR.position.set(.315,.50,0);torso.add(armL,armR);
  armL.rotation.z=-.10;armR.rotation.z=.10;
  for(const [arm,sign] of [[armL,-1],[armR,1]]){
   sphere(.105,bodyMat,0,-.018,0,1.08,1.0,1.04,arm);
   characterCapsule(arm,.078,.30,bodyMat,0,-.205,0,1.0,1.0,1.0);
   const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.077,.079,.045,14),dressTrim);
   cuff.position.set(0,-.385,0);cuff.castShadow=true;arm.add(cuff);
   const wrist=new THREE.Mesh(new THREE.CapsuleGeometry(.043,.075,4,8),skinMat);
   wrist.position.set(0,-.444,-.005);wrist.castShadow=true;arm.add(wrist);
   sphere(.062,skinMat,0,-.492,-.02,.92,1.02,.72,arm);
   for(let f=0;f<3;f++)characterCapsule(arm,.012,.034,skinMat,sign*(f-1)*.025,-.535,-.048,.9,1,1);
   sphere(.014,skinMat,-sign*.046,-.5,-.035,1,1,1,arm);
  }
  // Legs use separate pivots so the run cycle no longer swings square blocks at the hips.
  const legL=new THREE.Group(),legR=new THREE.Group();
  legL.position.set(-.17,.57,0);legR.position.set(.17,.57,0);runner.add(legL,legR);
  const bootL=new THREE.Group(),bootR=new THREE.Group();
  for(const [leg,boot] of [[legL,bootL],[legR,bootR]]){
   characterCapsule(leg,.073,.37,pantsMat,0,-.225,0,1,1,1);
   sphere(.078,pantsMat,0,-.085,0,1,.88,1,leg);
   boot.position.set(0,-.45,-.025);leg.add(boot);
   const sole=new THREE.Mesh(new THREE.BoxGeometry(.17,.045,.32),shoeMat);
   sole.position.set(0,-.065,-.075);sole.castShadow=true;boot.add(sole);
   sphere(.088,shoeMat,0,-.005,-.095,1.02,.80,1.38,boot);
   characterCapsule(boot,.063,.095,shoeMat,0,.045,.005,1,1,.95);
   const buckle=new THREE.Mesh(new THREE.BoxGeometry(.045,.032,.012),jewelryMat);
   buckle.position.set(0,.053,-.064);boot.add(buckle);
  }
  runner.position.set(0,0,2.3);
  
  // Procedural blue-fire glow replaces the former globe shells and nine balls.
  const ultimateAura=createUltimateAura(runner);
  return {runner,torso,armL,armR,legL,legR,ultimateAura};
}
