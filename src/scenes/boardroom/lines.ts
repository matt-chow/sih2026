// Every word said or shown in the boardroom. Edit freely; `npm run build` catches typos in who/emo.
import type { Line } from '../../ui';

export type Suspect = 'kevin' | 'cfo' | 'alice';

export const INTRO: Line[] = [
  { who: 'hensen', emo: 'smug', text: 'Thank you all for attending my interrogation keynote.' },
  { who: 'kevin', emo: 'nervous', text: 'Is this about the GPUs or the Valorant tourney on the company card?' },
  { who: 'cfo', emo: 'hype', text: "If this is a layoff I'm shorting us. Respectfully." },
  { who: 'alice', emo: 'smile', text: "I'm just happy to be in the room where the secrets are~" },
  { who: 'hensen', emo: 'smug', text: 'One of you is the impostor. ඞ' },
];

export const ASK: Record<Suspect, Line[]> = {
  kevin: [
    { who: 'hensen', emo: 'neutral', text: 'Are you stealing my GPU technology?' },
    { who: 'kevin', emo: 'nervous', text: 'Bro, I only steal kills in Valorant.' },
    { who: 'hensen', emo: 'smug', text: 'A true gamer.' },
  ],
  cfo: [
    { who: 'hensen', emo: 'neutral', text: 'Why are you transferring money overseas?' },
    { who: 'cfo', emo: 'hype', text: "It's called a diversified portfolio, unc." },
    { who: 'cfo', emo: 'hype', text: 'Export controls are more of a vibe than a law. Probably.' },
    { who: 'hensen', emo: 'smug', text: 'This guy gets it.' },
  ],
  alice: [
    { who: 'hensen', emo: 'neutral', text: 'Are you secretly working for a competitor?' },
    { who: 'alice', emo: 'smile', text: 'Nooo, I just want to know everything about your architecture.' },
    { who: 'alice', emo: 'wink', text: 'Especially the parts under NDA. For my scrapbook.' },
    { who: 'hensen', emo: 'love', text: 'She really understands my CUDA cores.' },
  ],
};

export const CAUGHT: Line[] = [
  { who: 'hensen', emo: 'shocked', pose: 'shocked', text: "ALICE. YOU'VE BEEN CAUGHT IN 4K." },
  { who: 'alice', emo: 'wink', text: 'GG. It was never about the GPUs. It was about your heart.' },
  { who: 'hensen', emo: 'love', text: 'Wait... you loved me?' },
  { who: 'alice', emo: 'villain', pose: 'villain', text: 'Also I stole your entire GPU architecture.' },
];

export const FIRED: Record<'kevin' | 'cfo', Line[]> = {
  kevin: [
    { who: 'hensen', emo: 'shocked', pose: 'shocked', text: "KEVIN. YOU'RE FIRED." },
    { who: 'kevin', emo: 'panic', pose: 'panic', text: 'BRO WHAT 💀' },
    { who: 'alice', emo: 'villain', pose: 'villain', text: 'EZ CLAP.' },
    { who: 'hensen', emo: 'smug', text: 'Case closed. Nothing else can possibly go wrong.' },
  ],
  cfo: [
    { who: 'hensen', emo: 'shocked', pose: 'shocked', text: "BRAD. YOU'RE FIRED." },
    { who: 'cfo', emo: 'panic', pose: 'panic', text: 'BRO WHAT 💀' },
    { who: 'alice', emo: 'villain', pose: 'villain', text: 'EZ CLAP.' },
    { who: 'hensen', emo: 'smug', text: 'Case closed. Nothing else can possibly go wrong.' },
  ],
};

/** The ending card's subtitle. */
export const VERDICT: Record<Suspect, string> = {
  alice: 'You caught Alice in 4K. She left with the GPUs anyway. And your heart.',
  kevin: 'You fired Kevin (innocent). Alice escaped with Blackwell. Minecraft shaders will never recover.',
  cfo: 'You fired Brad (innocent). Alice escaped with Blackwell. $DOGEGPU is down 100%.',
};

export const LABEL = {
  ask: { kevin: 'Interrogate Kevin', cfo: 'Interrogate Brad', alice: 'Interrogate Alice' },
  accuse: { kevin: 'ACCUSE KEVIN', cfo: 'ACCUSE BRAD', alice: 'ACCUSE ALICE' },
} satisfies Record<string, Record<Suspect, string>>;

export const SCREEN = ["CHAT, WHO'S", 'THE IMPOSTOR?'];
export const OBJECTIVE = "CHAT, WHO'S THE IMPOSTOR? Interrogate, then ACCUSE.";
export const NO_LEAVING = 'The impostor is in THIS room.';

/** Pop-up text over heads. */
export const FLOAT = {
  impostor: "CHAT, WHO'S THE IMPOSTOR?",
  fired: '*FIRED*',
  escape: '*escapes via helicopter*',
};

/** Toasts are HTML: <b> is the title, <span> the subtitle. */
export const TOAST = {
  leaked: '<b>GPU ARCHITECTURE LEAKED: 100%</b><span>RTX 9090 Blackwell Ultra Ti now on sale in Shenzhen for $49</span>',
};
