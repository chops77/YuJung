export const locales = ['en', 'zh-tw', 'zh-cn'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'zh-tw';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  'zh-tw': '繁體中文',
  'zh-cn': '简体中文',
};

/** BCP-47 html lang tags */
export const langTags: Record<Locale, string> = {
  en: 'en',
  'zh-tw': 'zh-Hant',
  'zh-cn': 'zh-Hans',
};

/** Intl tags for date formatting */
const intlTags: Record<Locale, string> = { en: 'en-US', 'zh-tw': 'zh-TW', 'zh-cn': 'zh-CN' };
export function intlLocale(locale: Locale) { return intlTags[locale]; }