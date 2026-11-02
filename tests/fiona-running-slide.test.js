import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {FIONA_FBX_FILES} from '../src/player/FionaImportedFBX.js';

test('ground slide uses the uploaded Running Slide (1) FBX',()=>{
 const slide=FIONA_FBX_FILES.find(asset=>asset.id==='slide');
 assert.deepEqual(slide,{id:'slide',file:'Running Slide (1).fbx',action:'slideFBX'});
 assert.ok(existsSync(new URL('../public/models/fiona/animations/fbx/Running Slide (1).fbx',import.meta.url)));
 const controller=readFileSync(new URL('../src/player/FionaRig.js',import.meta.url),'utf8');
 assert.ok(controller.includes("slideFBX:'Running Slide (1).fbx'"));
 assert.ok(controller.includes("if(resolved==='slideFBX')action.setEffectiveTimeScale(clips.get(resolved).duration/SLIDE_DURATION)"));
 assert.ok(controller.includes("!['slipFBX','slideFBX'].includes(resolved)"));
 assert.ok(controller.includes("ultimate?'ultimateFly':broom?(broomDuck>0.14?'broomDuck':'broomFly')"));
});
