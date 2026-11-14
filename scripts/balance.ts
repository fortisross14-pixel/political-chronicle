// Balance baseline: a fixed-seed subset of the sim, compared against balance/baseline.json.
//   npm run balance          → compare; exits 1 if any metric drifts past its tolerance
//   npm run balance:update   → re-record the baseline (commit it with the change that moved it)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { botCharacter, climbCareer, hometownWinRate, preparedLoadout, reelectionRate, scenarioRate } from '../src/sim/bot';

const RUNS = 40;
const BASELINE = 'balance/baseline.json';

interface Metric {
  value: number;
  /** Allowed absolute drift before the check fails. */
  tolerance: number;
}

function measure(): Record<string, Metric> {
  const rate = (v: number, tolerance = 0.12): Metric => ({ value: Math.round(v * 1000) / 1000, tolerance });
  const m: Record<string, Metric> = {};
  for (const home of ['ny-north', 'ny-wny', 'ny-nyc']) {
    m[`mayor.${home}.sensible`] = rate(hometownWinRate(botCharacter(home), 'sensible', RUNS).winRate);
  }
  m['mayor.ny-north.idle'] = rate(hometownWinRate(botCharacter('ny-north'), 'idle', RUNS).winRate, 0.05);
  m['mayor.ny-north.transplant'] = rate(hometownWinRate(botCharacter('ny-north', 'public_servant', 35, 'TX'), 'sensible', RUNS).winRate);
  m['reelect.ny-north.keeper'] = rate(reelectionRate(botCharacter('ny-north'), 'sensible', RUNS).reelected);
  m['reelect.ny-north.flipflop'] = rate(reelectionRate(botCharacter('ny-north'), 'flipflop', RUNS).reelected);
  const climbs = Array.from({ length: 20 }, (_, i) => climbCareer(botCharacter('ny-north'), 60, `baseline-climb-${i}`));
  const tries = climbs.filter((c) => c.firstGovernorTry !== undefined);
  m['climb.governor.reached'] = rate(climbs.filter((c) => c.reachedGovernor).length / climbs.length, 0.15);
  m['climb.governor.firstTry'] = rate(tries.filter((c) => c.firstGovernorTry).length / Math.max(1, tries.length), 0.2);
  for (const id of ['hometown_favorite', 'keep_your_word', 'pick_a_side', 'big_city_small_town']) {
    m[`scenario.${id}`] = rate(scenarioRate(id, 20).winRate, 0.15);
    m[`scenario.${id}.prepared`] = rate(scenarioRate(id, 20, preparedLoadout(id)).winRate, 0.12);
  }
  return m;
}

const current = measure();
if (process.argv.includes('--update')) {
  writeFileSync(BASELINE, JSON.stringify(current, null, 2) + '\n');
  console.log(`Wrote ${Object.keys(current).length} metrics to ${BASELINE}.`);
  process.exit(0);
}
if (!existsSync(BASELINE)) {
  console.error(`No ${BASELINE}. Run "npm run balance:update" and commit it.`);
  process.exit(1);
}
const baseline = JSON.parse(readFileSync(BASELINE, 'utf8')) as Record<string, Metric>;
let failed = 0;
for (const [key, base] of Object.entries(baseline)) {
  const now = current[key];
  const drift = now ? now.value - base.value : NaN;
  const bad = !now || Math.abs(drift) > base.tolerance;
  if (bad) failed++;
  console.log(
    `${bad ? '✗' : '✓'} ${key.padEnd(34)} ${base.value.toFixed(3)} → ${now ? now.value.toFixed(3) : 'missing'}  (±${base.tolerance})`,
  );
}
for (const key of Object.keys(current)) if (!baseline[key]) console.log(`+ ${key} is new; run "npm run balance:update".`);
if (failed) {
  console.error(`\n${failed} metric(s) drifted. If the change is intended, run "npm run balance:update" and commit the new baseline.`);
  process.exit(1);
}
console.log('\nBalance is within tolerance of the baseline.');
