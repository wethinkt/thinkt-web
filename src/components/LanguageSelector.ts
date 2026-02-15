export interface LanguageSelectorOptions<TLocale extends string> {
  container: HTMLElement;
  locales: readonly TLocale[];
  currentLocale: TLocale;
  onChange: (locale: TLocale) => void | Promise<void>;
}

export class LanguageSelector<TLocale extends string> {
  private readonly container: HTMLElement;
  private readonly locales: readonly TLocale[];
  private readonly onChange: (locale: TLocale) => void | Promise<void>;
  private currentLocale: TLocale;
  private readonly selectEl: HTMLSelectElement;

  constructor(options: LanguageSelectorOptions<TLocale>) {
    this.container = options.container;
    this.locales = options.locales;
    this.onChange = options.onChange;
    this.currentLocale = options.currentLocale;

    this.selectEl = document.createElement('select');
    this.selectEl.id = 'lang-select';
    this.selectEl.addEventListener('change', this.handleChange);

    this.container.replaceChildren(this.selectEl);
    this.renderOptions();
  }

  setCurrentLocale(locale: TLocale): void {
    this.currentLocale = locale;
    this.renderOptions();
  }

  dispose(): void {
    this.selectEl.removeEventListener('change', this.handleChange);
    this.container.replaceChildren();
  }

  private readonly handleChange = (): void => {
    const nextLocale = this.selectEl.value as TLocale;
    if (!this.locales.includes(nextLocale)) {
      this.selectEl.value = this.currentLocale;
      return;
    }

    void Promise.resolve(this.onChange(nextLocale)).catch((error: unknown) => {
      console.error('[THINKT] Failed to change locale:', error);
      this.selectEl.value = this.currentLocale;
    });
  };

  private renderOptions(): void {
    this.selectEl.replaceChildren();

    for (const locale of this.locales) {
      const option = document.createElement('option');
      option.value = locale;
      option.textContent = this.getLocaleLabel(locale);
      this.selectEl.appendChild(option);
    }

    this.selectEl.value = this.currentLocale;
  }

  private createDisplayNames(displayLocale: string): Intl.DisplayNames | null {
    try {
      return new Intl.DisplayNames([displayLocale], { type: 'language' });
    } catch {
      return null;
    }
  }

  private getLocaleLabel(locale: TLocale): string {
    const displayNames = this.createDisplayNames(locale);
    if (!displayNames) {
      return locale;
    }

    return displayNames.of(locale) ?? locale;
  }
}
