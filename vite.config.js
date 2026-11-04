import { defineConfig,loadEnv } from 'vite';
import { resolve } from 'node:path';
import {execFileSync} from 'node:child_process';

export default defineConfig(({command,mode})=>{
 const env={...loadEnv(mode,process.cwd(),''),...process.env};
 const editorEnabled=env.VITE_ENABLE_WORLD_EDITOR==='true'||(command==='serve'&&env.VITE_ENABLE_WORLD_EDITOR!=='false');
 let commit=env.VERCEL_GIT_COMMIT_SHA??'unknown',dirty=!env.VERCEL_GIT_COMMIT_SHA;
 try{commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();dirty=Boolean(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim());}catch{}
 const build={revision:4,commit,dirty,editorEnabled,builtAt:new Date().toISOString()};
 return {
  base:'./',define:{__EDITOR_BUILD__:JSON.stringify(build)},
  plugins:[{name:'editor-build-identity',generateBundle(){this.emitFile({type:'asset',fileName:'editor-build.json',source:JSON.stringify(build,null,2)});}}],
  build:{outDir:'dist',assetsDir:'assets',emptyOutDir:true,rollupOptions:{input:{main:resolve(process.cwd(),'index.html'),fireStudioPreview:resolve(process.cwd(),'fire-studio-preview.html'),...(editorEnabled?{effectsComparison:resolve(process.cwd(),'effects-comparison.html')}: {})}}}
 };
});
