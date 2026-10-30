// Keeps obstacle selection probabilities and spacing decisions outside the frame loop.
export function createSegmentGenerator({ makeLavaRiver, makeFish, makePuddle, makeObstacle, makeSoul }) {
  return function makeSegment(z) {
    
     if(Math.random()<.13){makeLavaRiver(z);return}
     if(Math.random()<.88){
      const lane=(Math.random()*3)|0;
      if(Math.random()<.20)makeFish(lane,z);else if(Math.random()<.17)makePuddle(lane,z);else makeObstacle(lane,z,'knot');
      // Keep a clear view of the hazard: souls follow it in the next safe stretch,
      // not alongside the fish, puddle, or fallen pine. Four souls, same chance.
      if(Math.random()<.72){
       const cl=(lane+1+(Math.random()<.5?1:0))%3;
       for(let j=0;j<4;j++)makeSoul(cl,z-7-j*1.55,1.2+Math.sin(j*.8)*.18);
      }
     }else{
      const lane=(Math.random()*3)|0;
      for(let j=0;j<5;j++)makeSoul(lane,z-j*1.55,1.2);
     }
  };
}
