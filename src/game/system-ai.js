// The System AI: narrator, host and occasional tormentor.
// All lines are original; tone inspired by the books.

export const LINES = {
  welcome: [
    'Welcome, Crawler, to the first floor of the World Dungeon. Borant Corporation thanks you for your involuntary participation.',
    'Controls: W/S move, A/D sidestep, Q/E turn, SPACE interact, M map, G broadcast quality.',
  ],
  bumpWall: [
    'That is a wall. Walls are load-bearing. Please stop licking them.',
    'Impressive. You have defeated nothing.',
    'Our viewers have noted your fondness for masonry.',
    'The wall wins on points.',
    'Crawler, the dungeon extends in more than one direction.',
  ],
  bumpObject: [
    'Something is in the way. That something is not impressed.',
  ],
  chest: [
    'A chest! Opening chests requires the Inventory System, which management has not finished installing. Please hold.',
    'The chest remains closed. Somewhere, a Syndicate accountant smiles.',
  ],
  barrel: [
    'A barrel. It contains: barrel. Smashing comes in a future patch.',
  ],
  brazier: [
    'A brazier. It is hot. This information is complimentary.',
  ],
  coldBrazier: [
    'A brazier burning blue. The flame is sponsored. The warmth was cut from the budget.',
    'Cold fire. Borant calls it "atmospheric". Accounting calls it "cheaper".',
  ],
  bones: [
    'The remains of a previous Crawler. Viewer rating: two stars. Would not watch again.',
    'You step on someone who did not read the tutorial.',
  ],
  stairs: [
    'The stairwell is sealed. Stairs open when the floor timer allows it. The floor timer has not been invented yet.',
  ],
  poster: [
    'A notice from Borant Corporation: "Your suffering is our content. Smile, you are on screen."',
  ],
  nothing: [
    'You wave at the empty air. Twelve viewers wave back.',
    'There is nothing here. That will not last.',
  ],
  firstSteps: [
    'Achievement unlocked: Took A Walk! Reward: none. Loot boxes are not yet in stock.',
  ],
};

const counters = {};

// Cycles through lines in order so repeats are rare.
export function line(topic) {
  const list = LINES[topic];
  if (!list) return '';
  const i = counters[topic] = ((counters[topic] ?? -1) + 1) % list.length;
  return list[i];
}
