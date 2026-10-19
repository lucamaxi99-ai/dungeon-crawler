# Notes for Claude

- Design source of truth: `GDD.md` in the claude.ai project "DnD/DCC". Record new decisions there (decision log), not only in chat.
- Talk to the user in German. All in-game text is English.
- Setting: the world of *Dungeon Crawler Carl*, with an original crawler and story. References to the books are welcome (Borant, the Syndicate, viewers, achievements, loot box tiers). Do not draw characters from the books as sprites and do not quote passages from the books.
- Work in small playable steps, one feature per chat.

## Workflow (do this without being asked)

- **Start of every session**, before touching code (also when an older chat is resumed): pull the latest `main`, read `GDD.md` and this file. Tell the user in one sentence whether anything changed since the session's last known state.
- **After every finished, working step**: run `npm run check` and `npm run build`, then commit and push without asking. Never push something broken.
- **Before every push**, fetch first. If changes from another chat conflict, do not overwrite them; tell the user briefly what collides.
- **After every push**, update the playable artifact.
- **New design decisions** go into the GDD decision log after a short confirmation from the user.

## Missing prerequisites

- **Small missing asset** (sprite, texture, text): point it out and ask whether to create it right here or in the matching milestone chat.
- **Missing system from another milestone** (e.g. items from M3 for a merchant in M7): name it and ask whether to switch there first or build a simple placeholder that gets replaced later.
- Mark placeholders with `// TODO(M#)` in code and list them in the GDD under open questions.

## Code rules

- `src/engine/` stays game-independent. Game content and rules go in `src/game/`.
- Every pixel is a palette index. The palette has 64 colors (`palette.js`); indices 0-31 are the original ones and never change. Never write RGB values outside `palette.js`; use the named colors in `C`.
- Light and darkness go through the lit shade tables (`buildLitTables` in `lighting.js`) and the per-cell `LightMap`, never through alpha or RGB math. Light colors are `TINTS` in `src/game/lights.js`; new light colors are new rows there. (`SHADE` in `palette.js` is only left for the editor's onion skin.)
- Screen: the 3D view has its own buffer (960x420, stepping down to 640x280 / 320x140 via `AutoResolution`). The HUD is drawn in HUD pixels (320 wide: panel 320x60, overlay 320x140) and scaled 3x. Never draw HUD elements into the view buffer, and never assume the view's resolution.
- Textures are 64x64, procedural and seeded (`src/game/textures.js`), so they are reproducible. Walls are `WALL` ids in the map; floor and ceiling (`FLAT` ids) and ambient light are set per map area.
- Sprites are 64 px per wall height (`unit: 64`, the default). Two ways to make them:
  - hand drawn ASCII rasters via `defineSprite` (one frame) or `defineFrames` (several, same size); `.` is transparent. Good for items.
  - painted with the `Painter` (`src/engine/paint.js`) from 3D-ish primitives, using the materials in `src/game/materials.js`; game objects live in `src/game/objects.js`.
  - `glow` marks colors that ignore light (flames, neon, runes, eyes).
- Creatures are painted in poses (`idle0`, `idle1`, `lunge`, `flinch`) in `src/game/creatures.js`, facing left, and registered in `CREATURES` (`assets.js`), which adds the right-facing set and the corpse. Enemy stats live in `ENEMY_TYPES` (`enemies.js`), combat rules in `combat.js` (pure, tested in `tools/test-combat.mjs`).
- Enemy designs that are not in play yet live in the bestiary: `src/game/bestiary.js` (names, System AI texts, painters) with the painters in `src/game/bestiary/` (front views in all four poses). Gear from the world above is welcome (saucepan helmets, traffic cones, STOP signs). Flat polygons use matte materials (`tin`, `sign`, `safety`): a glossy flat face turns into one big highlight. `tools/test-bestiary.mjs` checks poses, sizes and cut-offs. The showroom shows them in a gallery.
- Every entry in `SPRITES` (`src/game/assets.js`) has an `anim` (`animation(frames, { frameMs, mode })`); pick frames with `frameAt`. Variants come from `recolor`/`rampMap`, `mirror`, `flip` and work on sprites, frame arrays and animations alike. Objects that shine set `light` (a preset from `lights.js`); wall decorations set `wall: true`.
- Hand-drawn sprites are made in the editor (`editor.html`, code in `src/editor/`) and pasted into `src/game/assets.js`. The editor may import from `src/game/` for previews; the game never imports from `src/editor/`.
- `src/proto/` is the graphics showroom (`proto.html`). The game never imports from it.
- Story layer (M7): every run is a rerun on Borant Encore. What survives a death lives in the profile (`profile.js`, localStorage): runs, deaths, deepest floor, causes, heard dialogue nodes, story flags, unlocks. Conversations are data in `dialogue.js` (topics, nodes, replies; tested for reachability and that every text fits). Former jobs and their unlocks are in `jobs.js`, the intake form in `creation-ui.js`. Thrum the merchant is `merchant.js` (painted like Ozzle, HUD scale), prices and stock in `shop.js`. Save and quit (`save.js`) only stores what the floor's seed can't rebuild; resuming uses the save up. Tests: `tools/test-story.mjs`.
- URL parameters for testing: `?seed=123`, `?floor=test`, `?res=640`, `?fresh=1` (forget profile and save), `?intake=skip` (skip the intake form).
- Placeholders for systems of later milestones are marked `// TODO(M#)`.
- No runtime dependencies. esbuild is only for `npm run build`.

## Before committing

1. `npm run check` (map validation, sprite engine and editor round-trip tests, engine tests, bestiary, show, story)
2. `npm run build` (must succeed)
3. Render headless and look at a screenshot when anything visual changed. `window.game` exposes level, player, log, state, light, stats (fps, render ms), crawler, combat, dead, `engage(enemy, initiator)`, `restart()` and `onAction` for scripted tests; `game.setResolution(0 | 1 | 2 | 'auto')` or `?res=640` fixes the view resolution. `window.forge` does the same for the editor (doc, ui, actions).
