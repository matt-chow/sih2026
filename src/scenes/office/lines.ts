// Every word said or shown in the office. Edit freely; `npm run build` catches typos in who/emo.
import type { Line } from '../../ui';

export const DESKS: Record<'A' | 'B' | 'C', Line[]> = {
  A: [
    { who: 'hensen', emo: 'neutral', text: 'Marketing desk. 312 stickers that say "RGB IS A LIFESTYLE."' },
    { who: 'hensen', emo: 'smug', text: 'Suspicious only in how correct they are.' },
  ],
  B: [
    { who: 'hensen', emo: 'neutral', text: 'A GPU duct-taped to a toaster. Sticky note: "IT RUNS CRYSIS NOW."' },
    { who: 'hensen', emo: 'smug', text: 'Not a crime. Promote this man.' },
  ],
  C: [
    { who: 'hensen', emo: 'shocked', text: '"TOTALLY NOT STOLEN CHIP BLUEPRINTS — deliver to RIVAL CORP." Signed: KEVIN.' },
    { who: 'hensen', emo: 'shocked', text: 'KEVIN?!' },
  ],
};

export const SPY: Line[] = [
  { who: 'kevin', emo: 'panic', text: 'M-Mr. Juang! Those are just my… vacation photos!' },
  { who: 'kevin', emo: 'panic', text: 'Of a chip. In Bermuda. OKAY BYE!!' },
];

export const ALICE: Line[] = [
  { who: 'alice', emo: 'smile', text: 'Mr. Juang! I heard about Kevin… you must be so stressed.' },
  { who: 'hensen', emo: 'love', text: 'W-who are you? My heart is overclocking.' },
  { who: 'alice', emo: 'wink', text: 'Just Alice. From Accounting. I would NEVER betray you~' },
  { who: 'alice', emo: 'smile', text: "Let's settle this… the old-fashioned way!" },
];

export const OBJECTIVE = {
  start: 'Someone is leaking secrets. Search the desks.',
  nothing: 'Nothing. Keep searching.',
  lastDesk: "One desk left. It's always the last desk.",
  chase: 'CATCH KEVIN!',
  escaped: 'Kevin escaped…',
  who: "…who's that?",
};

export const DOOR_LOCKED = 'No time for hallways!';

/** Pop-up text over heads. */
export const FLOAT = {
  kevinSpotted: '!!',
  kevinTrips: '*TRIPS*',
  hensenMisses: ['Got y—!', 'Almost!', 'KEVIN!!'],
};

/** Toasts are HTML: <b> is the title, <span> the subtitle. */
export const TOAST = {
  escaped: '<b>KEVIN ESCAPED</b><span>with <code>chip_blueprints_FINAL_v2.zip</code></span>',
  jacket: '<i>🏆</i><b>LEATHER JACKET UNLOCKED</b><span>You were already wearing it.</span>',
};
