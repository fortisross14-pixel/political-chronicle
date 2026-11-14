// A small "i" that opens a tooltip bubble: the place for every explanation, so screens stay short.
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export function Info({ label, children, align = 'center' }: { label: string; children: ReactNode; align?: 'center' | 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  return (
    <span className="info" ref={ref}>
      <button
        type="button"
        className="info-btn"
        aria-label={`About ${label}`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        i
      </button>
      {open && (
        <span role="tooltip" id={id} className={`info-bubble ${align}`}>
          {children}
        </span>
      )}
    </span>
  );
}

/** A skill as chunky pips: filled up to the value, out of 10. */
export function Pips({ value, max = 10, cap, label }: { value: number; max?: number; cap?: number; label: string }) {
  return (
    <span className="pips" role="img" aria-label={`${label}: ${value} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`pip${i < value ? ' on' : ''}${cap !== undefined && i >= cap ? ' locked' : ''}`} />
      ))}
    </span>
  );
}
