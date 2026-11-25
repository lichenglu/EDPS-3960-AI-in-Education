import { en, type MessageKey } from './en';
import { es } from './es';

export { en, es };
export type { MessageKey };
export const languages = { en: 'English', es: 'Español' } as const;
export type Locale = keyof typeof languages;
export const localeStorageKey = 'edps3960-language';
type Variables = Record<string, string | number>;

function parseLocale(value: string | null): Locale | undefined {
  return value === 'en' || value === 'es' ? value : undefined;
}

export function readLocale(search: string, readPreference: () => string | null): Locale {
  const explicit = parseLocale(new URLSearchParams(search).get('lang'));
  if (explicit) return explicit;
  try {
    return parseLocale(readPreference()) ?? 'en';
  } catch {
    return 'en';
  }
}

export function localizedHref(href: string, locale: Locale): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  const url = new URL(href, 'https://course.invalid');
  if (locale === 'es') url.searchParams.set('lang', locale);
  else url.searchParams.delete('lang');
  return url.pathname + url.search + url.hash;
}

export function formatMessage(message: string, variables: Variables = {}) {
  return message.replace(/\{(\w+)\}/g, (token, name: string) =>
    Object.hasOwn(variables, name) ? String(variables[name]) : token,
  );
}

const catalogs = { en, es };
export function translate(locale: Locale, key: MessageKey, variables?: Variables): string {
  return formatMessage(catalogs[locale][key], variables);
}
