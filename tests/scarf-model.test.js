import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Misty scarf renders an independently modeled embroidered 3D shawl',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const model=read('src/powerups/ScarfModel.js');
 const pickup=read('src/powerups/ScarfPickup.js');
 assert.match(model,/CanvasTexture/);
 assert.match(model,/BufferGeometry/);
 assert.match(model,/createModel/);
 assert.match(model,/fringeGeo/);
 assert.match(model,/flower\(/);
 assert.match(model,/THREE\.DoubleSide/);
 assert.match(pickup,/createScarfModelFactory/);
 assert.match(pickup,/rotation\.y=t\*\.0015\+p\.phase/);
 // Existing collectible, rule, and revive entry points still belong to pickup.
 for(const member of ['function offer(','function update(','function revive(','function reset('])
  assert.ok(pickup.includes(member),member);
 assert.ok(read('src/systems/ScarfRules.js').includes('SCARF_INTERVAL_METRES=3000'));
});
