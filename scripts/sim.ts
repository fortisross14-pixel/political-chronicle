// Balance harness: npm run sim [runs]
import { BACKGROUNDS } from '../src/data';
import { botCharacter, hometownWinRate } from '../src/sim/bot';
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
