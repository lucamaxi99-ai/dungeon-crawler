// The bestiary: enemy designs that exist as art, front view in all four
// poses (idle0, idle1, lunge, flinch), with the System AI's introduction.
// Enemies in play (stats, behaviour) are ENEMY_TYPES in enemies.js; an
// entry here becomes playable once it gets stats there and a side view.
//
// origin: 'classic' (dungeon staple), 'book' (nod to the books), 'own'.

import { POSES } from './creatures.js';
import { paintRatFront } from './creatures.js';
import { paintSlimeFront, paintSpiderFront, paintSkeletonFront } from './bestiary/classics.js';
import { paintGoblinFront } from './bestiary/goblins.js';
import {
  paintLlamaFront, paintVendingFront, paintRoboVacFront, paintCartFront,
  paintTubeFront, paintRaccoonFront, paintGnomeFront,
} from './bestiary/modern.js';

const goblin = (kit) => (pose, scale) => paintGoblinFront(kit, pose, scale);

export const BESTIARY = [
  {
    id: 'rat', name: 'Giant Rat', family: 'Vermin', origin: 'classic', inGame: true,
    paint: paintRatFront, frameMs: 260,
    blurb: 'The dungeon\'s welcoming committee. It has rabies, fleas and a better health plan than you.',
  },
  {
    id: 'slime', name: 'Lost & Found Slime', family: 'Ooze', origin: 'classic',
    paint: paintSlimeFront, frameMs: 180,
    blurb: 'It has eaten three phones, a sneaker and somebody\'s car keys. One of the phones is still getting notifications.',
  },
  {
    id: 'spider', name: 'Festive Tunnel Spider', family: 'Vermin', origin: 'classic',
    paint: paintSpiderFront, frameMs: 320,
    blurb: 'Somebody\'s holiday lights survived the end of the world. They are now load-bearing for something with eight legs and a grudge.',
  },
  {
    id: 'skeleton', name: 'Skeletal Road Crew', family: 'Undead', origin: 'own',
    paint: paintSkeletonFront, frameMs: 700,
    blurb: 'Still on shift. Still holding the same piece of rebar. Has not taken a break since before your species learned to stand.',
  },
  {
    id: 'goblinGrunt', name: 'Goblin Pot-Head', family: 'Goblin', origin: 'book',
    paint: goblin('grunt'), frameMs: 380,
    blurb: 'Standard goblin infantry. The saucepan is both helmet and dinner plans. You are the dinner plans.',
  },
  {
    id: 'goblinSapper', name: 'Goblin Sapper', family: 'Goblin', origin: 'book',
    paint: goblin('sapper'), frameMs: 300,
    blurb: 'Carries enough explosives to level a strip mall and has the impulse control of a toddler with a lighter. Keep your distance, Crawler.',
  },
  {
    id: 'goblinShaman', name: 'Goblin Hedge-Shaman', family: 'Goblin', origin: 'own',
    paint: goblin('shaman'), frameMs: 420,
    blurb: 'Wears a colander to block mind-control rays. Nobody has ever wanted to control that mind.',
  },
  {
    id: 'goblinBoss', name: 'Goblin Warboss', family: 'Goblin', origin: 'own',
    paint: goblin('boss'), frameMs: 450,
    blurb: 'Crowned itself with a traffic cone and declared a kingdom. The kingdom is this room. The stop sign is not a suggestion.',
  },
  {
    id: 'badLlama', name: 'Bad Llama', family: 'Beast', origin: 'book',
    paint: paintLlamaFront, frameMs: 520,
    blurb: 'Petting-zoo graduate. Spits acid, holds grudges. Do not make eye contact. You just made eye contact.',
  },
  {
    id: 'vending', name: 'Vendetta Machine', family: 'Mimic', origin: 'own',
    paint: paintVendingFront, frameMs: 500,
    blurb: 'Exact change only. It has never once given anybody their change, and it is not going to start with you.',
  },
  {
    id: 'roboVac', name: 'Feral Robo-Vac', family: 'Appliance', origin: 'own',
    paint: paintRoboVacFront, frameMs: 120,
    blurb: 'It mapped this whole floor while you slept. Someone taped a steak knife to it. Nobody is asking who.',
  },
  {
    id: 'cartMimic', name: 'Cart Mimic', family: 'Mimic', origin: 'own',
    paint: paintCartFront, frameMs: 400,
    blurb: 'One wheel squeaks. One wheel wobbles. One wheel pulls left. The fourth wheel has never been found, and neither have its last three owners.',
  },
  {
    id: 'tubeMan', name: 'Wacky Waving Wailer', family: 'Construct', origin: 'own',
    paint: paintTubeFront, frameMs: 260,
    blurb: 'Formerly employed by a used car dealership. Kept inflated by pure spite and a blower nobody can find.',
  },
  {
    id: 'raccoon', name: 'Trash Panda Bandit', family: 'Beast', origin: 'own',
    paint: paintRaccoonFront, frameMs: 360,
    blurb: 'Mask: natural. Crimes: numerous. It went through your inventory while you were reading this.',
  },
  {
    id: 'gnome', name: 'Lawn Gnome Militia', family: 'Construct', origin: 'own',
    paint: paintGnomeFront, frameMs: 480,
    blurb: 'Ceramic, glazed and furious about property values. They never come alone, and they never come quietly.',
  },
];

// Paints all poses of an entry: { idle0, idle1, lunge, flinch }.
export function paintPoses(entry, scale = 1) {
  return Object.fromEntries(POSES.map((pose) => [pose, entry.paint(pose, scale)]));
}
