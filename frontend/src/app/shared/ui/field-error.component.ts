import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { AbstractControl } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import type { TranslationKey } from '../../core/i18n/translations/en';

/** Maps Angular validator errors to translated messages. */
export function validationMessage(errors: Record<string, unknown> | null | undefined, i18n: I18nService, overrides: Partial<Record<string, TranslationKey>> = {}): string | null {
  if (!errors) return null;
  const [key, value] = Object.entries(errors)[0] ?? [];
  if (!key) return null;
  const override = overrides[key];
  if (override) return i18n.t(override);
  const v = value as Record<string, number> | undefined;
  switch (key) {
    case 'required':
      return i18n.t('validation.required');
    case 'email':
      return i18n.t('validation.email');
    case 'phone':
      return i18n.t('validation.phone');
    case 'minlength':
      return i18n.t('validation.minlength', { min: v?.['requiredLength'] });
    case 'maxlength':
      return i18n.t('validation.maxlength', { max: v?.['requiredLength'] });
    case 'min':
      return i18n.t('validation.min', { min: v?.['min'] });
    case 'max':
      return i18n.t('validation.max', { max: v?.['max'] });
    case 'integer':
      return i18n.t('validation.number');
    case 'year':
      return i18n.t('validation.year', { min: v?.['min'], max: v?.['max'] });
    case 'server':
      return String(value);
    default:
      return i18n.t('validation.required');
  }
}

/**
 * Shows the first error for a control once it has been touched (or the form submitted).
 * Uses default change detection so it refreshes whenever the host form does (e.g. on blur).
 * The element id should be referenced by the input's aria-describedby.
 */
@Component({
  selector: 'app-field-error',
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    @if (message; as msg) {
      <p class="field-error" [id]="id()" role="alert">{{ msg }}</p>
    }
  `,
})
export class FieldErrorComponent {
  private readonly i18n = inject(I18nService);
  readonly control = input.required<AbstractControl>();
  readonly id = input.required<string>();
  readonly show = input(false);
  readonly overrides = input<Partial<Record<string, TranslationKey>>>({});

  protected get message(): string | null {
    this.i18n.lang();
    const control = this.control();
    if (!this.show() && !control.touched) return null;
    return control.invalid ? validationMessage(control.errors, this.i18n, this.overrides()) : null;
  }
}
