import { el } from './dom';
import { addMemory, parseYouTubeId } from '../../lib/firebase';

const STR = JSON.parse(document.getElementById('wall-i18n').textContent);
const COOLDOWN_MS = 45000;

export function initForm() {
  const root = document.getElementById('memory-form');
  const status = document.getElementById('form-status');

  const field = 'w-full rounded-md border hairline bg-white/60 px-4 py-2.5 outline-none focus:border-gold';
  const name = el('input', { class: field, required: '', maxlength: '60', autocomplete: 'name' });
  const relation = el('input', { class: field, maxlength: '60' });
  const message = el('textarea', { rows: '5', maxlength: '2000', class: field + ' resize-y' });
  const photoUrl = el('input', { type: 'url', placeholder: 'https://…/photo.jpg', class: field + ' text-sm' });
  const videoUrl = el('input', { type: 'url', placeholder: 'https://youtube.com/watch?v=…', class: field + ' text-sm' });
  // Bots auto-fill every visible input; humans never see or fill this one.
  // Name is deliberately meaningless — "website"-style names get autofilled
  // by password managers, which would silently swallow real submissions.
  const honeypot = el('input', { type: 'text', name: 'xy_extra_field', tabindex: '-1', autocomplete: 'off',
    'aria-hidden': 'true', class: 'absolute opacity-0 h-0 w-0 -z-10 pointer-events-none' });
  const submit = el('button', { type: 'submit',
    class: 'rounded-full bg-ink px-8 py-3 text-parchment transition-colors hover:bg-gold-deep disabled:opacity-50 disabled:hover:bg-ink',
    text: STR['form.submit'] });

  const labeled = (txt, node, hint) => el('label', { class: 'block space-y-1.5' }, [
    el('span', { class: 'text-sm font-medium', text: txt }), node,
    hint ? el('span', { class: 'block text-xs text-ink/50', text: hint }) : null,
  ]);

  const form = el('form', { class: 'relative mx-auto max-w-2xl space-y-5 rounded-2xl border hairline bg-white/40 p-6 md:p-8' }, [
    honeypot,
    labeled(STR['form.name'], name),
    labeled(STR['form.relationOptional'], relation),
    labeled(STR['form.message'], message),
    el('div', { class: 'grid gap-5 sm:grid-cols-2' }, [
      labeled(STR['form.photo'], photoUrl, STR['form.photoHint']),
      labeled(STR['form.videoUrl'], videoUrl, STR['form.videoHint']),
    ]),
    el('div', { class: 'text-center' }, [submit]),
  ]);
  root.append(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (honeypot.value) { console.warn('submission dropped: honeypot filled'); status.textContent = STR['form.success']; return; }  // silently drop bots
    if (submit.disabled) { status.textContent = STR['form.cooldown']; return; }

    const msgText = message.value.trim();
    if (!name.value.trim() || !msgText) return;

    submit.disabled = true;
    status.textContent = '';
    try {
    const media = [];
    const pic = photoUrl.value.trim();
    if (pic) {
      if (!/^https:\/\/\S+$/.test(pic)) throw Object.assign(new Error(), { code: 'invalid-link' });
      media.push({ type: 'image', url: pic });
    }
    const yt = videoUrl.value.trim();
      if (yt) {
        if (!parseYouTubeId(yt)) throw Object.assign(new Error(), { code: 'invalid-video' });
        media.push({ type: 'video', url: yt });
      }
      await addMemory({
        authorName: name.value.trim(),
        relation: relation.value.trim(),
        message: msgText,
        media,
      });
      form.reset();
      status.textContent = STR['form.success'];
      setTimeout(() => (status.textContent = ''), 8000);
      setTimeout(() => (submit.disabled = false), COOLDOWN_MS);   // gentle rate-limit
    } catch (err) {
      console.error('share memory failed:', err);
      status.textContent =
        err.code === 'invalid-video' ? STR['form.invalidVideo'] :
        err.code === 'invalid-link'  ? STR['form.invalidLink']  :
        STR['errors.generic'];
      submit.disabled = false;
    }
  });
}