# Launch Checklist

## A. Repo & hosting
1. Create repo (GitHub "Use this template" or push this folder)
2. Run `npm run seed` → commit
3. astro.config.mjs: site=`https://<user>.github.io`, base=`/<repo>`
4. Settings → Pages → Source: **GitHub Actions**
5. Push to main → confirm first green deploy

## B. Firebase console
6. Create project → Web app → copy config values
7. Authentication → enable Anonymous + Email/Password → create family users
8. Firestore → create DB → publish firestore.rules
9. App Check → register reCAPTCHA v3 (localhost + prod domains)
10. Firestore → collection `admins` → one doc per family member UID

## C. Cloudinary
11. Create a free Cloudinary account and an unsigned upload preset
12. Configure the preset with:
    - allowed formats: `jpg,jpeg,png,webp,heic,heif`
    - maximum file size: `12582912` bytes (12 MB)
    - generated unique public IDs; client-supplied public IDs disabled
    - asset folder: `memory-wall`, with that folder included as the public ID prefix
    - incoming transformation: auto-orient, limit to 2000×2000, WebP quality 82, and `force_strip` metadata
13. Test the preset with JPEG and iPhone HEIC files. Confirm the upload response is WebP, no larger than 2000×2000 or 2 MB.
14. Treat disabling the unsigned preset as the upload kill switch if abuse occurs.

## D. Wiring
15. Set repo Variables (`PUBLIC_FIREBASE_*`, `PUBLIC_RECAPTCHA_SITE_KEY`, `PUBLIC_CLOUDINARY_CLOUD_NAME`, `PUBLIC_CLOUDINARY_UPLOAD_PRESET`) → re-run deploy
16. Deploy [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) as a Cloudflare Worker
17. Create a GitHub OAuth App with callback `<worker-url>/callback`; set the Worker's `GITHUB_CLIENT_ID`, encrypted `GITHUB_CLIENT_SECRET`, and `ALLOWED_DOMAINS`
18. Set `backend.repo` and the Worker URL as `backend.base_url` in `public/admin/config.yml`
19. Local: `cp .env.example .env` and fill

## E. Content
20. Visit /admin/ → sign in with a collaborator account
21. Fill Profile, Biography, Timeline, Photos, Videos, Service, Donations, and optional Music
22. Add og.jpg (1200×630), portrait.jpg, favicon is included
23. Test all three languages + mobile widths

## F. Memory Wall rehearsal
24. Post test Memories with JPEG, HEIC, and YouTube attachments; verify wall, comments, and candle
25. Interrupt a Firestore write after photo upload; verify Submit reuses the completed upload
26. Hide / unhide / edit / delete from `/admin/moderation`
27. Copy a Guest Photo public ID and locate it in Cloudinary's Media Library
28. Verify rules block non-admin updates and deletes (try in incognito)

## G. Go live
29. Enable Cloudinary usage notifications and monitor the free-tier allowance
30. Share URL + QR code on printed materials
31. After services: toggle `service` off in CMS Site Settings
