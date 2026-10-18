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
  chestOpen: [
    'The chest creaks open. The viewers lean in.',
    'You open the chest. A sponsor somewhere pays for the privilege of watching.',
    'Chest opened. The System has helpfully moved its contents into your inventory before you could touch anything.',
  ],
  chestEmpty: [
    'The chest is empty. You emptied it. Staring will not refill it.',
    'Still empty. Borant does not do refills.',
  ],
  lootCommon: [
    'Mostly garbage. But it is YOUR garbage now.',
    'Our analysts rate this haul as "technically loot".',
  ],
  lootGood: [
    'Ooh, something shiny. The chat is mildly interested.',
    'Not bad, Crawler. Do not let it go to your head. Your head is fragile.',
  ],
  lootGreat: [
    'Look at that! Somebody in accounting is going to be very upset.',
  ],
  lootLegendary: [
    'LEGENDARY! The audience gasps. Mostly because they bet against you.',
  ],
  inventoryHint: [
    'Press I to inspect your inventory. The System keeps it somewhere you cannot see. Do not ask where.',
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
