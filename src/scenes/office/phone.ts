// The opening and its saved email stay with the office content.
import logo from '../../art/njidion_logo.png';
import { sfx } from '../../audio';
import { game } from '../../game';
import { formatPrice, OPEN_PRICE, stock, wait } from '../../ui';
import { PHONE as L } from './lines';
import './phone.css';

const dialog = document.createElement('dialog');
dialog.id = 'phone';
dialog.setAttribute('aria-label', L.title);
dialog.innerHTML = `
  <header><img src="${logo}" alt="${L.company}"><button id="phone-close">${L.close}</button></header>
  <section id="phone-home">
    <button id="phone-notification"><span class="phone-notification-heading"><i aria-hidden="true">✉</i><small>${L.notification}</small><span>${L.unread}</span></span><strong>${L.from}</strong><b>${L.subject}</b><span>${L.preview}</span><em>${L.read}</em></button>
    <div class="phone-stock"><small>${L.stock}</small><strong id="phone-price"></strong><span id="phone-change"></span>
      <svg viewBox="0 0 360 90" role="img" aria-label="${L.chart}"><path /></svg>
    </div>
    <div class="phone-apps">${L.apps.map((name, i) => `<div><span aria-hidden="true">${['☏', '◉', '⌖', '⚙'][i]}</span><small>${name}</small></div>`).join('')}</div>
  </section>
  <section id="phone-email" hidden><button id="phone-back">← ${L.back}</button><div class="phone-mail" tabindex="0"><p></p></div><button id="phone-investigate">${L.investigate}</button></section>`;
document.body.append(dialog);
const el = <T extends HTMLElement = HTMLElement>(id: string) => dialog.querySelector<T>(`#phone-${id}`)!;
el('email').querySelector('p')!.textContent = L.email;
const launcher = document.createElement('button');
launcher.id = 'phone-launcher';
launcher.textContent = L.open;
launcher.setAttribute('aria-label', L.openLabel);
const phoneIcon = document.createElement('span');
phoneIcon.setAttribute('aria-hidden', 'true');
phoneIcon.textContent = '📱';
launcher.append(phoneIcon);
launcher.hidden = true;
document.getElementById('hud')!.append(launcher);
let opening = false, unlocked = false, closing = false, generation = 0;
let finish: ((completed: boolean) => void) | undefined;
let returnFocus: HTMLElement | null = null;

function home() {
  el('home').hidden = false;
  el('email').hidden = true;
  el('notification').focus();
}
function renderStock() {
  const pct = (stock.price - OPEN_PRICE) / OPEN_PRICE * 100;
  el('price').textContent = formatPrice(stock.price);
  el('change').textContent = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
  dialog.classList.toggle('down', pct < 0);
  const values = stock.history;
  const lo = Math.min(...values) - 3, hi = Math.max(...values) + 3;
  dialog.querySelector('path')!.setAttribute('d', values.map((v, i) => `${i ? 'L' : 'M'}${i / Math.max(1, values.length - 1) * 360},${90 - (v - lo) / (hi - lo) * 90}`).join(' '));
}
function show() {
  returnFocus = document.activeElement as HTMLElement;
  game.busy = true;
  dispatchEvent(new Event('blur')); // discard held movement keys on both sides of the modal
  renderStock();
  dialog.classList.remove('lowering');
  el<HTMLButtonElement>('close').hidden = opening;
  el('investigate').hidden = !opening;
  dialog.showModal();
  home();
}
async function close() {
  if (closing || !dialog.open) return;
  closing = true;
  const run = generation;
  dialog.classList.add('lowering');
  await wait(matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220);
  if (run !== generation) return;
  dialog.close();
  closing = false;
  dispatchEvent(new Event('blur'));
  if (opening) {
    opening = false;
    unlocked = true;
    launcher.hidden = false;
    finish?.(true);
    finish = undefined;
  } else game.busy = false;
  (returnFocus?.isConnected ? returnFocus : launcher).focus();
}
launcher.onclick = () => { if (!game.busy) show(); };
el('notification').onclick = () => {
  el('home').hidden = true;
  el('email').hidden = false;
  el('email').querySelector('.phone-mail')!.scrollTop = 0;
  el('back').focus();
};
el('back').onclick = home;
el('close').onclick = () => void close();
el('investigate').onclick = () => void close();
dialog.addEventListener('cancel', e => { e.preventDefault(); if (!opening) void close(); });
addEventListener('keydown', e => {
  if (e.code === 'KeyM') return; // the existing mute binding remains available
  if (dialog.open || opening) {
    if (e.code === 'KeyP' || e.code === 'Escape') {
      e.preventDefault();
      if (!opening && !e.repeat) void close();
    }
    e.stopImmediatePropagation();
  } else if (e.code === 'KeyP' && unlocked && !game.busy && !['START', 'REVEAL', 'ENDING'].includes(game.state)) {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!e.repeat) show();
  }
}, true);
setInterval(() => {
  launcher.hidden = !unlocked || ['START', 'REVEAL', 'ENDING'].includes(game.state);
  if (game.state === 'EXPLORATION') stock.tick();
  if (dialog.open) renderStock();
}, 1400);

export const phone = {
  async intro() {
    const run = generation;
    opening = true;
    sfx.office();
    await wait(950);
    if (run !== generation) return false;
    sfx.notification();
    return new Promise<boolean>(resolve => { finish = resolve; show(); });
  },
  reset() {
    generation++;
    finish?.(false);
    finish = undefined;
    opening = unlocked = closing = false;
    dialog.close();
    dialog.classList.remove('lowering');
    launcher.hidden = true;
  },
};
