export interface ImageLike {
  url: string;
  thumbUrl?: string | null;
}

const UNSPLASH = /^https:\/\/images\.unsplash\.com\//;

function withWidth(url: string, width: number): string {
  const u = new URL(url);
  u.searchParams.set('w', String(width));
  return u.toString();
}

/**
 * Responsive `srcset` for an image:
 *  - Unsplash (demo data): generated widths via the `w` parameter
 *  - Uploaded images: the stored thumbnail (640w) and large (1600w) variants
 */
export function imageSrcset(image: ImageLike | null | undefined, widths = [480, 800, 1200, 1600]): string | null {
  if (!image?.url) return null;
  if (UNSPLASH.test(image.url)) return widths.map((w) => `${withWidth(image.url, w)} ${w}w`).join(', ');
  if (image.thumbUrl && image.thumbUrl !== image.url) return `${image.thumbUrl} 640w, ${image.url} 1600w`;
  return null;
}

/** Smallest sensible source for small slots (cards, thumbnails). */
export function imageSmall(image: ImageLike | null | undefined): string | null {
  if (!image?.url) return null;
  if (UNSPLASH.test(image.url)) return withWidth(image.url, 640);
  return image.thumbUrl ?? image.url;
}

/** Absolute URL (for Open Graph / JSON-LD). */
export function absoluteUrl(url: string | null | undefined, siteUrl: string): string | null {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return `${siteUrl.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
}
