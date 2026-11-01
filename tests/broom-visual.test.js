import test from 'node:test';
import assert from 'node:assert/strict';
import {
 BROOM_VISUAL_PROFILES,broomVisualProfile,broomTuningSnapshot,
 setBroomTuningValue,revertBroomTuning,resetBroomTuning
} from '../src/powerups/BroomVisualProfiles.js';
import {broomTrailState} from '../src/powerups/BroomTrail.js';

test('broom VFX presets are separate and transition smoothly over the final 3s',()=>{
 resetBroomTuning();
 assert.equal(broomVisualProfile(9).density,200);
 assert.equal(broomVisualProfile(3).opacity,200);
 assert.equal(broomVisualProfile(0).opacity,31);
 assert.equal(broomVisualProfile(0).sparks,299);
 assert.equal(broomVisualProfile(1.5).density,(200+147)/2);
 assert.equal(broomVisualProfile(9).smokeColor,'#5600b3');
});
test('3D workshop sliders alter the actual shared particle profiles, with limits',()=>{
 resetBroomTuning();
 setBroomTuningValue('flight','density',0);
 setBroomTuningValue('flight','opacity',0);
 setBroomTuningValue('landing','coughs',235);
 setBroomTuningValue('landing','sparks',1000);
 setBroomTuningValue('landing','smokeColor','#bdaabb');
 setBroomTuningValue('landing','smokeColor','not-a-color');
 assert.equal(broomVisualProfile(9).density,0);
 assert.equal(broomVisualProfile(9).opacity,0);
 assert.equal(broomTuningSnapshot().landing.coughs,235);
 assert.equal(broomVisualProfile(0).sparks,400);
 assert.equal(broomVisualProfile(0).smokeColor,'#bdaabb');
 assert.equal(BROOM_VISUAL_PROFILES.flight.density,200);
 assert.equal(broomTuningSnapshot().landing.smokeColor,'#bdaabb');
 resetBroomTuning();
 assert.equal(broomVisualProfile(9).density,200);
});
test('closing without saving reverts the workshop tuning',()=>{
 resetBroomTuning();
 setBroomTuningValue('flight','streaks',0);
 assert.equal(broomVisualProfile(9).streaks,0);
 revertBroomTuning();
 assert.equal(broomVisualProfile(9).streaks,95);
});
test('last three seconds of the broom display the warning and brighter sparks',()=>{
 assert.equal(broomTrailState(9).warning,false);
 assert.equal(broomTrailState(3).warning,true);
 assert.equal(broomTrailState(0).active,false);
 assert.ok(broomTrailState(1).sparkIntensity>broomTrailState(2.9).sparkIntensity);
 assert.ok(broomTrailState(0.2).fatigue>broomTrailState(2.5).fatigue);
});

test('flight and landing can have independent effect colors with smooth interpolation',()=>{
 resetBroomTuning();
 setBroomTuningValue('flight','streakColor','#112233');
 setBroomTuningValue('landing','streakColor','#445566');
 setBroomTuningValue('flight','sparkColor','#ffeedd');
 setBroomTuningValue('landing','coughColor','#baabcd');
 assert.equal(broomVisualProfile(9).streakColor,'#112233');
 assert.equal(broomVisualProfile(0).streakColor,'#445566');
 assert.equal(broomVisualProfile(1.5).streakColor,'#2b3c4d');
 assert.equal(broomVisualProfile(9).sparkColor,'#ffeedd');
 assert.equal(broomVisualProfile(0).coughColor,'#baabcd');
 setBroomTuningValue('flight','smokeRise',500);
 setBroomTuningValue('flight','sparkSpread',-5);
 assert.equal(broomVisualProfile(9).smokeRise,200);
 assert.equal(broomVisualProfile(9).sparkSpread,0);
 setBroomTuningValue('flight','sparkColor','javascript:');
 assert.equal(broomVisualProfile(9).sparkColor,'#ffeedd');
 resetBroomTuning();
});

test('approved exported broom preset is the full default for both phases',()=>{
 resetBroomTuning();
 const expected={"flight":{"density":200,"opacity":200,"size":139,"length":153,"streaks":95,"coughs":250,"sparks":400,"smokeRise":164,"sparkSpread":250,"sparkSize":250,"glowSize":250,"glowIntensity":147,"smokeColor":"#5600b3","coughColor":"#ff70d9","streakColor":"#fa00ab","sparkColor":"#761aa8","glowColor":"#8126f7"},"landing":{"density":147,"opacity":31,"size":150,"length":47,"streaks":39,"coughs":250,"sparks":299,"smokeRise":100,"sparkSpread":100,"sparkSize":100,"glowSize":100,"glowIntensity":100,"smokeColor":"#7400f0","coughColor":"#720dde","streakColor":"#540ff5","sparkColor":"#e97aff","glowColor":"#9747ff"}};
 assert.deepEqual(BROOM_VISUAL_PROFILES,expected);
 assert.deepEqual(broomTuningSnapshot(),expected);
 assert.equal(broomVisualProfile(1.5).opacity,115.5);
 assert.equal(broomVisualProfile(1.5).sparkSpread,175);
});
