import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { SeoService } from '../../core/services/seo.service';
import { SettingsService } from '../../core/services/settings.service';
import { FeaturedSectionComponent } from './sections/featured-section.component';
import { FinderSectionComponent } from './sections/finder-section.component';
import { HeroSectionComponent } from './sections/hero-section.component';
import { SellCtaSectionComponent } from './sections/sell-cta-section.component';
import { ServicesSectionComponent } from './sections/services-section.component';
import { ShowroomSectionComponent } from './sections/showroom-section.component';
import { TrustSectionComponent } from './sections/trust-section.component';

@Component({
  selector: 'app-home-page',
  imports: [
    HeroSectionComponent,
    FinderSectionComponent,
    FeaturedSectionComponent,
    ServicesSectionComponent,
    TrustSectionComponent,
    SellCtaSectionComponent,
    ShowroomSectionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-hero-section />
    <app-finder-section />
    <app-featured-section />
    <app-services-section />
    <app-trust-section />
    <app-sell-cta-section />
    <app-showroom-section />
  `,
})
export class HomePage {
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  private readonly settings = inject(SettingsService);

  constructor() {
    effect(() => {
      const s = this.settings.settings();
      this.seo.set({
        title: this.i18n.t('seo.home.title'),
        description: this.i18n.t('seo.home.description'),
        path: '/',
        jsonLd: s
          ? {
              '@context': 'https://schema.org',
              '@type': 'AutoDealer',
              name: s.businessName,
              url: s.siteUrl,
              telephone: s.phone,
              address: { '@type': 'PostalAddress', streetAddress: s.address, addressLocality: 'Karachi', addressCountry: 'PK' },
              ...(s.latitude != null && s.longitude != null && { geo: { '@type': 'GeoCoordinates', latitude: s.latitude, longitude: s.longitude } }),
              ...(s.facebookUrl || s.instagramUrl ? { sameAs: [s.facebookUrl, s.instagramUrl].filter(Boolean) } : {}),
            }
          : null,
      });
    });
  }
}
