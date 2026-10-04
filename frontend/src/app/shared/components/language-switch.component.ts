import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import type { Lang } from '../../core/models/lead.models';

@Component({
  selector: 'app-language-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex rounded-full border p-[3px]" [class]="tone() === 'light' ? 'border-black/15' : 'border-white/15'" role="group" [attr.aria-label]="i18n.t('nav.language')">
      @for (option of options; track option.lang) {
        <button
          type="button"
          class="min-h-9 rounded-full px-3 text-xs font-semibold transition-colors"
          [class]="
            i18n.lang() === option.lang
              ? tone() === 'light' ? 'bg-ink-950 text-white' : 'bg-white text-ink-950'
              : tone() === 'light' ? 'text-ink-950/70 hover:text-ink-950' : 'text-white/70 hover:text-white'
          "
          [class.font-urdu]="option.lang === 'ur'"
          [class.text-sm]="option.lang === 'ur'"
          [attr.lang]="option.lang"
          [attr.aria-pressed]="i18n.lang() === option.lang"
          (click)="i18n.setLang(option.lang)"
          [attr.data-testid]="'lang-' + option.lang"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
})
export class LanguageSwitchComponent {
  protected readonly i18n = inject(I18nService);
  readonly tone = input<'dark' | 'light'>('dark');
  protected readonly options: { lang: Lang; label: string }[] = [
    { lang: 'en', label: 'EN' },
    { lang: 'ur', label: 'اردو' },
  ];
}
