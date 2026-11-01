import test from 'node:test';
import assert from 'node:assert/strict';
import {
 BROOM_VISUAL_PROFILES,broomVisualProfile,broomTuningSnapshot,
 setBroomTuningValue,revertBroomTuning,resetBroomTuning
} from '../src/powerups/BroomVisualProfiles.js';
import {broomTrailState} from '../src/powerups/BroomTrail.js';

test('broom VFX presets are separate and transition smoothly over the final 3s',()=>{
 resetBroomTuning();
 assert.equal(broomVisualProfile(9).density,180);
 assert.equal(broomVisualProfile(3).opacity,110);
 assert.equal(broomVisualProfile(0).opacity,70);
 assert.equal(broomVisualProfile(0).sparks,299);
 assert.equal(broomVisualProfile(1.5).density,(180+150)/2);
 assert.equal(broomVisualProfile(9).smokeColor,'#d8c5ec');
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
 assert.equal(BROOM_VISUAL_PROFILES.flight.density,180);
 assert.equal(broomTuningSnapshot().landing.smokeColor,'#bdaabb');
 resetBroomTuning();
 assert.equal(broomVisualProfile(9).density,180);
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
