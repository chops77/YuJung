import { el, relTime } from './dom';
import { subscribeMemories, fetchComments, addComment } from '../../lib/firebase';
import { headRow, photoNode, videoNode, messageBlock } from './cards';

const STR = JSON.parse(document.getElementById('wall-i18n').textContent);

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
    class: 'cursor-pointer rounded-full bg-gold-deep px-4 py-1.5 text-sm text-white transition-colors hover:bg-ink disabled:opacity-50',
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
    class: 'mt-3 cursor-pointer text-sm text-gold-deep underline underline-offset-4 hover:text-ink',
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
      const cardEl = el('article', { class: 'card p-5' }, [
        headRow(card, langTag),
        messageBlock(card.message, { expandable: true }),
        card.photo ? photoNode(card.photo) : null,
        card.videoUrl ? videoNode(card.videoUrl) : null,
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
