// Seeded RNG (mulberry32). The state is a single 32-bit integer stored in GameState,
// so every run is reproducible from its seed and its actions.

export function seedFromString(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Returns a float in [0, 1) and the next RNG state. */
export function nextFloat(state: number): [value: number, next: number] {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

/** Returns an integer in [min, max] (inclusive) and the next RNG state. */
export function nextInt(state: number, min: number, max: number): [value: number, next: number] {
  const [f, next] = nextFloat(state);
  return [min + Math.floor(f * (max - min + 1)), next];
}
