import {createFlameShaderMaterial} from './original/Shaders.js';
// Original equations, one shared instanced batch. Uniform settings become instance
// attributes so different authored presets can coexist without one material per tree.
export function createOriginalBatchMaterial(){
 const m=createFlameShaderMaterial();
 const attributes='attribute vec4 aForm,aStyle,aMotion,aExtra,aEnvelope;attribute vec3 aBase,aMiddle,aTip;varying vec4 vStudio;varying vec2 vStudioShape;varying vec3 vCore,vMid,vEdge;\n';
 const aliases={uFlameHeight:'1.',uFlameWidth:'1.',uSpeed:'aStyle.x',uSwayStrength:'aMotion.x',uModeType:'aMotion.w'};
 let v=m.vertexShader.replace(/attribute vec4 aInstanceParams;[^\n]*/,'').replace(/attribute vec4 aInstanceExtra;[^\n]*/,'');
 for(const [name,value] of Object.entries(aliases))v=v.replace(new RegExp('uniform float '+name+';'),'').replace(new RegExp('\\b'+name+'\\b','g'),value);
 v=attributes+'\n#define aInstanceParams vec4(aStyle.w,aForm.x,aForm.y,aForm.w)\n#define aInstanceExtra aExtra\n'+v;
 v=v.replace('void main() {','void main() {if(aShellData.z>.5&&(aMotion.y<1.5||aMotion.z<.001)){gl_Position=vec4(2.,2.,2.,1.);return;}vStudioShape=vec2(aMotion.z,aEnvelope.y);vStudio=vec4(aForm.z*aStyle.z,aStyle.y,aStyle.x,aMotion.y);vCore=aBase;vMid=aMiddle;vEdge=aTip;');
 v=v.replace('pow(burstWave, 4.0) * 0.38','pow(burstWave, 4.0) * aEnvelope.x').replace('// Subtle upward breathing stretch','pos.x+=hNorm*hNorm*aEnvelope.z*wScale;pos.z+=sin(hNorm*9.-t*2.)*hNorm*aEnvelope.w*wScale;\n        // Subtle upward breathing stretch');
 let f=m.fragmentShader.replace('float n1 = fbmFire(noiseCoord, octs);','noiseCoord *= .5 + .5*vStudioShape.y;\n        float n1 = fbmFire(noiseCoord, octs);').replace('0.58 * noiseRidge','vStudioShape.x * noiseRidge');
 for(const [name,value] of Object.entries({uIntensity:'vStudio.x',uOpacity:'vStudio.y',uSpeed:'vStudio.z',uOctaves:'vStudio.w',uCoreColor:'vCore',uMidColor:'vMid',uEdgeColor:'vEdge',uModeType:'0.'}))f=f.replace(new RegExp('uniform (float|vec3) '+name+';'),'').replace(new RegExp('\\b'+name+'\\b','g'),value);
 m.vertexShader=v;m.fragmentShader='varying vec4 vStudio;varying vec2 vStudioShape;varying vec3 vCore,vMid,vEdge;\n'+f;m.forceSinglePass=true;m.toneMapped=false;return m;
}

// Both coal silhouettes share one batch. Unused vertex ranges are skipped when
// the scene contains only one style; mixed styles are clipped in the vertex shader.
export function createSurfaceCoalGeometry(THREE,original){
 const cracked=new THREE.IcosahedronGeometry(1,0),a=cracked.getAttribute('position'),b=original.getAttribute('position');
 const positions=new Float32Array((a.count+b.count)*3),shapes=new Float32Array((a.count+b.count)*4);
 for(let i=0;i<a.count;i++){positions.set([a.getX(i),a.getY(i),a.getZ(i)],i*3);shapes[i*4+3]=0;}
 for(let i=0;i<b.count;i++){positions.set([b.getX(i)/.085,b.getY(i)/.085,b.getZ(i)/.085],(a.count+i)*3);shapes.set([b.getX(i),b.getY(i),b.getZ(i),1],(a.count+i)*4);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('aCoalShape',new THREE.BufferAttribute(shapes,4));geo.userData.crackedCount=a.count;cracked.dispose();return geo;
}
