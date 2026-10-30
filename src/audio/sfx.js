// Original, lightweight Web Audio sound effects for KNOTTY PINE.
// Generated only on user interaction: no files, autoplay, or background loops.
const STORAGE_VOLUME = 'knottyPineSfxVolume';
const STORAGE_MUTED = 'knottyPineSfxMuted';
const clamp = value => Math.min(1, Math.max(0, value));
function getSavedVolume() {
  try {
    const saved = localStorage.getItem(STORAGE_VOLUME);
    return saved === null ? .35 : clamp(Number(saved) || 0);
  } catch { return .35; }
}
function getSavedMuted() {
  try { return localStorage.getItem(STORAGE_MUTED) === '1'; }
  catch { return false; }
}
export function createGameAudio() {
  let context = null;
  let master = null;
  let noiseBuffer = null;
  let volume = getSavedVolume();
  let muted = getSavedMuted();
  let lastStep = -Infinity;

  function unlock() {
    if (muted || volume <= 0) return null;
    if (!context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      try {
        context = new AudioContextClass();
        master = context.createGain();
        master.gain.value = volume;
        master.connect(context.destination);
        // Cache one small reusable noise sample, created just once.
        noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * .55), context.sampleRate);
        const samples = noiseBuffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      } catch {
        context = null;
        master = null;
        return null;
      }
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
    return context;
  }

  function tone(from, to, delay, duration, level = .12, type = 'sine') {
    const ctx = context;
    const at = ctx.currentTime + .005 + delay;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(25, from), at);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(25, to), at + duration);
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, level), at + Math.min(.018, duration * .2));
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(at);
    oscillator.stop(at + duration + .015);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  function air(delay, duration, level = .07, cutoff = 1500, filterType = 'highpass') {
    const ctx = context;
    const at = ctx.currentTime + .005 + delay;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = noiseBuffer;
    filter.type = filterType;
    filter.frequency.value = cutoff;
    filter.Q.value = .7;
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, level), at + Math.min(.025, duration * .25));
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(at);
    source.stop(at + duration + .01);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  function play(name) {
    if (!unlock()) return;
    try {
      switch (name) {
        case 'start':
          tone(185, 135, 0, .24, .16, 'triangle');
          tone(370, 277, .09, .35, .08, 'sine');
          air(0, .22, .035, 400, 'lowpass');
          break;
        case 'move':
          // Small cloth swish; capped so quick lane switching is not noisy.
          if (context.currentTime - lastStep < .09) return;
          lastStep = context.currentTime;
          air(0, .095, .045, 1250);
          tone(160, 125, 0, .095, .04, 'triangle');
          break;
        case 'jump':
          air(0, .21, .085, 620);
          tone(220, 390, .015, .24, .10, 'sine');
          break;
        case 'slide':
          air(0, .23, .10, 2200, 'lowpass');
          tone(160, 78, 0, .23, .07, 'triangle');
          break;
        case 'soul':
          tone(620, 930, 0, .19, .12, 'sine');
          tone(1040, 1240, .045, .15, .052, 'sine');
          break;
        case 'ultimate':
          // Short original magical ascent, not a borrowed melody.
          tone(293.7, 293.7, 0, .34, .09, 'sine');
          tone(349.2, 349.2, .13, .38, .09, 'sine');
          tone(440, 440, .27, .46, .10, 'sine');
          tone(587.3, 587.3, .43, .47, .11, 'sine');
          air(.07, .41, .055, 2700);
          break;
        case 'slip':
          tone(340, 105, 0, .34, .11, 'triangle');
          air(.025, .16, .065, 850);
          break;
        case 'hat':
          tone(510, 740, 0, .23, .10, 'sine');
          tone(760, 1000, .10, .28, .072, 'sine');
          break;
        case 'death':
          tone(145, 45, 0, .44, .20, 'sawtooth');
          tone(72, 36, .08, .48, .13, 'sine');
          air(0, .20, .085, 550, 'lowpass');
          break;
      }
    } catch {
      // If a device blocks Web Audio, gameplay must continue normally.
    }
  }

  function setMuted(next) {
    muted = Boolean(next);
    try { localStorage.setItem(STORAGE_MUTED, muted ? '1' : '0'); } catch {}
    if (!muted) unlock();
    if (master && context) master.gain.setTargetAtTime(muted ? 0 : volume, context.currentTime, .015);
  }

  function setVolume(next) {
    volume = clamp(Number(next) || 0);
    try { localStorage.setItem(STORAGE_VOLUME, String(volume)); } catch {}
    if (master && context) master.gain.setTargetAtTime(muted ? 0 : volume, context.currentTime, .015);
  }

  return { play, unlock, setMuted, setVolume, getMuted: () => muted, getVolume: () => volume };
}
