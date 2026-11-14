// Card illustrations: small layered SVG scenes drawn in code, so every card has its own picture
// without shipping image files. All art is decorative; the card's text carries the meaning.
import type { ReactNode } from 'react';
import type { IssueId, SkillId } from '../../engine';

const W = 120;
const H = 80;

interface Palette {
  sky: [string, string];
  glow: string;
}

const PALETTES: Record<string, Palette> = {
  night: { sky: ['#1b3f8f', '#071a45'], glow: '#f5c842' },
  studio: { sky: ['#8f1d1d', '#2b0a12'], glow: '#ffd9d2' },
  day: { sky: ['#6fb3ff', '#d9ecff'], glow: '#fff7d6' },
  dusk: { sky: ['#f08a4b', '#5a2a6e'], glow: '#ffe2a3' },
  online: { sky: ['#2c5fe0', '#1a1f6b'], glow: '#9fe3ff' },
  green: { sky: ['#1f8a63', '#0b3a34'], glow: '#c8ffe4' },
  gold: { sky: ['#e2b23a', '#7a4f08'], glow: '#fff3c4' },
  violet: { sky: ['#7a4fd6', '#27124f'], glow: '#e7d6ff' },
  steel: { sky: ['#5f7392', '#1c2638'], glow: '#e8f0ff' },
};

function Scene({ id, palette, children }: { id: string; palette: keyof typeof PALETTES; children: ReactNode }) {
  const p = PALETTES[palette]!;
  const g = `art-${id}`;
  return (
    <svg className="card-art" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${g}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="1" stopColor={p.sky[1]} />
        </linearGradient>
        <radialGradient id={`${g}-glow`} cx="0.5" cy="1" r="0.75">
          <stop offset="0" stopColor={p.glow} stopOpacity="0.75" />
          <stop offset="1" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${g}-sky)`} />
      <rect width={W} height={H} fill={`url(#${g}-glow)`} />
      {children}
    </svg>
  );
}

/** A row of heads along the bottom edge. */
function Crowd({ y = 80, fill = '#06102b', n = 9 }: { y?: number; fill?: string; n?: number }) {
  return (
    <g fill={fill}>
      {Array.from({ length: n }, (_, i) => {
        const x = (i + 0.5) * (W / n);
        const r = 6 + ((i * 7) % 3);
        return (
          <g key={i}>
            <circle cx={x} cy={y - 9 - (i % 2) * 2} r={r * 0.62} />
            <rect x={x - r} y={y - 6 - (i % 2) * 2} width={r * 2} height={12} rx={r * 0.7} />
          </g>
        );
      })}
    </g>
  );
}

function Speaker({ x = 60, y = 52, fill = '#fff7d6' }: { x?: number; y?: number; fill?: string }) {
  return (
    <g fill={fill}>
      <circle cx={x} cy={y - 16} r={5.5} />
      <path d={`M${x - 8} ${y + 8} Q${x - 8} ${y - 9} ${x} ${y - 9} Q${x + 8} ${y - 9} ${x + 8} ${y + 8} Z`} />
    </g>
  );
}

function Beams({ color = '#fff7d6' }: { color?: string }) {
  return (
    <g fill={color} opacity="0.22">
      <path d="M20 0 L50 80 L74 80 Z" />
      <path d="M100 0 L46 80 L70 80 Z" />
      <path d="M60 0 L40 80 L80 80 Z" opacity="0.6" />
    </g>
  );
}

const EVENT_ART: Record<string, () => ReactNode> = {
  door_knocking: () => (
    <Scene id="door" palette="day">
      <rect x="0" y="58" width="120" height="22" fill="#5c9a57" />
      <path d="M18 60 V30 L44 12 L70 30 V60 Z" fill="#f4ead3" />
      <path d="M12 32 L44 8 L76 32 L70 34 L44 15 L18 34 Z" fill="#b8322b" />
      <rect x="36" y="36" width="16" height="24" rx="1.5" fill="#1b48b8" />
      <circle cx="49" cy="49" r="1.4" fill="#f5c842" />
      <rect x="24" y="36" width="8" height="9" fill="#9cc2ff" />
      <rect x="56" y="36" width="8" height="9" fill="#9cc2ff" />
      <circle cx="92" cy="38" r="6" fill="#14213d" />
      <path d="M82 68 Q82 46 92 46 Q102 46 102 68 Z" fill="#14213d" />
      <rect x="99" y="50" width="10" height="13" rx="1" fill="#fff" transform="rotate(8 104 56)" />
    </Scene>
  ),
  social_post: () => (
    <Scene id="post" palette="online">
      <rect x="42" y="10" width="36" height="62" rx="6" fill="#0a1433" stroke="#cfe0ff" strokeWidth="1.5" />
      <rect x="46" y="17" width="28" height="18" rx="2" fill="#5d9bff" />
      <rect x="46" y="39" width="22" height="3" rx="1.5" fill="#cfe0ff" />
      <rect x="46" y="45" width="16" height="3" rx="1.5" fill="#7f94c9" />
      <path d="M50 58 l3 -3 a2.2 2.2 0 0 1 3 3 l-3 3 l-3 -3 a2.2 2.2 0 0 1 3 -3" fill="#ff6a7a" />
      <g fill="#fff" opacity="0.85">
        <circle cx="24" cy="24" r="3" />
        <circle cx="98" cy="30" r="2.4" />
        <circle cx="20" cy="54" r="2" />
        <circle cx="102" cy="58" r="3" />
      </g>
      <g stroke="#9fe3ff" strokeWidth="1" opacity="0.6">
        <path d="M27 25 L42 30 M95 31 L78 34 M22 53 L42 48 M99 57 L78 52" />
      </g>
    </Scene>
  ),
  call_time: () => (
    <Scene id="call" palette="gold">
      <rect x="0" y="60" width="120" height="20" fill="#5a3a0a" />
      <path
        d="M38 24 q-8 4 -6 14 q3 16 18 24 q8 4 13 -2 l2 -4 l-9 -6 l-4 3 q-6 -4 -8 -11 l4 -3 l-4 -10 z"
        fill="#14213d"
        stroke="#fff3c4"
        strokeWidth="1.2"
      />
      <g fill="none" stroke="#fff3c4" strokeWidth="2" strokeLinecap="round">
        <path d="M62 22 q8 4 9 13" />
        <path d="M66 14 q14 6 15 22" opacity="0.7" />
      </g>
      <g fill="#fff7d6" stroke="#7a4f08" strokeWidth="0.8">
        <circle cx="92" cy="54" r="7" />
        <circle cx="100" cy="46" r="7" />
        <circle cx="96" cy="62" r="7" />
      </g>
      <g fill="#7a4f08" fontSize="8" fontWeight="700" textAnchor="middle">
        <text x="100" y="49">
          $
        </text>
        <text x="96" y="65">
          $
        </text>
      </g>
    </Scene>
  ),
  town_hall: () => (
    <Scene id="hall" palette="dusk">
      <path d="M22 50 V26 L60 8 L98 26 V50 Z" fill="#f4ead3" />
      <path d="M16 28 L60 4 L104 28 L100 31 L60 10 L20 31 Z" fill="#8e1f2f" />
      <g fill="#c9b991">
        <rect x="30" y="30" width="5" height="20" />
        <rect x="44" y="30" width="5" height="20" />
        <rect x="71" y="30" width="5" height="20" />
        <rect x="85" y="30" width="5" height="20" />
      </g>
      <rect x="54" y="34" width="12" height="16" fill="#14213d" />
      <rect x="0" y="50" width="120" height="30" fill="#2b1840" />
      <Speaker x={60} y={60} />
      <Crowd fill="#120a22" />
    </Scene>
  ),
  radio_interview: () => (
    <Scene id="radio" palette="green">
      <g stroke="#c8ffe4" strokeWidth="1.5" fill="none">
        <path d="M28 70 L38 18 L48 70 M32 50 H44 M34 36 H42" />
        <path d="M46 20 q8 6 0 12 M52 14 q14 12 0 24" opacity="0.8" />
        <path d="M30 20 q-8 6 0 12 M24 14 q-14 12 0 24" opacity="0.8" />
      </g>
      <rect x="66" y="40" width="44" height="28" rx="4" fill="#0b2a26" stroke="#c8ffe4" strokeWidth="1.2" />
      <circle cx="80" cy="54" r="8" fill="#1f8a63" stroke="#c8ffe4" strokeWidth="1" />
      <g fill="#c8ffe4">
        <rect x="93" y="47" width="12" height="2.5" rx="1" />
        <rect x="93" y="53" width="12" height="2.5" rx="1" />
        <rect x="93" y="59" width="8" height="2.5" rx="1" />
      </g>
      <path d="M74 40 L96 24" stroke="#c8ffe4" strokeWidth="1.5" />
    </Scene>
  ),
  local_tv_ad: () => (
    <Scene id="tvad" palette="steel">
      <rect x="22" y="14" width="76" height="48" rx="5" fill="#0a1433" stroke="#e8f0ff" strokeWidth="2" />
      <rect x="27" y="19" width="66" height="38" rx="2" fill="#1b48b8" />
      <path d="M27 45 L93 33 V57 H27 Z" fill="#c3271e" />
      <path d="M27 41 L93 29 V33 L27 45 Z" fill="#fff" />
      <Speaker x={46} y={46} fill="#fff" />
      <g fill="#fff">
        <rect x="60" y="24" width="26" height="3.5" rx="1.5" />
        <rect x="60" y="30" width="18" height="2.5" rx="1" opacity="0.7" />
      </g>
      <path d="M50 62 L44 72 H76 L70 62" fill="#e8f0ff" />
    </Scene>
  ),
  cable_interview: () => (
    <Scene id="cable" palette="studio">
      <Beams color="#ffd9d2" />
      <rect x="0" y="54" width="120" height="26" fill="#12050a" />
      <path d="M14 58 H106 L98 80 H22 Z" fill="#e8f0ff" />
      <path d="M14 58 H106 L104 63 H16 Z" fill="#c3271e" />
      <Speaker x={42} y={50} fill="#14213d" />
      <Speaker x={78} y={50} fill="#14213d" />
      <rect x="6" y="8" width="26" height="12" rx="2" fill="#c3271e" />
      <circle cx="12" cy="14" r="2.2" fill="#fff" />
      <rect x="16" y="12.5" width="12" height="3" rx="1.5" fill="#fff" />
      <g fill="#0a1433" stroke="#ffd9d2" strokeWidth="1">
        <rect x="94" y="22" width="18" height="12" rx="2" />
        <path d="M94 26 L88 23 V33 L94 30 Z" />
      </g>
    </Scene>
  ),
  social_campaign: () => (
    <Scene id="socamp" palette="online">
      <g stroke="#9fe3ff" strokeWidth="1.2" opacity="0.75">
        <path d="M60 40 L24 18 M60 40 L98 20 M60 40 L20 58 M60 40 L100 60 M60 40 L60 10 M60 40 L60 72 M24 18 L60 10 L98 20 M20 58 L60 72 L100 60" />
      </g>
      <g fill="#fff">
        <circle cx="24" cy="18" r="5" />
        <circle cx="98" cy="20" r="5" />
        <circle cx="20" cy="58" r="5" />
        <circle cx="100" cy="60" r="5" />
        <circle cx="60" cy="10" r="4" />
        <circle cx="60" cy="72" r="4" />
      </g>
      <circle cx="60" cy="40" r="13" fill="#f5c842" stroke="#fff" strokeWidth="2" />
      <path d="M53 44 V36 l10 -4 v16 l-10 -4 Z M53 44 l2 6" fill="none" stroke="#1a1f6b" strokeWidth="2.2" strokeLinejoin="round" />
    </Scene>
  ),
  podcast_tour: () => (
    <Scene id="pod" palette="violet">
      <path d="M32 46 a28 28 0 0 1 56 0" fill="none" stroke="#e7d6ff" strokeWidth="4" />
      <rect x="25" y="42" width="12" height="20" rx="5" fill="#e7d6ff" />
      <rect x="83" y="42" width="12" height="20" rx="5" fill="#e7d6ff" />
      <rect x="52" y="24" width="16" height="28" rx="8" fill="#14213d" stroke="#f5c842" strokeWidth="1.5" />
      <g stroke="#f5c842" strokeWidth="1.2">
        <path d="M55 32 H65 M55 37 H65 M55 42 H65" />
      </g>
      <path d="M46 46 a14 14 0 0 0 28 0 M60 60 V70 M50 72 H70" fill="none" stroke="#f5c842" strokeWidth="2" strokeLinecap="round" />
    </Scene>
  ),
  arena_rally: () => (
    <Scene id="arena" palette="night">
      <Beams />
      <g fill="#fff7d6">
        <circle cx="14" cy="14" r="1.2" />
        <circle cx="104" cy="10" r="1.4" />
        <circle cx="88" cy="24" r="1" />
        <circle cx="30" cy="28" r="1" />
      </g>
      <rect x="38" y="52" width="44" height="6" fill="#1b48b8" />
      <rect x="38" y="58" width="44" height="3" fill="#fff" />
      <rect x="38" y="61" width="44" height="3" fill="#c3271e" />
      <Speaker x={60} y={46} />
      <path d="M52 34 L42 24" stroke="#fff7d6" strokeWidth="3" strokeLinecap="round" />
      <Crowd n={11} />
      <Crowd n={8} y={72} fill="#0b1b45" />
    </Scene>
  ),
  fundraising_dinner: () => (
    <Scene id="dinner" palette="gold">
      <g fill="#fff3c4" opacity="0.8">
        <path d="M56 0 h8 v8 l8 6 h-24 l8 -6 z" />
        <circle cx="48" cy="16" r="2" />
        <circle cx="60" cy="19" r="2" />
        <circle cx="72" cy="16" r="2" />
      </g>
      <ellipse cx="60" cy="62" rx="52" ry="14" fill="#fff" />
      <ellipse cx="60" cy="64" rx="52" ry="14" fill="#f4ead3" opacity="0.6" />
      <g fill="#fff" stroke="#b8892b" strokeWidth="1.2">
        <circle cx="34" cy="60" r="8" />
        <circle cx="86" cy="60" r="8" />
      </g>
      <path d="M56 40 h8 l-1 12 q-3 3 -6 0 z M60 54 V62 M55 63 H65" fill="#8e1f2f" stroke="#5e1220" strokeWidth="1" />
      <rect x="52" y="64" width="16" height="9" rx="1" fill="#1f8a63" />
      <text x="60" y="71" fontSize="7" fontWeight="700" textAnchor="middle" fill="#fff">
        $
      </text>
    </Scene>
  ),
  party_unity: () => (
    <Scene id="unity" palette="night">
      <g>
        <path d="M30 14 V70" stroke="#e8f0ff" strokeWidth="2" />
        <path d="M30 16 q12 -6 22 0 t20 0 V38 q-10 6 -20 0 t-22 0 Z" fill="#1b48b8" />
        <path d="M90 14 V70" stroke="#e8f0ff" strokeWidth="2" />
        <path d="M90 16 q-12 -6 -22 0 V38 q10 -6 22 0 Z" fill="#c3271e" />
      </g>
      <path
        d="M40 56 q10 -8 20 0 q10 -8 20 0 l-6 8 q-14 8 -28 0 Z"
        fill="#fff7d6"
        stroke="#14213d"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <Crowd n={10} />
    </Scene>
  ),
  debate: () => (
    <Scene id="debate" palette="studio">
      <Beams color="#ffd9d2" />
      <rect x="0" y="60" width="120" height="20" fill="#12050a" />
      <g>
        <Speaker x={32} y={46} fill="#9cc2ff" />
        <path d="M22 50 H42 L39 72 H25 Z" fill="#1b48b8" />
        <Speaker x={88} y={46} fill="#ffb3ab" />
        <path d="M78 50 H98 L95 72 H81 Z" fill="#c3271e" />
      </g>
      <path d="M52 30 L58 36 L52 42 M68 30 L62 36 L68 42" fill="none" stroke="#f5c842" strokeWidth="2.5" strokeLinecap="round" />
    </Scene>
  ),
};

const MEDIUM_FALLBACK: Record<string, string> = {
  tv: 'local_tv_ad',
  cable: 'cable_interview',
  social: 'social_post',
  inPerson: 'town_hall',
  radio: 'radio_interview',
};

export function EventArt({ id, medium }: { id: string; medium: string }) {
  const draw = EVENT_ART[id] ?? EVENT_ART[MEDIUM_FALLBACK[medium] ?? 'town_hall']!;
  return <>{draw()}</>;
}

const SKILL_GLYPH: Record<SkillId, { palette: keyof typeof PALETTES; glyph: ReactNode }> = {
  charisma: {
    palette: 'studio',
    glyph: (
      <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
        <rect x="52" y="18" width="16" height="28" rx="8" fill="#fff" />
        <path d="M44 40 a16 16 0 0 0 32 0 M60 56 V64 M50 66 H70" />
      </g>
    ),
  },
  economics: {
    palette: 'gold',
    glyph: (
      <g fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M34 60 L50 44 L62 52 L86 26" />
        <path d="M74 26 H86 V38" />
      </g>
    ),
  },
  diplomacy: {
    palette: 'green',
    glyph: (
      <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M30 40 q14 -14 30 0 q16 -14 30 0 l-10 14 q-20 12 -40 0 Z" />
        <path d="M60 40 V54" />
      </g>
    ),
  },
  strategy: {
    palette: 'violet',
    glyph: (
      <g fill="#fff">
        <path d="M52 62 H72 L70 54 H54 Z" />
        <path d="M54 52 q-2 -12 6 -18 l-6 -2 q4 -10 14 -10 q10 4 8 30 Z" />
      </g>
    ),
  },
  administration: {
    palette: 'steel',
    glyph: (
      <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <rect x="44" y="18" width="32" height="44" rx="3" />
        <path d="M51 32 l3 3 l6 -6 M51 46 l3 3 l6 -6 M65 33 H70 M65 47 H70" />
      </g>
    ),
  },
  leadership: {
    palette: 'night',
    glyph: (
      <path
        d="M60 14 l7 15 l16 2 l-12 11 l3 16 l-14 -8 l-14 8 l3 -16 l-12 -11 l16 -2 Z"
        fill="#f5c842"
        stroke="#fff"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    ),
  },
  law: {
    palette: 'dusk',
    glyph: (
      <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M60 18 V62 M46 64 H74 M38 26 H82" />
        <path d="M38 26 L30 46 a8 5 0 0 0 16 0 Z M82 26 L74 46 a8 5 0 0 0 16 0 Z" />
      </g>
    ),
  },
};

/** An emblem on a rayed field. */
function Emblem({ id, palette, children }: { id: string; palette: keyof typeof PALETTES; children: ReactNode }) {
  return (
    <Scene id={id} palette={palette}>
      <g fill="#fff" opacity="0.1">
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M60 40 L56 -40 L64 -40 Z" transform={`rotate(${i * 30} 60 40)`} />
        ))}
      </g>
      <circle cx="60" cy="40" r="30" fill="#000" opacity="0.22" />
      <circle cx="60" cy="40" r="30" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.2" />
      {children}
    </Scene>
  );
}

export function SkillArt({ skill }: { skill: SkillId }) {
  const s = SKILL_GLYPH[skill];
  return (
    <Emblem id={`skill-${skill}`} palette={s.palette}>
      {s.glyph}
    </Emblem>
  );
}

const stroke = { fill: 'none', stroke: '#fff', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const ISSUE_GLYPH: Record<IssueId, { palette: keyof typeof PALETTES; glyph: ReactNode }> = {
  taxes: {
    palette: 'gold',
    glyph: (
      <g {...stroke}>
        <path d="M46 56 L74 24" />
        <circle cx="48" cy="28" r="6" />
        <circle cx="72" cy="52" r="6" />
      </g>
    ),
  },
  min_wage: {
    palette: 'green',
    glyph: (
      <g {...stroke}>
        <circle cx="60" cy="40" r="20" />
        <path d="M67 32 q-7 -5 -13 0 q-4 6 6 8 q10 2 6 8 q-6 5 -14 0 M60 24 V56" />
      </g>
    ),
  },
  healthcare: { palette: 'studio', glyph: <path d="M53 20 H67 V33 H80 V47 H67 V60 H53 V47 H40 V33 H53 Z" fill="#fff" /> },
  guns: {
    palette: 'steel',
    glyph: (
      <g {...stroke}>
        <circle cx="60" cy="40" r="18" />
        <circle cx="60" cy="40" r="6" />
        <path d="M60 16 V26 M60 54 V64 M36 40 H46 M74 40 H84" />
      </g>
    ),
  },
  abortion: {
    palette: 'violet',
    glyph: (
      <g {...stroke}>
        <path d="M60 18 l18 7 v14 q0 14 -18 23 q-18 -9 -18 -23 V25 Z" />
        <path d="M52 40 l6 6 l11 -12" />
      </g>
    ),
  },
  lgbtq: {
    palette: 'violet',
    glyph: (
      <g fill="none" strokeWidth="4" strokeLinecap="round">
        <path d="M34 58 a26 26 0 0 1 52 0" stroke="#ff6a7a" />
        <path d="M41 58 a19 19 0 0 1 38 0" stroke="#f5c842" />
        <path d="M48 58 a12 12 0 0 1 24 0" stroke="#7fd1ff" />
      </g>
    ),
  },
  immigration: {
    palette: 'online',
    glyph: (
      <g {...stroke}>
        <circle cx="60" cy="40" r="20" />
        <path d="M40 40 H80 M60 20 q-12 20 0 40 q12 -20 0 -40" />
      </g>
    ),
  },
  climate: {
    palette: 'green',
    glyph: (
      <g {...stroke}>
        <path d="M42 58 q-4 -30 36 -36 q2 34 -28 34 M46 58 q8 -18 22 -24" />
      </g>
    ),
  },
  industry: {
    palette: 'steel',
    glyph: (
      <g {...stroke}>
        <path d="M36 60 V40 L50 48 V40 L64 48 V26 H76 V60 Z" />
        <path d="M70 18 q4 -4 8 0" />
      </g>
    ),
  },
  policing: {
    palette: 'night',
    glyph: (
      <g {...stroke}>
        <path d="M60 18 l6 6 h12 v14 q0 16 -18 24 q-18 -8 -18 -24 V24 h12 Z" />
        <path d="M60 32 l3 6 l6 1 l-4.5 4 l1 6 l-5.5 -3 l-5.5 3 l1 -6 l-4.5 -4 l6 -1 Z" fill="#fff" strokeWidth="1" />
      </g>
    ),
  },
  education: {
    palette: 'dusk',
    glyph: (
      <g {...stroke}>
        <path d="M32 36 L60 24 L88 36 L60 48 Z" />
        <path d="M44 42 V54 q16 10 32 0 V42 M88 36 V52" />
      </g>
    ),
  },
  housing: {
    palette: 'day',
    glyph: (
      <g {...stroke} stroke="#14213d">
        <path d="M36 42 L60 22 L84 42 M42 38 V60 H78 V38 M54 60 V48 H66 V60" />
      </g>
    ),
  },
  transit: {
    palette: 'online',
    glyph: (
      <g {...stroke}>
        <rect x="42" y="18" width="36" height="36" rx="7" />
        <path d="M42 38 H78 M50 46 H52 M68 46 H70 M48 54 L42 64 M72 54 L78 64" />
      </g>
    ),
  },
  labor: {
    palette: 'studio',
    glyph: (
      <g {...stroke}>
        <path d="M48 60 V40 q0 -6 6 -6 V26 q4 -4 8 0 V32 q4 -4 8 0 V36 q4 -2 6 2 V50 q0 10 -10 10 Z" />
      </g>
    ),
  },
  cannabis: {
    palette: 'green',
    glyph: (
      <g {...stroke}>
        <path d="M60 62 V18 M60 44 L40 30 M60 44 L80 30 M60 52 L44 50 M60 52 L76 50" />
      </g>
    ),
  },
  small_biz: {
    palette: 'gold',
    glyph: (
      <g {...stroke}>
        <path d="M38 34 L42 22 H78 L82 34 M38 34 q5 8 11 0 q5 8 11 0 q5 8 11 0 q5 8 11 0 M42 38 V60 H78 V38 M54 60 V48 H66 V60" />
      </g>
    ),
  },
};

export function IssueArt({ issue }: { issue: IssueId }) {
  const s = ISSUE_GLYPH[issue];
  return (
    <Emblem id={`issue-${issue}`} palette={s.palette}>
      {s.glyph}
    </Emblem>
  );
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const SKIN = ['#f6d3b3', '#e9b48c', '#c98d62', '#9a6642', '#70452b', '#f1c9a5'];
const HAIR = ['#2a1b12', '#5a3a1e', '#111827', '#8a8f9c', '#b4532a', '#d9c08a'];
const SUIT = ['#14213d', '#2b2f3a', '#3a2440', '#1f3a34', '#4a1f24', '#2a3f66'];
const ROLE_PALETTE: Record<string, keyof typeof PALETTES> = {
  campaignManager: 'studio',
  chiefOfStaff: 'night',
  partyLiaison: 'violet',
  legislativeDirector: 'green',
};

/** A portrait generated from the person's name: the same name always gets the same face. */
export function PortraitArt({ name, role }: { name: string; role: string }) {
  const h = hash(name);
  const skin = SKIN[h % SKIN.length]!;
  const hair = HAIR[(h >> 4) % HAIR.length]!;
  const suit = SUIT[(h >> 8) % SUIT.length]!;
  const style = (h >> 12) % 4;
  const glasses = (h >> 16) % 3 === 0;
  const tie = (h >> 18) % 2 === 0 ? '#c3271e' : '#f5c842';
  return (
    <Scene id={`p-${h}`} palette={ROLE_PALETTE[role] ?? 'steel'}>
      <g fill="#fff" opacity="0.08">
        <path d="M0 80 L40 0 H56 L16 80 Z M50 80 L90 0 H106 L66 80 Z" />
      </g>
      <path d="M22 80 Q24 56 46 52 L60 62 L74 52 Q96 56 98 80 Z" fill={suit} />
      <path d="M50 52 L60 66 L70 52 L64 48 H56 Z" fill="#fff" />
      <path d="M57 56 H63 L65 74 L60 79 L55 74 Z" fill={tie} />
      <rect x="54" y="42" width="12" height="12" fill={skin} />
      <ellipse cx="60" cy="31" rx="13" ry="16" fill={skin} />
      {style === 0 && <path d="M46 30 Q46 12 60 12 Q74 12 74 30 Q70 20 60 20 Q50 20 46 30 Z" fill={hair} />}
      {style === 1 && <path d="M45 34 Q42 10 60 11 Q78 10 75 34 Q73 22 64 19 Q52 20 45 34 Z" fill={hair} />}
      {style === 2 && <path d="M44 48 Q40 10 60 11 Q80 10 76 48 L72 46 Q76 24 60 21 Q44 24 48 46 Z" fill={hair} />}
      {style === 3 && <path d="M47 26 Q48 14 60 14 Q72 14 73 26 Q66 19 60 19 Q54 19 47 26 Z" fill={hair} opacity="0.85" />}
      <g fill="#14213d">
        <circle cx="54.5" cy="31" r="1.5" />
        <circle cx="65.5" cy="31" r="1.5" />
      </g>
      <path d="M55 39 Q60 42 65 39" fill="none" stroke="#14213d" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      {glasses && (
        <g fill="none" stroke="#14213d" strokeWidth="1.2">
          <circle cx="54.5" cy="31" r="4.2" />
          <circle cx="65.5" cy="31" r="4.2" />
          <path d="M58.7 31 H61.3" />
        </g>
      )}
    </Scene>
  );
}

const ITEM_GLYPH: Record<string, ReactNode> = {
  volunteer_list: (
    <g {...stroke}>
      <rect x="44" y="18" width="32" height="44" rx="3" />
      <path d="M51 30 H69 M51 40 H69 M51 50 H62" />
    </g>
  ),
  oppo_dossier: (
    <g {...stroke}>
      <path d="M38 26 H54 L58 31 H82 V58 H38 Z" />
      <circle cx="58" cy="44" r="6" />
      <path d="M63 49 L70 56" />
    </g>
  ),
  endorsement: (
    <g {...stroke}>
      <circle cx="60" cy="34" r="14" />
      <path d="M53 34 l5 5 l9 -10 M52 46 L46 64 L60 56 L74 64 L68 46" />
    </g>
  ),
  ad_reservation: (
    <g {...stroke}>
      <rect x="38" y="22" width="44" height="30" rx="4" />
      <path d="M54 30 V44 L68 37 Z M50 60 H70" />
    </g>
  ),
  poll_watchers: (
    <g {...stroke}>
      <path d="M32 40 q28 -26 56 0 q-28 26 -56 0 Z" />
      <circle cx="60" cy="40" r="7" />
    </g>
  ),
};

export function ItemArt({ id }: { id: string }) {
  return (
    <Emblem id={`item-${id}`} palette="violet">
      {ITEM_GLYPH[id] ?? ITEM_GLYPH.endorsement}
    </Emblem>
  );
}
