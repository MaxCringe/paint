// Track achievements against the records captured at the BEGINNING of a run.
// Independent from UI and rendering; legacy saves count as prior experience.
export function createRunRecordTracker({storage,bestMetres=0,bestSouls=0}={}){
 const key='knottyPineRunsStarted';
 const score=value=>Math.max(0,Math.floor(Number(value)||0));
 const read=()=>{
  try{
   const raw=storage?.getItem(key);
   if(raw!==null&&raw!==undefined)return score(raw);
  }catch{}
  return bestMetres>0||bestSouls>0?1:0;
 };
 let runs=read();
 let baselineMetres=score(bestMetres),baselineSouls=score(bestSouls);
 let eligible=false,metres=false,souls=false;
 function start(previousMetres,previousSouls){
  baselineMetres=score(previousMetres);
  baselineSouls=score(previousSouls);
  eligible=runs>0;  // First ever run only establishes the initial record.
  runs++;
  try{storage?.setItem(key,String(runs));}catch{}
  metres=false;souls=false;
  return status();
 }
 function progress(distance,collectedSouls){
  if(eligible){
   if(score(distance)>baselineMetres)metres=true;
   if(score(collectedSouls)>baselineSouls)souls=true;
  }
  return status();
 }
 function status(){return {metres,souls};}
 return {start,progress,status,get runsStarted(){return runs;}};
}
