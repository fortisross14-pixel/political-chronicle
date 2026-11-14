// Demographics (DESIGN_V2 §14): every district and neighborhood is a mix of three age groups,
// three income classes and three education levels. The mix drives what voters think about each
// topic, how much they care, which media reach them and how they lean.
import type { IssueId, MediaChannel, RegionType } from './types';

export type AgeGroup = 'young' | 'adult' | 'senior';
export type ClassGroup = 'low' | 'middle' | 'high';
export type EduGroup = 'none' | 'some' | 'college';
export type Group = AgeGroup | ClassGroup | EduGroup;
export type Dimension = 'age' | 'class' | 'edu';

/** Shares of each group, per dimension (each triple sums to 1). */
export interface Demo {
  age: Record<AgeGroup, number>;
  class: Record<ClassGroup, number>;
  edu: Record<EduGroup, number>;
}

export const DIMENSIONS: Record<Dimension, Group[]> = {
  age: ['young', 'adult', 'senior'],
  class: ['low', 'middle', 'high'],
  edu: ['none', 'some', 'college'],
};

export const GROUP_LABEL: Record<Group, string> = {
  young: 'Young adults',
  adult: 'Adults',
  senior: 'Seniors',
  low: 'Low income',
  middle: 'Middle class',
  high: 'Affluent',
  none: 'No degree',
  some: 'High school / college',
  college: 'College grads',
};

export const GROUP_SHORT: Record<Group, string> = {
  young: 'Young',
  adult: 'Adult',
  senior: 'Senior',
  low: 'Low',
  middle: 'Middle',
  high: 'High',
  none: 'No degree',
  some: 'Some college',
  college: 'College',
};

/**
 * A demographic profile from labels: the named groups of each dimension share 80% of it
 * (or 100% for a mix of all three). `'any'` (or omitting a dimension) is an even mix.
 * Example: profile('young', 'middle|high', 'college') — young urban professionals.
 */
export function profile(age = 'any', cls = 'any', edu = 'any'): Demo {
  const dim = <G extends Group>(groups: G[], spec: string): Record<G, number> => {
    const named = spec === 'any' ? groups : (spec.split('|') as G[]);
    const main = named.length === groups.length ? 1 : 0.8;
    const rest = groups.filter((g) => !named.includes(g));
    return Object.fromEntries(
      groups.map((g) => [g, named.includes(g) ? main / named.length : rest.length ? (1 - main) / rest.length : 0]),
    ) as Record<G, number>;
  };
  return {
    age: dim(DIMENSIONS.age as AgeGroup[], age),
    class: dim(DIMENSIONS.class as ClassGroup[], cls),
    edu: dim(DIMENSIONS.edu as EduGroup[], edu),
  };
}

/** Share of a group in a demo. */
export function shareOf(demo: Demo, g: Group): number {
  if (g in demo.age) return demo.age[g as AgeGroup];
  if (g in demo.class) return demo.class[g as ClassGroup];
  return demo.edu[g as EduGroup];
}

/** Population-weighted average of several demos. */
export function blend(parts: [Demo, number][]): Demo {
  const total = parts.reduce((s, [, w]) => s + w, 0);
  const out = profile();
  for (const d of Object.keys(DIMENSIONS) as Dimension[]) {
    for (const g of DIMENSIONS[d]) {
      const v = parts.reduce((s, [demo, w]) => s + shareOf(demo, g) * w, 0) / total;
      (out[d] as Record<Group, number>)[g] = v;
    }
  }
  return out;
}

// ---------- Opinions ----------

/** How far a fully Red (+1) area sits on each topic (stance units, −2..+2). */
export const PARTISAN_AXIS: Record<IssueId, number> = {
  taxes: 1.1,
  min_wage: 0.8,
  healthcare: 0.9,
  guns: 1.3,
  abortion: 1.1,
  lgbtq: 1.0,
  immigration: 1.1,
  climate: 1.1,
  industry: 0.4,
  policing: 0.9,
  education: 0.8,
  housing: 0.8,
  transit: 1.0,
  labor: 0.9,
  cannabis: 0.6,
  small_biz: 0.8,
};

/** Party lean counts this much more than one stance step per point of lean. */
export const LEAN_SCALE = 1.8;

/** Cross-pressures each group adds on top of party lean (stance units, applied as share − ⅓). */
export const GROUP_OPINION: Record<Group, Partial<Record<IssueId, number>>> = {
  young: { climate: -1.2, cannabis: -1.6, lgbtq: -1.4, housing: -1.4, transit: -0.8, min_wage: -0.8, abortion: -0.8 },
  adult: { taxes: 0.4, education: -0.3, policing: 0.3 },
  senior: { lgbtq: 0.9, cannabis: 1.2, immigration: 0.8, healthcare: -0.6, taxes: 0.5, transit: 0.4 },
  low: { min_wage: -2.0, labor: -1.4, healthcare: -1.4, taxes: -0.9, housing: -1.2, education: -0.4 },
  middle: { taxes: 0.6, policing: 0.3 },
  high: { taxes: 1.8, min_wage: 1.5, small_biz: 0.9, labor: 1.2, housing: 1.4, healthcare: 0.6 },
  none: { immigration: 1.2, guns: 0.9, lgbtq: 0.8, industry: -0.9, labor: -0.6, climate: 0.6 },
  some: { guns: 0.3, small_biz: 0.3 },
  college: { climate: -1.2, lgbtq: -1.2, immigration: -1.2, abortion: -0.9, guns: -0.9, cannabis: -0.5 },
};

/** What each group cares about more (salience added, applied as share − ⅓). */
export const GROUP_SALIENCE: Record<Group, Partial<Record<IssueId, number>>> = {
  young: { housing: 0.9, climate: 0.9, cannabis: 0.6, transit: 0.4, min_wage: 0.4 },
  adult: { taxes: 0.6, education: 0.7, policing: 0.3 },
  senior: { healthcare: 1.2, taxes: 0.6, policing: 0.6, immigration: 0.3 },
  low: { min_wage: 1.2, housing: 0.9, healthcare: 0.6, labor: 0.6, transit: 0.4 },
  middle: { taxes: 0.6, education: 0.6, small_biz: 0.3 },
  high: { taxes: 0.9, education: 0.6, small_biz: 0.6, housing: 0.3 },
  none: { industry: 0.9, guns: 0.4, labor: 0.4 },
  some: { labor: 0.3, small_biz: 0.3 },
  college: { climate: 0.6, education: 0.4, abortion: 0.4, lgbtq: 0.3 },
};

/** Lean each group adds (−1 Blue .. +1 Red), applied as share − ⅓. */
export const GROUP_LEAN: Record<Group, number> = {
  young: -0.5,
  adult: 0,
  senior: 0.4,
  low: -0.3,
  middle: 0.1,
  high: 0.2,
  none: 0.6,
  some: 0.1,
  college: -0.7,
};

const BASE_SALIENCE: Record<IssueId, number> = {
  taxes: 0.6,
  min_wage: 0.45,
  healthcare: 0.55,
  guns: 0.5,
  abortion: 0.5,
  lgbtq: 0.35,
  immigration: 0.5,
  climate: 0.45,
  industry: 0.4,
  policing: 0.55,
  education: 0.55,
  housing: 0.5,
  transit: 0.4,
  labor: 0.45,
  cannabis: 0.25,
  small_biz: 0.5,
};

/** Place-type pulls that demographics don't capture (cities want transit, the country wants roads). */
const TYPE_OPINION: Record<RegionType, Partial<Record<IssueId, number>>> = {
  urban: { transit: -1.2, housing: -0.6, guns: -0.6, policing: -0.2 },
  suburban: { housing: 0.6, taxes: 0.3, policing: 0.3 },
  midsize: { industry: -0.6, labor: -0.4 },
  rural: { guns: 0.6, transit: 1.0, climate: 0.4, small_biz: 0.4 },
};

const TYPE_SALIENCE: Record<RegionType, Partial<Record<IssueId, number>>> = {
  urban: { housing: 0.25, transit: 0.3, policing: 0.15 },
  suburban: { taxes: 0.2, education: 0.25, policing: 0.15 },
  midsize: { industry: 0.3, labor: 0.2 },
  rural: { guns: 0.25, small_biz: 0.15, climate: 0.1 },
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function groupSum(demo: Demo, table: Record<Group, Partial<Record<IssueId, number>>>, issue: IssueId): number {
  let s = 0;
  for (const d of Object.keys(DIMENSIONS) as Dimension[])
    for (const g of DIMENSIONS[d]) s += (shareOf(demo, g) - 1 / 3) * (table[g][issue] ?? 0);
  return s;
}

/** The lean demographics add to a place's own partisan history. */
export function demographicLean(demo: Demo): number {
  let s = 0;
  for (const d of Object.keys(DIMENSIONS) as Dimension[]) for (const g of DIMENSIONS[d]) s += (shareOf(demo, g) - 1 / 3) * GROUP_LEAN[g];
  return s;
}

/** Average stance and salience per topic for a place with this lean, type and mix of people. */
export function deriveOpinions(
  lean: number,
  type: RegionType,
  demo: Demo,
  quirks: Partial<Record<IssueId, number>> = {},
): { issueOpinion: Record<IssueId, number>; issueSalience: Record<IssueId, number> } {
  const issueOpinion = {} as Record<IssueId, number>;
  const issueSalience = {} as Record<IssueId, number>;
  for (const issue of Object.keys(PARTISAN_AXIS) as IssueId[]) {
    const o =
      lean * LEAN_SCALE * PARTISAN_AXIS[issue] +
      groupSum(demo, GROUP_OPINION, issue) +
      (TYPE_OPINION[type][issue] ?? 0) +
      (quirks[issue] ?? 0);
    issueOpinion[issue] = Math.round(clamp(o, -2, 2) * 100) / 100;
    const s = BASE_SALIENCE[issue] + groupSum(demo, GROUP_SALIENCE, issue) + (TYPE_SALIENCE[type][issue] ?? 0);
    issueSalience[issue] = Math.round(clamp(s, 0.1, 1) * 100) / 100;
  }
  return { issueOpinion, issueSalience };
}

// ---------- Media ----------

/** Who each kind of media reaches best: multiplier per group (1 = average). */
export const MEDIUM_GROUPS: Record<MediaChannel, Partial<Record<Group, number>>> = {
  tv: { senior: 1.5, adult: 1.1, young: 0.5, middle: 1.1 },
  cable: { senior: 1.4, young: 0.6, college: 1.2, high: 1.1 },
  social: { young: 1.7, adult: 1.0, senior: 0.4, college: 1.1 },
  inPerson: { low: 1.15, none: 1.1, senior: 1.1 },
  radio: { senior: 1.2, adult: 1.15, young: 0.6, none: 1.25, some: 1.1, college: 0.8 },
};

const TYPE_MEDIA: Record<RegionType, Partial<Record<MediaChannel, number>>> = {
  urban: { cable: 1.15, social: 1.1, radio: 0.8 },
  suburban: { tv: 1.15 },
  midsize: { radio: 1.1, tv: 1.05 },
  rural: { inPerson: 1.3, radio: 1.25, cable: 0.8 },
};

/** How well a set of group multipliers fits a place: 1 for an average place. */
export function groupFit(demo: Demo, weights: Partial<Record<Group, number>>): number {
  let fit = 1;
  for (const d of Object.keys(DIMENSIONS) as Dimension[]) {
    const dim = DIMENSIONS[d].reduce((s, g) => s + shareOf(demo, g) * (weights[g] ?? 1), 0);
    const avg = DIMENSIONS[d].reduce((s, g) => s + (weights[g] ?? 1) / 3, 0);
    fit *= dim / avg;
  }
  return fit;
}

export function deriveMedia(type: RegionType, demo: Demo): Record<MediaChannel, number> {
  const out = {} as Record<MediaChannel, number>;
  for (const m of Object.keys(MEDIUM_GROUPS) as MediaChannel[]) {
    out[m] = Math.round(clamp(groupFit(demo, MEDIUM_GROUPS[m]) * (TYPE_MEDIA[type][m] ?? 1), 0.5, 1.5) * 100) / 100;
  }
  return out;
}

/** The groups a card reaches best and worst, for its face. */
export function audienceSummary(weights: Partial<Record<Group, number>>): { strong: Group[]; weak: Group[] } {
  const entries = Object.entries(weights) as [Group, number][];
  return {
    strong: entries
      .filter(([, w]) => w >= 1.2)
      .sort((a, b) => b[1] - a[1])
      .map(([g]) => g),
    weak: entries
      .filter(([, w]) => w <= 0.8)
      .sort((a, b) => a[1] - b[1])
      .map(([g]) => g),
  };
}

/** One-line description of a place: "Young · Middle–High · College". */
export function describeDemo(demo: Demo): string {
  return (Object.keys(DIMENSIONS) as Dimension[])
    .map((d) => {
      const groups = DIMENSIONS[d];
      const top = [...groups].sort((a, b) => shareOf(demo, b) - shareOf(demo, a));
      const [a, b] = [shareOf(demo, top[0]!), shareOf(demo, top[1]!)];
      if (a >= 0.55 && b < 0.3) return GROUP_SHORT[top[0]!];
      // Two groups named together (in the dimension's own order: Middle–High, not High–Middle).
      if (a + b >= 0.7 && b >= 0.3)
        return groups
          .filter((g) => g === top[0] || g === top[1])
          .map((g) => GROUP_SHORT[g])
          .join('–');
      return 'Mixed';
    })
    .join(' · ');
}
