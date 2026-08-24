# Music files are committed to git via Decap CMS, not Firebase Storage

The project already uses Firebase for guest features, so a future reader might expect uploaded media to live in Firebase Storage. It cannot: Storage requires the paid Blaze plan (`src/lib/firebase.ts` notes this), and every piece of curated content here flows through Decap CMS → git → GitHub Pages. We therefore added a `music` CMS collection whose audio uploads commit to `public/media/music/` and deploy as static assets with the site.

## Considered Options

- **Firebase Storage + Firestore metadata + custom admin CRUD** — rejected: requires the paid Blaze plan and a runtime backend for what is a handful of files.

## Consequences

- The repository grows with each track; keep tracks to roughly 8 MB each (GitHub Pages rejects files over 100 MB).
- Adding or swapping a track is a CMS publish → site rebuild, not an instant change.
