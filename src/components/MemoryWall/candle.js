import { subscribeCandle, lightCandleOnce } from '../../lib/firebase';

/** labelLight: aria-label for the button; templateLit: "{count} candles lit" */
export function initCandle(labelLight, templateLit) {
  const root = document.getElementById('candle-widget');
  const btn = root.querySelector('button');
  const countSpan = root.querySelector('[data-count]');
  btn.setAttribute('aria-label', labelLight);

  const paint = n => { countSpan.textContent = templateLit.replace('{count}', (n || 0).toLocaleString()); };
  subscribeCandle(paint);
  parseInt(localStorage.getItem('candle-lit') || '0', 10) === 1 && btn.classList.add('lit');

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try { await lightCandleOnce(); btn.classList.add('lit'); } catch (e) { console.error('light candle failed:', e); }
    btn.disabled = false;
  });
}