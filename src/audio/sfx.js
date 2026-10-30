// Sample-based game SFX. Most clips are locally bundled CC0 OGG recordings.
// Soul collection uses the Mixkit #883 clip from its official CDN under the Mixkit SFX license.
// Do not redistribute the Mixkit audio as a standalone asset or source file.
const VOLUME_KEY = 'knottyPineSfxVolume';
const MUTE_KEY = 'knottyPineSfxMuted';
const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
const EFFECTS = {
  start:    {file:'start.ogg',gain:.40,rate:.85,cutoff:1350,gap:250},
  move:     {file:'move.ogg',gain:.25,rate:1.05,cutoff:3800,gap:95,jitter:.06},
  jump:     {file:'jump.ogg',gain:.43,rate:.83,cutoff:4400,gap:180},
  slide:    {file:'slide.ogg',gain:.35,rate:.85,cutoff:2200,gap:180},
  soul:     {remote:'https://assets.mixkit.co/active_storage/sfx/883/883-preview.mp3',gain:.74,gap:250},
  ultimate: {file:'ultimate.ogg',gain:.43,rate:.84,cutoff:2900,gap:1000,echo:.16},
  slip:     {file:'slip.ogg',gain:.38,rate:.72,cutoff:2400,gap:300},
  hat:      {file:'hat.ogg',gain:.28,rate:.92,cutoff:3600,gap:250,echo:.10},
  death:    {file:'death.ogg',gain:.65,rate:.69,cutoff:1600,gap:500,echo:.12},
  step:     {file:'step.ogg',gain:.14,rate:.93,cutoff:2400,gap:175,jitter:.07},
  land:     {file:'land.ogg',gain:.15,rate:.72,cutoff:1350,gap:180},
  bats:     {files:['bats-flap_1.ogg','bats-flap_2.ogg','bats-flap_3.ogg'],gain:.90,rate:1.0,cutoff:7500,gap:950}
};
const base = import.meta.env.BASE_URL + 'audio/sfx/';
function stored(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
export function createGameAudio() {
  let volume = clamp(stored(VOLUME_KEY, '.35'));
  let muted = stored(MUTE_KEY, '0') === '1';
  let context = null;
  let master = null;
  const cache = new Map();
  const lastPlayed = new Map();
  let preloaded = false;
  const soulVoices = [];
  let soulVoiceIndex = 0;
  function prepareSoulVoices() {
    if (soulVoices.length || !window.Audio) return;
    for (let i=0;i<2;i++) {
      const voice = new Audio(EFFECTS.soul.remote);
      voice.preload = 'auto';
      voice.volume = muted ? 0 : Math.min(1,volume * EFFECTS.soul.gain);
      soulVoices.push(voice);
    }
  }
  function syncSoulVolume() {
    const v = muted ? 0 : Math.min(1,volume * EFFECTS.soul.gain);
    for (const voice of soulVoices) voice.volume = v;
  }
  function playSoul() {
    prepareSoulVoices();
    if (!soulVoices.length) return;
    const voice = soulVoices[soulVoiceIndex++ % soulVoices.length];
    const serial = (voice._knottySerial || 0) + 1;
    voice._knottySerial = serial;
    voice.pause();
    try { voice.currentTime = 0; } catch {}
    voice.playbackRate = 1;
    voice.volume = Math.min(1,volume * EFFECTS.soul.gain);
    // The recording's audible part is about a second; omit its long silent tail.
    const playback = voice.play();
    if (playback && typeof playback.catch === 'function') playback.catch(()=>{});
    setTimeout(() => {
      if (serial !== voice._knottySerial) return;
      voice.pause();
      try { voice.currentTime = 0; } catch {}
    }, 1200);
  }

  function read(file) {
    if (!context) return Promise.resolve(null);
    if (!cache.has(file)) {
      const p = fetch(base + file)
        .then(r => {
          if (!r.ok) throw new Error(file + ': HTTP ' + r.status);
          return r.arrayBuffer();
        })
        .then(bytes => context.decodeAudioData(bytes))
        .catch(err => { console.warn('Unable to load sound', file, err); return null; });
      cache.set(file, p);
    }
    return cache.get(file);
  }

  function unlock() {
    if (muted || volume <= 0) return null;
    if (!context) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      try {
        context = new Ctx();
        master = context.createGain();
        master.gain.value = volume;
        master.connect(context.destination);
      } catch { context = null; master = null; return null; }
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
    if (!preloaded) {
      preloaded = true;
      // Start loading after the player's first gesture (also works on iPhone).
      for (const effect of Object.values(EFFECTS)) {
        if (effect.file) read(effect.file);
        if (effect.files) for (const file of effect.files) read(file);
      }
      prepareSoulVoices();
    }
    return context;
  }

  // Bat wings: find the first audible waveform rather than replaying silence.
  // These are actual wing foley samples; never synthesize artificial beeps.
  const batProfiles = new WeakMap();
  function getBatProfile(buffer) {
    if (batProfiles.has(buffer)) return batProfiles.get(buffer);
    const samples = buffer.getChannelData(0);
    const stride = 512;
    const energies = [];
    let peak = 0;
    for (let k = 0; k < samples.length; k += stride) {
      let total = 0;
      const stop = Math.min(k + stride, samples.length);
      for (let j = k; j < stop; j++) total += samples[j] * samples[j];
      const level = Math.sqrt(total / (stop - k));
      energies.push(level);
      peak = Math.max(peak, level);
    }
    const threshold = Math.max(.00035, peak * .085);
    const first = energies.findIndex(v => v >= threshold);
    const onset = first < 0 ? 0 : Math.max(0, first * stride / buffer.sampleRate - .023);
    const startSample = Math.floor(onset * buffer.sampleRate);
    const endSample = Math.min(samples.length, startSample + Math.round(.75 * buffer.sampleRate));
    let energy = 0, sampleCount = 0;
    for (let j = startSample; j < endSample; j += 4) {
      energy += samples[j] * samples[j];
      sampleCount++;
    }
    const rms = Math.sqrt(energy / Math.max(sampleCount, 1));
    const normalize = Math.min(7, Math.max(.65, .12 / Math.max(.002, rms)));
    const profile = { onset, normalize };
    batProfiles.set(buffer, profile);
    return profile;
  }
  function playBatFlight(fx) {
    // The first sound is audible immediately; each subsequent wing beat decays.
    Promise.all(fx.files.map(read)).then(buffers => {
      if (!context || !master || muted || volume <= 0) return;
      if (context.state === 'suspended') return;
      const startTime = context.currentTime + .012;
      buffers.forEach((buffer, i) => {
        if (!buffer) return;
        try {
          const {onset, normalize} = getBatProfile(buffer);
          const rate = fx.rate * (.95 + Math.random() * .10);
          const duration = Math.min(.76, (buffer.duration - onset) / rate);
          if (duration <= .06) return;
          const at = startTime + i * .18;
          const source = context.createBufferSource();
          const filter = context.createBiquadFilter();
          const gain = context.createGain();
          source.buffer = buffer;
          source.playbackRate.value = rate;
          filter.type = 'lowpass';
          filter.frequency.value = fx.cutoff;
          filter.Q.value = .45;
          const level = Math.min(1.8, normalize * fx.gain) * [1, .77, .63][i];
          gain.gain.setValueAtTime(.0001, at);
          gain.gain.linearRampToValueAtTime(level, at + .018);
          gain.gain.setValueAtTime(level, at + Math.max(.035, duration - .11));
          gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
          source.connect(filter);
          filter.connect(gain);
          gain.connect(master);
          source.start(at, onset, duration);
          source.stop(at + duration + .004);
          source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
        } catch (err) { console.warn('Bat wing sound failed', err); }
      });
    }).catch(err => console.warn('Bat wing samples unavailable', err));
  }

  function play(name) {
    const fx = EFFECTS[name];
    if (!fx || !unlock()) return;
    const stamp = performance.now();
    if (stamp - (lastPlayed.get(name) ?? -Infinity) < fx.gap) return;
    lastPlayed.set(name, stamp);
    if (name === 'soul') { playSoul(); return; }
    if (name === 'bats') { playBatFlight(fx); return; }
    read(fx.file).then(buffer => {
      if (!buffer || !context || !master || muted || volume <= 0) return;
      try {
        const source = context.createBufferSource();
        const filter = context.createBiquadFilter();
        const gain = context.createGain();
        source.buffer = buffer;
        source.playbackRate.value = fx.rate * (1 + (Math.random() * 2 - 1) * (fx.jitter || 0));
        filter.type = 'lowpass';
        filter.frequency.value = fx.cutoff;
        filter.Q.value = .5;
        gain.gain.value = fx.gain;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(master);
        let delay = null;
        let wet = null;
        if (fx.echo) {
          delay = context.createDelay(.4);
          wet = context.createGain();
          delay.delayTime.value = fx.echo;
          wet.gain.value = .19;
          gain.connect(delay);
          delay.connect(wet);
          wet.connect(master);
        }
        source.start();
        source.onended = () => {
          source.disconnect();
          filter.disconnect();
          gain.disconnect();
          if (delay) { delay.disconnect(); wet.disconnect(); }
        };
      } catch (err) { console.warn('Unable to play sound', name, err); }
    });
  }

  function setMuted(next) {
    muted = Boolean(next);
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch {}
    if (!muted) unlock();
    if (context && master) master.gain.setTargetAtTime(muted ? 0 : volume, context.currentTime, .015);
    syncSoulVolume();
  }
  function setVolume(next) {
    volume = clamp(next);
    try { localStorage.setItem(VOLUME_KEY, String(volume)); } catch {}
    if (context && master) master.gain.setTargetAtTime(muted ? 0 : volume, context.currentTime, .015);
    syncSoulVolume();
  }
  return { play, unlock, setMuted, setVolume, getMuted: () => muted, getVolume: () => volume };
}
