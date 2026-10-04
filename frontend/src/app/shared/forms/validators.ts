import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Same rule as the API: digits/spaces/dashes/parentheses, optional leading +, 10–15 digits. */
export function isValidPhone(value: string): boolean {
  if (!/^\+?[\d\s\-().]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export const phoneValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  return isValidPhone(value) ? null : { phone: true };
};

/** Optional email — the built-in Validators.email accepts "a@b"; this requires a dot in the domain. */
export const emailValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? null : { email: true };
};

/** Whole number (accepts "45,000"). Empty is allowed — combine with Validators.required if needed. */
export const integerValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const raw = control.value;
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(String(raw).replace(/[,\s]/g, ''));
  return Number.isInteger(n) && n >= 0 ? null : { integer: true };
};

export function yearValidator(min = 1970, max = new Date().getFullYear() + 1): ValidatorFn {
  return (control) => {
    const raw = control.value;
    if (raw === null || raw === undefined || raw === '') return null;
    const n = Number(raw);
    return Number.isInteger(n) && n >= min && n <= max ? null : { year: { min, max } };
  };
}

/** Required that ignores whitespace-only input. */
export const requiredTrimmed: ValidatorFn = (control) => (String(control.value ?? '').trim() ? null : { required: true });

export function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Copies API field errors onto matching form controls as { server: message }. */
export function applyServerErrors(form: { get(name: string): AbstractControl | null }, errors: Record<string, string[]> | undefined): boolean {
  if (!errors) return false;
  let applied = false;
  for (const [field, messages] of Object.entries(errors)) {
    const control = form.get(field);
    if (control && messages.length) {
      control.setErrors({ server: messages[0] });
      control.markAsTouched();
      applied = true;
    }
  }
  return applied;
}
