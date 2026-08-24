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
16. GitHub OAuth App (callback `<site>/<repo>/admin/`) → app_id into admin/config.yml
17. Local: `cp .env.example .env` and fill

## E. Content
18. Visit /admin/ → sign in with a collaborator account
19. Fill Profile, Biography, Timeline, Photos, Videos, Service, Donations
20. Add og.jpg (1200×630), portrait.jpg, favicon is included
21. Test all three languages + mobile widths

## F. Memory Wall rehearsal
22. Post test Memories with JPEG, HEIC, and YouTube attachments; verify wall, comments, and candle
23. Interrupt a Firestore write after photo upload; verify Submit reuses the completed upload
24. Hide / unhide / edit / delete from `/admin/moderation`
25. Copy a Guest Photo public ID and locate it in Cloudinary's Media Library
26. Verify rules block non-admin updates and deletes (try in incognito)

## G. Go live
27. Enable Cloudinary usage notifications and monitor the free-tier allowance
28. Share URL + QR code on printed materials
29. After services: toggle `service` off in CMS Site Settings
