import { subscribeCandle, lightCandle, candleCooldown } from '../../lib/firebase';

/** labelLight: aria-label for the button; templateLit: "{count} candles lit";
 *  templateWait: cooldown notice, "{seconds}" placeholder. */
export function initCandle(labelLight, templateLit, templateWait) {
  const root = document.getElementById('candle-widget');
  const btn = root.querySelector('button');
  const countSpan = root.querySelector('[data-count]');
  const waitSpan = root.querySelector('[data-wait]');
  btn.setAttribute('aria-label', labelLight);

  const paint = n => { countSpan.textContent = templateLit.replace('{count}', (n || 0).toLocaleString()); };
  subscribeCandle(paint);

  let timer;
  const startCooldown = ms => {
    clearInterval(timer);
    btn.disabled = true;
    const end = Date.now() + ms;
    const tick = () => {
      const left = Math.ceil((end - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(timer);
        waitSpan.textContent = '';
        btn.disabled = false;
        return;
      }
      waitSpan.textContent = templateWait.replace('{seconds}', String(left));
    };
    tick();
    timer = setInterval(tick, 250);
  };

  candleCooldown().then(ms => { if (ms > 0) startCooldown(ms); }).catch(() => {});

  const pulse = () => {
    btn.classList.remove('pulse');
    void btn.offsetWidth;
    btn.classList.add('pulse');
  };

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    let res;
    try {
      res = await lightCandle();
    } catch {
      // e.g. server rejected a too-fast write due to clock skew —
      // re-derive remaining time instead of surfacing an error.
      res = { ok: false, remainingMs: await candleCooldown().catch(() => 5000) };
    }
    if (res.ok) {
      btn.classList.add('lit');
      pulse();
      btn.disabled = false;
    } else {
      startCooldown(res.remainingMs || 5000);
    }
  });
}
