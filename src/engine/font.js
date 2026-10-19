// 3x5 pixel font. Each glyph is 5 rows, each row a 3-bit number (MSB = left).
// Lowercase is drawn as uppercase. Advance is 4px, line height 6px.

const G = {
  A: [2, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [3, 4, 4, 4, 3], D: [6, 5, 5, 5, 6],
  E: [7, 4, 6, 4, 7], F: [7, 4, 6, 4, 4], G: [3, 4, 5, 5, 3], H: [5, 5, 7, 5, 5],
  I: [7, 2, 2, 2, 7], J: [1, 1, 1, 5, 2], K: [5, 5, 6, 5, 5], L: [4, 4, 4, 4, 7],
  M: [5, 7, 7, 5, 5], N: [6, 5, 5, 5, 5], O: [2, 5, 5, 5, 2], P: [6, 5, 6, 4, 4],
  Q: [2, 5, 5, 6, 3], R: [6, 5, 6, 5, 5], S: [3, 4, 2, 1, 6], T: [7, 2, 2, 2, 2],
  U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5], X: [5, 5, 2, 5, 5],
  Y: [5, 5, 2, 2, 2], Z: [7, 1, 2, 4, 7],
  0: [7, 5, 5, 5, 7], 1: [2, 6, 2, 2, 7], 2: [6, 1, 2, 4, 7], 3: [6, 1, 2, 1, 6],
  4: [5, 5, 7, 1, 1], 5: [7, 4, 6, 1, 6], 6: [3, 4, 7, 5, 7], 7: [7, 1, 2, 2, 2],
  8: [7, 5, 7, 5, 7], 9: [7, 5, 7, 1, 6],
  ' ': [0, 0, 0, 0, 0], '.': [0, 0, 0, 0, 2], ',': [0, 0, 0, 2, 4], '!': [2, 2, 2, 0, 2],
  '?': [6, 1, 2, 0, 2], ':': [0, 2, 0, 2, 0], ';': [0, 2, 0, 2, 4], "'": [2, 2, 0, 0, 0],
  '"': [5, 5, 0, 0, 0], '-': [0, 0, 7, 0, 0], '+': [0, 2, 7, 2, 0], '=': [0, 7, 0, 7, 0],
  '/': [1, 1, 2, 4, 4], '(': [1, 2, 2, 2, 1], ')': [4, 2, 2, 2, 4], '%': [5, 1, 2, 4, 5],
  '#': [5, 7, 5, 7, 5], '*': [0, 5, 2, 5, 0], '<': [1, 2, 4, 2, 1], '>': [4, 2, 1, 2, 4],
  '_': [0, 0, 0, 0, 7], '[': [3, 2, 2, 2, 3], ']': [6, 2, 2, 2, 6], '&': [2, 5, 2, 5, 3],
};

export const CHAR_W = 4;
export const LINE_H = 6;

export function textWidth(str) {
  return str.length * CHAR_W - 1;
}

export function drawText(fb, str, x, y, color, shadow = -1) {
  const s = str.toUpperCase();
  for (let i = 0; i < s.length; i++) {
    const g = G[s[i]] || G['?'];
    const gx = x + i * CHAR_W;
    for (let row = 0; row < 5; row++) {
      const bits = g[row];
      for (let col = 0; col < 3; col++) {
        if (bits & (4 >> col)) {
          if (shadow >= 0) fb.set(gx + col + 1, y + row + 1, shadow);
          fb.set(gx + col, y + row, color);
        }
      }
    }
  }
}

// Greedy word wrap to a pixel width. Returns an array of lines.
export function wrapText(str, maxWidth) {
  const maxChars = Math.max(1, Math.floor((maxWidth + 1) / CHAR_W));
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const candidate = line ? line + ' ' + w : w;
    if (candidate.length <= maxChars) line = candidate;
    else { if (line) lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}
