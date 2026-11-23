// Renders build/icon.svg to PNGs and a multi-size Windows .ico (no extra dependencies except sharp).
// Run: node scripts/make-icon.cjs   (sharp is resolved from local or global node_modules)
const fs = require('fs');
const path = require('path');
let sharp;
try { sharp = require('sharp'); } catch { sharp = require(path.join(process.env.APPDATA, 'npm', 'node_modules', 'sharp')); }

const root = path.join(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'build', 'icon.svg'));
(async () => {
  await sharp(svg).resize(1024, 1024).png().toFile(path.join(root, 'build', 'icon.png'));
  fs.mkdirSync(path.join(root, 'public'), { recursive: true });
  await sharp(svg).resize(256, 256).png().toFile(path.join(root, 'public', 'icon.png'));
  // ICO: header + directory + PNG-compressed images (supported since Vista).
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngs = await Promise.all(sizes.map((s) => sharp(svg).resize(s, s).png().toBuffer()));
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  const dir = Buffer.alloc(16 * sizes.length);
  let offset = 6 + dir.length;
  sizes.forEach((s, i) => {
    const o = i * 16;
    dir.writeUInt8(s >= 256 ? 0 : s, o); dir.writeUInt8(s >= 256 ? 0 : s, o + 1);
    dir.writeUInt8(0, o + 2); dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4); dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(pngs[i].length, o + 8); dir.writeUInt32LE(offset, o + 12);
    offset += pngs[i].length;
  });
  fs.writeFileSync(path.join(root, 'build', 'icon.ico'), Buffer.concat([head, dir, ...pngs]));
  console.log('icons written: build/icon.png, build/icon.ico, public/icon.png');
})();
