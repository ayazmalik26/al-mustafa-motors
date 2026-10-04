import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SettingsService } from './settings.service';
import { absoluteUrl } from '../utils/images';

export interface PageSeo {
  title: string;
  description?: string;
  /** Path such as "/inventory/toyota-fortuner-2024"; query strings are dropped from the canonical URL. */
  path: string;
  image?: string | null;
  type?: 'website' | 'product' | 'article';
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | null;
}

/** Sets title, description, canonical URL, Open Graph/Twitter tags and JSON-LD. Works during SSR. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly settings = inject(SettingsService);

  set(page: PageSeo) {
    const siteUrl = this.settings.siteUrl() || this.document.location?.origin || '';
    const url = `${siteUrl}${page.path.split('?')[0]}`;
    const image = absoluteUrl(page.image ?? this.settings.settings()?.heroImageUrl ?? null, siteUrl);
    const siteName = this.settings.businessName();

    this.title.setTitle(page.title);
    this.upsertName('description', page.description ?? '');
    this.upsertName('robots', page.noindex ? 'noindex, nofollow' : 'index, follow');
    this.upsertProperty('og:title', page.title);
    this.upsertProperty('og:description', page.description ?? '');
    this.upsertProperty('og:type', page.type ?? 'website');
    this.upsertProperty('og:url', url);
    this.upsertProperty('og:site_name', siteName);
    this.upsertProperty('og:locale', this.document.documentElement.lang === 'ur' ? 'ur_PK' : 'en_PK');
    this.upsertName('twitter:card', image ? 'summary_large_image' : 'summary');
    this.upsertName('twitter:title', page.title);
    this.upsertName('twitter:description', page.description ?? '');
    if (image) {
      this.upsertProperty('og:image', image);
      this.upsertName('twitter:image', image);
    } else {
      this.meta.removeTag('property="og:image"');
      this.meta.removeTag('name="twitter:image"');
    }
    this.setCanonical(url);
    this.setJsonLd(page.jsonLd ?? null);
  }

  private upsertName(name: string, content: string) {
    this.meta.updateTag({ name, content });
  }

  private upsertProperty(property: string, content: string) {
    this.meta.updateTag({ property, content });
  }

  private setCanonical(url: string) {
    const head = this.document.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private setJsonLd(data: Record<string, unknown> | null) {
    const head = this.document.head;
    head.querySelector('script[data-seo="jsonld"]')?.remove();
    if (!data) return;
    const script = this.document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute('data-seo', 'jsonld');
    // Escape "<" so the JSON can never close the script tag.
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    head.appendChild(script);
  }
}
