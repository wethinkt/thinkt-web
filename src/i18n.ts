import { i18n, type Messages } from '@lingui/core';

export const SUPPORTED_LOCALES = ['en', 'zh', 'es'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

const STORAGE_KEY = 'thinkt-locale';
const DEFAULT_LOCALE: SupportedLocale = 'en';

const CATALOG_LOADERS: Record<SupportedLocale, () => Promise<{ messages: Messages }>> = {
  en: () => import('./locales/en/messages.po'),
  zh: () => import('./locales/zh/messages.po'),
  es: () => import('./locales/es/messages.po'),
};

const loadedLocales = new Set<SupportedLocale>();

function normalizeLocale(raw: string | null | undefined): SupportedLocale | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const base = lower.split('-')[0];

  if (SUPPORTED_LOCALES.includes(lower as SupportedLocale)) {
    return lower as SupportedLocale;
  }
  if (SUPPORTED_LOCALES.includes(base as SupportedLocale)) {
    return base as SupportedLocale;
  }
  return null;
}

async function loadCatalog(locale: SupportedLocale): Promise<void> {
  if (loadedLocales.has(locale)) return;
  const catalog = await CATALOG_LOADERS[locale]();
  i18n.load(locale, catalog.messages);
  loadedLocales.add(locale);
}

async function activateLocale(locale: SupportedLocale): Promise<void> {
  await loadCatalog(locale);
  i18n.activate(locale);
}

/** Initialize i18n and return the active locale. */
export async function initI18n(): Promise<SupportedLocale> {
  const stored = normalizeLocale(localStorage.getItem(STORAGE_KEY));
  const browser = normalizeLocale(navigator.language);
  const locale = stored ?? browser ?? DEFAULT_LOCALE;

  await activateLocale(locale);
  return locale;
}

/** Change the active locale and persist to localStorage. */
export async function changeLocale(locale: SupportedLocale): Promise<void> {
  localStorage.setItem(STORAGE_KEY, locale);
  await activateLocale(locale);
}
