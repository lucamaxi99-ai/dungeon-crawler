# Dungeon Crawler (working title)

A retro first-person dungeon crawler for the browser, in the spirit of early-90s
RPGs like *The Elder Scrolls: Arena*. Grid movement, turn-based combat
and lots of loot. A fan project set in the world of *Dungeon Crawler Carl*,
with its own crawler and story.

All graphics are code: a fixed 64-color palette, procedural 64x64 textures,
painted and ASCII-defined 64 px sprites, colored light per cell with dithering,
rendered by a small raycaster into indexed framebuffers. The 3D view runs at
960x420 and steps down to 640x280 or 320x140 when the frame rate drops; the HUD
is coarse pixel art scaled 3x, like Daggerfall.

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

### Graphics showroom

`proto.html` (or `dist/proto.html`) shows a showroom floor in the old classic
look and in the current look, with every switch on its own and the frame time
measured live. The exhibits are example sprites (items, monsters, loot boxes, a
portrait), rated by how well Claude can produce them alone.

### Controls

| Key | Action |
|---|---|
| W / ↑, S / ↓ | Step forward / back |
| A, D | Sidestep |
| Q / ←, E / → | Turn 90° |
| Space / Enter | Interact with what's in front of you (attacks an enemy) |
| I / Tab | Inventory (X / Del drops, Esc closes) |
| M | Map |
| G | Picture quality: AUTO, 960, 640, 320 |

Touch buttons below the screen do the same on phones.

**Combat** opens its own screen when an enemy steps next to you or you attack
one. ↑/↓ pick an action (Attack, Defend, Item, Flee), Space confirms, ←/→ pick
the target when there are several, Esc goes back from the item list. Tapping
the menu works too. Enemies move one cell for each of your actions and show up
on the map as red dots once you can see them.

## Project layout

```
index.html, style.css     page shell and touch pad
src/main.js               wires everything together, game loop, screen layout
src/engine/               generic, game-independent
  palette.js              64-color palette (0-31 = original colors)
  framebuffer.js          indexed buffer, present (scaled) to a canvas
  raycaster-lit.js        walls, floor/ceiling per cell, sprites, light, dithering,
                          corner shadows, fog of war
  lighting.js             lit shade tables, light map with shadows and flicker
  resolution.js           automatic view resolution from frame times
  paint.js                Painter: sprites from 3D-ish primitives, lit and shaded
  font.js                 3x5 pixel font
  sprite.js               ASCII sprites, frames, animation, recolor/mirror/flip,
                          ASCII export (spriteToAscii)
  texgen.js               seeded noise, Voronoi and classic texture helpers
src/game/                 this game's content and rules
  assets.js               sprite registry (SPRITES), texture exports
  textures.js             64x64 wall, floor and ceiling textures
  objects.js              painted objects: chest, barrel, braziers, bones, torch
  creatures.js            painted creatures in poses (giant rat)
  materials.js            paint materials and the procedural flame
  lights.js               light colors, light presets, the lantern
  map.js                  level data (areas, torches) and Level class
  player.js               grid movement and animation
  crawler.js              the crawler's stats: HP, ATK, DEF, SPD, regeneration
  enemies.js              enemy types, turn-based movement (notice, chase, roam)
  combat.js               combat rules: initiative, attack, defend, item, flee
  combat-ui.js            combat screen (lit stage) and action menu
  gameover-ui.js          game over screen
  items.js, loot.js       item catalogue, loot tables
  inventory.js            bag, equipment slots, gold
  inventory-ui.js, icons.js  inventory screen and 12x12 item icons
  hud.js                  3x pixel HUD: status, log, minimap, overlays
  input.js                keyboard and touch
  system-ai.js            the System AI's lines
src/proto/                graphics showroom (proto.html)
editor.html, editor.css   sprite editor page
src/editor/               the sprite editor (doc model, code export/import,
                          lit preview, UI)
tools/build.mjs           bundle game, editor and showroom into single HTML files
tools/check-map.mjs       map validation (reachability)
tools/test-sprites.mjs    sprite engine and editor round-trip tests
tools/test-engine.mjs     engine tests (automatic resolution)
tools/test-items.mjs      items, loot tables, inventory
tools/test-combat.mjs     crawler stats, combat rules and balance, enemy movement
```

The design document (GDD) lives in the Claude project and is the source of truth
for design decisions.
