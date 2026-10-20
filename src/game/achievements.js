// Achievements, as in the books: the System notices what a crawler does
// and hands out titles, sometimes with a loot box, sometimes with nothing
// but an opinion. Pure game logic, no drawing.
//
// The game reports what happens with note(kind, data); the tracker keeps
// counters for the run and returns the achievements that just unlocked.
// Everything a test looks at lives in the counters `s`.
//
// reward: { box: tier } (a loot box, opened in a Safe Room),
//         { item: id } (straight into the inventory), or null.
// secret: hidden in the list until unlocked (shown as ???).

export const ACHIEVEMENTS = [
  // ---------------------------------------------------------- getting going
  {
    id: 'tookAWalk', name: 'Took a Walk', reward: { item: 'trophy' },
    hint: 'Walk twelve squares.',
    text: 'You moved twelve squares under your own power. The bar was on the floor and you stepped over it. Here is a trophy. Everybody gets one.',
    test: (s) => s.steps >= 12,
  },
  {
    id: 'firstBlood', name: 'First Blood', reward: { box: 'bronze' },
    hint: 'Kill something.',
    text: 'You killed something! It was probably minding its own business. The Syndicate approves.',
    test: (s) => s.kills >= 1,
  },
  {
    id: 'treasureGoblin', name: 'Treasure Goblin', reward: null,
    hint: 'Open a chest.',
    text: 'You opened a box that was not a loot box. Adorable. Reward: the contents of the box. Obviously.',
    test: (s) => s.chests >= 1,
  },
  {
    id: 'highlightReel', name: 'Highlight Reel', reward: null,
    hint: 'Land a critical hit.',
    text: 'A critical hit! The replay is already looping in eleven star systems. Reward: exposure.',
    test: (s) => s.crits >= 1,
  },
  // ---------------------------------------------------------- fighting
  {
    id: 'pestControl', name: 'Pest Control', reward: { box: 'silver' },
    hint: 'Kill 10 rats.',
    text: 'Ten rats. The rodent union has filed a complaint. Borant has filed it under "content".',
    test: (s) => (s.kill_rat || 0) >= 10,
  },
  {
    id: 'ratRace', name: 'Rat Race Champion', reward: { box: 'gold' },
    hint: 'Kill 15 rats.',
    text: 'Fifteen rats! There is now a betting market on how many more you will step on. You are the favorite.',
    test: (s) => (s.kill_rat || 0) >= 15,
  },
  {
    id: 'montage', name: 'Montage Material', reward: { box: 'bronze' },
    hint: 'Land 5 critical hits.',
    text: 'Five crits. The editors are cutting them to music. Something with a saxophone.',
    test: (s) => s.crits >= 5,
  },
  // ---------------------------------------------------------- the M8 crowd
  {
    id: 'featuredGuest', name: 'Featured Guest Removed', reward: { box: 'silver' },
    hint: 'Defeat a miniboss.',
    text: 'You beat a miniboss. Its agent is furious. Its replacement is already in makeup.',
    test: (s) => s.minibosses >= 1,
  },
  {
    id: 'hostileTakeover', name: 'Hostile Takeover', reward: { box: 'gold' },
    hint: 'Defeat three minibosses in one season.',
    text: 'Three minibosses in one season. The guest booking department has unionized against you.',
    test: (s) => s.minibosses >= 3,
  },
  {
    id: 'regimeChange', name: 'Regime Change', reward: { box: 'bronze' },
    hint: 'Take out a leader and watch the rest run.',
    text: 'You removed the boss and the whole crew quit on the spot. Borant\'s HR department would like to study you.',
    test: (s) => s.routs >= 1,
  },
  {
    id: 'friendlyFire', name: 'Friendly Fire', reward: { box: 'bronze' }, secret: true,
    hint: 'Let an explosion do your job.',
    text: 'The goblins brought the bomb, the goblins lit the bomb, the goblins caught the bomb. You get the credit. That is showbusiness.',
    test: (s) => s.blastKills >= 1,
  },
  {
    id: 'chinaShop', name: 'Bull in a China Shop', reward: { box: 'bronze' },
    hint: 'Smash 5 lawn gnomes.',
    text: 'Five lawn gnomes shattered. Property values in the dungeon have never been higher.',
    test: (s) => (s.fam_gnome || 0) >= 5,
  },
  {
    id: 'goblinTax', name: 'Goblin Tax Audit', reward: { box: 'silver' },
    hint: 'Kill 8 goblins.',
    text: 'Eight goblins. Their kingdom was one room. Now it is one room with fewer goblins in it.',
    test: (s) => (s.fam_goblin || 0) >= 8,
  },
  {
    id: 'unplugged', name: 'Unplugged', reward: { box: 'bronze' },
    hint: 'Destroy a Feral Robo-Vac.',
    text: 'The robo-vac is down. It mapped the whole floor and never once found the stairs. Relatable.',
    test: (s) => (s.kill_roboVac || 0) >= 1,
  },
  {
    id: 'aisleThree', name: 'Clean-Up on Aisle Three', reward: { box: 'bronze' },
    hint: 'Kill a mimic.',
    text: 'You killed a shopping cart. It had teeth, so it counts. The other carts are watching you now.',
    test: (s) => (s.fam_mimic || 0) >= 1,
  },
  {
    id: 'shoplifted', name: 'Shoplifted', reward: null, secret: true,
    hint: 'Get robbed.',
    text: 'A raccoon took your money. In front of an audience of millions. Several of them sent it tips.',
    test: (s) => s.stolen >= 1,
  },
  {
    id: 'returnToSender', name: 'Return to Sender', reward: { box: 'bronze' }, secret: true,
    hint: 'Get your stolen gold back.',
    text: 'You chased down a thief and took your gold back. With interest. The interest was its life.',
    test: (s) => s.goldBack >= 1,
  },
  {
    id: 'spitTake', name: 'Spit Take', reward: null, secret: true,
    hint: 'Catch a llama\'s opinion with your face.',
    text: 'The llama has shared its feelings with you, directly, via your eyes. Our viewers voted it Moment of the Week.',
    test: (s) => s.spat >= 1,
  },
  {
    id: 'fists', name: 'Fists of Mild Fury', reward: { box: 'bronze' },
    hint: 'Kill 5 enemies with your bare hands.',
    text: 'Five kills without a weapon. Your knuckles would like a word. Several words, actually.',
    test: (s) => s.unarmedKills >= 5,
  },
  {
    id: 'byAThread', name: 'By a Thread', reward: { box: 'silver' },
    hint: 'Win a fight with 2 HP or less.',
    text: 'You won with your life hanging by a thread. A thin one. Dental floss, really. The viewers screamed.',
    test: (s) => s.byAThread >= 1,
  },
  {
    id: 'notAScratch', name: 'Not a Scratch', reward: { box: 'silver' },
    hint: 'Beat a pack of two or more without getting hurt.',
    text: 'A whole pack, and not one scratch. Borant\'s insurance department is deeply suspicious.',
    test: (s) => s.flawless >= 1,
  },
  {
    id: 'strategicWithdrawal', name: 'Strategic Withdrawal', reward: { box: 'bronze' },
    hint: 'Run away three times.',
    text: 'Three successful retreats. The chat has started calling you "Legs". It is not a compliment.',
    test: (s) => s.flees >= 3,
  },
  {
    id: 'belowTheBelt', name: 'Below the Belt', reward: { box: 'bronze' }, secret: true,
    hint: 'Use Dirty Kick 10 times.',
    text: 'Ten Dirty Kicks. The Syndicate\'s rules committee met about you. They decided it was funny.',
    test: (s) => (s.skill_dirtyKick || 0) >= 10,
  },
  // ---------------------------------------------------------- growing
  {
    id: 'hangOfIt', name: 'Getting the Hang of It', reward: { box: 'bronze' },
    hint: 'Reach level 3.',
    text: 'Level 3. You are now officially more dangerous than a large rat. Slightly.',
    test: (s) => s.level >= 3,
  },
  {
    id: 'middleManagement', name: 'Middle Management', reward: { box: 'silver' },
    hint: 'Reach level 5.',
    text: 'Level 5. In Borant terms you have reached middle management: still expendable, but with a nicer chair.',
    test: (s) => s.level >= 5,
  },
  {
    id: 'adequate', name: 'Practice Makes Adequate', reward: { box: 'bronze' },
    hint: 'Get a skill or spell to level 3.',
    text: 'A skill at level 3. Not perfect. Not good. Adequate. Borant\'s favorite word.',
    test: (s) => s.maxSkill >= 3,
  },
  {
    id: 'nightSchool', name: 'Night School', reward: { box: 'bronze' },
    hint: 'Learn something from a book or potion.',
    text: 'You learned something from a book! The System is moved. Not to tears. To a slightly different spot.',
    test: (s) => s.learned >= 1,
  },
  {
    id: 'dressed', name: 'Dressed for the Apocalypse', reward: { box: 'silver' },
    hint: 'Wear something in 6 equipment slots.',
    text: 'Six slots filled. You look like a garage sale that learned to walk. Very on brand.',
    test: (s) => s.slotsFilled >= 6,
  },
  // ---------------------------------------------------------- floors
  {
    id: 'floorOne', name: 'Floor One Survivor', reward: { box: 'gold' },
    hint: 'Survive the first floor.',
    text: 'You survived the first floor. Most of humanity did not. Try not to let it go to your head.',
    test: (s) => s.floors >= 1,
  },
  {
    id: 'stillBreathing', name: 'Still Breathing', reward: { box: 'gold' },
    hint: 'Survive the second floor.',
    text: 'Two floors down. The producers have moved you from "filler" to "recurring guest".',
    test: (s) => s.floors >= 2,
  },
  {
    id: 'fashionablyLate', name: 'Fashionably Late', reward: { box: 'silver' },
    hint: 'Take the stairs in the last tenth of the countdown.',
    text: 'Down the stairs with the ceiling already falling. The demolition crew is furious. The viewers are not.',
    test: (s) => s.lateStairs >= 1,
  },
  {
    id: 'hallMonitor', name: 'Hall Monitor', reward: { box: 'silver' }, secret: true,
    hint: 'Leave a floor without killing anything on it.',
    text: 'A whole floor and no kills. The rats are confused. The Syndicate is bored. A sponsor called it "refreshing".',
    test: (s) => s.peacefulFloors >= 1,
  },
  {
    id: 'seasonSurvivor', name: 'Season Survivor', reward: { box: 'platinum' },
    hint: 'Survive the whole season.',
    text: 'You survived the season. The Syndicate is already writing next season\'s rules with you in mind.',
    test: (s) => s.won >= 1,
  },
  {
    id: 'exterminator', name: 'Exterminator', reward: { box: 'legendary' }, secret: true,
    hint: 'Survive the season and leave nothing alive behind.',
    text: 'Every floor emptied, every enemy dead, and you walked out. The galaxy is impressed. The rats are extinct.',
    test: (s) => s.won >= 1 && s.cleanFloors >= 3,
  },
  {
    id: 'objector', name: 'Conscientious Objector', reward: { box: 'celestial' }, secret: true,
    hint: 'Survive the season without killing anything.',
    text: 'A whole season and not one kill. Nobody has ever done this. Nobody wanted to. The Syndicate is lost for words, and they are never lost for words.',
    test: (s) => s.won >= 1 && s.kills === 0,
  },
  // ---------------------------------------------------------- the show
  {
    id: 'goingViral', name: 'Going Viral', reward: { box: 'bronze' },
    hint: 'Reach 100 viewers.',
    text: 'One hundred viewers! Your mother would be proud, if she were still around. Statistically she is not.',
    test: (s) => s.viewers >= 100,
  },
  {
    id: 'primeTime', name: 'Prime Time', reward: { box: 'silver' },
    hint: 'Reach 1,000 viewers.',
    text: 'A thousand viewers. Borant has moved your feed off the bargain channel. Congratulations on your promotion to entertainment.',
    test: (s) => s.viewers >= 1000,
  },
  {
    id: 'galacticSensation', name: 'Galactic Sensation', reward: { box: 'gold' },
    hint: 'Reach 10,000 viewers.',
    text: 'Ten thousand viewers. Somewhere a species you have never heard of is naming its children after you. Badly.',
    test: (s) => s.viewers >= 10000,
  },
  {
    id: 'soldOut', name: 'Sold Out', reward: null,
    hint: 'Get a sponsor.',
    text: 'You have a sponsor! Your soul now has a logo on it. Small print available on request. Request denied.',
    test: (s) => s.sponsors >= 1,
  },
  {
    id: 'brandAmbassador', name: 'Brand Ambassador', reward: { item: 'lanyard' },
    hint: 'Get three sponsors.',
    text: 'Three sponsors. You are now legally a billboard. Borant has issued you the matching lanyard. Wear it with shame.',
    test: (s) => s.sponsors >= 3,
  },
  // ---------------------------------------------------------- safe rooms
  {
    id: 'safeAndSound', name: 'Safe and Sound', reward: null,
    hint: 'Find a Safe Room.',
    text: 'You found a Safe Room. Your guide is thrilled. Your guide is never thrilled. That was sarcasm. You will get used to it.',
    test: (s) => s.safeVisits >= 1,
  },
  {
    id: 'napTime', name: 'Professional Napper', reward: { box: 'bronze' },
    hint: 'Rest in three Safe Rooms.',
    text: 'Three naps on three floors. The apocalypse is happening and you are well rested. The viewers respect it.',
    test: (s) => s.rests >= 3,
  },
  {
    id: 'noRest', name: 'Sleep Is for the Weak', reward: null, secret: true,
    hint: 'Leave a floor without visiting its Safe Room.',
    text: 'You skipped the Safe Room. Your guide noticed. Your guide is pretending not to be hurt.',
    test: (s) => s.skippedSafe >= 1,
  },
  {
    id: 'unboxing', name: 'Unboxing Video', reward: { box: 'bronze' },
    hint: 'Open five loot boxes.',
    text: 'Five boxes opened on camera. The unboxing community has accepted you as one of its own. Here is a box. Yes, really.',
    test: (s) => s.boxesOpened >= 5,
  },
  // ---------------------------------------------------------- nonsense
  {
    id: 'wallEnthusiast', name: 'Wall Enthusiast', reward: null, secret: true,
    hint: 'Walk into walls. A lot.',
    text: 'Ten collisions with masonry. Borant has registered you as a crash test dummy. Reward: a concussion, already applied.',
    test: (s) => s.bumps >= 10,
  },
  {
    id: 'hypochondriac', name: 'Hypochondriac', reward: { item: 'mushroom' }, secret: true,
    hint: 'Try to heal at full health three times.',
    text: 'Three attempts to heal a body that is not hurt. The System prescribes one Suspicious Mushroom. Do not ask what it treats.',
    test: (s) => s.wastedHeals >= 3,
  },
  {
    id: 'patience', name: 'Patience Is a Virtue', reward: null, secret: true,
    hint: 'Rattle the sealed stairs three times.',
    text: 'You keep trying the sealed stairs. They are sealed. That is what sealed means. Reward: a vocabulary lesson.',
    test: (s) => s.lockedStairs >= 3,
  },
  {
    id: 'fashionVictim', name: 'Fashion Victim', reward: { box: 'bronze' }, secret: true,
    hint: 'Wear a traffic cone and a bathrobe at the same time.',
    text: 'A traffic cone and a hotel bathrobe. Together. Our stylists have resigned, but the look is trending.',
    test: (s) => s.fashion >= 1,
  },
  {
    id: 'tailCollector', name: 'Tail Collector', reward: null, secret: true,
    hint: 'Carry 10 rat tails.',
    text: 'You are carrying ten rat tails. On purpose. The System would like to recommend a therapist. There are none left.',
    test: (s) => s.tails >= 10,
  },
  {
    id: 'litterbug', name: 'Litterbug', reward: null, secret: true,
    hint: 'Drop something on the floor.',
    text: 'You dropped something on the dungeon floor. Somewhere a janitor goblin sighs.',
    test: (s) => s.drops >= 1,
  },
  {
    id: 'fanService', name: 'Fan Service', reward: { box: 'bronze' }, secret: true,
    hint: 'Wave at nobody five times.',
    text: 'You keep waving at empty air. The viewers started waving back. Now there is a fan club. You did this.',
    test: (s) => s.waves >= 5,
  },
  {
    id: 'barrelConnoisseur', name: 'Barrel Connoisseur', reward: null, secret: true,
    hint: 'Inspect barrels five times.',
    text: 'Five barrels inspected. They all contained barrel. You knew that. You checked anyway.',
    test: (s) => s.barrels >= 5,
  },
];

export const ACHIEVEMENT = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

// Events that simply count up a counter.
const COUNT = {
  crit: 'crits', flee: 'flees', chest: 'chests', learn: 'learned', won: 'won',
  bump: 'bumps', wastedHeal: 'wastedHeals', lockedStairs: 'lockedStairs',
  rout: 'routs', stolen: 'stolen', goldBack: 'goldBack', spat: 'spat',
  drop: 'drops', wave: 'waves', barrel: 'barrels', safeRoom: 'safeVisits', rest: 'rests', boxOpened: 'boxesOpened', sponsor: 'sponsors',
};

// How the other events change the counters. Unknown kinds are ignored
// (other systems, like the viewers, listen to more events than this one).
const RULES = {
  step: (s, d) => { s.steps = d.steps; },
  kill: (s, d) => {
    s.kills++;
    s.floorKills++;
    s[`kill_${d.type}`] = (s[`kill_${d.type}`] || 0) + 1;
    if (d.family) s[`fam_${d.family}`] = (s[`fam_${d.family}`] || 0) + 1;
    if (d.rank === 'miniboss') s.minibosses++;
    if (d.blast) s.blastKills++;
    if (d.unarmed) s.unarmedKills++;
  },
  skill: (s, d) => { s[`skill_${d.id}`] = (s[`skill_${d.id}`] || 0) + 1; },
  fightWon: (s, d) => {
    if (d.hp <= 2) s.byAThread++;
    if (d.foes >= 2 && !d.hurt) s.flawless++;
  },
  level: (s, d) => { s.level = Math.max(s.level, d.level); },
  skillUp: (s, d) => { s.maxSkill = Math.max(s.maxSkill, d.level); },
  gear: (s, d) => {
    const worn = Object.values(d.equip).filter(Boolean).map((e) => e.id);
    s.slotsFilled = Math.max(s.slotsFilled, worn.length);
    if (worn.includes('cone') && worn.includes('bathrobe')) s.fashion++;
  },
  bag: (s, d) => { s.tails = Math.max(s.tails, d.tails); },
  viewers: (s, d) => { s.viewers = Math.max(s.viewers, d.count); },
  floorDone: (s, d) => {
    s.floors++;
    if (d.turnsShare <= 0.1) s.lateStairs++;
    if (s.floorKills === 0) s.peacefulFloors++;
    if (d.allDead) s.cleanFloors++;
    if (d.safeVisited === false) s.skippedSafe++;
    s.floorKills = 0;
  },
};

export class Achievements {
  constructor() {
    this.s = {
      steps: 0, kills: 0, floorKills: 0, unarmedKills: 0, crits: 0, flees: 0,
      byAThread: 0, flawless: 0, level: 1, maxSkill: 1, learned: 0, slotsFilled: 0,
      fashion: 0, tails: 0, floors: 0, lateStairs: 0, peacefulFloors: 0, cleanFloors: 0,
      minibosses: 0, routs: 0, blastKills: 0, stolen: 0, goldBack: 0, spat: 0,
      won: 0, viewers: 0, safeVisits: 0, rests: 0, skippedSafe: 0, boxesOpened: 0, sponsors: 0, bumps: 0, wastedHeals: 0, lockedStairs: 0, drops: 0, waves: 0, barrels: 0, chests: 0,
    };
    this.unlocked = [];  // ids in the order they were earned
    this.boxes = [];     // unopened loot boxes: { tier, sponsored, from }
  }

  has(id) { return this.unlocked.includes(id); }

  // Reports something that happened. Returns the achievements it unlocked.
  note(kind, data = {}) {
    if (COUNT[kind]) this.s[COUNT[kind]]++;
    else if (RULES[kind]) RULES[kind](this.s, data);
    else return [];
    const got = [];
    for (const a of ACHIEVEMENTS) {
      if (this.has(a.id) || !a.test(this.s)) continue;
      this.unlocked.push(a.id);
      if (a.reward && a.reward.box) this.boxes.push({ tier: a.reward.box, sponsored: false, from: a.name });
      got.push(a);
    }
    return got;
  }
}
