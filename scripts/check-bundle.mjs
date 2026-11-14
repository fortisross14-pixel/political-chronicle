// Bundle budget (gzipped). Run after `npm run build`. Fails CI if the app grows past it.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = { js: 170, css: 16 };
const dir = 'dist/assets';
const totals = { js: 0, css: 0 };
for (const file of readdirSync(dir)) {
  const kind = file.endsWith('.js') ? 'js' : file.endsWith('.css') ? 'css' : null;
  if (!kind) continue;
  totals[kind] += gzipSync(readFileSync(join(dir, file))).length / 1024;
}
let over = false;
for (const kind of /** @type {const} */ (['js', 'css'])) {
  const ok = totals[kind] <= BUDGET_KB[kind];
  if (!ok) over = true;
  console.log(`${ok ? '✓' : '✗'} ${kind.toUpperCase()} ${totals[kind].toFixed(1)} KB gzip (budget ${BUDGET_KB[kind]} KB)`);
}
process.exit(over ? 1 : 0);
