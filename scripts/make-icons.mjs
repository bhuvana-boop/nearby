// Renders the Nearby app icon to PNG at several sizes with no dependencies (supersampled rasteriser + zlib).
import { deflateSync } from "zlib";
import { writeFileSync } from "fs";

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BG = hex("#0a6c74"), WHITE = [255, 255, 255], GOLD = hex("#f2a93b");
// Icon geometry in 64-unit space (artwork scaled to 75% for maskable safe zone).
const T = (x, y) => [8 + 0.75 * x, 6 + 0.75 * y];
const bez = [];
for (let i = 0; i <= 48; i++) {
  const t = i / 48, u = 1 - t;
  const x = u ** 3 * 17 + 3 * u * u * t * 21 + 3 * u * t * t * 43 + t ** 3 * 47;
  const y = u ** 3 * 42 + 3 * u * u * t * 28 + 3 * u * t * t * 28 + t ** 3 * 42;
  bez.push(T(x, y));
}
const half = (5 * 0.75) / 2;
const circles = [
  { c: T(17, 42), r: 4.5, col: WHITE, a: 1 },
  { c: T(47, 42), r: 4.5, col: GOLD, a: 1 },
  { c: T(32, 22), r: 3, col: GOLD, a: 0.9 },
];
function distSeg(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function sample(u, v) {
  let col = BG;
  let d = Infinity;
  for (let i = 0; i < bez.length - 1; i++) d = Math.min(d, distSeg(u, v, bez[i], bez[i + 1]));
  if (d <= half) col = WHITE;
  for (const c of circles) {
    if (Math.hypot(u - c.c[0], v - c.c[1]) <= c.r) col = col.map((ch, k) => ch * (1 - c.a) + c.col[k] * c.a);
  }
  return col;
}
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
function png(S) {
  const SS = 4;
  const raw = Buffer.alloc(S * (S * 3 + 1));
  for (let y = 0; y < S; y++) {
    raw[y * (S * 3 + 1)] = 0;
    for (let x = 0; x < S; x++) {
      let acc = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const c = sample(((x + (sx + 0.5) / SS) * 64) / S, ((y + (sy + 0.5) / SS) * 64) / S);
          acc = acc.map((a, k) => a + c[k]);
        }
      const o = y * (S * 3 + 1) + 1 + x * 3;
      for (let k = 0; k < 3; k++) raw[o + k] = Math.round(acc[k] / (SS * SS));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0);
  ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
for (const [S, out] of [[512, "public/icon-512.png"], [192, "public/icon-192.png"], [180, "app/apple-icon.png"]]) {
  writeFileSync(out, png(S));
  console.log("wrote", out);
}
