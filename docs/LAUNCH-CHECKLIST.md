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
9. Storage → create bucket → publish storage.rules
10. App Check → register reCAPTCHA v3 (localhost + prod domains)
11. Firestore → collection `admins` → one doc per family member UID

## C. Wiring
12. Set repo Variables (PUBLIC_FIREBASE_*, PUBLIC_RECAPTCHA_SITE_KEY) → re-run deploy
13. GitHub OAuth App (callback `<site>/<repo>/admin/`) → app_id into admin/config.yml
14. Paste Firebase config into public/admin/moderation.html
15. Local: `cp .env.example .env` and fill

## D. Content
16. Visit /admin/ → sign in with a collaborator account
17. Fill Profile, Biography, Timeline, Photos, Videos, Service, Donations
18. Add og.jpg (1200×630), portrait.jpg, favicon is included
19. Test all three languages + mobile widths

## E. Guestbook rehearsal
20. Post test memory w/ photo + video link; verify wall, comments, candle
21. Hide / unhide / edit / delete from moderation panel
22. Verify rules block non-admin writes (try in incognito)

## F. Go live
23. Share URL + QR code on printed materials
24. After services: toggle `service` off in CMS Site Settings