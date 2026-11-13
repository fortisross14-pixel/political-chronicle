// Balance harness: npm run sim [runs]
import { BACKGROUNDS } from '../src/data';
import { getEventCard } from '../src/data';
import { buildRunConfig, createRun, eventPrice } from '../src/engine';
import { botCharacter, careerFunds, hometownWinRate } from '../src/sim/bot';
import type { BotStyle } from '../src/sim/bot';

const runs = Number(process.argv[2] ?? 200);
const pct = (v: number) => `${(v * 100).toFixed(0)}%`.padStart(5);

console.log(`Hometown mayoral races, ${runs} runs each (age 35)\n`);
for (const home of ['ny-north', 'ny-wny', 'ny-nyc']) {
  for (const style of ['sensible', 'idle', 'contrarian'] as BotStyle[]) {
    const r = hometownWinRate(botCharacter(home), style, runs);
    console.log(`${home.padEnd(9)} ${style.padEnd(10)} win ${pct(r.winRate)}  avg share ${pct(r.avgShare)}`);
  }
}
console.log('\nSensible bot in Watertown by background');
for (const b of BACKGROUNDS) {
  const r = hometownWinRate(botCharacter('ny-north', b.id), 'sensible', Math.max(50, runs / 2));
  console.log(`${b.name.padEnd(22)} win ${pct(r.winRate)}  avg share ${pct(r.avgShare)}`);
}

console.log('\nFundraising investment: Watertown teacher, 20 turns (~6 years)');
const rallyPrice = eventPrice(getEventCard('arena_rally'), createRun(buildRunConfig(botCharacter('ny-north'), 'price')));
for (const style of ['sensible', 'investor'] as BotStyle[]) {
  const n = Math.max(40, runs / 4);
  let funds = 0;
  let fr = 0;
  let rally = 0;
  for (let i = 0; i < n; i++) {
    const r = careerFunds(botCharacter('ny-north'), style, 20, `fund-${style}-${i}`);
    funds += r.funds;
    fr += r.fundraising;
    if (r.peak >= rallyPrice) rally++;
  }
  console.log(`${style.padEnd(10)} Fundraising ${(fr / n).toFixed(1)}  avg funds $${Math.round(funds / n / 1000)}k  could afford a $${rallyPrice / 1000}k rally: ${pct(rally / n)}`);
}
