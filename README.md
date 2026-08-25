# YuJung

> A trilingual memorial website template, built in loving memory of my grandmother, YuJung.

YuJung is a static-first memorial site that anyone in the family can maintain — no coding
required after setup. Guests share memories, photos, and candle lights without accounts;
family admins moderate everything from a private panel; every section can be toggled on or
off as the days pass (for example, removing service details once the funeral concludes).

**English · 繁體中文 · 简体中文** — fully route-based (`/en/`, `/zh-tw/`, `/zh-cn/`), with
every piece of content translatable per language.

---

## Features

- 🕯 **Memory wall** — guests post cards (name, relationship, message) with no visible account,
  upload one photo or attach a YouTube link, and reply in comment threads
- 🛡 **Layered spam protection** — App Check (reCAPTCHA v3), honeypot field, cooldown,
  and length caps, without showing a CAPTCHA to grieving visitors
- 🔐 **Post-hoc moderation** — family members sign in with email/password to hide,
  edit, or delete any card or comment; soft-hide by default, hard delete guarded
- 🧩 **Toggleable sections** — nav and routes respond instantly to Site Settings
- 🎞 **Homepage slideshow** — gallery photos rotate at an admin-configured interval, with
  pause, fullscreen, and an optional CMS-managed music playlist
- ✍️ **Git-based CMS** (Decap) — edit everything through browser forms; saves commits
  straight to the repo and triggers an automatic rebuild
- 🌏 **Trilingual** — route-based i18n with localized dates, relative times, and content fields
- ⚡ **Fast & free to host** — static Astro output on GitHub Pages, Firestore for guest
  content, and Cloudinary's free tier for uploaded photos

## Stack

Astro 5 · Tailwind CSS 4 · Decap CMS · Firebase (Firestore, Auth, App Check) · Cloudinary ·
Cloudflare Workers (CMS OAuth) · GitHub Actions → GitHub Pages

## Requirements

- Node.js **20.3+** (Node 20 LTS recommended; Astro also supports Node 22+)
- A GitHub account (Pages + OAuth app)
- A Cloudflare account (free Worker for CMS authentication)
- A Firebase project (free Spark plan is sufficient)
- A Cloudinary account (the free plan is sufficient for small memorial sites)

## Local development

```bash
npm install
cp .env.example .env      # fill from your Firebase web-app config
npm run dev               # http://localhost:4321 → redirects to /zh-tw/
```

Everything except the Memory Wall works immediately against the sample content.
To bring the wall, Guest Photo upload, candle, and moderation features alive, complete
the Firebase and Cloudinary steps in [`docs/LAUNCH-CHECKLIST.md`](docs/LAUNCH-CHECKLIST.md), restart the dev
server, then:

- Post test memories at `/zh-tw/memories/`
- Moderate them at `/admin/moderation` (email/password sign-in)

### Production build check

```bash
npm run build     # catches YAML/schema/import errors
npm run preview   # serves dist/ exactly as GitHub Pages will
```

### Editing content through the CMS (local)

```bash
npx decap-server        # terminal 1 — local auth/write proxy
npm run dev             # terminal 2
```

Uncomment `local_backend: true` in `public/admin/config.yml`, open
`http://localhost:4321/admin/`, and edit away. **Re-comment before committing.**

## Content model

All curated content lives in `src/content/**/*.yaml` and is editable via the CMS:

| Collection | What it holds |
|---|---|
| `settings` | Site title, section visibility toggles, contact, footer note |
| `profile` | Name, dates, portrait, epitaph, biography |
| `timeline` | Milestones (date, title, text, optional photo) |
| `photos` | Gallery images with trilingual captions + alt text |
| `videos` | YouTube video IDs (upload as *Unlisted*) + titles |
| `service` | Funeral/memorial date, venue, maps & livestream links |
| `donations` | Charity cards (name, URL, blurb) |
| `music` | Optional homepage slideshow tracks, artists, active state, and play order |

Per-language fields use the keys `en` / `zh_tw` / `zh_cn`. Route codes are
`en` / `zh-tw` / `zh-cn`; the helper `pick()` in `src/i18n/ui.ts` bridges the two.

**Media convention:** paths in content have **no leading slash** (e.g. `media/portrait.jpg`).
Components prefix `import.meta.env.BASE_URL`, which keeps images working on project sites
served under `/<repo>/`.

Music files are also curated static media: the CMS commits them under
`public/media/uploads/` and the site rebuilds. Keep each track to roughly 8 MB; see
[`docs/adr/0001-music-files-in-git-via-decap.md`](docs/adr/0001-music-files-in-git-via-decap.md).

## Moderation & permissions

- **Guests**: anonymous Firebase sessions only; can create memories/comments and upload one
  Guest Photo per Memory through a constrained unsigned Cloudinary preset
- **Admins**: Email/Password accounts whose UID exists as a document in the Firestore
  `admins` collection; may update/delete anything, enforced by `firestore.rules`
- Panel: `/admin/moderation` — filter, hide/unhide, edit messages, copy Cloudinary photo IDs,
  delete cards (cascades comments) and individual comments

## Deployment

Full walkthrough: [`docs/LAUNCH-CHECKLIST.md`](docs/LAUNCH-CHECKLIST.md). Short version:

1. Push to GitHub; Settings → Pages → Source: **GitHub Actions**
2. Create the Firebase project; enable Anonymous + Email auth; publish `firestore.rules`;
   register App Check (reCAPTCHA v3); add admin UIDs
3. Create the Cloudinary unsigned upload preset described in the launch checklist
4. Set repo Variables: `PUBLIC_FIREBASE_*`, `PUBLIC_RECAPTCHA_SITE_KEY`,
   `PUBLIC_CLOUDINARY_CLOUD_NAME`, and `PUBLIC_CLOUDINARY_UPLOAD_PRESET`
5. Deploy [`sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth) as a Cloudflare
   Worker; create a GitHub **OAuth App** whose callback is `<worker-url>/callback`; configure
   the Worker's `GITHUB_CLIENT_ID`, encrypted `GITHUB_CLIENT_SECRET`, and `ALLOWED_DOMAINS`
6. Set `backend.repo` and the Worker URL as `backend.base_url` in `public/admin/config.yml`
7. Fill content via `/admin/` — every save rebuilds the site automatically

## Using YuJung for another loved one

1. Fork / "Use this template"
2. `npm run seed` — **destructively** resets settings, profile, and service and wipes all
   repeatable collections (timeline, photos, videos, donations, and music)
3. Update the deployment and CMS settings:
   - `astro.config.mjs` → `site` and `base: '/<new-repo>'`
   - `public/admin/config.yml` → `site_url`, `display_url`, `backend.repo`, and
     `backend.base_url`
   - Your OAuth Worker → `ALLOWED_DOMAINS`; use `<worker-url>/callback` for the OAuth App
4. Set a fresh (or shared) Firebase config through environment variables and add admins
5. Edit everything through `/admin/`

> Tip: keep this upstream repo as `yujung`; give each deployed instance its own
> personal repo name (e.g. `in-memory-of-…`).

## Security model

Firebase web credentials and the Cloudinary cloud/preset names are public by design.
Firestore rules constrain guest writes; only UIDs listed in `admins` may modify or delete.
The unsigned Cloudinary preset enforces photo format, size, dimensions, and normalization.
No Firebase or Cloudinary secret ships to the client.

## Project structure

```
├── astro.config.mjs            # site/base/i18n config
├── firestore.rules             # guest + admin access model
├── docs/LAUNCH-CHECKLIST.md    # step-by-step launch walkthrough
├── scripts/seed.mjs            # reset content for reuse
├── public/
│   ├── favicon.svg
│   ├── media/                  # curated photos/audio (CMS uploads land in media/uploads/)
│   └── admin/
│       ├── index.html          # Decap CMS entry
│       └── config.yml          # CMS collections
└── src/
    ├── config.ts               # locales, defaults
    ├── content.config.ts       # zod schemas
    ├── i18n/                   # ui.ts runtime + en / zh-tw / zh-cn JSON
    ├── layouts/Base.astro      # nav-from-toggles, SEO/hreflang/OG
    ├── components/             # Hero, switcher, slideshow, MemoryWall islands
    ├── lib/firebase.ts         # init + guest/admin data helpers
    ├── pages/                  # root redirect, [locale]/*, moderation, 404
    └── content/                # settings, profile, timeline, …
```

---

In loving memory of YuJung · 玉蓉

*If this template helps you honor someone you loved, that is her kindness continuing onward.*
