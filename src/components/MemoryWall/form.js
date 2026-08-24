import { el } from './dom';
import { addMemory, parseYouTubeId } from '../../lib/firebase';

const STR = JSON.parse(document.getElementById('wall-i18n').textContent);
const CLOUD_NAME = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const PHOTO_READY = 'memory-photo-ready';
const DRAFT = 'memory-form-draft';
const COOLDOWN_MS = 45000;
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_RESULT_BYTES = 2 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = /\.(?:jpe?g|png|webp|heic|heif)$/i;

function readJson(key) {
  try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { return null; }
}

function validUpload(result) {
  if (!result || result.resource_type !== 'image' || result.format !== 'webp') return false;
  if (!result.public_id || result.width > 2000 || result.height > 2000 || result.bytes > MAX_RESULT_BYTES) return false;
  if (!result.public_id.startsWith('memory-wall/')) return false;
  try {
    const url = new URL(result.secure_url);
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com'
      && url.pathname.startsWith(`/${CLOUD_NAME}/image/upload/`)
      && url.pathname.includes('/memory-wall/') && url.pathname.endsWith('.webp');
  } catch { return false; }
}

function validStoredPhoto(photo) {
  if (!photo?.url || !photo.publicId) return false;
  try {
    const url = new URL(photo.url);
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com'
      && url.pathname.startsWith(`/${CLOUD_NAME}/image/upload/`);
  } catch { return false; }
}

async function uploadPhoto(file, onProgress) {
  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', UPLOAD_PRESET);
  const request = new XMLHttpRequest();
  return new Promise((resolve, reject) => {
    request.open('POST', `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUD_NAME)}/image/upload`);
    request.timeout = 120000;
    request.upload.addEventListener('progress', e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    request.addEventListener('load', () => {
      let result;
      try { result = JSON.parse(request.responseText); } catch { /* handled below */ }
      if (request.status >= 200 && request.status < 300 && validUpload(result)) {
        resolve({ url: result.secure_url, publicId: result.public_id });
      } else reject(new Error(result?.error?.message || 'invalid upload response'));
    });
    request.addEventListener('error', () => reject(new Error('network error')));
    request.addEventListener('timeout', () => reject(new Error('upload timed out')));
    request.send(body);
  });
}

export function initForm() {
  const root = document.getElementById('memory-form');
  const status = document.getElementById('form-status');
  const cloudinaryReady = Boolean(CLOUD_NAME && UPLOAD_PRESET);
  let uploadedPhoto = readJson(PHOTO_READY);
  if (!validStoredPhoto(uploadedPhoto)) {
    uploadedPhoto = null;
    sessionStorage.removeItem(PHOTO_READY);
  }
  let selectedFile = null;
  let localPreviewUrl = null;
  let uploading = false;

  const field = 'w-full rounded-md border hairline bg-white/60 px-4 py-2.5 outline-none focus:border-gold disabled:opacity-50';
  const name = el('input', { class: field, required: '', maxlength: '60', autocomplete: 'name' });
  const relation = el('input', { class: field, maxlength: '60' });
  const message = el('textarea', { rows: '5', maxlength: '2000', required: '', class: field + ' resize-y' });
  const photo = el('input', { type: 'file', accept: '.jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif', class: field + ' text-sm', disabled: cloudinaryReady ? null : '' });
  const videoUrl = el('input', { type: 'url', placeholder: 'https://youtube.com/watch?v=…', class: field + ' text-sm' });
  const preview = el('div', { class: 'hidden space-y-2 rounded-lg border hairline bg-white/40 p-3' });
  const retry = el('button', { type: 'button', class: 'hidden text-sm text-gold-deep underline underline-offset-4', text: STR['form.photoRetry'] });
  const remove = el('button', { type: 'button', class: 'hidden text-sm text-ink/60 underline underline-offset-4', text: STR['form.photoRemove'] });
  const honeypot = el('input', { type: 'text', name: 'xy_extra_field', tabindex: '-1', autocomplete: 'off',
    'aria-hidden': 'true', class: 'absolute opacity-0 h-0 w-0 -z-10 pointer-events-none' });
  const submit = el('button', { type: 'submit',
    class: 'rounded-full bg-ink px-8 py-3 text-parchment transition-colors hover:bg-gold-deep disabled:opacity-50 disabled:hover:bg-ink',
    text: STR['form.submit'] });

  const inputs = [name, relation, message, photo, videoUrl];
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
      labeled(STR['form.photo'], photo, cloudinaryReady ? STR['form.photoHint'] : STR['form.photoUnavailable']),
      labeled(STR['form.videoUrl'], videoUrl, STR['form.videoHint']),
    ]),
    preview,
    el('div', { class: 'flex justify-center gap-4' }, [retry, remove]),
    el('div', { class: 'text-center' }, [submit]),
  ]);
  root.append(form);

  const draft = readJson(DRAFT);
  if (draft) {
    name.value = draft.name || '';
    relation.value = draft.relation || '';
    message.value = draft.message || '';
    videoUrl.value = draft.videoUrl || '';
  }

  function saveDraft() {
    sessionStorage.setItem(DRAFT, JSON.stringify({ name: name.value, relation: relation.value, message: message.value, videoUrl: videoUrl.value }));
  }

  function renderPhoto() {
    preview.innerHTML = '';
    preview.classList.toggle('hidden', !uploadedPhoto && !selectedFile);
    remove.classList.toggle('hidden', !uploadedPhoto && !selectedFile);
    if (uploadedPhoto) {
      const img = el('img', { src: uploadedPhoto.url, alt: '', class: 'max-h-52 w-full rounded-md object-contain' });
      img.addEventListener('error', () => clearPhoto());
      preview.append(img, el('p', { class: 'text-xs text-ink/60', text: STR['form.photoReady'] }));
    } else if (selectedFile) {
      localPreviewUrl = URL.createObjectURL(selectedFile);
      const img = el('img', { src: localPreviewUrl, alt: '', class: 'max-h-52 w-full rounded-md object-contain' });
      img.addEventListener('error', () => img.remove());
      preview.append(img, el('p', { class: 'text-sm text-ink/70', text: selectedFile.name }));
    }
  }

  function clearPhoto() {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    localPreviewUrl = null;
    uploadedPhoto = null;
    selectedFile = null;
    photo.value = '';
    sessionStorage.removeItem(PHOTO_READY);
    retry.classList.add('hidden');
    renderPhoto();
    submit.disabled = false;
  }

  function setBusy(value) {
    uploading = value;
    inputs.forEach(input => { input.disabled = value || (input === photo && !cloudinaryReady); });
    submit.disabled = value || Boolean(selectedFile && !uploadedPhoto);
    retry.disabled = value;
    remove.disabled = value;
  }

  async function beginUpload() {
    if (!selectedFile || uploading) return;
    setBusy(true);
    retry.classList.add('hidden');
    status.textContent = STR['form.preparingPhoto'];
    try {
      status.textContent = STR['form.uploadingPhoto'].replace('{percent}', '0');
      uploadedPhoto = await uploadPhoto(selectedFile, percent => {
        status.textContent = STR['form.uploadingPhoto'].replace('{percent}', String(percent));
      });
      sessionStorage.setItem(PHOTO_READY, JSON.stringify(uploadedPhoto));
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      localPreviewUrl = null;
      selectedFile = null;
      photo.value = '';
      status.textContent = STR['form.photoReady'];
      renderPhoto();
    } catch (err) {
      console.error('photo upload failed:', err);
      status.textContent = STR['form.photoFailed'];
      retry.classList.remove('hidden');
    } finally { setBusy(false); }
  }

  inputs.filter(input => input !== photo).forEach(input => input.addEventListener('input', saveDraft));
  photo.addEventListener('change', () => {
    const file = photo.files?.[0];
    if (!file) return;
    const supported = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.type)
      || ACCEPTED_EXTENSIONS.test(file.name);
    if (!supported || file.size > MAX_SOURCE_BYTES) {
      status.textContent = supported ? STR['form.photoTooLarge'] : STR['form.photoInvalid'];
      photo.value = '';
      return;
    }
    uploadedPhoto = null;
    sessionStorage.removeItem(PHOTO_READY);
    selectedFile = file;
    renderPhoto();
    submit.disabled = true;
    beginUpload();
  });
  retry.addEventListener('click', beginUpload);
  remove.addEventListener('click', clearPhoto);
  renderPhoto();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (honeypot.value) { status.textContent = STR['form.success']; return; }
    if (submit.disabled) { status.textContent = STR['form.cooldown']; return; }
    const msgText = message.value.trim();
    if (!name.value.trim() || !msgText) return;
    const yt = videoUrl.value.trim();
    if (yt && !parseYouTubeId(yt)) { status.textContent = STR['form.invalidVideo']; return; }

    setBusy(true);
    status.textContent = STR['form.publishing'];
    try {
      await addMemory({
        authorName: name.value.trim(), relation: relation.value.trim(), message: msgText,
        photo: uploadedPhoto || undefined, videoUrl: yt || undefined,
      });
      form.reset();
      uploadedPhoto = null;
      selectedFile = null;
      sessionStorage.removeItem(PHOTO_READY);
      sessionStorage.removeItem(DRAFT);
      renderPhoto();
      status.textContent = STR['form.success'];
      setTimeout(() => (status.textContent = ''), 8000);
      setTimeout(() => setBusy(false), COOLDOWN_MS);
    } catch (err) {
      console.error('share memory failed:', err);
      status.textContent = STR['form.publishFailed'];
      setBusy(false);
    }
  });
}
