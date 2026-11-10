import { fileURLToPath } from 'url';
import { dirname, parse, join } from 'path';
import { glob } from 'glob';
import fs from 'fs';
import svg2ttf from 'svg2ttf';
import ttf2woff from 'ttf2woff';
import ttf2woff2 from 'ttf2woff2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cwd = process.cwd();
const fontsPath = './public/assets/fonts';
const fontsDone: string[] = [];

console.log(' ');
console.log('Converting fonts...');
console.log(' ');
console.log('cwd:', cwd);
console.log('fontsPath:', fontsPath);
// Найти все шрифты ttf, otf, svg
const files = await glob(`${fontsPath}/**/*.{ttf,otf,svg}`);
console.log(fontsPath);

for (const font of files) {
  const fontData = parse(font);

  if (fontsDone.includes(fontData.name)) continue;

  // --- SVG → TTF ---
  let ttfPath = font;
  if (fontData.ext === '.svg') {
    const svgBuffer = fs.readFileSync(font, 'utf8');
    const ttf = svg2ttf(svgBuffer, {});
    ttfPath = join(fontData.dir, `${fontData.name}.ttf`);
    fs.writeFileSync(ttfPath, Buffer.from(ttf.buffer));
  }

  const ttfBuffer = fs.readFileSync(ttfPath);

  // --- TTF → WOFF1 (strict) ---
  const woffBuffer = Buffer.from(ttf2woff(ttfBuffer).buffer);
  fs.writeFileSync(join(fontData.dir, `${fontData.name}.woff`), woffBuffer);

  // --- TTF → WOFF2 (strict) ---
  const woff2Buffer = ttf2woff2(ttfBuffer);
  fs.writeFileSync(join(fontData.dir, `${fontData.name}.woff2`), woff2Buffer);

  fontsDone.push(fontData.name);
  console.log('\x1b[32m%s\x1b[0m', `Font ${fontData.name} was converted.`);
}
