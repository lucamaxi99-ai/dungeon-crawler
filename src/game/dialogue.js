// Conversations (M7): talk topics with a speaker, a tree of nodes and the
// crawler's replies. The engine is pure; the Safe Room screen draws it.
//
// A cast member has topics. A topic opens at a node:
//   { id, label, start, when?(ctx), repeat? }
// A node is what the speaker says plus the crawler's possible replies:
//   { say, replies: [{ text, to?, if?(ctx), set?, unlock?, give? }] }
// `say` may be an array (one is picked, in turn) and may use {placeholders}
// from ctx.vars. A reply without `to` ends the topic. `set` raises a story
// flag in the profile, `unlock` unlocks something (jobs, later more),
// `give` hands an item from the crawler's bag to the speaker (ctx.give).
// The profile remembers every node heard, across reruns (GDD 4.9).
//
// ctx: { profile, rerun, deaths, vars, page (found a contract page this run),
//        hasPage (carries page 1), give(id) }

export const CAST = {
  ozzle: {
    name: 'Ozzle',
    topics: [
      { id: 'who', label: 'WHO ARE YOU?', start: 'who1' },
      { id: 'place', label: 'WHAT IS THIS PLACE?', start: 'place1' },
      { id: 'encore', label: 'BORANT ENCORE?', start: 'encore1', when: (c) => c.rerun > 0 },
      { id: 'tally', label: 'THE TALLY MARKS', start: 'tally1', when: (c) => c.deaths > 0 },
      { id: 'contract', label: 'YOUR CONTRACT', start: 'contract1', when: (c) => c.profile.flag('heardCancel') || c.rerun >= 3 },
      // Page 1 of his contract (GDD 2.3): handed over, or sent to him by the
      // lost and found after the crawler died with it. Then it hangs on the wall.
      { id: 'page', label: 'THE YELLOW PAPER', start: 'page1', when: (c) => c.hasPage },
      { id: 'pageLost', label: 'THE YELLOW PAPER', start: 'pageL1', when: (c) => !c.hasPage && c.profile.flag('contractPage1') && !c.profile.flag('page1Given') },
      { id: 'pinned', label: 'THE PINNED PAGE', start: 'pin1', when: (c) => !c.hasPage && c.profile.flag('page1Given') },
      { id: 'advice', label: 'ANY ADVICE?', start: 'advice', repeat: true },
    ],
    // What he says when the crawler asks to talk, and when it is done.
    open: [
      'What do you want to know? Keep it short. I\'m on break. I\'m always on break.',
      'Talk. I\'ll listen. I\'m contractually obliged to listen. Not to care, though.',
    ],
    close: [
      'Riveting. Anything else, or can I go back to staring at the wall?',
      'Good chat. Let\'s never do it again. Unless you want to.',
    ],
    nodes: {
      who1: {
        say: 'Ozzle. Game guide, retired. Then un-retired by Borant, for 300 more seasons. I didn\'t sign anything. Apparently my tentacle did.',
        replies: [
          { text: 'Your tentacle signed a contract?', to: 'who2' },
          { text: '300 seasons? How long is a season?', to: 'who3' },
          { text: 'Nice to meet you, Ozzle.', to: 'who4' },
        ],
      },
      who2: {
        say: 'I have eight of them. One has poor judgement. We don\'t talk anymore.',
        replies: [{ text: 'Fair enough.' }],
      },
      who3: {
        say: 'Long enough that I stopped counting and started drinking coffee. The coffee is also a contract violation.',
        replies: [{ text: 'Right.' }],
      },
      who4: {
        say: 'Is it? We\'ll see. Most crawlers I meet, I only meet once.',
        replies: [
          { text: 'You\'ve met me before, haven\'t you?', to: 'who5', if: (c) => c.rerun > 0 },
          { text: 'Cheery.' },
        ],
      },
      who5: {
        say: 'Many times. You were nicer the first time. Or meaner. They blur.',
        replies: [{ text: 'Thanks, I think.' }],
      },

      place1: {
        say: 'A Safe Room. Borant\'s one concession to labor law. Nothing can hurt you in here. Except the coffee. And the truth.',
        replies: [
          { text: 'Why does time stop in here?', to: 'place2' },
          { text: 'Who pays for all of this?', to: 'place3' },
          { text: 'Thanks.' },
        ],
      },
      place2: {
        say: 'Ratings. Nobody wants to watch you sit in a bar, so the feed cuts away and the floor waits for you. Television magic.',
        replies: [{ text: 'Television magic. Sure.' }],
      },
      place3: {
        say: 'Sponsors. The Syndicate. Viewers. And you, indirectly, by dying in interesting ways. Please keep doing that. But slower.',
        replies: [{ text: 'I\'ll try to die slower.' }],
      },

      encore1: {
        say: 'The rerun channel. Cheap crawlers get restored from a soul backup and dropped back in. Saves Borant on casting. You\'re a cost-saving measure.',
        replies: [
          { text: 'So I can\'t really die?', to: 'encore2' },
          { text: 'Does anyone actually watch reruns?', to: 'encore3' },
        ],
      },
      encore2: {
        say: 'Your body can. Your soul just goes back on the shelf. Shelves are not forever, though. Channels get cancelled. Then the shelf gets cleaned.',
        replies: [
          { text: 'Cancelled? What happens then?', to: 'encore4' },
          { text: 'I\'d rather not think about that.' },
        ],
      },
      encore3: {
        say: 'Twelve people, on a good day. One of them is a bot. One of them is me.',
        replies: [{ text: 'Then I\'d better be worth watching.' }],
      },
      encore4: {
        say: 'Then the backups get deleted. All of them. Don\'t look at me like that. I don\'t run the channel. Somebody in production does. Somebody nervous.',
        replies: [{ text: 'Somebody nervous. Great.', set: 'heardCancel' }],
      },

      tally1: {
        say: '{t}. One mark for every time you died. I keep the count. Somebody should. Borant only counts the ratings.',
        replies: [
          { text: 'That\'s... oddly kind.', to: 'tally2' },
          { text: 'Could you maybe stop?', to: 'tally3' },
        ],
      },
      tally2: {
        say: 'Don\'t tell anyone. I have a reputation for not caring. I worked hard on it.',
        replies: [{ text: 'Your secret is safe.' }],
      },
      tally3: {
        say: 'Could you maybe stop dying?',
        replies: [{ text: 'Point taken.' }],
      },

      contract1: {
        say: 'My contract? 300 seasons of service. Non-negotiable. Except... there\'s a clause. Clause 18. Nobody ever reads clause 18.',
        replies: [
          { text: 'What does clause 18 say?', to: 'contract2' },
          { text: 'I\'m not here to read contracts.' },
        ],
      },
      contract2: {
        say: 'If a crawler in my care survives a whole season, all eighteen floors, my service ends. Borant put it in because it never happens.',
        replies: [
          { text: 'Then I\'ll do it.', to: 'contract3', set: 'contractKnown' },
          { text: 'Eighteen? We barely get three floors.', to: 'contract4', set: 'contractKnown' },
        ],
      },
      contract3: {
        say: 'Sure you will. They all say that. Then a rat happens.',
        replies: [{ text: 'Not this time.' }],
      },
      contract4: {
        say: 'Borant is still building the rest. Union dispute with the construction goblins. Give it time. I\'ve got 300 seasons.',
        replies: [{ text: 'I\'ll wait.' }],
      },

      page1: {
        say: 'Hold on. Yellow paper, Borant seal, my tentacle print at the bottom. That\'s my contract. Page one. Where did you get that?',
        replies: [{ text: 'Under a parking robot\'s wiper.', to: 'page2' }],
      },
      page2: {
        say: 'Of course it was. Borant cut my contract into six pages and handed them to the guest stars. As props. My life is set dressing.',
        replies: [
          { text: 'Why cut it up?', to: 'page3' },
          { text: 'Here. It\'s yours.', to: 'page4', give: 'contractPage1', set: 'page1Given' },
        ],
      },
      page3: {
        say: 'So nobody holds clause 18 and the signatures at the same time. One page per story floor. Whoever has all six has my release.',
        replies: [{ text: 'Then take this one.', to: 'page4', give: 'contractPage1', set: 'page1Given' }],
      },
      page4: {
        say: 'I\'ll pin it up next to the tally marks, where I can see it. One down, five to go. I\'m not excited. This is my excited face.',
        replies: [{ text: 'Five to go.' }],
      },
      pageL1: {
        say: 'You found a page of my contract last time. Then you died with it in your pocket. The System\'s lost and found sent it to me. Postage: one crawler.',
        replies: [{ text: 'So you have it?', to: 'pageL2', set: 'page1Given' }],
      },
      pageL2: {
        say: 'On the wall, next to the tally marks. One down, five to go. Next time hand it over before you die. Saves postage.',
        replies: [{ text: 'Noted.' }],
      },
      pin1: {
        say: 'Page one of six. Clause 1: three hundred seasons of service. The other clauses are on the other pages. Clause 18 is on page six. Borant has a sense of humour.',
        replies: [
          { text: 'Where are the other pages?', to: 'pin2' },
          { text: 'Five more to find.' },
        ],
      },
      pin2: {
        say: 'With the other guest stars, on the other story floors. Every third floor, if Borant ever finishes building them. Bring a big pocket.',
        replies: [{ text: 'I\'ll find them.' }],
      },

      advice: {
        say: [
          'Spend your points in here. Out there they just sit in your head, feeling sad.',
          'Open your loot boxes before you die. The System does not do refunds.',
          'Rats are territorial. Leave their room and they get bored. Like me.',
          'The stairs only open after a while. Don\'t stand in front of them crying. Explore.',
          'Dirty Kick stuns. Stunned things don\'t bite. That\'s the whole lesson.',
          'Defending halves the damage. Cowardice, but efficient cowardice.',
        ],
        replies: [{ text: 'Thanks, Ozzle.' }],
      },
    },
  },
};

// Quill Dobrane, junior producer of Borant Encore, calls the Safe Room
// terminal (GDD 2.3). His topics are calls the game puts through, not
// something the crawler picks: 'intro' (the first call ever, on story floor
// 3), 'again' (story floor 3 in a later rerun), 'win' (after the boss).
CAST.quill = {
  name: 'Quill Dobrane',
  topics: [
    { id: 'intro', label: 'INCOMING CALL', start: 'q1' },
    { id: 'again', label: 'INCOMING CALL', start: 'qa1' },
    { id: 'win', label: 'INCOMING CALL', start: 'qw1' },
  ],
  nodes: {
    q1: {
      say: 'Is this thing on? Crawler! Hi! Quill Dobrane, junior producer, Borant Encore. Big fan. Well. Fan. I watch you for work.',
      replies: [
        { text: 'You produce my show?', to: 'q2' },
        { text: 'How are you on this terminal?', to: 'q2b' },
      ],
    },
    q2: {
      say: 'Every rerun of it! Twelve viewers. One is a bot, one is the octopus behind you, and one is my mother.',
      replies: [{ text: 'Impressive. What do you want?', to: 'q3' }],
    },
    q2b: {
      say: 'Every Safe Room has a Borant terminal. Mostly for ads. Today it is for me. I have four minutes of satellite time, so listen.',
      replies: [{ text: 'Make it quick.', to: 'q3' }],
    },
    q3: {
      say: 'Upstairs wants to cancel Encore. Cancelled channel means deleted soul backups. Yours included. Also, frankly, my career.',
      replies: [
        { text: 'Deleted? For good?', to: 'q4', set: 'heardCancel' },
        { text: 'Your career is not my problem.', to: 'q4b', set: 'heardCancel' },
      ],
    },
    q4: {
      say: 'Permadeath for real. Very off-brand. So we need ratings. Big ones. Luckily I booked a guest star for this floor.',
      replies: [{ text: 'A guest star?', to: 'q5' }],
    },
    q4b: {
      say: 'It is if I get fired before I can stop the cancellation. So we need ratings. I booked a guest star for this floor.',
      replies: [{ text: 'Who?', to: 'q5' }],
    },
    q5: {
      say: 'Officer Tow-Matic! Parking enforcement. Got it from the city for free, it was impounded. It is in the parking lot by the subway.',
      replies: [
        { text: 'A parking robot is your big star?', to: 'q6' },
        { text: 'Fine. I will scrap it.', to: 'q7' },
      ],
    },
    q6: {
      say: 'It has a tow hook, a ticket printer and no off switch. The focus groups loved it. Production note: the subway stays shut until it is scrap.',
      replies: [{ text: 'Of course it does.', to: 'q7' }],
    },
    q7: {
      say: 'Take it apart on camera and we might get renewed. Make it loud! Make it ugly! Producer out.',
      replies: [{ text: 'He hung up.', set: 'quillMet' }],
    },

    qa1: {
      say: [
        'Crawler! You are back! Well, a version of you. Tow-Matic is still booked. The fans love a rematch.',
        'Rerun {r}, Crawler. Same guest star, same parking lot. The network calls it a franchise.',
      ],
      replies: [
        { text: 'Any tips this time?', to: 'qa2' },
        { text: 'On it.' },
      ],
    },
    qa2: {
      say: 'It raises that hook a turn before it swings. Brace for it. And it cannot fine you if you are broke. Shop at Sal\'s first. You did not hear that from me.',
      replies: [{ text: 'Thanks, Quill.' }],
    },

    qw1: {
      say: 'THAT WAS INCREDIBLE! The numbers moved, Crawler! Up! Do you know how rare up is? I have to call my mother. She saw it. She was one of the numbers.',
      replies: [
        { text: 'So the channel is safe?', to: 'qw2' },
        { text: 'The robot dropped a yellow paper.', to: 'qw3', if: (c) => c.page },
      ],
    },
    qw2: {
      say: 'Safe is a strong word. Renewed for one more floor. Keep going, keep it loud. I will call when I have the next guest. Producer out.',
      replies: [{ text: 'He hung up again.', set: 'quillWin' }],
    },
    qw3: {
      say: 'Probably a parking ticket. Give it to the octopus, he collects paperwork. Anyway: renewed for one more floor! Producer out.',
      replies: [{ text: 'He hung up again.', set: 'quillWin' }],
    },
  },
};

const picks = {};
// The text of a node: one of several in turn, with {placeholders} filled.
export function sayText(node, vars = {}, key = '') {
  let s = node.say;
  if (Array.isArray(s)) {
    const i = picks[key] = ((picks[key] ?? -1) + 1) % s.length;
    s = s[i];
  }
  return s.replace(/\{(\w)\}/g, (_, k) => vars[k] ?? '');
}

// Topics the crawler can bring up right now, with whether they are new.
export function topicsFor(who, ctx) {
  return CAST[who].topics
    .filter((t) => !t.when || t.when(ctx))
    .map((t) => ({ ...t, fresh: !t.repeat && !ctx.profile.hasSeen(`${who}:${t.start}`) }));
}

// One conversation on one topic.
export class Conversation {
  constructor(who, topic, ctx) {
    this.who = who;
    this.cast = CAST[who];
    this.ctx = ctx;
    this.topic = topic;
    this.goto(topic.start);
  }

  goto(id) {
    const node = this.cast.nodes[id];
    if (!node) throw new Error(`dialogue: no node ${id}`);
    this.id = id;
    this.node = node;
    this.text = sayText(node, this.ctx.vars, `${this.who}:${id}`);
    this.ctx.profile.see(`${this.who}:${id}`);
  }

  // The replies on offer at this node.
  get replies() {
    return this.node.replies.filter((r) => !r.if || r.if(this.ctx));
  }

  // The crawler answers. Returns true while the conversation goes on.
  choose(i) {
    const r = this.replies[i];
    if (!r) return true;
    if (r.set) this.ctx.profile.setFlag(r.set);
    if (r.unlock) this.ctx.profile.unlock(r.unlock);
    if (r.give) this.ctx.give?.(r.give);
    if (!r.to) return false;
    this.goto(r.to);
    return true;
  }
}

// Every node a topic can reach (for the tests and for "fully heard").
export function reachable(who, start) {
  const nodes = CAST[who].nodes, seen = new Set(), todo = [start];
  while (todo.length) {
    const id = todo.pop();
    if (seen.has(id) || !nodes[id]) continue;
    seen.add(id);
    for (const r of nodes[id].replies) if (r.to) todo.push(r.to);
  }
  return seen;
}
