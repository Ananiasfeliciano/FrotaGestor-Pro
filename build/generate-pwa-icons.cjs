/**
 * Gera ícones PNG para PWA (192x192 e 512x512)
 * Usa apenas Node.js built-ins — zero dependências.
 *
 * Formato: quadrado azul arredondado com "FG" em branco, idêntico ao ícone desktop.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZES = [192, 512];
const OUT_DIR = path.join(__dirname, '..', 'public', 'icons');

// ── Paleta ────────────────────────────────────
const BG = [37, 99, 235]; // blue-600
const FG = [255, 255, 255]; // branco
const RADIUS_RATIO = 0.18; // raio do arredondamento

/**
 * Cria um buffer RGBA com fundo arredondado e "FG" centralizado
 */
function createImage(size) {
  const data = Buffer.alloc(size * size * 4, 0);
  const r = Math.round(size * RADIUS_RATIO);

  function setPixel(x, y, rgb) {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = 255;
  }

  function inRoundedRect(x, y) {
    if (x >= r && x < size - r) return true;
    if (y >= r && y < size - r) return true;
    const cx = x < r ? r : size - r - 1;
    const cy = y < r ? r : size - r - 1;
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= r * r;
  }

  // Fundo azul arredondado
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (inRoundedRect(x, y)) {
        setPixel(x, y, BG);
      }
    }
  }

  // "FG" bitmap 5x7 por caractere
  const F = [
    [1,1,1,1,1],
    [1,0,0,0,0],
    [1,1,1,1,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
  ];
  const G = [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,0],
    [1,0,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ];

  const scale = Math.max(1, Math.round(size / 24));
  const charW = 5 * scale;
  const charH = 7 * scale;
  const gap = Math.round(scale * 1.5);
  const totalW = charW * 2 + gap;
  const startX = Math.round((size - totalW) / 2);
  const startY = Math.round((size - charH) / 2);

  function drawChar(glyph, offX, offY) {
    for (let cy = 0; cy < 7; cy++) {
      for (let cx = 0; cx < 5; cx++) {
        if (glyph[cy][cx]) {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              setPixel(offX + cx * scale + sx, offY + cy * scale + sy, FG);
            }
          }
        }
      }
    }
  }

  drawChar(F, startX, startY);
  drawChar(G, startX + charW + gap, startY);

  return data;
}

/** Codifica RGBA em PNG */
function encodePNG(width, height, rgbaData) {
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const filterByte = Buffer.from([0]);
    const row = rgbaData.subarray(y * width * 4, (y + 1) * width * 4);
    rawRows.push(filterByte, row);
  }
  const raw = Buffer.concat(rawRows);
  const deflated = zlib.deflateSync(raw, { level: 9 });

  const chunks = [];

  // Signature
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

  function writeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeB = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeB, data]);
    const crc = crc32(body);
    const crcB = Buffer.alloc(4);
    crcB.writeUInt32BE(crc >>> 0, 0);
    chunks.push(len, body, crcB);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  writeChunk('IHDR', ihdr);

  // IDAT
  writeChunk('IDAT', deflated);

  // IEND
  writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat(chunks);
}

// CRC-32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// ── Main ──────────────────────────────────────
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

for (const size of SIZES) {
  const rgba = createImage(size);
  const png = encodePNG(size, size, rgba);
  const out = path.join(OUT_DIR, `icon-${size}.png`);
  fs.writeFileSync(out, png);
  console.log(`✓ ${out} (${(png.length / 1024).toFixed(1)} KB)`);
}

console.log('PWA icons generated!');
