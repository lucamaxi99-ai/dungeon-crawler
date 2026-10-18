// Converts between the editor document and source code for assets.js:
// defineSprite (one frame) or defineFrames (several), plus optional
// animation() and recolor() lines. Also parses such code back in.

import { C } from '../engine/palette.js';
import { spriteToAscii, defineFrames, KEY_CHARS } from '../engine/sprite.js';

export const COLOR_NAME = Object.fromEntries(Object.entries(C).map(([k, v]) => [v, k]));

const ident = (s) => (s.replace(/[^A-Za-z0-9_$]/g, '_').replace(/^(\d)/, '_$1') || 'sprite');
const camel = (s) => ident(s).replace(/_+([a-z0-9])/gi, (_, c) => c.toUpperCase());

function keyLiteral(key) {
  const parts = Object.entries(key).map(([ch, c]) => {
    const k = /^[A-Za-z_$][\w$]*$/.test(ch) ? ch : `'${ch}'`;
    return `${k}: C.${COLOR_NAME[c]}`;
  });
  return `{ ${parts.join(', ')} }`;
}

const rowsLiteral = (rows, indent) => rows.map((r) => `${indent}'${r}',`).join('\n');

export function toSource(doc) {
  const sprites = doc.toSprites();
  const a = spriteToAscii(sprites);
  const v = camel(doc.name);
  const lines = [];
  const glow = a.glow ? `\n  glow: '${a.glow}',` : '';

  if (sprites.length === 1) {
    lines.push(
      `const ${v} = defineSprite({`,
      `  name: '${doc.name}',`,
      `  key: ${keyLiteral(a.key)},${glow}`,
      '  rows: [',
      rowsLiteral(a.frames[0], '    '),
      '  ],',
      '});',
    );
  } else {
    lines.push(
      `const ${v}Frames = defineFrames({`,
      `  name: '${doc.name}',`,
      `  key: ${keyLiteral(a.key)},${glow}`,
      '  frames: [',
      ...a.frames.map((rows) => `    [\n${rowsLiteral(rows, '      ')}\n    ],`),
      '  ],',
      '});',
      `const ${v} = animation(${v}Frames, { frameMs: ${doc.frameMs}, mode: '${doc.mode}' });`,
    );
  }

  const map = doc.recolorMap();
  const pairs = Object.entries(map);
  if (pairs.length) {
    const body = pairs.map(([f, t]) => `[C.${COLOR_NAME[f]}]: C.${COLOR_NAME[t]}`).join(', ');
    lines.push(`const ${v}Variant = recolor(${v}, { ${body} }, 'variant');`);
  }
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------- import

// Reads string literals inside the first [...] after `label:`; returns them
// as { top: strings at depth 1, groups: one list per nested [...] }.
function readArray(src, label) {
  const m = new RegExp(`\\b${label}\\s*:\\s*\\[`).exec(src);
  if (!m) return null;
  let i = m.index + m[0].length;
  let depth = 1;
  const top = [];
  const groups = [];
  let group = null;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (ch === '[') { depth++; if (depth === 2) groups.push(group = []); i++; continue; }
    if (ch === ']') { depth--; i++; continue; }
    if (ch === "'" || ch === '"' || ch === '`') {
      const end = src.indexOf(ch, i + 1);
      if (end < 0) throw new Error('A string is not closed.');
      const str = src.slice(i + 1, end);
      if (depth === 1) top.push(str);
      else if (depth === 2) group.push(str);
      i = end + 1;
      continue;
    }
    if (src.startsWith('...', i)) {
      throw new Error('Spread rows (...NAME) cannot be imported. Paste the rows themselves.');
    }
    i++;
  }
  return { top, groups };
}

function parseKey(src) {
  const m = /\bkey\s*:\s*\{([^}]*)\}/.exec(src);
  if (!m) return null;
  const key = {};
  const re = /(?:'(.)'|"(.)"|([A-Za-z0-9_$]))\s*:\s*(?:C\.([A-Z_]+)|(\d+))/g;
  let e;
  while ((e = re.exec(m[1]))) {
    const ch = e[1] ?? e[2] ?? e[3];
    const idx = e[4] !== undefined ? C[e[4]] : Number(e[5]);
    if (idx === undefined || Number.isNaN(idx) || idx > 31) {
      throw new Error(`Unknown color for key '${ch}'.`);
    }
    key[ch] = idx;
  }
  return key;
}

// Accepts editor/assets.js style code, or just bare ASCII rows that use the
// default key characters (one row per line).
export function parseSource(text) {
  const src = text.trim();
  if (!src) throw new Error('Nothing to import. Paste sprite code or ASCII rows.');
  const name = /\bname\s*:\s*['"]([^'"]+)['"]/.exec(src)?.[1]?.replace(/_\d+$/, '') || 'imported';
  const glow = /\bglow\s*:\s*['"]([^'"]*)['"]/.exec(src)?.[1] || '';
  const frameMs = Number(/frameMs\s*:\s*(\d+)/.exec(src)?.[1]) || undefined;
  const mode = /mode\s*:\s*['"](loop|pingpong|once)['"]/.exec(src)?.[1];
  let key = parseKey(src);

  let frameRows;
  const frames = readArray(src, 'frames');
  const rows = readArray(src, 'rows');
  if (frames && frames.groups.length) frameRows = frames.groups;
  else if (rows) frameRows = [rows.top];
  else {
    // Bare ASCII: blank lines separate frames.
    key = Object.fromEntries([...KEY_CHARS].map((ch, i) => [ch, i]));
    frameRows = src.split(/\n\s*\n/).map((block) => block.split('\n').map((l) => l.trim().replace(/^['"]|['"],?$/g, '')).filter(Boolean));
  }
  if (!key) throw new Error('No key found. Expected key: { k: C.BLACK, ... } with C.NAME colors.');
  if (!frameRows.length || !frameRows[0].length) throw new Error('No rows found.');

  // Pad rows so ragged input still imports.
  const w = Math.max(...frameRows.flat().map((r) => r.length));
  const h = Math.max(...frameRows.map((f) => f.length));
  const padded = frameRows.map((f) => {
    const out = f.map((r) => r.padEnd(w, '.'));
    while (out.length < h) out.unshift('.'.repeat(w));
    return out;
  });
  if (w > 64 || h > 64) throw new Error(`Sprite is ${w}x${h}; the editor handles up to 64x64.`);

  const sprites = defineFrames({ key, frames: padded, glow, name });
  return { name, frames: sprites, frameMs, mode };
}
