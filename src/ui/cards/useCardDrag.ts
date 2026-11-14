// Drag a card and drop it on anything marked with data-region (map regions, region chips).
// Dragging starts only on an upward pull, so a sideways swipe still scrolls the hand on phones.
import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { RegionId } from '../../engine';

export interface DragState {
  key: string;
  x: number;
  y: number;
  over?: RegionId;
}

const regionAt = (x: number, y: number): RegionId | undefined =>
  (document.elementFromPoint(x, y)?.closest('[data-region]') as HTMLElement | SVGElement | null)?.dataset.region;

export function useCardDrag(onDrop: (key: string, region: RegionId) => void) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const start = useRef<{ key: string; x: number; y: number; id: number } | null>(null);
  /** Set after a drag so the click that follows the pointer-up doesn't also select the card. */
  const swallowClick = useRef(false);

  const handlers = (key: string) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      start.current = { key, x: e.clientX, y: e.clientY, id: e.pointerId };
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const s = start.current;
      if (!s || s.id !== e.pointerId) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (!drag) {
        // Mouse: any direction past 8px. Touch and pen: an upward pull.
        const pulled = e.pointerType === 'mouse' ? Math.hypot(dx, dy) > 8 : dy < -14 && Math.abs(dy) > Math.abs(dx);
        if (!pulled) return;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      setDrag({ key: s.key, x: e.clientX, y: e.clientY, over: regionAt(e.clientX, e.clientY) });
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      const s = start.current;
      start.current = null;
      if (!drag || !s) return;
      swallowClick.current = true;
      setTimeout(() => (swallowClick.current = false), 0);
      const over = regionAt(e.clientX, e.clientY);
      setDrag(null);
      if (over) onDrop(s.key, over);
    },
    onPointerCancel: () => {
      start.current = null;
      setDrag(null);
    },
    onClickCapture: (e: { preventDefault: () => void; stopPropagation: () => void }) => {
      if (swallowClick.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
  });

  return { drag, handlers };
}
