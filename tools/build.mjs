// Bundles the game into one self-contained HTML file: dist/dungeon-crawler.html
// (used for Claude artifacts and for sharing a single file).

import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const root = new URL('..', import.meta.url);
const read = (p) => readFile(new URL(p, root), 'utf8');

const result = await build({
  entryPoints: [new URL('src/main.js', root).pathname],
  bundle: true,
  format: 'iife',
  minify: true,
  write: false,
  target: 'es2020',
});
const js = result.outputFiles[0].text;
const css = await read('style.css');
let html = await read('index.html');

html = html
  .replace('<link rel="stylesheet" href="style.css">', `<style>\n${css}</style>`)
  .replace('<script type="module" src="src/main.js"></script>', () => `<script>\n${js}</script>`);

await mkdir(new URL('dist/', root), { recursive: true });
await writeFile(new URL('dist/dungeon-crawler.html', root), html);
console.log(`dist/dungeon-crawler.html  ${(html.length / 1024).toFixed(1)} KB`);
