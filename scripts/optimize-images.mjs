/**
 * Re-creates the optimised website images from the original photos. Run with:  node scripts/optimize-images.mjs
 *
 *  - src/assets/images/*.jpg      → WebP (bundled by Vite, referenced from src/lib/constants.ts) + 640/960 px variants for srcset
 *  - public/demo-villas/*.jpg     → recompressed progressive JPEG with the SAME file name (sample properties in the database
 *                                   store these URLs) + a -640 variant for small cards
 *  - public/og-image.jpg          → 1200×630 social-sharing preview (hero photo with a brand panel)
 *  - public/favicon.svg, icon PNGs → generated from an inline SVG monogram
 *
 * Originals are only read from git-ignored backups in .image-originals/ (created on first run), so re-running never
 * compounds quality loss.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const backup = path.join(root, '.image-originals');
const assets = path.join(root, 'src/assets/images');
const demo = path.join(root, 'public/demo-villas');
fs.mkdirSync(backup, { recursive: true });

const original = (dir, name) => {
  const b = path.join(backup, path.basename(dir), name);
  fs.mkdirSync(path.dirname(b), { recursive: true });
  if (!fs.existsSync(b)) fs.copyFileSync(path.join(dir, name), b);
  return b;
};
const kb = (f) => `${Math.round(fs.statSync(f).size / 1024)} KB`;

// Bundled images → WebP
for (const f of fs.readdirSync(assets).filter((n) => /\.(jpe?g|png)$/i.test(n))) {
  const src = original(assets, f);
  const base = f.replace(/\.(jpe?g|png)$/i, '');
  await sharp(src).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 74, effort: 5 }).toFile(path.join(assets, `${base}.webp`));
  if (/^hero_/.test(f)) {
    for (const w of [640, 960]) await sharp(src).rotate().resize({ width: w }).webp({ quality: 72, effort: 5 }).toFile(path.join(assets, `${base}-${w}.webp`));
  }
  console.log(`${f}  ${kb(src)} → ${base}.webp ${kb(path.join(assets, `${base}.webp`))}`);
}

// Demo property photos: same names, far smaller
for (const f of fs.readdirSync(demo).filter((n) => /^[^.]+\.jpg$/i.test(n) && !/-640\.jpg$/.test(n))) {
  const src = original(demo, f);
  const out = path.join(demo, f);
  await sharp(src).rotate().resize({ width: 1400, withoutEnlargement: true }).jpeg({ quality: 76, mozjpeg: true, progressive: true }).toFile(`${out}.tmp`);
  fs.renameSync(`${out}.tmp`, out);
  await sharp(src).rotate().resize({ width: 640 }).jpeg({ quality: 74, mozjpeg: true, progressive: true }).toFile(path.join(demo, f.replace(/\.jpg$/, '-640.jpg')));
  console.log(`demo-villas/${f}  ${kb(src)} → ${kb(out)}`);
}

// Brand icon (monogram) and social preview
const mark = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#092D28"/><path d="M148 392V120h52v108h112V120h52v272h-52V272H200v120z" fill="#E8C77F"/><path d="M104 436c52-22 100 22 152 0s100-22 152 0" fill="none" stroke="#D8AD57" stroke-width="14" stroke-linecap="round"/></svg>`;
const pub = path.join(root, 'public');
fs.writeFileSync(path.join(pub, 'favicon.svg'), mark(512));
for (const [name, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  await sharp(Buffer.from(mark(512))).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(pub, name));
}
const heroSrc = path.join(backup, 'images', fs.readdirSync(path.join(backup, 'images')).find((n) => /^hero_/.test(n)));
const panel = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#062722" stop-opacity=".92"/><stop offset=".62" stop-color="#062722" stop-opacity=".55"/><stop offset="1" stop-color="#062722" stop-opacity="0"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><text x="72" y="300" font-family="Georgia, 'DejaVu Serif', serif" font-size="84" font-weight="700" fill="#FBF7EF">Holiday<tspan fill="#E8C77F">Alibag</tspan></text><text x="76" y="368" font-family="Helvetica, Arial, 'DejaVu Sans', sans-serif" font-size="30" fill="#F1E7D2">Luxury coastal villas &amp; getaways</text><text x="76" y="414" font-family="Helvetica, Arial, 'DejaVu Sans', sans-serif" font-size="24" letter-spacing="4" fill="#E8C77F">ALIBAUG · MAHARASHTRA</text></svg>`);
await sharp(heroSrc).resize(1200, 630, { fit: 'cover', position: 'attention' }).composite([{ input: panel }]).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(pub, 'og-image.jpg'));
console.log(`og-image.jpg ${kb(path.join(pub, 'og-image.jpg'))}`);
