/**
 * Internationalization stub
 *
 * Minimal i18n implementation. Replace with a full i18n library
 * (e.g. @lingui/core) when translation support is needed.
 */

export const SUPPORTED_LOCALES = ['en', 'zh', 'es'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

const STORAGE_KEY = 'thinkt-locale';

/** Initialize i18n and return the current locale */
export async function initI18n(): Promise<SupportedLocale> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
    return stored as SupportedLocale;
  }
  return 'en';
}

/** Change the active locale (persists to localStorage) */
export async function changeLocale(locale: SupportedLocale): Promise<void> {
  localStorage.setItem(STORAGE_KEY, locale);
}
