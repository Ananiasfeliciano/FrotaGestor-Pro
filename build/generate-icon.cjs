/**
 * generate-icon.cjs
 * Generates build/icon.ico (multi-size) and build/icon.png (256x256)
 * using ONLY Node.js built-in modules (no external deps).
 *
 * Run: node build/generate-icon.cjs
 */

const zlib = require('node:zlib');
const fs = require('node:fs');
const path = require('node:path');

// ── Colours ────────────────────────────────────────────────
const BLUE = [37, 99, 235, 255];    // #2563EB
const WHITE = [255, 255, 255, 255];
const TRANSPARENT = [0, 0, 0, 0];

// ── Pixel-art "FG" bitmap (10 wide × 7 tall) ──────────────
// 1 = white text, 0 = background (blue)
const FG_GLYPH = [
  [1,1,1,1,0,0,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,0],
  [1,0,0,0,0,0,1,0,0,0],
  [1,1,1,0,0,0,1,0,1,1],
  [1,0,0,0,0,0,1,0,0,1],
  [1,0,0,0,0,0,1,0,0,1],
  [1,0,0,0,0,0,1,1,1,1],
];

// ── CRC-32 (for PNG chunks) ───────────────────────────────
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

// ── Create a PNG buffer for a given size ──────────────────
function createPNG(size) {
  const raw = Buffer.alloc(size * (1 + size * 4));

  const margin = Math.max(1, Math.floor(size * 0.06));
  const radius = Math.max(1, Math.floor(size * 0.18));
  const glyphH = FG_GLYPH.length;
  const glyphW = FG_GLYPH[0].length;

  // Scale glyph to fit ~50% of the icon area
  const cellSize = Math.max(1, Math.floor((size - margin * 2) * 0.5 / Math.max(glyphH, glyphW)));
  const glyphPixelW = glyphW * cellSize;
  const glyphPixelH = glyphH * cellSize;
  const gx0 = Math.floor((size - glyphPixelW) / 2);
  const gy0 = Math.floor((size - glyphPixelH) / 2);

  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 4);
    raw[row] = 0; // filter byte = None

    for (let x = 0; x < size; x++) {
      const off = row + 1 + x * 4;

      // Rounded-rect hit-test
      let inside = false;
      if (x >= margin && x < size - margin && y >= margin && y < size - margin) {
        const il = margin + radius, ir = size - margin - radius;
        const it = margin + radius, ib = size - margin - radius;
        if ((x >= il && x <= ir) || (y >= it && y <= ib)) {
          inside = true;
        } else {
          const cx = x < il ? il : ir;
          const cy = y < it ? it : ib;
          inside = Math.hypot(x - cx, y - cy) <= radius;
        }
      }

      // Glyph hit-test
      let isLetter = false;
      if (inside && size >= 16) {
        const gx = Math.floor((x - gx0) / cellSize);
        const gy = Math.floor((y - gy0) / cellSize);
        if (gx >= 0 && gx < glyphW && gy >= 0 && gy < glyphH) {
          isLetter = FG_GLYPH[gy][gx] === 1;
        }
      }

      const c = !inside ? TRANSPARENT : isLetter ? WHITE : BLUE;
      raw[off] = c[0]; raw[off + 1] = c[1]; raw[off + 2] = c[2]; raw[off + 3] = c[3];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Build ICO (PNG-inside-ICO) ────────────────────────────
function createICO(sizes) {
  const pngs = sizes.map(s => ({ size: s, data: createPNG(s) }));

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = ICO
  header.writeUInt16LE(pngs.length, 4);

  let offset = 6 + pngs.length * 16;
  const entries = pngs.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e[0] = size < 256 ? size : 0;
    e[1] = size < 256 ? size : 0;
    e.writeUInt16LE(1, 4);   // planes
    e.writeUInt16LE(32, 6);  // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });

  return Buffer.concat([header, ...entries, ...pngs.map(p => p.data)]);
}

// ── Main ──────────────────────────────────────────────────
const buildDir = path.join(__dirname);
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

const ico = createICO([16, 32, 48, 64, 128, 256]);
fs.writeFileSync(path.join(buildDir, 'icon.ico'), ico);

const png256 = createPNG(256);
fs.writeFileSync(path.join(buildDir, 'icon.png'), png256);

console.log('✔ build/icon.ico  (%d KB)', Math.round(ico.length / 1024));
console.log('✔ build/icon.png  (%d KB)', Math.round(png256.length / 1024));
