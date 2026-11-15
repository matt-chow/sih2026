// Every word said or shown in the office. Edit freely; `npm run build` catches typos in who/emo.
import type { Line } from '../../ui';

export const PHONE = {
  title: 'Phone', open: 'P', openLabel: 'Open phone (P)', close: 'Close · P', back: 'Home',
  company: 'Njidion', stock: 'NJDN · Simulated', chart: 'Njidion share price history',
  from: 'Office of the President',
  subject: 'RE: RE: URGENT / national security? / pls open plzplz',
  preview: 'bestie, your office has spies tryna steal confidential chip designs.',
  notification: 'MAIL · NOW', unread: '1 new message',
  apps: ['Messages', 'Camera', 'Maps', 'Settings'],
  read: 'Open email →', investigate: 'Investigate',
  email: `FROM: Office of the President
SUBJECT: RE: RE: URGENT / national security? / pls open plzplz

bestie,

your office has spies tryna steal confidential chip designs. investigate quietly.

(your company is lowk carrying the economy so lock in.)

regards,
president

Sent from my RTX 6070`,
};

/** A: Kevin (CTO), B: Brad (CFO), C: Alice (the spy). */
export const DESKS: Record<'A' | 'B' | 'C', Line[]> = {
  A: [
    { who: 'hensen', emo: 'determined', text: 'Kevin. Are you a Chinese spy?' },
    { who: 'kevin', emo: 'nervous', text: "Senator, I'm Singaporean." },
  ],
  B: [
    { who: 'hensen', emo: 'shocked', pose: 'shocked', text: 'Why did you send $800M to China?' },
    { who: 'cfo', emo: 'hype', text: "Portfolio diversification, king. We're bullish on the Chinese market." },
  ],
  C: [
    { who: 'hensen', emo: 'love', text: "Alice, what's all this?" },
    { who: 'alice', emo: 'wink', text: 'Just a little surprise for you <3' },
    { who: 'hensen', emo: 'love', text: "She's so supportive of my work." },
  ],
};

/** Jessica: an ordinary coworker who has noticed everything and reported nothing. Brad chimes in from his desk. */
export const JESSICA: Line[] = [
  { who: 'jessica', emo: 'neutral', text: "Morning, Mr. Juang. Alice has been photocopying the GPU schematics since 6 a.m." },
  { who: 'hensen', emo: 'smug', text: 'Photocopying my genius. She is a fan.' },
  { who: 'jessica', emo: 'neutral', text: "Also, Brad's been staring at the stock market for six hours." },
  { who: 'cfo', emo: 'hype', text: "It's called technical analysis." },
  { who: 'jessica', emo: 'friendly', text: "You're looking at a screenshot." },
  { who: 'cfo', emo: 'hype', text: 'The market is psychological.' },
  { who: 'jessica', emo: 'friendly', text: "…Sure. I'll be by the water cooler if you need a witness." },
];

export const ALL_SEARCHED: Line[] = [
  { who: 'hensen', emo: 'determined', text: 'Lawyers say I get ONE interrogation. Choose wisely, chat.' },
  { who: 'hensen', emo: 'smug', text: 'EVERYONE. BOARDROOM. NOW.' },
];

/** Brad's second monitor. */
export const TICKER = ['$DOGEGPU', '▼ 40%'];

/** Alice's monitor. Every other computer shows the company logo. */
export const ALICE_MONITOR = 'OPERATION STEAL BLACKWELL';

export const DESK_LABEL = { A: "Search Kevin's desk (CTO)", B: "Search Brad's desk (CFO)", C: "Search Alice's desk (Assistant)" };

export const OBJECTIVE = {
  start: 'Someone is leaking secrets. Inspect the desks.',
  progress: (n: number) => `Search the suspects' desks (${n}/3)`,
  boardroom: 'Go to the BOARDROOM (door on the back wall)',
};

export const BOARDROOM_SIGN = 'BOARDROOM';
export const DOOR_LOCKED = 'No time for hallways!';
export const BOARDROOM_LOCKED = 'Search all 3 desks first. Detective rules.';

/** Toasts are HTML: <b> is the title, <span> the subtitle. */
export const TOAST = {
  mission: "<i>🕵️</i><b>SEARCH 3 DESKS</b><span>Walk to a green marker, press E</span>",
};
