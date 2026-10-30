// CC0 sample-based sound effects. One replaceable .ogg file per game event.
// No oscillator/chiptune generation. Adjust per-event volume/filters below.
const VOLUME_KEY = 'knottyPineSfxVolume';
const MUTE_KEY = 'knottyPineSfxMuted';
const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
const EFFECTS = {
  start:    {file:'start.ogg',gain:.40,rate:.85,cutoff:1350,gap:250},
  move:     {file:'move.ogg',gain:.25,rate:1.05,cutoff:3800,gap:95,jitter:.06},
  jump:     {file:'jump.ogg',gain:.43,rate:.83,cutoff:4400,gap:180},
  slide:    {file:'slide.ogg',gain:.35,rate:.85,cutoff:2200,gap:180},
  soul:     {file:'soul.ogg',gain:.30,rate:1.1,cutoff:4700,gap:85,echo:.10},
  ultimate: {file:'ultimate.ogg',gain:.43,rate:.84,cutoff:2900,gap:1000,echo:.16},
  slip:     {file:'slip.ogg',gain:.38,rate:.72,cutoff:2400,gap:300},
  hat:      {file:'hat.ogg',gain:.28,rate:.92,cutoff:3600,gap:250,echo:.10},
  death:    {file:'death.ogg',gain:.65,rate:.69,cutoff:1600,gap:500,echo:.12},
  step:     {file:'step.ogg',gain:.14,rate:.93,cutoff:2400,gap:175,jitter:.07},
  land:     {file:'land.ogg',gain:.15,rate:.72,cutoff:1350,gap:180}
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
      for (const {file} of Object.values(EFFECTS)) read(file);
    }
    return context;
  }

  function play(name) {
    const fx = EFFECTS[name];
    if (!fx || !unlock()) return;
    const stamp = performance.now();
    if (stamp - (lastPlayed.get(name) ?? -Infinity) < fx.gap) return;
    lastPlayed.set(name, stamp);
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
  }
  function setVolume(next) {
    volume = clamp(next);
    try { localStorage.setItem(VOLUME_KEY, String(volume)); } catch {}
    if (context && master) master.gain.setTargetAtTime(muted ? 0 : volume, context.currentTime, .015);
  }
  return { play, unlock, setMuted, setVolume, getMuted: () => muted, getVolume: () => volume };
}
