import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Public pages are server-rendered on every request (fresh inventory, correct SEO and
 * Open Graph tags for shared vehicle links). The admin area renders in the browser only.
 */
export const serverRoutes: ServerRoute[] = [
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server },
];
