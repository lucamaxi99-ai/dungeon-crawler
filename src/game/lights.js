// Light colors and light presets for the lit renderer.
// TINT values index the rows of the lit shade tables (buildLitTables), so a
// light's color never leaves the palette.

export const TINT = { NEUTRAL: 0, TORCH: 1, COLD: 2, SEWER: 3, NEON: 4, RUNE: 5, SMOG: 6, FLUOR: 7, SODIUM: 8 };
export const TINTS = [
  [1, 1, 1],          // neutral
  [1.2, 0.95, 0.72],  // torch fire
  [0.62, 0.82, 1.25], // cold blue
  [0.8, 1.15, 0.72],  // sewer green
  [1.22, 0.62, 1.15], // neon pink
  [0.85, 0.72, 1.3],  // rune violet
  [1.1, 0.9, 0.78],   // city smog at dusk
  [0.92, 1.08, 1.05], // fluorescent tubes
  [1.3, 0.86, 0.5],   // sodium street lamps
];

// Names usable in level data ("torch", "cold", ...).
export const TINT_BY_NAME = Object.fromEntries(Object.entries(TINT).map(([k, v]) => [k.toLowerCase(), v]));

// What an object or wall decoration emits. radius/intensity in world units.
export const LIGHT_PRESETS = {
  brazier: { radius: 5, intensity: 1.05, tint: TINT.TORCH, flicker: 0.35 },
  coldBrazier: { radius: 4.5, intensity: 0.9, tint: TINT.COLD, flicker: 0.2 },
  torch: { radius: 4.2, intensity: 0.75, tint: TINT.TORCH, flicker: 0.3 },
  coldTorch: { radius: 3.8, intensity: 0.7, tint: TINT.COLD, flicker: 0.15 },
  sponsor: { radius: 3.4, intensity: 0.7, tint: TINT.NEON, flicker: 0.12 },
  // City (story floor 3)
  burnBarrel: { radius: 4.6, intensity: 0.95, tint: TINT.TORCH, flicker: 0.4 },
  streetLamp: { radius: 4.6, intensity: 0.8, tint: TINT.SODIUM, flicker: 0.05 },
  fluoTube: { radius: 4.2, intensity: 0.75, tint: TINT.FLUOR, flicker: 0.18 },
  trafficLight: { radius: 2.6, intensity: 0.45, tint: TINT.TORCH, flicker: 0.5 },
};

// The player's lantern: a small warm light that follows the camera.
export const LANTERN = { radius: 3.6, intensity: 0.55, tint: TINT.TORCH };
