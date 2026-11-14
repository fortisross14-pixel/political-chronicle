import { useCountUp, useDelta } from './useCountUp';

/** Renders a number that counts toward its new value and flashes green or red when it changes. */
export function CountUp({ value, format = (n) => String(Math.round(n)) }: { value: number; format?: (n: number) => string }) {
  const shown = useCountUp(value);
  const dir = useDelta(value);
  return <span className={dir ? `count flash-${dir}` : 'count'}>{format(shown)}</span>;
}
