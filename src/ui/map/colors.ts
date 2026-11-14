type Rgb = [number, number, number];

function hex(color: string): Rgb {
  const n = parseInt(color.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hex(a);
  const [br, bg, bb] = hex(b);
  const k = Math.max(0, Math.min(1, t));
  const c = (x: number, y: number) => Math.round(x + (y - x) * k);
  return `rgb(${c(ar, br)}, ${c(ag, bg)}, ${c(ab, bb)})`;
}

const NEUTRAL = '#34415a';

/** −1 (blue) .. +1 (red). */
export function leanColor(lean: number): string {
  return lean < 0 ? mix(NEUTRAL, '#3f7fe8', -lean / 0.8) : mix(NEUTRAL, '#e5523f', lean / 0.8);
}

/** 0 .. 1 */
export function recognitionColor(value: number): string {
  return mix('#1f2a3d', '#e8b84a', value);
}

/** −1 .. +1, deliberately not blue/red so it isn't confused with party. */
export function favorabilityColor(value: number): string {
  return value < 0 ? mix(NEUTRAL, '#e07b39', -value / 0.6) : mix(NEUTRAL, '#2fb39a', value / 0.6);
}

/** Broadcast colour for a candidate: party colour, gold for you as an independent. */
export function sideColor(affiliation: 'DU' | 'RP' | 'IND', lean: number, isPlayer: boolean): string {
  if (affiliation === 'DU') return '#2f6fd6';
  if (affiliation === 'RP') return '#d83a2e';
  if (isPlayer) return '#e9b92f';
  return lean < -0.2 ? '#5f93ea' : lean > 0.2 ? '#e8695c' : '#9b8cf0';
}

/** A region held by `base`, stronger the bigger the lead (0..~0.3). */
export function leadColor(base: string, margin: number): string {
  return mix('#3a4a6b', base, 0.4 + margin * 4);
}
