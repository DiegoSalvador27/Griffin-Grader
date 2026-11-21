/**
 * Generates the app icons into public/icons/ from brand/em-griffin-athletics.jpg.
 *
 * Why this is not a one-line image resize: the athletics mark is a NAVY griffin
 * on a white background, and SPEC section 5 asks for it centred on a navy
 * square. Dropped straight on navy the griffin disappears into the field.
 * Recolouring it to white instead also fails, because the "EM" letters are
 * navy with a gold outline, so their interiors turn white too and the letters
 * dissolve into a slab.
 *
 * So the mark keeps its real colours and sits on a white rounded plate on the
 * navy field. That is the same treatment the crest gets in the app's top bar,
 * so the icon and the running app agree with each other.
 *
 * Rendering happens in headless Chrome so the project needs no image library.
 * If anything here fails the build must still proceed (SPEC section 5), so the
 * script falls back to a gold "GG" monogram and never exits non-zero.
 *
 * Run: npm run icons
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
const source = join(root, 'brand', 'em-griffin-athletics.jpg');

const NAVY = '#0B1F3A';
const GOLD = '#C9A227';

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

/** Icons to produce. `plate` is the white plate's width as a fraction of the canvas. */
const TARGETS = [
  { name: 'icon-192.png', size: 192, plate: 0.82 },
  { name: 'icon-512.png', size: 512, plate: 0.82 },
  { name: 'apple-touch-icon.png', size: 180, plate: 0.82 },
  // Maskable icons get cropped to a circle by the launcher, so the plate has
  // to sit well inside the safe zone.
  { name: 'icon-maskable-512.png', size: 512, plate: 0.58 },
];

function findChrome() {
  return CHROME_CANDIDATES.find((p) => existsSync(p)) ?? null;
}

function buildHtml({ size, plate, dataUri }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:${size}px;height:${size}px;overflow:hidden;background:${NAVY};}
    canvas{display:block;}
  </style></head><body>
  <canvas id="c" width="${size}" height="${size}"></canvas>
  <script>
    const SIZE = ${size};
    const PLATE = ${plate};
    const ctx = document.getElementById('c').getContext('2d');
    ctx.fillStyle = '${NAVY}';
    ctx.fillRect(0, 0, SIZE, SIZE);

    function roundedRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y,     x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x,     y + h, r);
      ctx.arcTo(x,     y + h, x,     y,     r);
      ctx.arcTo(x,     y,     x + w, y,     r);
      ctx.closePath();
    }

    function monogram() {
      ctx.fillStyle = '${GOLD}';
      ctx.font = '700 ' + Math.round(SIZE * 0.42) + 'px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GG', SIZE / 2, SIZE / 2 + SIZE * 0.02);
      document.title = 'done';
    }

    function drawPlate() {
      const p = Math.round(SIZE * PLATE);
      const px = Math.round((SIZE - p) / 2);
      ctx.fillStyle = '#FFFFFF';
      roundedRect(px, px, p, p, Math.round(p * 0.22));
      ctx.fill();
      return { p, px };
    }

    const hasSrc = ${dataUri ? 'true' : 'false'};
    if (!hasSrc) { monogram(); } else {
      const img = new Image();
      img.onerror = monogram;
      img.onload = () => {
        const { p, px } = drawPlate();
        // Inset the mark inside the plate so it does not touch the corners.
        const w = Math.round(p * 0.86);
        const h = Math.round((img.height / img.width) * w);
        ctx.drawImage(img, px + Math.round((p - w) / 2), px + Math.round((p - h) / 2), w, h);
        document.title = 'done';
      };
      img.src = ${dataUri ? JSON.stringify(dataUri) : 'null'};
    }
  </script></body></html>`;
}

function main() {
  mkdirSync(outDir, { recursive: true });

  const chrome = findChrome();
  if (!chrome) {
    console.warn('make-icons: no Chrome found, skipping icon generation.');
    return;
  }

  let dataUri = null;
  if (existsSync(source)) {
    dataUri = `data:image/jpeg;base64,${readFileSync(source).toString('base64')}`;
  } else {
    console.warn('make-icons: brand/em-griffin-athletics.jpg missing, using GG monogram.');
  }

  const work = join(tmpdir(), `gg-icons-${process.pid}`);
  mkdirSync(work, { recursive: true });

  for (const target of TARGETS) {
    const htmlPath = join(work, `${target.name}.html`);
    const shotPath = join(work, target.name);
    writeFileSync(htmlPath, buildHtml({ ...target, dataUri }));

    try {
      execFileSync(
        chrome,
        [
          '--headless',
          '--disable-gpu',
          '--hide-scrollbars',
          '--force-device-scale-factor=1',
          `--window-size=${target.size},${target.size}`,
          `--screenshot=${shotPath}`,
          '--virtual-time-budget=4000',
          `file://${htmlPath}`,
        ],
        { stdio: 'ignore' },
      );
      renameSync(shotPath, join(outDir, target.name));
      console.log(`make-icons: wrote ${target.name} (${target.size}x${target.size})`);
    } catch {
      console.warn(`make-icons: failed to render ${target.name}, leaving it out.`);
    }
  }

  rmSync(work, { recursive: true, force: true });
}

main();
