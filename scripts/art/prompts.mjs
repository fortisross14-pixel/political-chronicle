// Writes art/PROMPTS.md from art/grids.json: one copy-paste prompt per grid.
import { readFileSync, writeFileSync } from 'node:fs';

const spec = JSON.parse(readFileSync('art/grids.json', 'utf8'));
const out = [
  '# Art grids',
  '',
  'Paste each prompt into an image generator (one image per prompt), save the result (.png, .webp or .jpg) as',
  '`art/grids/<id>.png`, then run `npm run art` to slice it into `public/art/`.',
  'Each grid is 6 columns × 4 rows, read left to right, top to bottom.',
  '',
];
for (const g of spec.grids) {
  if (g.cells.length !== 24) throw new Error(`${g.id} has ${g.cells.length} cells`);
  const style = g.kind === 'portrait' ? `${spec.style} ${spec.portraitStyle}` : spec.style;
  out.push(`## ${g.title} — save as \`art/grids/${g.id}.png\``, '', '```text');
  out.push(spec.layout, '', `Style: ${style}`, '', 'Cells, left to right, top to bottom:');
  g.cells.forEach(([, desc], i) => out.push(`Row ${Math.floor(i / 6) + 1}, column ${(i % 6) + 1}: ${desc}.`));
  out.push('```', '');
}
writeFileSync('art/PROMPTS.md', out.join('\n'));
console.log('Wrote art/PROMPTS.md');
