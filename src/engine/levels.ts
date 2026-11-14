// Two levels of geography (DESIGN_V2 §14): districts for the state, neighborhoods inside cities.
// After every action, what changed in a neighborhood rolls up into its district (weighted by how
// much of the district the city covers, and its media reach), and what changed in a district
// flows down to its neighborhoods.
import { getRegion, REGIONS } from '../data';
import { clamp } from './opinion';
import type { GameState, RegionId } from './types';

/** A city's media spills over its district: its weight counts this many times its population. */
export const CITY_REACH = 4;

interface Family {
  district: RegionId;
  children: { id: RegionId; weight: number }[];
}

const FAMILIES: Family[] = (() => {
  const byParent = new Map<RegionId, RegionId[]>();
  for (const r of REGIONS) if (r.parent) byParent.set(r.parent, [...(byParent.get(r.parent) ?? []), r.id]);
  return [...byParent].map(([district, ids]) => {
    const childPop = ids.reduce((s, id) => s + getRegion(id).population, 0);
    const cover = clamp((childPop / getRegion(district).population) * CITY_REACH, 0, 1);
    return { district, children: ids.map((id) => ({ id, weight: (getRegion(id).population / childPop) * cover })) };
  });
})();

export function syncLevels(prev: GameState, next: GameState): GameState {
  if (prev.regions === next.regions) return next;
  const regions = { ...next.regions };
  let changed = false;
  for (const f of FAMILIES) {
    const p0 = prev.regions[f.district];
    const p1 = next.regions[f.district];
    if (!p0 || !p1) continue;
    const down = { rec: p1.recognition - p0.recognition, fav: p1.favorability - p0.favorability };
    let upRec = 0;
    let upFav = 0;
    for (const c of f.children) {
      const c0 = prev.regions[c.id];
      const c1 = next.regions[c.id];
      if (!c0 || !c1) continue;
      upRec += (c1.recognition - c0.recognition) * c.weight;
      upFav += (c1.favorability - c0.favorability) * c.weight;
      if (down.rec || down.fav) {
        regions[c.id] = {
          recognition: clamp(c1.recognition + down.rec, 0, 1),
          favorability: clamp(c1.favorability + down.fav, -1, 1),
        };
        changed = true;
      }
    }
    if (upRec || upFav) {
      regions[f.district] = {
        recognition: clamp(regions[f.district]!.recognition + upRec, 0, 1),
        favorability: clamp(regions[f.district]!.favorability + upFav, -1, 1),
      };
      changed = true;
    }
  }
  return changed ? { ...next, regions } : next;
}
