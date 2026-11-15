// Tiny Web Audio synth: every sound effect is a few oscillators or a noise burst.

let ctx: AudioContext | null = null;
let master: GainNode;
let muted = false;

/** Must be called from a user gesture (browser autoplay policy). */
export function initAudio() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.45;
    master.connect(ctx.destination);
  }
  void ctx.resume();
}

export function toggleMute() {
  muted = !muted;
  if (ctx) master.gain.value = muted ? 0 : 0.45;
  return muted;
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.15, to?: number, at = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.2, freq = 1200, at = 0, q = 0.8) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = buf;
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

const arp = (notes: number[], step: number, type: OscillatorType = 'square', vol = 0.12, len = 0.18) =>
  notes.forEach((n, i) => tone(n, len, type, vol, undefined, i * step));

export const sfx = {
  blip: () => tone(880 + Math.random() * 80, 0.03, 'square', 0.04),
  select: () => arp([660, 990], 0.06, 'square', 0.1, 0.1),
  search: () => { noise(0.25, 0.25, 2500); noise(0.2, 0.2, 1800, 0.15); },
  meh: () => arp([392, 330], 0.12, 'triangle', 0.15, 0.2),
  alert: () => { arp([523, 784, 1046, 1568], 0.05, 'square', 0.12, 0.25); noise(0.3, 0.15, 4000, 0.05); },
  run: () => tone(200, 0.4, 'sawtooth', 0.12, 900),
  stumble: () => { noise(0.18, 0.4, 300); tone(300, 0.25, 'square', 0.1, 90, 0.05); },
  door: () => { noise(0.3, 0.35, 200); tone(120, 0.25, 'sine', 0.3, 50); },
  stockDown: () => arp([600, 520, 440], 0.1, 'triangle', 0.14, 0.2),
  achievement: () => arp([523, 659, 784, 1046, 1318], 0.07, 'square', 0.1, 0.3),
  romance: () => { arp([784, 988, 1175, 1568, 1175, 1568], 0.09, 'sine', 0.14, 0.5); },
  flash: () => tone(1400, 0.08, 'square', 0.12, 700),
  wipe: () => { tone(110, 1.1, 'sawtooth', 0.12, 880); noise(1.1, 0.12, 1500, 0, 0.4); },
  battleStart: () => arp([392, 392, 523, 659, 784], 0.08, 'square', 0.1, 0.16),
  dodge: (pitch = 1) => tone(500 * pitch, 0.12, 'triangle', 0.12, 1400 * pitch),
  poof: () => noise(0.2, 0.3, 3000),
  nope: () => arp([220, 180], 0.08, 'square', 0.1, 0.12),
  love: () => arp([523, 659, 784, 1046, 1318, 1568, 2093], 0.06, 'sine', 0.16, 0.5),
  glitch: () => {
    for (let i = 0; i < 9; i++) { noise(0.06, 0.4, 400 + Math.random() * 6000, i * 0.07, 3); tone(60 + Math.random() * 900, 0.05, 'square', 0.12, undefined, i * 0.07); }
  },
  sting: () => { tone(98, 1.4, 'sawtooth', 0.2, 49); tone(103, 1.4, 'sawtooth', 0.16, 51); noise(0.6, 0.3, 120); },
  plunge: () => tone(1800, 2.2, 'sine', 0.16, 60),
  boom: () => { noise(1.2, 0.8, 90, 0, 0.5); tone(70, 1, 'sine', 0.5, 30); },
  defeat: () => arp([392, 370, 349, 330, 262], 0.22, 'triangle', 0.18, 0.4),
};
