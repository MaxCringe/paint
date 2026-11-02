// Minimal extensible contract for every forest plant: one registration, any number
// of cached visual prototypes, one weighted placement system.
export class PlantRegistry {
 constructor(){this.species=new Map();}
 register({id,family,weight=1,templates=1,create,sizing,windKind}){
  if(!id||!family||typeof create!=='function'||!Number.isFinite(weight)||weight<=0||
     !Number.isInteger(templates)||templates<1||this.species.has(id)){
   throw new Error('Invalid or duplicate forest plant: '+id);
  }
  const entry=Object.freeze({id,family,weight,templates,create,sizing,windKind});
  this.species.set(id,entry);
  return this;
 }
 get(id){return this.species.get(id);}
 list(family){return [...this.species.values()].filter(p=>p.family===family);}
 choose(family,random=Math.random()){
  const types=this.list(family);
  const total=types.reduce((sum,p)=>sum+p.weight,0);
  if(!total)throw new Error('No forest plants registered for '+family);
  let remaining=Math.max(0,Math.min(1-Number.EPSILON,random))*total;
  for(const plant of types){remaining-=plant.weight;if(remaining<0)return plant;}
  return types[types.length-1];
 }
}

export function createForestRandom(seed=1337){
 let value=(Math.floor(seed)>>>0)||1;
 return ()=>{
  let t=value+=0x6D2B79F5;
  t=Math.imul(t^t>>>15,t|1);
  t^=t+Math.imul(t^t>>>7,t|61);
  return ((t^t>>>14)>>>0)/4294967296;
 };
}
