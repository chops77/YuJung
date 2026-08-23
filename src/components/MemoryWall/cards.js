import { el, relTime, youTubeEmbedUrl } from './dom';

/** Shared renderers for memory cards — used by the wall page and the homepage preview. */

export function showDialog(src) {
  let dlg = document.getElementById('lightbox');
  if (!dlg) {
    dlg = el('dialog', { id: 'lightbox', class: 'm-auto max-w-[92vw] backdrop:bg-black/70 bg-transparent p-0' });
    dlg.addEventListener('click', () => dlg.close());
    document.body.append(dlg);
  }
  dlg.innerHTML = '';
  dlg.append(el('img', { src, alt: '', class: 'max-h-[85vh] rounded-lg shadow-2xl' }));
  dlg.showModal();
}

export function mediaNode(item) {
  if (item.type === 'video') {
    const src = youTubeEmbedUrl(item.url);
    if (!src) return null;
    return el('div', { class: 'mt-3 overflow-hidden rounded-lg aspect-video' },
      [el('iframe', { src, loading: 'lazy', title: 'video', allowfullscreen: '',
        class: 'h-full w-full', allow: 'encrypted-media; picture-in-picture' })]);
  }
  const img = el('img', { src: item.url, alt: '', loading: 'lazy',
    class: 'w-full cursor-zoom-in rounded-lg object-cover' });
  img.addEventListener('click', () => showDialog(img.src));
  return el('div', { class: 'mt-3' }, [img]);
}

export function headRow(card, langTag) {
  return el('header', { class: 'flex items-baseline justify-between gap-3' }, [
    el('h3', { class: 'font-serif text-lg', text: card.authorName + (card.relation ? ' · ' + card.relation : '') }),
    el('time', { class: 'shrink-0 text-xs text-ink/50', text: relTime(card.createdAt, langTag) }),
  ]);
}

/**
 * Message paragraph. `expandable` toggles the full text in place (wall page);
 * otherwise the text is CSS-clamped (homepage preview).
 */
export function messageBlock(message, { expandable = false } = {}) {
  if (!expandable) {
    return el('p', { class: 'mt-2 whitespace-pre-line leading-relaxed text-ink/80 line-clamp-6' },
      [document.createTextNode(message)]);
  }
  const long = message.length > 400;
  const txt = el('span');
  let expanded = false;
  txt.textContent = long ? message.slice(0, 400) + '…' : message;

  const msgP = el('p', { class: 'mt-2 whitespace-pre-line leading-relaxed text-ink/80' }, [txt]);
  if (long) {
    const more = el('button', { type: 'button',
      class: 'ml-2 cursor-pointer text-sm text-gold-deep underline underline-offset-4', text: '⋯' });
    more.addEventListener('click', () => {
      expanded = !expanded;
      txt.textContent = expanded ? message : message.slice(0, 400) + '…';
    });
    msgP.append(more);
  }
  return msgP;
}
