// Sample-based game SFX. Most clips are locally bundled CC0 OGG recordings.
// All game effects are local; no requests to third-party audio servers.
// The selected Mixkit impact clip is used only for collisions with pines.
const VOLUME_KEY = 'knottyPineSfxVolume';
const MUTE_KEY = 'knottyPineSfxMuted';
const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
const EFFECTS = {
  start:    {file:'start.ogg',gain:.40,rate:.85,cutoff:1350,gap:250},
  move:     {file:'move.ogg',gain:.25,rate:1.05,cutoff:3800,gap:95,jitter:.06},
  jump:     {file:'jump.ogg',gain:.43,rate:.83,cutoff:4400,gap:180},
  slide:    {file:'slide.ogg',gain:.35,rate:.85,cutoff:2200,gap:180},
  soul:     {file:'soul.ogg',gain:.74,gap:250},
  ultimate: {file:'ultimate.ogg',gain:.43,rate:.84,cutoff:2900,gap:1000,echo:.16},
  slip:     {file:'slip.ogg',gain:.38,rate:.72,cutoff:2400,gap:300},
  hat:      {file:'hat.ogg',gain:.28,rate:.92,cutoff:3600,gap:250,echo:.10},
  death:    {file:'death.ogg',gain:.65,rate:.69,cutoff:1600,gap:500,echo:.12},
  treeHit:  {file:'mixkit-fast-impact-blow-2655.mp3',gain:1,rate:1,cutoff:5500,gap:500},
  step:     {file:'step.ogg',gain:.14,rate:.93,cutoff:2400,gap:175,jitter:.07},
  land:     {file:'land.ogg',gain:.15,rate:.72,cutoff:1350,gap:180},
  bats:     {file:'bats-flock-digpro120.mp3',gain:.72,rate:1,cutoff:7300,gap:2800},
  rat:      {file:'rat-squeak-breviceps.mp3',gain:.88,rate:1,cutoff:7500,gap:550}
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
      const voice = new Audio(base + EFFECTS.soul.file);
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

  // Selected recording: DigPro120's CC0 Birds Wings.mp3 (Freesound #432639).
  // Play a ~5-second segment and fade it as the colony disappears into the forest.
  const batProfiles = new WeakMap();
  function getBatProfile(buffer) {
    if (batProfiles.has(buffer)) return batProfiles.get(buffer);
    const samples = buffer.getChannelData(0);
    const step = 512;
    let peak = 0;
    const energies = [];
    for (let i=0; i<samples.length; i+=step) {
      let total = 0, end = Math.min(i+step,samples.length);
      for (let k=i; k<end; k++) total += samples[k]*samples[k];
      let rms = Math.sqrt(total/(end-i));
      energies.push(rms);
      peak = Math.max(peak,rms);
    }
    const threshold = Math.max(.0005,peak*.075);
    const first = energies.findIndex(v=>v>=threshold);
    const onset = Math.max(0,(first<0?0:first*step/buffer.sampleRate)-.04);
    const result={onset};
    batProfiles.set(buffer,result);
    return result;
  }

  function playBatFlight(fx, details={}) {
    read(fx.file).then(buffer=>{
      if(!buffer||!context||!master||muted||volume<=0||context.state==='suspended')return;
      try{
        const source=context.createBufferSource();
        const filter=context.createBiquadFilter();
        const gain=context.createGain();
        const panner=context.createStereoPanner?context.createStereoPanner():null;
        const start=context.currentTime+.01;
        const offset=getBatProfile(buffer).onset;
        const duration=Math.min(5.1,buffer.duration-offset);
        if(duration<=.05)return;
        source.buffer=buffer;
        source.playbackRate.value=1;
        filter.type='lowpass';
        filter.frequency.setValueAtTime(fx.cutoff,start);
        filter.frequency.exponentialRampToValueAtTime(2100,start+duration);
        filter.Q.value=.4;
        gain.gain.setValueAtTime(.0001,start);
        gain.gain.linearRampToValueAtTime(fx.gain,start+.12);
        gain.gain.setValueAtTime(fx.gain,start+Math.min(1.6,duration*.35));
        gain.gain.linearRampToValueAtTime(fx.gain*.32,start+Math.min(3.5,duration*.76));
        gain.gain.linearRampToValueAtTime(.0001,start+duration);
        source.connect(filter);
        filter.connect(gain);
        if(panner){
          const side=details.pan<0?-1:1;
          panner.pan.setValueAtTime(side*.15,start);
          panner.pan.linearRampToValueAtTime(side*.80,start+duration);
          gain.connect(panner);
          panner.connect(master);
        }else gain.connect(master);
        source.start(start,offset,duration);
        source.stop(start+duration+.01);
        source.onended=()=>{
          source.disconnect();filter.disconnect();gain.disconnect();
          if(panner)panner.disconnect();
        };
      }catch(e){console.warn('Birds Wings playback failed',e);}
    }).catch(e=>console.warn('Birds Wings unavailable',e));
  }

  function play(name, details = {}) {
    const fx = EFFECTS[name];
    if (!fx || !unlock()) return;
    const stamp = performance.now();
    if (stamp - (lastPlayed.get(name) ?? -Infinity) < fx.gap) return;
    lastPlayed.set(name, stamp);
    if (name === 'soul') { playSoul(); return; }
    if (name === 'bats') { playBatFlight(fx, details); return; }
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
        let panNode=null;
        if(name==='rat' && context.createStereoPanner){
          panNode=context.createStereoPanner();
          panNode.pan.value=Math.max(-.65,Math.min(.65,Number(details.pan)||0));
          gain.connect(panNode);
          panNode.connect(master);
        }else gain.connect(master);
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
          if (panNode) panNode.disconnect();
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
