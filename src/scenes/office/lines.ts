// Every word said or shown in the office. Edit freely; `npm run build` catches typos in who/emo.
import type { Line } from '../../ui';

export const BRIEFING: Line[] = [
  { who: 'hensen', emo: 'shocked', pose: 'shocked', text: 'Chat, we have a massive problem.' },
  { who: 'hensen', emo: 'neutral', text: 'Someone is stealing my proprietary GPU technology.' },
  { who: 'hensen', emo: 'defeated', text: 'My competitors are literally stealing my aura.' },
  { who: 'hensen', emo: 'smug', text: 'There are three impostors in this office. Find them.' },
];

/** A: Kevin (CTO), B: Brad (CFO), C: Alice (the spy). */
export const DESKS: Record<'A' | 'B' | 'C', Line[]> = {
  A: [
    { who: 'hensen', emo: 'shocked', pose: 'shocked', text: 'A USB stick labelled "CLASSIFIED GPU SOURCE CODE". Plus 400 CUDA files.' },
    { who: 'hensen', emo: 'shocked', pose: 'shocked', text: 'Kevin. Why do you have our classified source code?' },
    { who: 'kevin', emo: 'nervous', text: "Bro I'm optimizing Minecraft shaders. The RTX 5090 is NOT enough 💀" },
    { who: 'kevin', emo: 'nervous', text: 'Ray-traced dirt blocks. 9 FPS. We are so back.' },
    { who: 'hensen', emo: 'smug', text: 'Understandable. Keep cooking.' },
  ],
  B: [
    { who: 'hensen', emo: 'shocked', pose: 'shocked', text: 'Wire transfer: $800,000,000 to "Definitely Not A Shell Co., Shenzhen".' },
    { who: 'hensen', emo: 'neutral', text: 'Open on his screen: GPU_EXPORT_CONTROL_BYPASS.xlsx' },
    { who: 'hensen', emo: 'shocked', pose: 'shocked', text: 'Why did you transfer $800 million to China?' },
    { who: 'cfo', emo: 'hype', text: "Portfolio diversification, king. We're bullish on the Chinese market." },
    { who: 'cfo', emo: 'hype', text: 'Rest of payroll is in $DOGEGPU. Up 4% today. Generational wealth.' },
    { who: 'hensen', emo: 'smug', text: 'Based. Financial literacy.' },
  ],
  C: [
    { who: 'hensen', emo: 'neutral', text: 'Laptop says "OPERATION STEAL BLACKWELL". Folder: "STOLEN GPU SCHEMATICS".' },
    { who: 'hensen', emo: 'neutral', text: 'Email to "My Handler": "Blackwell secured. Hensen suspects nothing. lol."' },
    { who: 'hensen', emo: 'neutral', text: 'And a doc: "HOW TO HONEYPOT A BILLIONAIRE". Step 1 is highlighted.' },
    { who: 'hensen', emo: 'love', text: "Alice, what's all this?" },
    { who: 'alice', emo: 'wink', text: 'Just a little surprise for you, daddy.' },
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
];

/** Brad (CFO): optional chat, one small clue buried in finance-bro noise. */
export const BRAD: Line[] = [
  { who: 'hensen', emo: 'neutral', text: 'Brad. Have you seen anything suspicious?' },
  { who: 'cfo', emo: 'panic', text: "Bro, the only suspicious thing is my portfolio. Down 40%. I'm actually cooked." },
  { who: 'hensen', emo: 'neutral', text: 'Anyone acting weird?' },
  { who: 'cfo', emo: 'hype', text: 'Alice asked about chip designs. Thought she was doing due diligence.' },
  { who: 'hensen', emo: 'shocked', pose: 'shocked', text: "And you didn't question that?" },
  { who: 'cfo', emo: 'hype', text: 'I was locked in on the grindset.' },
];

export const ALL_SEARCHED: Line[] = [
  { who: 'hensen', emo: 'smug', text: 'Three desks. Zero clues. My detective skills are mid.' },
  { who: 'hensen', emo: 'smug', text: 'EVERYONE. BOARDROOM. NOW.' },
];

/** Text on each suspect's monitor. */
/** Brad's second monitor. */
export const TICKER = ['$DOGEGPU', '▼ 40%'];

export const MONITOR = { A: 'minecraft_rtx.cu', B: '→ SHENZHEN $800M', C: 'OPERATION STEAL BLACKWELL' };

export const DESK_LABEL = { A: "Search Kevin's desk (CTO)", B: "Search Brad's desk (CFO)", C: "Search Alice's desk (Assistant)" };

export const OBJECTIVE = {
  start: 'FIND THE SPY. PROTECT THE GPUs. SAVE THE COMPANY.',
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
