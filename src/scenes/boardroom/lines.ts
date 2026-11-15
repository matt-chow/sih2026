// Every word said or shown in the boardroom. Edit freely; `npm run build` catches typos in who/emo.
import type { Line } from '../../ui';

export type Suspect = 'kevin' | 'cfo' | 'alice';

/** E on a suspect: free small talk, as often as you like. */
export const CHAT: Record<Suspect, Line[]> = {
  kevin: [{ who: 'kevin', emo: 'nervous', text: 'Is this about the GPUs or the Valorant tourney on the company card?' }],
  cfo: [{ who: 'cfo', emo: 'hype', text: "If this is a layoff I'm shorting us. Respectfully." }],
  alice: [{ who: 'alice', emo: 'smile', text: "I'm just happy to be in the room where the secrets are~" }],
};

/** Q on a suspect: the one interrogation is a Pokémon-style battle. `by` 'me' = Hensen attacks; dmg is % of HP. */
export interface Move { by: 'me' | 'foe'; text: string; dmg: number; fx?: 'crit' | 'hearts' }
export const BATTLE: Record<Suspect, { name: string; level: string; appear: string; moves: Move[]; faint?: string }> = {
  kevin: {
    name: 'KEVIN', level: 'Lv.12', appear: 'A wild KEVIN appeared! He is holding a USB stick.',
    moves: [
      { by: 'me', text: 'HENSEN used "ARE YOU A CHINESE SPY?"!', dmg: 30 },
      { by: 'foe', text: "KEVIN used SENATOR, I'M SINGAPOREAN! It's super effective!", dmg: 45 },
      { by: 'me', text: "HENSEN used YOU'RE FIRED!", dmg: 100, fx: 'crit' },
    ],
    faint: 'KEVIN fainted! ...He was innocent. BRO WHAT 💀',
  },
  cfo: {
    name: 'BRAD', level: 'Lv.69', appear: 'A wild BRAD appeared! He smells like Axe and leverage.',
    moves: [
      { by: 'me', text: 'HENSEN used AUDIT! Brad has never heard of it.', dmg: 25 },
      { by: 'foe', text: 'BRAD used DIVERSIFIED PORTFOLIO, UNC! HENSEN is confused!', dmg: 35 },
      { by: 'me', text: "HENSEN used YOU'RE FIRED!", dmg: 100, fx: 'crit' },
    ],
    faint: 'BRAD fainted! His $DOGEGPU bags fainted too. He was innocent.',
  },
  alice: {
    name: 'ALICE', level: 'Lv.99', appear: 'A wild ALICE appeared! She is holding your GPU schematics.',
    moves: [
      { by: 'foe', text: "ALICE used <3! It's super effective!", dmg: 50, fx: 'hearts' },
    ],
  },
};

/** Hensen picks Alice ❤ in her duel: she was the spy all along. */
export const BETRAYAL_QUOTE = '"Thanks for the root password, darling~ 💚 Your GPUs are already in China."';
/** Wrong guess: the real spy takes the stage. */
export const SPY_QUOTE = '"EZ CLAP. While you fired the wrong guy, I uploaded Blackwell to Shenzhen."';

/** The ending card's subtitle. */
export const VERDICT: Record<Suspect, string> = {
  alice: 'You chose Alice. Alice chose China. Blackwell ships from Shenzhen on Monday.',
  kevin: 'You fired Kevin (innocent). Alice escaped with Blackwell. Minecraft shaders will never recover.',
  cfo: 'You fired Brad (innocent). Alice escaped with Blackwell. $DOGEGPU is down 100%.',
};

export const LABEL = {
  chat: { kevin: 'Talk to Kevin', cfo: 'Talk to Brad', alice: 'Talk to Alice' },
  interrogate: 'INTERROGATE',
} as const;

export const SCREEN = ["CHAT, WHO'S", 'THE IMPOSTOR?'];
export const OBJECTIVE = "CHAT, WHO'S THE IMPOSTOR? Press Q on ONE suspect.";
export const NO_LEAVING = 'The impostor is in THIS room.';

/** Pop-up text over heads. */
export const FLOAT = {
  impostor: "CHAT, WHO'S THE IMPOSTOR?",
};

/** Toasts are HTML: <b> is the title, <span> the subtitle. */
export const TOAST = {
  oneShot: '<i>❓</i><b>ONE INTERROGATION</b><span>Q on a suspect. Guess wrong and the spy wins.</span>',
};
