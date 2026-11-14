// Renders public/icon.svg into the PNG icons the web app manifest needs. Run after changing it:
//   node scripts/icons.mjs
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const svg = readFileSync('public/icon.svg', 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
const shots = [
  { file: 'public/icon-192.png', size: 192, pad: 0 },
  { file: 'public/icon-512.png', size: 512, pad: 0 },
  { file: 'public/apple-touch-icon.png', size: 180, pad: 0 },
  // Maskable: launchers crop to a circle, so keep the art inside the middle 80%.
  { file: 'public/icon-maskable-512.png', size: 512, pad: 0.1 },
];
for (const { file, size, pad } of shots) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * (1 - pad * 2));
  await page.setContent(
    `<body style="margin:0;background:#050f2c;display:grid;place-items:center;width:${size}px;height:${size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body>`,
  );
  await page.screenshot({ path: file, omitBackground: false });
  console.log(`Wrote ${file}`);
}
await browser.close();
