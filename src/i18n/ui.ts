import en from './en.json';
import zhTw from './zh-tw.json';
import zhCn from './zh-cn.json';
import { defaultLocale, intlLocale, type Locale } from '../config';

type Dict = Record<string, string>;
const dicts: Record<Locale, Dict> = { en, 'zh-tw': zhTw, 'zh-cn': zhCn };

/** Returns a translate function: const $t = t(locale); $t('nav.home') */
export function t(locale: Locale) {
  return (key: string, vars?: Record<string, string | number>): string => {
    let s = dicts[locale][key] ?? dicts[defaultLocale][key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}

/**
 * Content YAML stores per-language fields keyed `en` / `zh_tw` / `zh_cn`,
 * while route locales are `en` / `zh-tw` / `zh-cn`. This picks correctly,
 * falling back to English, then empty string.
 */
const FIELD_KEY = { en: 'en', 'zh-tw': 'zh_tw', 'zh-cn': 'zh_cn' } as const;
export function pick(field: Record<string, string> | undefined | null, locale: Locale): string {
  return field?.[FIELD_KEY[locale]] ?? field?.['en'] ?? '';
}

/** "March 12, 1948" / 「1948年3月12日」 */
export function formatDate(d: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    year: 'numeric', month: 'long', day: 'numeric',
  }).format(d);
}