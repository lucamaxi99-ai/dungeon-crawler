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
- Every pixel is a palette index. Never write RGB values outside `palette.js`; use the named colors in `C`.
- Darkening goes through `SHADE` (palette-internal), never through alpha or RGB math.
- Sprites are ASCII rasters via `defineSprite` (one frame) or `defineFrames` (several, same size); `.` is transparent; `glow` marks colors that ignore distance shading.
- Every entry in `SPRITES` has an `anim` (`animation(frames, { frameMs, mode })`); pick frames with `frameAt`. Variants come from `recolor`/`rampMap`, `mirror`, `flip` and work on sprites, frame arrays and animations alike.
- New sprites are drawn in the editor (`editor.html`, code in `src/editor/`) and pasted into `assets.js`. The editor may import from `src/game/` for previews; the game never imports from `src/editor/`.
- Textures are procedural and seeded, so they are reproducible.
- No runtime dependencies. esbuild is only for `npm run build`.

## Before committing

1. `npm run check` (map validation, sprite engine and editor round-trip tests)
2. `npm run build` (must succeed)
3. Render headless and look at a screenshot when anything visual changed. `window.game` exposes level, player, log, state and `onAction` for scripted tests; `window.forge` does the same for the editor (doc, ui, actions).
