import { el } from './dom';
import { subscribeMemories } from '../../lib/firebase';
import { headRow, mediaNode, messageBlock } from './cards';

/**
 * Read-only preview of the latest memories for the homepage.
 * Renders up to `max` cards into #memory-preview; hides the grid when the
 * wall is empty and degrades to a muted error line if Firebase is unreachable.
 */
export function initPreview(strings, max = 3) {
  const root = document.getElementById('memory-preview');
  const statusEl = document.getElementById('memory-preview-status');
  if (!root) return;

  subscribeMemories(cards => {
    root.removeAttribute('aria-busy');
    statusEl.textContent = '';
    const latest = cards.slice(0, max);
    root.classList.toggle('hidden', !latest.length);
    root.innerHTML = '';

    for (const card of latest) {
      root.append(el('article',
        { class: 'rounded-xl border hairline bg-white/50 p-5 shadow-sm' }, [
        headRow(card, strings.langTag),
        messageBlock(card.message),                       // CSS-clamped, no expand
        ...(card.media ?? []).slice(0, 1).map(mediaNode).filter(Boolean), // keep it compact
      ]));
    }
  }, err => {
    console.error('memory preview:', err);
    root.classList.add('hidden');
    root.innerHTML = '';
    statusEl.textContent = strings['wall.error'] ?? '';
  });
}
