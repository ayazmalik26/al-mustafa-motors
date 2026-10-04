import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { SeoService } from '../../core/services/seo.service';
import { SettingsService } from '../../core/services/settings.service';
import { EnquiryFormComponent } from '../../shared/components/enquiry-form.component';
import { MapEmbedComponent } from '../../shared/components/map-embed.component';
import { ShowroomInfoComponent } from '../../shared/components/showroom-info.component';

@Component({
  selector: 'app-contact-page',
  imports: [TranslatePipe, EnquiryFormComponent, MapEmbedComponent, ShowroomInfoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-ink-950 pb-12 pt-10 sm:pt-14">
      <div class="container-x">
        <p class="kicker">{{ 'contact.kicker' | t }}</p>
        <h1 class="display-2 mt-3">{{ 'contact.titleLead' | t }} <em class="accent">{{ 'contact.titleAccent' | t }}</em></h1>
        <p class="mt-4 max-w-xl text-[15px] text-muted">{{ 'contact.subtitle' | t }}</p>
      </div>
    </section>

    <section class="bg-ink-950 pb-16">
      <div class="container-x grid gap-4 lg:grid-cols-[.85fr_1.15fr]">
        <app-showroom-info />
        <div class="min-h-[380px] overflow-hidden rounded-[18px] border border-white/10 bg-ink-700" data-testid="contact-map">
          <app-map-embed class="h-full min-h-[inherit]" [url]="settings.settings()?.mapEmbedUrl" [name]="settings.businessName()" />
        </div>
      </div>
    </section>

    <section class="bg-sand py-16 text-ink-950 sm:py-20">
      <div class="container-x grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <h2 class="display-3">{{ 'contact.formTitle' | t }}</h2>
          <p class="mt-4 max-w-sm text-sm text-muted-ink">{{ 'form.privacy' | t }}</p>
        </div>
        <div class="panel-light p-5 sm:p-8">
          <app-enquiry-form source="CONTACT_PAGE" tone="light" />
        </div>
      </div>
    </section>
  `,
})
export class ContactPage {
  protected readonly settings = inject(SettingsService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  constructor() {
    effect(() => this.seo.set({ title: this.i18n.t('seo.contact.title'), description: this.i18n.t('seo.contact.description'), path: '/contact' }));
  }
}
