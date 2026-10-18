// Bundles the game and the sprite editor into self-contained HTML files:
//   dist/dungeon-crawler.html, dist/artifact.html            (game)
//   dist/sprite-forge.html,   dist/sprite-forge-artifact.html (editor)
//   dist/proto.html,          dist/proto-artifact.html        (graphics prototype)
// The *artifact* variants are for Claude artifacts, which wrap the page in
// their own document skeleton.

import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const root = new URL('..', import.meta.url);
const read = (p) => readFile(new URL(p, root), 'utf8');

async function bundlePage({ html: htmlFile, css: cssFile, entry, out, artifactOut }) {
  const result = await build({
    entryPoints: [new URL(entry, root).pathname],
    bundle: true,
    format: 'iife',
    minify: true,
    write: false,
    target: 'es2020',
  });
  const js = result.outputFiles[0].text;
  const css = await read(cssFile);
  let html = await read(htmlFile);

  const linkTag = `<link rel="stylesheet" href="${cssFile}">`;
  const scriptTag = `<script type="module" src="${entry}"></script>`;
  if (!html.includes(linkTag) || !html.includes(scriptTag)) {
    throw new Error(`${htmlFile}: expected ${linkTag} and ${scriptTag}`);
  }
  html = html
    .replace(linkTag, () => `<style>\n${css}</style>`)
    .replace(scriptTag, () => `<script>\n${js}</script>`);

  await writeFile(new URL(`dist/${out}`, root), html);
  console.log(`dist/${out.padEnd(28)} ${(html.length / 1024).toFixed(1)} KB`);

  // Artifact variant: drop doctype/html/head/body and the metas claude.ai provides.
  const artifact = html
    .replace(/<!doctype html>\s*/i, '')
    .replace(/<\/?(html|head|body)[^>]*>\s*/gi, '')
    .replace(/<meta charset[^>]*>\s*/i, '')
    .replace(/<meta name="viewport"[^>]*>\s*/i, '');
  await writeFile(new URL(`dist/${artifactOut}`, root), artifact);
  console.log(`dist/${artifactOut.padEnd(28)} ${(artifact.length / 1024).toFixed(1)} KB`);
}

await mkdir(new URL('dist/', root), { recursive: true });
await bundlePage({
  html: 'index.html', css: 'style.css', entry: 'src/main.js',
  out: 'dungeon-crawler.html', artifactOut: 'artifact.html',
});
await bundlePage({
  html: 'editor.html', css: 'editor.css', entry: 'src/editor/main.js',
  out: 'sprite-forge.html', artifactOut: 'sprite-forge-artifact.html',
});
await bundlePage({
  html: 'proto.html', css: 'proto.css', entry: 'src/proto/main.js',
  out: 'proto.html', artifactOut: 'proto-artifact.html',
});
