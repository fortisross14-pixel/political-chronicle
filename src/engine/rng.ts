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

/**
 * Mutable cursor over the seeded RNG, for code that needs several draws in a row.
 * Read `.state` back into GameState when done.
 */
export class Rng {
  constructor(public state: number) {}

  float(): number {
    const [v, next] = nextFloat(this.state);
    this.state = next;
    return v;
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.float() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.float() < p;
  }

  /** Standard normal via Box–Muller. */
  gaussian(mean = 0, sd = 1): number {
    const u = Math.max(this.float(), 1e-12);
    const v = this.float();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  pick<T>(items: readonly T[]): T {
    if (!items.length) throw new Error('pick from empty list');
    return items[Math.floor(this.float() * items.length)]!;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.float() * (i + 1));
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  }
}
