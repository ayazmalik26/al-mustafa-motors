import { Transform } from 'class-transformer';
import { registerDecorator, ValidationOptions } from 'class-validator';
import { isValidPhone } from '../utils/phone.js';

/** Trims strings; turns empty strings into `undefined` so optional fields can be left blank. */
export const TrimOptional = () =>
  Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  });

/** Trims strings but keeps empty strings (lets the required-field validators reject them). */
export const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

/** For PATCH bodies: empty string means "clear this value" and becomes null. */
export const TrimNullable = () =>
  Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  });

/** Converts numeric strings (query params, multipart fields) to numbers. Empty → undefined. */
export const ToNumber = () =>
  Transform(({ value }) => {
    if (value === '' || value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value === 'number') return value;
    const n = Number(String(value).replace(/[,\s]/g, ''));
    return Number.isNaN(n) ? value : n;
  });

/** Converts "true"/"false" strings to booleans. */
export const ToBoolean = () =>
  Transform(({ value }) => {
    if (value === 'true' || value === '1' || value === true) return true;
    if (value === 'false' || value === '0' || value === false) return false;
    return value === '' ? undefined : value;
  });

/** Validates a phone number (Pakistani or international formats). */
export function IsPhone(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isPhone',
      target: object.constructor,
      propertyName,
      options: { message: 'Enter a valid phone number (e.g. 0300 1234567 or +92 300 1234567)', ...options },
      validator: { validate: (value: unknown) => typeof value === 'string' && isValidPhone(value) },
    });
}
