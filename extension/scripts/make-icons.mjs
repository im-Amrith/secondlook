// Draws the SecondLook icon (ink-blue tile, white lens, marigold handle and tick) as PNGs with no dependencies.
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}
function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel((x + 0.5) / size * 64, (y + 0.5) / size * 64);
      raw.set([r, g, b, a], y * (size * 4 + 1) + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const distSeg = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))); return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
function pixel(x, y) {
  const r = 14; const cx = Math.min(Math.max(x, r), 64 - r), cy = Math.min(Math.max(y, r), 64 - r);
  if (Math.hypot(x - cx, y - cy) > r) return [0, 0, 0, 0];
  const d = Math.hypot(x - 28, y - 28);
  if (distSeg(x, y, 22, 28, 26, 32) < 2.2 || distSeg(x, y, 26, 32, 34, 24) < 2.2) return [240, 162, 2, 255];
  if (distSeg(x, y, 38, 38, 49, 49) < 3.2) return [240, 162, 2, 255];
  if (Math.abs(d - 13) < 2.6) return [255, 255, 255, 255];
  return [31, 43, 108, 255];
}
for (const s of [16, 48, 128]) writeFileSync(new URL(`../public/icons/icon${s}.png`, import.meta.url), png(s, pixel));
for (const s of [192, 512]) writeFileSync(new URL(`../../web/public/icon-${s}.png`, import.meta.url), png(s, pixel));
console.log("icons written");
