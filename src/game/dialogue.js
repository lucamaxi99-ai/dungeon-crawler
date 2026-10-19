// Conversations (M7): talk topics with a speaker, a tree of nodes and the
// crawler's replies. The engine is pure; the Safe Room screen draws it.
//
// A cast member has topics. A topic opens at a node:
//   { id, label, start, when?(ctx), repeat? }
// A node is what the speaker says plus the crawler's possible replies:
//   { say, replies: [{ text, to?, if?(ctx), set?, unlock? }] }
// `say` may be an array (one is picked, in turn) and may use {placeholders}
// from ctx.vars. A reply without `to` ends the topic. `set` raises a story
// flag in the profile, `unlock` unlocks something (jobs, later more).
// The profile remembers every node heard, across reruns (GDD 4.9).
//
// ctx: { profile, rerun, deaths, vars }

export const CAST = {
  ozzle: {
    name: 'Ozzle',
    topics: [
      { id: 'who', label: 'WHO ARE YOU?', start: 'who1' },
      { id: 'place', label: 'WHAT IS THIS PLACE?', start: 'place1' },
      { id: 'encore', label: 'BORANT ENCORE?', start: 'encore1', when: (c) => c.rerun > 0 },
      { id: 'tally', label: 'THE TALLY MARKS', start: 'tally1', when: (c) => c.deaths > 0 },
      { id: 'contract', label: 'YOUR CONTRACT', start: 'contract1', when: (c) => c.profile.flag('heardCancel') || c.rerun >= 3 },
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
