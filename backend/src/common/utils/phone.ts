/** Accepts digits, spaces, dashes, dots and parentheses with an optional leading +; 10–15 digits. */
export function isValidPhone(value: string): boolean {
  if (!/^\+?[\d\s\-().]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Returns the digits to match against stored (normalised, +92…) phone numbers when a search
 * query looks like a phone number, otherwise null. "0300 123" → "300123".
 */
export function phoneSearchFragment(query: string): string | null {
  if (!/^\+?[\d\s\-().]+$/.test(query.trim())) return null;
  const digits = query.replace(/\D/g, '').replace(/^0+/, '');
  return digits.length >= 3 ? digits : null;
}

/**
 * Normalises a phone number for storage/WhatsApp: keeps a leading + and digits.
 * Pakistani local numbers (03xx…) are converted to +92 format.
 */
export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) return `+${digits}`;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('0') && digits.length === 11) return `+92${digits.slice(1)}`;
  if (digits.startsWith('92') && digits.length === 12) return `+${digits}`;
  return digits;
}
