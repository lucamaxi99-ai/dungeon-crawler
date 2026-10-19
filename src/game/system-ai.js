// The System AI: narrator, host and occasional tormentor.
// All lines are original; tone inspired by the books.

export const LINES = {
  welcome: [
    'Welcome, Crawler, to the first floor of the World Dungeon. Borant Corporation thanks you for your involuntary participation.',
    'Controls: W/S move, A/D sidestep, Q/E turn, SPACE interact or attack, I inventory, C stats, M map, G broadcast quality.',
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
  enemyNotice: [
    'A {name} has noticed you. It looks hungry. You look like food.',
    'Heads up, Crawler: a {name} is coming your way. The viewers are thrilled.',
    'A {name} spots you. Somewhere, a betting pool opens.',
  ],
  combatStartEnemy: [
    'A {name} attacks! Combat mode engaged. Please keep your limbs inside the dungeon at all times.',
    'The {name} wants a word. The word is "bite". Fight!',
    'Ambush! The {name} has been waiting all season for this.',
  ],
  combatStartCrawler: [
    'You start a fight with a {name}. Bold. The viewers approve of violence.',
    'Crawler-initiated combat! The {name} did not see that coming. Neither did we.',
  ],
  crit: [
    'CRITICAL HIT! That one is going in the highlight reel.',
    'Critical! Somewhere a sponsor just reached for their wallet.',
  ],
  kill: [
    'Kill confirmed. The audience applauds politely.',
    'It is dead. You are not. That is the whole game, really.',
    'Another one for the kill counter. Borant thanks you for your service.',
  ],
  defend: [
    'You raise your guard. It is mostly elbows.',
  ],
  fled: [
    'You run away! Discretion is the better part of not dying.',
    'Tactical retreat logged. The chat calls it "running". The chat is right.',
  ],
  fleeFail: [
    'You try to flee. Your legs file a formal objection.',
    'No escape. The {name} is faster than your excuses.',
  ],
  combatWon: [
    'Victory! The System has moved anything of value into your inventory. Sorting fee waived.',
    'Fight over. You win. Please collect your trauma at the exit.',
  ],
  ratCorpse: [
    'A dead rat. It has stopped being a problem and started being a smell.',
    'The rat is deceased. The System has already taken everything worth taking.',
  ],
  death: [
    'Crawler down! The viewers would like a moment of silence. The moment is over.',
    'And that is how you die. Ratings spiked. Borant thanks you for your sacrifice.',
    'Deceased. Somewhere a sponsor is quietly peeling your name off a banner.',
  ],
  restart: [
    'A new Crawler enters the dungeon. The last one is already a meme. Try not to become a sequel.',
    'New run, new floors, new victim. Borant reminds you that every Crawler is unique and replaceable.',
  ],
  victory: [
    'Against all odds and most betting pools, the Crawler survived the season. The Syndicate demands a rematch.',
  ],
  enemyGiveUp: [
    'The {name} stops at the edge of its territory and squeaks something rude.',
    'The {name} will not follow you past its nest. It is a rat of principles.',
  ],
  enemyLostTrail: [
    'The {name} has lost your trail. It will tell its friends about you.',
    'You shook off the {name}. The viewers wanted more blood, but fine.',
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
  levelUp: [
    'LEVEL UP! You are now level {n}. {p} attribute points are burning a hole in your stats sheet. Press C.',
    'Level {n}! The System grudgingly admits you are improving. Spend your {p} points with C before you die with them.',
    'Ding! Level {n}. The viewers love a montage. You have {p} points to spend. C, Crawler. C.',
  ],
  pointsSpent: [
    'Points allocated. You feel exactly as strong as a spreadsheet says you are.',
    'All points spent. Borant reminds you that refunds are not a thing.',
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
    'The stairwell. Press SPACE again to descend. There is no coming back up. There never is.',
  ],
  stairsLocked: [
    'The stairwell is sealed. Borant does not air speedruns. It opens in {n} turns.',
    'Sealed. The sponsors paid for at least {n} more turns of you wandering around.',
  ],
  stairsOpen: [
    'Attention, Crawler: the stairwell on this floor is now open. Use it before the floor uses you.',
  ],
  countdownWarn: [
    '{n} turns until this floor collapses. No pressure. Well, structural pressure.',
    'Reminder: {n} turns left on this floor. The demolition crew is already stretching.',
  ],
  collapseSoon: [
    '{n} turns left! The ceiling is making noises ceilings should not make. Find the stairs!',
  ],
  collapse: [
    'Time is up. The floor collapses, and you with it. Borant thanks you for staying until the very end.',
    'The floor folds in on itself like a cheap lawn chair. You were on it. Ratings: spectacular.',
  ],
  descend: [
    'Down you go. The floor above will be recycled into content shortly.',
    'Descending. Mind the step. Mind all of them, really.',
  ],
  floorArrive: [
    'Welcome to Floor {n}, Crawler. Bigger, darker and statistically worse. The viewers are thrilled.',
    'Floor {n}. The rats down here have heard about you. They are not impressed.',
  ],
  finalFloor: [
    'Floor {n}, the season finale. Find the stairs and the Syndicate might even let you live. Might.',
  ],
  finalStairs: [
    'This is the last stairwell of the season. Press SPACE again to step through and end the broadcast.',
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
