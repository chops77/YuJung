type Slide = { src: string; alt: string };
type Track = { src: string; title: string };

interface SlideshowData {
  slides: Slide[];
  playlist: Track[];
  intervalMs: number;
  i18n: Record<string, string>;
}

/** Fisher–Yates — fresh order on every page load */
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function init(): void {
  const section = document.getElementById('slideshow');
  const dataEl = document.getElementById('slideshow-data');
  if (!section || !dataEl) return;

  const { slides, playlist, intervalMs, i18n } = JSON.parse(
    dataEl.textContent!,
  ) as SlideshowData;
  if (!slides.length) return;

  const stage = document.getElementById('slideshow-stage')!;
  const layerA = document.getElementById('slideshow-layer-a') as HTMLImageElement;
  const layerB = document.getElementById('slideshow-layer-b') as HTMLImageElement;
  const layers = [layerA, layerB] as const;

  const musicBtn = document.getElementById('slideshow-music') as HTMLButtonElement | null;
  const pauseBtn = document.getElementById('slideshow-pause') as HTMLButtonElement;
  const fsBtn = document.getElementById('slideshow-fs') as HTMLButtonElement;

  /* ---------- photo cycling ---------- */

  let deck = shuffle(slides);
  let pos = 0;
  let front = 0; // index of the currently visible layer
  let paused = false;
  let timer: number | undefined;

  const preload = (i: number) => {
    if (deck.length < 2) return;
    new Image().src = deck[i % deck.length].src;
  };

  function show(i: number): void {
    const slide = deck[i];
    const back = layers[1 - front];
    back.src = slide.src;
    back.alt = slide.alt;
    back.classList.add('is-active');
    layers[front].classList.remove('is-active');
    front = 1 - front;
    preload(i + 1);
  }

  function schedule(): void {
    window.clearTimeout(timer);
    if (!paused && deck.length > 1) {
      timer = window.setTimeout(() => {
        pos = (pos + 1) % deck.length;
        show(pos);
        schedule();
      }, intervalMs);
    }
  }

  function step(delta: number): void {
    pos = (pos + delta + deck.length) % deck.length;
    show(pos);
  }

  function setPaused(value: boolean): void {
    paused = value;
    pauseBtn.querySelector('.icon-pause')?.classList.toggle('hidden', value);
    pauseBtn.querySelector('.icon-resume')?.classList.toggle('hidden', !value);
    pauseBtn.setAttribute('aria-label', value ? i18n.resume : i18n.pause);
    pauseBtn.title = value ? i18n.resume : i18n.pause;
    window.clearTimeout(timer);
    if (!value) schedule();
  }

  pauseBtn.addEventListener('click', () => setPaused(!paused));

  window.addEventListener('keydown', (e) => {
    if (!paused) return;
    const target = e.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  });

  /* ---------- fullscreen ---------- */

  function syncFsUi(isFs: boolean): void {
    stage.classList.toggle('is-fs', isFs);
    stage.classList.remove('controls-idle');
    fsBtn.querySelector('.icon-fs-on')?.classList.toggle('hidden', isFs);
    fsBtn.querySelector('.icon-fs-off')?.classList.toggle('hidden', !isFs);
    fsBtn.setAttribute('aria-label', isFs ? i18n.exitFullscreen : i18n.fullscreen);
    fsBtn.title = isFs ? i18n.exitFullscreen : i18n.fullscreen;
  }

  fsBtn.addEventListener('click', () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void stage.requestFullscreen();
    }
  });
  document.addEventListener('fullscreenchange', () =>
    syncFsUi(document.fullscreenElement === stage),
  );

  let idleTimer: number | undefined;
  stage.addEventListener('mousemove', () => {
    if (!stage.classList.contains('is-fs')) return;
    stage.classList.remove('controls-idle');
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(
      () => stage.classList.add('controls-idle'),
      3000,
    );
  });

  /* ---------- music ---------- */

  let audio: HTMLAudioElement | null = null;
  let trackPos = 0;
  let musicOn = false;

  function startMusic(): void {
    if (!playlist.length) return;
    audio ??= new Audio();
    audio.addEventListener('ended', onTrackEnded);
    audio.src = playlist[trackPos].src;
    void audio.play().catch(() => {});
    musicOn = true;
    swapMusicIcon(true);
  }

  function onTrackEnded(this: HTMLAudioElement): void {
    trackPos = (trackPos + 1) % playlist.length;
    this.src = playlist[trackPos].src;
    void this.play().catch(() => {});
  }

  function stopMusic(): void {
    audio?.pause();
    if (audio) audio.currentTime = 0;
    trackPos = 0;
    musicOn = false;
    swapMusicIcon(false);
  }

  function swapMusicIcon(on: boolean): void {
    musicBtn?.querySelector('.icon-play')?.classList.toggle('hidden', on);
    musicBtn?.querySelector('.icon-stop')?.classList.toggle('hidden', !on);
    musicBtn?.setAttribute('aria-label', on ? i18n.stopMusic : i18n.playMusic);
    if (musicBtn) musicBtn.title = on ? i18n.stopMusic : i18n.playMusic;
  }

  musicBtn?.addEventListener('click', () => (musicOn ? stopMusic() : startMusic()));

  /* ---------- start ---------- */

  const first = deck[0];
  layerA.src = first.src;
  layerA.alt = first.alt;
  layerA.classList.add('is-active');
  preload(1);
  schedule();
}
