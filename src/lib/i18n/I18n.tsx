import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  localizedHref,
  localeStorageKey,
  readLocale,
  translate,
  type Locale,
  type MessageKey,
} from './messages';

const I18nContext = createContext<{ locale: Locale; selectLocale: (locale: Locale) => void } | null>(null);

export function I18nProvider({
  children,
  pageTitle = 'courseName',
}: {
  children: ReactNode;
  pageTitle?: MessageKey;
}) {
  const [locale, setLocale] = useState(() =>
    readLocale(location.search, () => localStorage.getItem(localeStorageKey)),
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translate(locale, pageTitle);
    document.querySelector('.studio-skip, .skip-link')?.replaceChildren(translate(locale, 'skipToContent'));
  }, [locale, pageTitle]);

  function selectLocale(next: Locale) {
    setLocale(next);
    try {
      localStorage.setItem(localeStorageKey, next);
    } catch {
      /* The URL carries the preference when storage is blocked. */
    }
    const url = new URL(location.href);
    url.searchParams.set('lang', next);
    history.replaceState(history.state, '', url);
  }

  return <I18nContext.Provider value={{ locale, selectLocale }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const settings = useContext(I18nContext);
  const locale = settings?.locale ?? 'en';
  return {
    locale,
    selectLocale: settings?.selectLocale,
    t: (key: MessageKey, variables?: Record<string, string | number>) => translate(locale, key, variables),
    href: (path: string) => localizedHref(path, locale),
  };
}
