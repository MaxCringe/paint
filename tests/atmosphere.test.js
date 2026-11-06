import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {normalizeAtmosphere,ATMOSPHERE_PRESETS} from '../src/systems/AtmosphereSettings.js';
import {createAtmosphereRuntime} from '../src/systems/AtmosphereRuntime.js';
import {createAirLite} from '../src/systems/AirLite.js';
import {createWindSystem} from '../src/systems/WindSystem.js';
import {PINE_SPECIES,upgradePreset,PresetHistory,saveEffectPreset,readEffectPreset} from '../src/devtools/world/FirePreset.js';

test('atmosphere schema bounds imports, keeps a soft reaction zone and rejects future versions',()=>{
 const p=normalizeAtmosphere({fog:{near:-20,far:0,density:Infinity,color:'red'},ash:{amount:10000,size:NaN},wind:{enabled:'false'}});
 assert.equal(p.fog.near,14);assert.ok(p.fog.far>=p.fog.near+30);assert.equal(p.fog.density,1);assert.equal(p.fog.color,'#3b101b');assert.equal(p.ash.amount,100);assert.equal(p.ash.size,1);assert.equal(p.wind.enabled,true);
 assert.throws(()=>normalizeAtmosphere({version:99}),/версия/);
 for(const value of Object.values(ATMOSPHERE_PRESETS))assert.deepEqual(normalizeAtmosphere(value.settings),value.settings);
});
test('atmosphere round-trips in existing fire JSON, storage and Undo/Redo without changing fire data',()=>{
 const previous=globalThis.localStorage,store=new Map([['record','100']]);globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 try{
  const p=upgradePreset({version:1,seed:1337,plants:Object.fromEntries(PINE_SPECIES.map(k=>[k,[]])),deck:[]}),history=new PresetHistory(p),before=structuredClone(p);
  p.atmosphere=ATMOSPHERE_PRESETS.forest.settings;history.push(p);saveEffectPreset(p);
  assert.deepEqual(readEffectPreset(),p);assert.deepEqual(upgradePreset(JSON.parse(JSON.stringify(p))),p);assert.deepEqual(history.undo(),before);assert.deepEqual(history.redo(),p);
  const {atmosphere,...fire}=p;assert.deepEqual(fire,before);assert.equal(store.get('record'),'100');
 }finally{globalThis.localStorage=previous;}
});
test('existing AirLite pools change real particle and layer counts; preview and reopen allocate nothing',()=>{
 const oldDocument=globalThis.document;globalThis.document={createElement:()=>({width:64,height:64,getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
 try{
  const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x3b101b,14,68);const backdrop=new THREE.Group();scene.add(backdrop);
  const mountain=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial({fog:false}));backdrop.add(mountain);
  const volcanic=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial());volcanic.name='VolcanoAtmosphericParticles';backdrop.add(volcanic);
  const air=createAirLite(scene,{mobile:false}),wind=createWindSystem([]),runtime=createAtmosphereRuntime({scene,air,wind,backdrop,mobile:false});const count=scene.children.length;
  const low=normalizeAtmosphere({...ATMOSPHERE_PRESETS.storm.settings,quality:'low'});runtime.configure(low);const cheap=runtime.stats();
  runtime.configure({...low,quality:'high'});const rich=runtime.stats();assert.ok(rich.particles>cheap.particles);assert.ok(rich.drawCalls>cheap.drawCalls);assert.equal(volcanic.geometry.drawRange.count,64);
  runtime.setFogHidden(true);assert.equal(scene.fog,null);assert.ok(runtime.stats().drawCalls<rich.drawCalls);runtime.setFogHidden(false);assert.ok(scene.fog?.isFog);assert.equal(scene.children.length,count);
  runtime.update(.04,{playing:true,speed:50});assert.ok(runtime.stats().cpuMs>=0);assert.ok(Math.abs(wind.current.x)+Math.abs(wind.current.z)>0);
  runtime.configure({fog:{enabled:false},ash:{enabled:false},wind:{enabled:false},background:{enabled:false}});assert.equal(scene.fog,null);assert.equal(runtime.stats().particles,0);runtime.update(.04);assert.equal(wind.current.strength,0);
  air.dispose();mountain.geometry.dispose();mountain.material.dispose();volcanic.geometry.dispose();volcanic.material.dispose();
 }finally{globalThis.document=oldDocument;}
});
