// The collectible card frame used everywhere a card appears: hand, Market, team, decisions.
// It tilts in 3D under the pointer, with a moving glare and (for rare cards) a foil sheen.
import { useRef } from 'react';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';

export type CardTone =
  'tv' | 'cable' | 'social' | 'inPerson' | 'radio' | 'skill' | 'bill' | 'item' | 'common' | 'rare' | 'epic' | 'legendary';

interface Props {
  tone: CardTone;
  title: string;
  /** The line under the art: "Event, in person". */
  typeLine: string;
  art: ReactNode;
  /** Top-left gem: the price. */
  cost?: string;
  /** Top-right gem: energy to play. */
  energy?: number;
  /** Bottom-left of the footer: rarity or status. */
  rarity?: string;
  /** Holographic sheen. */
  foil?: boolean;
  selected?: boolean;
  dim?: boolean;
  small?: boolean;
  /** Extra class names (kept for tests and layout hooks). */
  className?: string;
  /** With onClick the whole card is a button; otherwise it is an article that can hold buttons. */
  onClick?: () => void;
  style?: CSSProperties;
  children?: ReactNode;
}

export function Bolt() {
  return (
    <svg className="bolt" viewBox="0 0 12 16" width="9" height="12" aria-hidden="true">
      <path d="M7 0 L0 9 H5 L4 16 L12 6 H7 Z" fill="currentColor" />
    </svg>
  );
}

export function GameCard({
  tone,
  title,
  typeLine,
  art,
  cost,
  energy,
  rarity,
  foil,
  selected,
  dim,
  small,
  className,
  onClick,
  style,
  children,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);

  // Tilt toward the pointer. Written straight to CSS variables so moving the pointer never re-renders.
  const onMove = (e: PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', `${(x - 0.5) * 16}deg`);
    el.style.setProperty('--rx', `${(0.5 - y) * 14}deg`);
    el.style.setProperty('--gx', `${x * 100}%`);
    el.style.setProperty('--gy', `${y * 100}%`);
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    for (const v of ['--rx', '--ry', '--gx', '--gy']) el.style.removeProperty(v);
  };

  const classes = ['gcard', `tone-${tone}`, foil && 'foil', selected && 'selected', dim && 'dim', small && 'small', className]
    .filter(Boolean)
    .join(' ');
  const body = (
    <span className="gcard-face">
      <span className="gcard-top">
        {cost !== undefined && <span className="gem gem-cost">{cost}</span>}
        {energy !== undefined && (
          <span className="gem gem-energy" aria-label={`${energy} energy`}>
            <Bolt />
            {energy}
          </span>
        )}
      </span>
      <span className="gcard-art">{art}</span>
      <span className="gcard-title">{title}</span>
      <span className="gcard-type">{typeLine}</span>
      {children && <span className="gcard-text">{children}</span>}
      <span className="gcard-foot">
        <span className="gcard-rarity">{rarity ?? ''}</span>
        <span aria-hidden="true">Political Chronicle</span>
      </span>
      <span className="gcard-glare" aria-hidden="true" />
      {foil && <span className="gcard-foil" aria-hidden="true" />}
    </span>
  );

  if (onClick) {
    return (
      <button
        ref={(el) => {
          ref.current = el;
        }}
        type="button"
        className={classes}
        aria-pressed={selected}
        onClick={onClick}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={style}
      >
        {body}
      </button>
    );
  }
  return (
    <article
      ref={(el) => {
        ref.current = el;
      }}
      className={classes}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={style}
    >
      {body}
    </article>
  );
}
