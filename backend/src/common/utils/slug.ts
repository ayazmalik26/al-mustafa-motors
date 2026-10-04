import slugifyLib from 'slugify';

export function slugify(input: string): string {
  return slugifyLib(input, { lower: true, strict: true, trim: true }).replace(/-+/g, '-').slice(0, 80);
}

/** Readable vehicle URL slug, e.g. "toyota-fortuner-2024". */
export function vehicleBaseSlug(v: { make: string; model: string; year: number }): string {
  return slugify(`${v.make} ${v.model} ${v.year}`) || 'vehicle';
}

/**
 * Returns `base` if unused, otherwise `base-2`, `base-3`, … using the given existence check.
 */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  if (!(await exists(base))) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
