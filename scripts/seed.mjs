#!/usr/bin/env node
/**
 * Resets the template to a blank slate for a new memorial.
 * Usage: npm run seed
 */
import { rmSync, mkdirSync, writeFileSync } from 'node:fs';

const C = 'src/content';

// Wipe repeatable collections, keep directories
for (const f of ['timeline', 'photos', 'videos', 'donations']) {
  rmSync(`${C}/${f}`, { recursive: true, force: true });
  mkdirSync(`${C}/${f}`, { recursive: true });
  writeFileSync(`${C}/${f}/.gitkeep`, '');
}

writeFileSync(`${C}/settings/settings.yaml`, `# Edit via CMS → Site Settings
siteTitle:
  en: "REPLACE"
  zh_tw: "REPLACE"
  zh_cn: "REPLACE"
sections:
  lifeStory: true
  timeline: true
  gallery: true
  memories: true
  service: true      # switch off once services conclude
  donations: false
contactEmail: ""
footerNote:
  en: ""
  zh_tw: ""
  zh_cn: ""
`);

writeFileSync(`${C}/profile/profile.yaml`, `# Fill via CMS → Memorial Profile
name:
  en: "Full Name"
  zh_tw: "姓名"
  zh_cn: "姓名"
born: 1900-01-01
passed: 2000-01-01
portrait: "media/portrait.jpg"
epitaph:
  en: ""
  zh_tw: ""
  zh_cn: ""
biography:
  en: "REPLACE"
  zh_tw: "REPLACE"
  zh_cn: "REPLACE"
`);

mkdirSync(`${C}/service`, { recursive: true });
writeFileSync(`${C}/service/service.yaml`, `date: 2030-01-01
time: ""
venue:
  en: ""
  zh_tw: ""
  zh_cn: ""
address:
  en: ""
  zh_tw: ""
  zh_cn: ""
mapsUrl: ""
livestreamUrl: ""
`);

console.log(`
✅ Content reset. Next steps:
  1. Replace every REPLACE marker (or just use /admin/ in the browser)
  2. Drop portrait into public/media/
  3. astro.config.mjs → set site + base
  4. public/admin/config.yml → set repo + OAuth app_id
`);