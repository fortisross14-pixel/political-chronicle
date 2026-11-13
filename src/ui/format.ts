export function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function signed(value: number): string {
  const n = Math.round(value * 100);
  return n > 0 ? `+${n}` : `${n}`;
}

export function money(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${value}`;
}

/** Partisan lean as "Blue +60" / "Red +40" / "Even". */
export function leanLabel(lean: number): string {
  const n = Math.round(Math.abs(lean) * 100);
  if (n < 5) return 'Even';
  return `${lean < 0 ? 'Blue' : 'Red'} +${n}`;
}
