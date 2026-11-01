// Optional Fiona DEV asset loader. Never changes the normal runner.
const DATABASE='knotty-pine-fiona-assets-v1';
const PATHS={model:'/fiona/rigged-model.fbx',run:'/fiona/run-forward.fbx',jump:'/fiona/jump.fbx'};
function openDb(){
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined')return reject(new Error('IndexedDB unsupported'));
  const request=indexedDB.open(DATABASE,1);
  request.onupgradeneeded=()=>request.result.createObjectStore('files');
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 });
}
async function getSaved(key){
 const db=await openDb();
 try{return await new Promise((resolve,reject)=>{
  const request=db.transaction('files','readonly').objectStore('files').get(key);
  request.onsuccess=()=>resolve(request.result||null);
  request.onerror=()=>reject(request.error);
 });}finally{db.close();}
}
async function save(entries){
 const db=await openDb();
 try{await new Promise((resolve,reject)=>{
  const txn=db.transaction('files','readwrite');
  for(const [key,file] of entries)txn.objectStore('files').put(file,key);
  txn.oncomplete=resolve;txn.onerror=()=>reject(txn.error);
 });}finally{db.close();}
}
async function fromWebsite(path){
 let response;
 try{response=await fetch(path,{cache:'force-cache'});}catch{return null;}
 if(!response.ok)return null;
 const body=await response.blob();
 if(!body.size||/text\/html/i.test(body.type))return null;
 return new File([body],path.split('/').pop(),{type:'application/octet-stream'});
}
async function findAsset(key,userFile){
 if(userFile)return {file:userFile,origin:'computer'};
 const bundled=await fromWebsite(PATHS[key]);
 if(bundled)return {file:bundled,origin:'website'};
 try{const remembered=await getSaved(key);if(remembered?.size)return {file:remembered,origin:'saved'};}catch{}
 return {file:null,origin:'missing'};
}
export async function resolveFionaAssets({modelFile,runFile,jumpFile,animationFiles={}}){
 const entries=await Promise.all([
  findAsset('model',modelFile),
  findAsset('run',animationFiles.run||runFile),
  findAsset('jump',animationFiles.jump||jumpFile)
 ]);
 const [model,run,jump]=entries;
 if(!model.file||!run.file||!jump.file)throw new Error(
  'Не найдены: '+[!model.file&&'модель',!run.file&&'бег',!jump.file&&'прыжок'].filter(Boolean).join(', ')+
  '. Выбери недостающие FBX один раз: после успешного запуска браузер их запомнит.'
 );
 return {
  files:{modelFile:model.file,animationFiles:{...animationFiles,run:run.file,jump:jump.file}},
  sources:entries.map(item=>item.origin),
  async remember(){
   try{await save([['model',model.file],['run',run.file],['jump',jump.file]]);return true;}
   catch(error){console.warn('Fiona asset cache unavailable',error);return false;}
  }
 };
}
