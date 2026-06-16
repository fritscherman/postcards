import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'public');

/** Full-bleed icon artwork. `pad` keeps the card inside the maskable safe zone. */
function icon(pad = 0) {
  const card = 200 - pad; // half-width of the postcard region
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#13869f"/><stop offset="1" stop-color="#0b5563"/>
    </linearGradient>
    <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fffdf8"/><stop offset="1" stop-color="#f3ead9"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <g transform="translate(256 256) rotate(-7)">
    <rect x="${-card}" y="${-card * 0.66}" width="${card * 2}" height="${card * 1.32}" rx="26" fill="url(#paper)" stroke="rgba(0,0,0,.06)"/>
    <rect x="${card - 92}" y="${-card * 0.66 + 26}" width="64" height="76" rx="6" fill="#f6b73c" stroke="#0b5563" stroke-width="4"/>
    <text x="${card - 60}" y="${-card * 0.66 + 86}" font-size="46" text-anchor="middle">🌍</text>
    <path d="M${-card + 34} ${-card * 0.66 + 44} h150 M${-card + 34} ${-card * 0.66 + 84} h150 M${-card + 34} ${-card * 0.66 + 124} h220"
      stroke="#0e7490" stroke-width="12" stroke-linecap="round" opacity=".85"/>
    <path d="M${-card + 34} ${card * 0.4} h${card * 2 - 68}" stroke="#f97362" stroke-width="10" stroke-linecap="round" opacity=".7"/>
  </g>
</svg>`;
}

const jobs = [
  { name: 'pwa-192.png', size: 192, svg: icon(8) },
  { name: 'pwa-512.png', size: 512, svg: icon(8) },
  { name: 'maskable-512.png', size: 512, svg: icon(56) },
  { name: 'apple-touch-icon.png', size: 180, svg: icon(8) },
];

for (const job of jobs) {
  await sharp(Buffer.from(job.svg)).resize(job.size, job.size).png().toFile(resolve(out, job.name));
  console.log('✓', job.name);
}
