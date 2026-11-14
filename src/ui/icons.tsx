// Small stroke icons for navigation. Decorative: every use sits next to a text label.
import type { ReactNode } from 'react';

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const ICONS = {
  government: (
    <Icon>
      <path d="M3 21h18M5 21V10M19 21V10M9 21v-7M15 21v-7M2 10l10-6 10 6" />
    </Icon>
  ),
  profile: (
    <Icon>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
    </Icon>
  ),
  party: (
    <Icon>
      <path d="M4 21V4M4 4h12l-2 4 2 4H4" />
    </Icon>
  ),
  desk: (
    <Icon>
      <path d="M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h5" />
    </Icon>
  ),
  map: (
    <Icon>
      <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14" />
    </Icon>
  ),
  cards: (
    <Icon>
      <rect x="4" y="5" width="10" height="15" rx="2" transform="rotate(-8 9 12)" />
      <rect x="10" y="4" width="10" height="15" rx="2" transform="rotate(8 15 12)" />
    </Icon>
  ),
  market: (
    <Icon>
      <path d="M4 9l1-5h14l1 5M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9M5 12v8h14v-8" />
    </Icon>
  ),
  team: (
    <Icon>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 20c.6-3.5 3.2-5 7-5s6.400 1.500 7 5M16 4.500a3.500 3.500 0 0 1 0 7M18 15c2.500.500 3.700 2 4 5" />
    </Icon>
  ),
};
