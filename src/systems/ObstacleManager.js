// Keeps obstacle selection probabilities and spacing decisions outside the frame loop.
export function createSegmentGenerator({ makeLavaRiver, makeFish, makePuddle, makeObstacle, makeSoul, makeHat }) {
  return function makeSegment(z) {
    
     if(Math.random()<.13){makeLavaRiver(z);return}
     if(Math.random()<.88){
      const lane=(Math.random()*3)|0;
      if(Math.random()<.20)makeFish(lane,z);else if(Math.random()<.17)makePuddle(lane,z);else makeObstacle(lane,z,'knot');
      // Keep a clear view of the hazard: souls follow it in the next safe stretch,
      // not alongside the fish, puddle, or fallen pine. Four souls, same chance.
      let soulLane=-1;
      if(Math.random()<.72){
       const cl=(lane+1+(Math.random()<.5?1:0))%3;
       soulLane=cl;
       for(let j=0;j<4;j++)makeSoul(cl,z-4-j*1.55,1.2+Math.sin(j*.8)*.18);
      }
      // Rare witch hat only on an unoccupied lane: never hidden under a hazard or soul chain.
      if(Math.random()<.075){
       const free=[0,1,2].filter(l=>l!==lane&&l!==soulLane);
       makeHat(free[(Math.random()*free.length)|0],z-1.0);
      }
     }else{
      const lane=(Math.random()*3)|0;
      for(let j=0;j<5;j++)makeSoul(lane,z-j*1.55,1.2);
      if(Math.random()<.075){
       const hatLane=(lane+1+(Math.random()<.5?1:0))%3;
       makeHat(hatLane,z-1.0);
      }
     }
  };
}
