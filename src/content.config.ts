import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const settings = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/settings' }),
  schema: z.object({
    siteTitle: z.object({ en: z.string(), zh_tw: z.string(), zh_cn: z.string() }),
    sections: z.object({
      lifeStory: z.boolean(), timeline: z.boolean(),
      gallery: z.boolean(), memories: z.boolean(),
      service: z.boolean(), donations: z.boolean(),
    }).default({ lifeStory: true, timeline: true, gallery: true,
                 memories: true, service: true, donations: false }),
    contactEmail: z.string().optional(),
    footerNote: z.record(z.string()).optional(),
  }),
});

const profile = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/profile' }),
  schema: z.object({
    name: z.object({ en: z.string(), zh_tw: z.string(), zh_cn: z.string() }),
    born: z.coerce.date(), passed: z.coerce.date(),
    portrait: z.string(),
    epitaph: z.record(z.string()).default({}),
    biography: z.record(z.string()).default({}),
  }),
});

const timeline = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/timeline' }),
  schema: z.object({
    date: z.coerce.date(), image: z.string().optional(),
    title: z.record(z.string()), text: z.record(z.string()),
    order: z.number().default(0),
  }),
});

const photos = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/photos' }),
  schema: z.object({
    image: z.string(), caption: z.record(z.string()).default({}),
    alt: z.record(z.string()).default({}), order: z.number().default(0),
  }),
});

const videos = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/videos' }),
  schema: z.object({
    youtubeId: z.string(), title: z.record(z.string()).default({}),
    order: z.number().default(0),
  }),
});

const service = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/service' }),
  schema: z.object({
    date: z.coerce.date(),
    time: z.string().optional(),
    venue: z.record(z.string()).default({}),
    address: z.record(z.string()).default({}),
    mapsUrl: z.string().optional(),
    livestreamUrl: z.string().optional(),
  }),
});

const donations = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/donations' }),
  schema: z.object({
    name: z.string(), url: z.string(),
    blurb: z.record(z.string()).default({}),
    order: z.number().default(0),
  }),
});

export const collections = { settings, profile, timeline, photos, videos, service, donations };