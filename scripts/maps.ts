// Generates src/data/geometry.ts: stylized TV-style maps for the state and each city.
// Each map is a set of containers (outline polygons) split into areas by Voronoi cells around
// hand-placed sites, so the geometry follows the data and is easy to re-cut.
// Usage: npx vite-node scripts/maps.ts
import { writeFileSync } from 'node:fs';

type Pt = [number, number];
interface Container {
  outline: Pt[];
  sites: { id: string; at: Pt }[];
}
interface MapSpec {
  id: string;
  viewBox: [number, number];
  containers: Container[];
  /** Non-interactive decoration: water, frames, links. */
  decor: { kind: 'water' | 'river' | 'frame' | 'link' | 'land'; points: Pt[]; closed?: boolean }[];
}

const pts = (s: string): Pt[] =>
  s
    .trim()
    .split(/\s+/)
    .map((p) => p.split(',').map(Number) as Pt);

/** Keeps the part of `poly` on the side of the line a→b where `keep` lies (Sutherland–Hodgman step). */
function clipHalf(poly: Pt[], a: Pt, b: Pt, keep: Pt): Pt[] {
  const side = (p: Pt) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const sKeep = Math.sign(side(keep));
  const inside = (p: Pt) => side(p) * sKeep >= 0;
  const cross = (p: Pt, q: Pt): Pt => {
    const sp = side(p);
    const sq = side(q);
    const t = sp / (sp - sq);
    return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  };
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i]!;
    const prev = poly[(i + poly.length - 1) % poly.length]!;
    if (inside(cur)) {
      if (!inside(prev)) out.push(cross(prev, cur));
      out.push(cur);
    } else if (inside(prev)) out.push(cross(prev, cur));
  }
  return out;
}

/** The outline, cut down to the Voronoi cell of site i (the cell is convex, so clipping by its half-planes works). */
function cell(outline: Pt[], sites: Pt[], i: number): Pt[] {
  let poly = outline;
  const s = sites[i]!;
  for (let j = 0; j < sites.length; j++) {
    if (j === i) continue;
    const o = sites[j]!;
    const mid: Pt = [(s[0] + o[0]) / 2, (s[1] + o[1]) / 2];
    const dir: Pt = [-(o[1] - s[1]), o[0] - s[0]]; // perpendicular to s→o
    poly = clipHalf(poly, mid, [mid[0] + dir[0], mid[1] + dir[1]], s);
    if (poly.length < 3) break;
  }
  return poly;
}

function centroid(poly: Pt[]): Pt {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i]!;
    const [x1, y1] = poly[(i + 1) % poly.length]!;
    const f = x0 * y1 - x1 * y0;
    a += f;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  return a ? [cx / (3 * a), cy / (3 * a)] : poly[0]!;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const path = (poly: Pt[], closed = true) => `M${poly.map(([x, y]) => `${r1(x)},${r1(y)}`).join('L')}${closed ? 'Z' : ''}`;

/** A blobby city outline: a seeded wobble around an ellipse. */
function blob(cx: number, cy: number, rx: number, ry: number, seed: number, n = 28): Pt[] {
  let h = seed;
  const rnd = () => (h = (h * 1103515245 + 12345) % 2147483648) / 2147483648;
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const k = 0.9 + rnd() * 0.18;
    return [cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k] as Pt;
  });
}

const scale = (poly: Pt[], s: number, dx: number, dy: number): Pt[] => poly.map(([x, y]) => [x * s + dx, y * s + dy]);

// ---------- New York State ----------

const UPSTATE = pts(
  '30,240 48,205 60,170 58,140 100,135 180,130 240,124 268,92 298,52 330,26 400,20 405,60 410,120 406,190 410,250 394,262 372,262 358,258 344,248 330,236 132,236',
);
const LONG_ISLAND = pts('400,268 470,246 476,256 414,286 400,286');
const NYC_MAIN = pts('358,258 372,262 394,262 400,268 400,286 392,298 372,304 352,296 350,276');
/** The five boroughs, drawn in their own inset (local coordinates, 0..100 × 0..80). */
const BOROUGHS: Record<string, Pt[]> = {
  'ny-bronx': pts('42,2 72,2 80,18 60,26 46,22'),
  'ny-nyc': pts('36,16 46,22 48,30 42,56 32,66 28,54 32,30'),
  'ny-queens': pts('60,26 80,18 100,30 100,62 74,68 56,54 52,40'),
  'ny-brooklyn': pts('42,56 48,30 52,40 56,54 74,68 60,80 40,78 32,66'),
  'ny-staten': pts('2,62 22,56 28,72 14,80 0,76'),
};
const INSET = { x: 196, y: 242, s: 0.92 };

const NY: MapSpec = {
  id: 'NY',
  viewBox: [480, 320],
  containers: [
    {
      outline: UPSTATE,
      sites: [
        { id: 'ny-chautauqua', at: [48, 224] },
        { id: 'ny-wny', at: [70, 174] },
        { id: 'ny-rochester', at: [122, 150] },
        { id: 'ny-fingerlakes', at: [158, 200] },
        { id: 'ny-central', at: [205, 158] },
        { id: 'ny-southern', at: [238, 220] },
        { id: 'ny-north', at: [288, 78] },
        { id: 'ny-mohawk', at: [272, 168] },
        { id: 'ny-capital', at: [362, 160] },
        { id: 'ny-catskills', at: [318, 212] },
        { id: 'ny-hudson', at: [372, 214] },
        { id: 'ny-westchester', at: [378, 248] },
      ],
    },
    { outline: LONG_ISLAND, sites: [{ id: 'ny-suburbs', at: [438, 266] }] },
    ...Object.entries(BOROUGHS).map(([id, poly]) => {
      const o = scale(poly, INSET.s, INSET.x, INSET.y);
      return { outline: o, sites: [{ id, at: centroid(o) }] };
    }),
  ],
  decor: [
    { kind: 'land', points: NYC_MAIN, closed: true },
    {
      kind: 'frame',
      points: pts(
        `${INSET.x - 8},${INSET.y - 6} ${INSET.x + 104},${INSET.y - 6} ${INSET.x + 104},${INSET.y + 82} ${INSET.x - 8},${INSET.y + 82}`,
      ),
      closed: true,
    },
    { kind: 'link', points: pts(`${INSET.x + 104},${INSET.y + 30} 350,280`) },
  ],
};

// ---------- Cities ----------

const WATERTOWN_OUTLINE = blob(240, 160, 190, 128, 7);
const WATERTOWN: MapSpec = {
  id: 'mayor-watertown',
  viewBox: [480, 320],
  containers: [
    {
      outline: WATERTOWN_OUTLINE,
      sites: [
        { id: 'wt-downtown', at: [236, 160] },
        { id: 'wt-thompson', at: [330, 214] },
        { id: 'wt-drum', at: [356, 96] },
        { id: 'wt-mill', at: [168, 126] },
        { id: 'wt-arsenal', at: [130, 210] },
        { id: 'wt-ives', at: [246, 250] },
        { id: 'wt-northside', at: [238, 70] },
      ],
    },
  ],
  decor: [{ kind: 'river', points: pts('40,132 120,140 190,146 240,150 300,140 380,150 450,136') }],
};

const BUFFALO_OUTLINE = pts('110,20 300,14 410,40 452,120 446,230 400,300 250,308 150,296 96,240 70,180 60,110 80,50');
const BUFFALO: MapSpec = {
  id: 'mayor-buffalo',
  viewBox: [480, 320],
  containers: [
    {
      outline: BUFFALO_OUTLINE,
      sites: [
        { id: 'buf-downtown', at: [150, 250] },
        { id: 'buf-elmwood', at: [190, 150] },
        { id: 'buf-eastside', at: [300, 190] },
        { id: 'buf-south', at: [280, 280] },
        { id: 'buf-north', at: [250, 70] },
        { id: 'buf-westside', at: [128, 180] },
        { id: 'buf-riverside', at: [130, 80] },
        { id: 'buf-university', at: [370, 70] },
        { id: 'buf-lovejoy', at: [390, 230] },
      ],
    },
  ],
  decor: [
    { kind: 'water', points: pts('0,0 110,20 80,50 60,110 70,180 96,240 150,296 120,320 0,320'), closed: true },
    { kind: 'river', points: pts('150,296 210,268 260,262 330,270 420,282') },
  ],
};

const NYC_SCALE = 3.7;
const NYC_AT: Pt = [55, 12];
const nycBorough = (id: string) => scale(BOROUGHS[id]!, NYC_SCALE, NYC_AT[0], NYC_AT[1]);
/** Neighborhood sites in the boroughs' local coordinates. */
const nycSite = (id: string, x: number, y: number) => ({ id, at: [x * NYC_SCALE + NYC_AT[0], y * NYC_SCALE + NYC_AT[1]] as Pt });
const NYC: MapSpec = {
  id: 'mayor-nyc',
  viewBox: [480, 320],
  containers: [
    { outline: nycBorough('ny-nyc'), sites: [nycSite('nyc-harlem', 42, 24), nycSite('nyc-uws', 38, 38), nycSite('nyc-midtown', 37, 54)] },
    {
      outline: nycBorough('ny-brooklyn'),
      sites: [nycSite('nyc-williamsburg', 50, 46), nycSite('nyc-flatbush', 56, 66), nycSite('nyc-bayridge', 40, 72)],
    },
    {
      outline: nycBorough('ny-queens'),
      sites: [nycSite('nyc-astoria', 62, 32), nycSite('nyc-flushing', 88, 38), nycSite('nyc-jamaica', 80, 58)],
    },
    { outline: nycBorough('ny-bronx'), sites: [nycSite('nyc-southbronx', 52, 14), nycSite('nyc-riverdale', 70, 8)] },
    { outline: nycBorough('ny-staten'), sites: [nycSite('nyc-staten', 14, 70)] },
  ],
  decor: [],
};

// ---------- Output ----------

const SPECS = [NY, WATERTOWN, BUFFALO, NYC];
const out: Record<string, unknown> = {};
for (const spec of SPECS) {
  const shapes: Record<string, { d: string; label: Pt }> = {};
  for (const c of spec.containers) {
    const sites = c.sites.map((s) => s.at);
    c.sites.forEach((s, i) => {
      const poly = c.sites.length === 1 ? c.outline : cell(c.outline, sites, i);
      if (poly.length < 3) throw new Error(`${spec.id}: ${s.id} has no area`);
      const at = centroid(poly);
      shapes[s.id] = { d: path(poly), label: [r1(at[0]), r1(at[1])] };
    });
  }
  out[spec.id] = {
    viewBox: `0 0 ${spec.viewBox[0]} ${spec.viewBox[1]}`,
    shapes,
    decor: spec.decor.map((d) => ({ kind: d.kind, d: path(d.points, d.closed ?? false) })),
  };
}

const ts = `// Generated by scripts/maps.ts — do not edit by hand.
export interface MapShape {
  d: string;
  label: [number, number];
}
export interface MapGeometry {
  viewBox: string;
  shapes: Record<string, MapShape>;
  decor: { kind: 'water' | 'river' | 'frame' | 'link' | 'land'; d: string }[];
}

export const MAPS: Record<string, MapGeometry> = ${JSON.stringify(out, null, 2)};
`;
writeFileSync('src/data/geometry.ts', ts);
console.log(
  `Wrote ${SPECS.length} maps: ${SPECS.map((s) => `${s.id} (${Object.keys((out[s.id] as { shapes: object }).shapes).length})`).join(', ')}`,
);
