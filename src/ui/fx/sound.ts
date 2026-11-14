// Game sounds, synthesised with Web Audio: no audio files to download or cache.
// Every cue is short, quiet and mixed through one master gain, so nothing clips.
import { fxSettings } from './settings';

export type Cue = 'tap' | 'deal' | 'play' | 'stamp' | 'coin' | 'turn' | 'tick' | 'call-win' | 'call-lose' | 'error';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return { ctx, out: master! };
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', peak = 0.6, slideTo?: number) {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime + start;
  const osc = a.ctx.createOscillator();
  const env = a.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(peak, t + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(a.out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(start: number, dur: number, from: number, to: number, peak = 0.5) {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime + start;
  const buffer = a.ctx.createBuffer(1, Math.ceil(a.ctx.sampleRate * dur), a.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.ctx.createBufferSource();
  src.buffer = buffer;
  const filter = a.ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  const env = a.ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(peak, t + dur * 0.3);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(env).connect(a.out);
  src.start(t);
}

const CUES: Record<Cue, () => void> = {
  tap: () => tone(880, 0, 0.05, 'triangle', 0.25),
  deal: () => noise(0, 0.12, 2500, 5000, 0.35),
  play: () => {
    noise(0, 0.25, 600, 4000, 0.4);
    tone(392, 0.08, 0.18, 'triangle', 0.35);
    tone(587, 0.16, 0.22, 'triangle', 0.3);
  },
  stamp: () => {
    tone(140, 0, 0.12, 'square', 0.35, 70);
    noise(0, 0.06, 1500, 800, 0.4);
  },
  coin: () => {
    tone(988, 0, 0.08, 'square', 0.18);
    tone(1319, 0.07, 0.22, 'square', 0.18);
  },
  turn: () => {
    noise(0, 0.45, 300, 3000, 0.35);
    tone(523, 0.18, 0.25, 'sawtooth', 0.12);
    tone(784, 0.3, 0.35, 'sawtooth', 0.12);
  },
  tick: () => tone(1500, 0, 0.03, 'square', 0.08),
  'call-win': () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.4, 'triangle', 0.35));
    tone(1047, 0.48, 0.8, 'sine', 0.25);
  },
  'call-lose': () => {
    tone(392, 0, 0.35, 'triangle', 0.3);
    tone(330, 0.25, 0.35, 'triangle', 0.3);
    tone(262, 0.5, 0.7, 'triangle', 0.3);
  },
  error: () => tone(220, 0, 0.18, 'square', 0.15, 160),
};

const HAPTICS: Partial<Record<Cue, number | number[]>> = {
  tap: 8,
  play: [12, 40, 18],
  stamp: 25,
  turn: [10, 30, 10],
  'call-win': [30, 60, 30, 60, 80],
  'call-lose': 120,
  error: [40, 40, 40],
};

/** Plays a cue (if sound is on) and buzzes (if haptics are on and the device can). */
export function cue(name: Cue): void {
  const s = fxSettings();
  if (s.sound) {
    try {
      CUES[name]();
    } catch {
      // Audio is a nicety; never let it break a turn.
    }
  }
  const pattern = HAPTICS[name];
  if (s.haptics && pattern !== undefined && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
}
