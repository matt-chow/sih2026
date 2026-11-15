// Every word said in the hallway. Edit freely; `npm run build` catches typos in who/emo.
import type { Line } from '../../ui';

export const VENDING: Line[] = [
  { who: 'hensen', emo: 'neutral', text: 'A vending machine that only sells graphics cards.' },
  { who: 'hensen', emo: 'smug', text: '$1,999 for a bag of chips. Healthy margins.' },
];

export const ELEVATOR: Line[] = [
  { who: 'hensen', emo: 'neutral', text: '"OUT OF ORDER." It has said that since the IPO.' },
  { who: 'hensen', emo: 'defeated', text: 'I have taken the stairs for fourteen years.' },
];

export const EMPLOYEE: Line[] = [
  { who: 'hensen', emo: 'neutral', text: 'Employee of the Month: KEVIN. Twelve months running.' },
  { who: 'hensen', emo: 'love', text: 'Such a loyal boy. Nothing to worry about there.' },
];
