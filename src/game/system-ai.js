// The System AI: narrator, host and occasional tormentor.
// All lines are original; tone inspired by the books.

export const LINES = {
  welcome: [
    'Welcome, Crawler, to the first floor of the World Dungeon. Borant Corporation thanks you for your involuntary participation.',
    'Controls: W/S move, A/D sidestep, Q/E turn, SPACE interact, I inventory, M map, G broadcast quality.',
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
  equip: [
    'Equipped. You look marginally less doomed.',
    'Fashion choice logged. The viewers have opinions.',
    'Equipped. Our stylists have been notified and are crying.',
  ],
  unequip: [
    'Removed. Back into the void it goes.',
    'Unequipped. The System will hold it for you. Probably.',
  ],
  use: [
    'Consumed. Your body has been informed.',
    'Down the hatch. The audience winces on your behalf.',
  ],
  healed: [
    'Healed. The audience is relieved. Mostly the ones who bet on you.',
    'Your wounds close. The scars stay, for the highlight reel.',
    'Restorative. Do not read the ingredients.',
  ],
  healedFull: [
    'Fully healed. Enjoy it. It never lasts.',
    'Back to full health, Crawler. The dungeon thanks you for the fresh canvas.',
  ],
  healFull: [
    'You are already at full health. The System refuses to waste good product on you.',
  ],
  regenFull: [
    'Your body has quietly fixed itself. Biology: still the best sponsor.',
  ],
  look: [
    'You stare at it. It stares back. Nobody wins.',
    'Junk. Valuable junk, perhaps, once someone invents a shop.',
  ],
  drop: [
    'Dropped. Littering is a crime on the surface. Down here it is content.',
    'You leave it in a bag on the floor. A rat is already interested.',
  ],
  pickup: [
    'Picked up. Finders keepers, says the System, which keeps everything.',
    'Back in your inventory. The rat is devastated.',
  ],
  bagHere: [
    'A bag lies here. SPACE picks it up.',
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
