// Optional test character model. All animations now come from Python-generated
// data bundled under public/models/fiona/animations/; no Mixamo asset cache.
const MODEL_URL='/models/fiona/rigged-model%20(1)%20(1).fbx';

export async function resolveFionaAssets({modelFile}={}){
 if(modelFile){
  if(!/\.fbx$/i.test(modelFile.name))throw new Error('Выбери модель в формате FBX.');
  return {files:{modelFile},origin:'computer'};
 }
 let response;
 try{response=await fetch(MODEL_URL,{cache:'force-cache'});}
 catch(error){throw new Error('Не удалось скачать модель Фионы: '+error.message);}
 if(!response.ok)throw new Error('Модель Фионы не найдена на сайте (HTTP '+response.status+').');
 const contentType=response.headers.get('content-type')||'';
 if(/text\/html/i.test(contentType))throw new Error('Вместо FBX сайт вернул HTML. Проверь путь модели.');
 const bytes=await response.arrayBuffer();
 if(bytes.byteLength<1000)throw new Error('Загруженная модель Фионы слишком мала или повреждена.');
 const model=new File([bytes],'rigged-model (1) (1).fbx',{type:'application/octet-stream'});
 return {files:{modelFile:model},origin:'website'};
}
