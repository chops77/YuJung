import { el, relTime, youTubeEmbedUrl } from './dom';
import { subscribeMemories, fetchComments, addComment } from '../../lib/firebase';

const STR = JSON.parse(document.getElementById('wall-i18n').textContent);

function mediaNode(item) {
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

function showDialog(src) {
  let dlg = document.getElementById('lightbox');
  if (!dlg) {
    dlg = el('dialog', { id: 'lightbox', class: 'backdrop:bg-black/70 bg-transparent p-0' });
    dlg.addEventListener('click', () => dlg.close());
    document.body.append(dlg);
  }
  dlg.innerHTML = '';
  dlg.append(el('img', { src, alt: '', class: 'max-h-[85vh] rounded-lg shadow-2xl' }));
  dlg.showModal();
}

function commentRow(c) {
  const row = el('p', { class: 'text-sm leading-relaxed text-ink/80' });
  row.append(
    el('span', { class: 'font-medium text-ink', text: c.authorName }),
    el('span', { class: 'text-ink/50', text: ' · ' + relTime(c.createdAt, STR.langTag) }),
    document.createElement('br'),
    document.createTextNode(c.text),
  );
  return row;
}

async function loadComments(listEl) {
  try {
    const items = await fetchComments(card.id);
    listEl.innerHTML = '';
    if (!items.length) listEl.append(el('p', { class: 'text-sm text-ink/50', text: STR['comments.none'] }));
    items.forEach(c => listEl.append(commentRow(c)));
  } catch { /* transient */ }
  var card; // hoisted reference set below (see usage)
}

function commentSection(card) {
  const listEl = el('div', { class: 'space-y-2' },
    [el('p', { class: 'text-sm text-ink/50', text: STR['comments.none'] })]);

  const nameIn = el('input', {
    class: 'w-full rounded-md border hairline bg-white/60 px-3 py-2 text-sm outline-none focus:border-gold',
    placeholder: STR['comments.yourName'], maxlength: '60' });
  // Remember the visitor's chosen display name across cards — never reuse
  // the memory author's name automatically.
  nameIn.value = sessionStorage.getItem('commenter-name') || '';

  const input = el('input', { class: 'w-full rounded-md border hairline bg-white/60 px-3 py-2 text-sm outline-none focus:border-gold',
    placeholder: STR['comments.add'], maxlength: '1000' });
  const send = el('button', { type: 'button',
    class: 'rounded-full bg-gold-deep px-4 py-1.5 text-sm text-white transition-colors hover:bg-ink disabled:opacity-50',
    text: STR['comments.send'] });

  send.addEventListener('click', async () => {
    const name = nameIn.value.trim();
    const text = input.value.trim();
    if (!name || !text || send.disabled) return;
    send.disabled = true;
    try {
      sessionStorage.setItem('commenter-name', name);
      await addComment(card.id, { authorName: name, text });
      input.value = '';
      await loadCommentsInto(listEl, card.id);
    } catch (e) { console.error('add comment failed:', e); alert(STR['errors.generic']); }
    send.disabled = false;
  });

  const composeRow = el('div', { class: 'flex flex-col gap-2' }, [
    nameIn,
    el('div', { class: 'flex gap-2' }, [input, send]),
  ]);
  const wrap = el('div', { class: 'hidden border-t hairline mt-3 pt-3 space-y-3' });
  wrap.append(listEl, composeRow);

  const toggle = el('button', { type: 'button', 'aria-expanded': 'false',
    class: 'mt-3 text-sm text-gold-deep underline underline-offset-4 hover:text-ink',
    text: STR['comments.show'] });
  toggle.addEventListener('click', async () => {
    const opening = wrap.classList.contains('hidden');
    wrap.classList.toggle('hidden');
    toggle.setAttribute('aria-expanded', String(opening));
    if (opening) await loadCommentsInto(listEl, card.id);
  });

  return el('div', {}, [toggle, wrap]);   // ← both nodes actually mount now
}

async function loadCommentsInto(listEl, cardId) {
  try {
    const items = await fetchComments(cardId);
    listEl.innerHTML = '';
    if (!items.length) listEl.append(el('p', { class: 'text-sm text-ink/50', text: STR['comments.none'] }));
    else items.forEach(c => listEl.append(commentRow(c)));
  } catch { /* transient */ }
}

export function initWall(langTag) {
  STR.langTag = langTag;
  const root = document.getElementById('memory-wall');
  const countEl = document.getElementById('memory-count');

  subscribeMemories(cards => {
    root.innerHTML = '';
    countEl.textContent =
      cards.length ? t_count(cards.length) : '';

    if (!cards.length) {
      root.append(el('p', { class: 'py-12 text-center text-ink/50 md:col-span-2', text: STR['wall.empty'] }));
      return;
    }
    for (const card of cards) {
      const long = card.message.length > 400;
      const txt = el('span');
      let expanded = false;
      txt.textContent = long ? card.message.slice(0, 400) + '…' : card.message;

      const msgP = el('p', { class: 'mt-2 whitespace-pre-line leading-relaxed text-ink/80' }, [txt]);
      if (long) {
        const more = el('button', { type: 'button',
          class: 'ml-2 text-sm text-gold-deep underline underline-offset-4', text: '⋯' });
        more.addEventListener('click', () => {
          expanded = !expanded;
          txt.textContent = expanded ? card.message : card.message.slice(0, 400) + '…';
        });
        msgP.append(more);
      }

      const head = el('header', { class: 'flex items-baseline justify-between gap-3' }, [
        el('h3', { class: 'font-serif text-lg', text: card.authorName + (card.relation ? ' · ' + card.relation : '') }),
        el('time', { class: 'shrink-0 text-xs text-ink/50', text: relTime(card.createdAt, langTag) }),
      ]);

      const cardEl = el('article', { class: 'rounded-xl border hairline bg-white/50 p-5 shadow-sm' }, [
        head, msgP,
        ...(card.media ?? []).map(mediaNode).filter(Boolean),
        commentSection(card),
      ]);
      root.append(cardEl);
    }
  }, err => {
    console.error('memory wall:', err);
    root.innerHTML = '';
    root.append(el('p', {
      class: 'py-12 text-center text-ink/50 md:col-span-2',
      text: STR['wall.error'] ?? STR['errors.generic'],
    }));
  });
}

function t_count(n) { return STR['wall.count'].replace('{count}', n); }