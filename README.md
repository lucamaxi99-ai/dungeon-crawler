# Dungeon Crawler (working title)

A retro first-person dungeon crawler for the browser, in the spirit of early-90s
RPGs like *The Elder Scrolls: Arena*. Grid movement, turn-based combat (coming),
and lots of loot. A fan project set in the world of *Dungeon Crawler Carl*,
with its own crawler and story.

All graphics are code: a fixed 32-color palette, procedural textures and
ASCII-defined sprites rendered by a small raycaster into an indexed framebuffer.

## Play

- **Online**: enable GitHub Pages (Settings → Pages → branch `main`, folder `/`),
  then open `https://lucamaxi99-ai.github.io/dungeon-crawler/`.
- **Locally**: `npm run serve` and open http://localhost:8080
  (ES modules need a web server; double-clicking `index.html` will not work).
- **Single file**: `npm install && npm run build` → `dist/dungeon-crawler.html`.

### Sprite editor (Borant Sprite Forge)

Open `editor.html` (same server as the game, or `dist/sprite-forge.html` after a
build). Draw with the game palette, mirror, animate frames, build recolor
variants and see the sprite in a dungeon room at three distances. **Copy code**
gives you a `defineSprite` / `defineFrames` block for `src/game/assets.js`;
**Import** reads such code (or plain ASCII rows) back in.

Shortcuts: B pencil, E eraser, G fill, L line, R box, I pick, M mirror drawing,
H / V flip, arrows move pixels, [ ] switch frames, Ctrl+Z / Ctrl+Y undo/redo,
right click erases.

### Controls

| Key | Action |
|---|---|
| W / ↑, S / ↓ | Step forward / back |
| A, D | Sidestep |
| Q / ←, E / → | Turn 90° |
| Space / Enter | Interact with what's in front of you |
| M | Map |

Touch buttons below the screen do the same on phones.

## Project layout

```
index.html, style.css     page shell and touch pad
src/main.js               wires everything together, game loop
src/engine/               generic, game-independent
  palette.js              32-color palette + shading table
  framebuffer.js          indexed 320x200 buffer, present to canvas
  raycaster.js            walls, floor/ceiling, billboard sprites, fog of war
  font.js                 3x5 pixel font
  sprite.js               ASCII sprites, frames, animation, recolor/mirror/flip,
                          ASCII export (spriteToAscii)
  texgen.js               seeded procedural textures (bricks, rock, planks, overlays)
src/game/                 this game's content and rules
  assets.js               all textures and sprites
  map.js                  level data and Level class
  player.js               grid movement and animation
  hud.js                  message log, minimap, map overlay
  input.js                keyboard and touch
  system-ai.js            the System AI's lines
editor.html, editor.css   sprite editor page
src/editor/               the sprite editor (doc model, code export/import,
                          raycaster preview, UI)
tools/build.mjs           bundle game and editor into single HTML files
tools/check-map.mjs       map validation (reachability)
tools/test-sprites.mjs    sprite engine and editor round-trip tests
```

The design document (GDD) lives in the Claude project and is the source of truth
for design decisions.
