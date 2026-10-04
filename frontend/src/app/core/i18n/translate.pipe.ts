import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';
import type { TranslationKey } from './translations/en';

/**
 * `{{ 'nav.inventory' | t }}` or `{{ 'inventory.results' | t: { count: 12 } }}`.
 * Impure so it re-evaluates when the language signal changes.
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: TranslationKey, params?: Record<string, string | number | null | undefined>): string {
    return this.i18n.t(key, params);
  }
}
