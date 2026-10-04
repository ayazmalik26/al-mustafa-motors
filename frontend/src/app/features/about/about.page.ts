import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { TranslationKey } from '../../core/i18n/translations/en';
import { SeoService } from '../../core/services/seo.service';
import { SettingsService } from '../../core/services/settings.service';
import { MapEmbedComponent } from '../../shared/components/map-embed.component';
import { ShowroomInfoComponent } from '../../shared/components/showroom-info.component';
import { VehicleImageComponent } from '../../shared/components/vehicle-image.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { IconComponent } from '../../shared/ui/icon.component';
import { HOME_IMAGES } from '../home/home-images';

/** Business description comes from admin settings; no unverified claims are shown. */
@Component({
  selector: 'app-about-page',
  imports: [RouterLink, TranslatePipe, MapEmbedComponent, ShowroomInfoComponent, VehicleImageComponent, RevealDirective, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-ink-950 pb-16 pt-10 sm:pt-14">
      <div class="container-x grid items-end gap-10 lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <p class="kicker">{{ 'about.kicker' | t }}</p>
          <h1 class="display-2 mt-3 max-w-[14ch] rtl:max-w-none">{{ 'about.titleLead' | t }} <em class="accent">{{ 'about.titleAccent' | t }}</em></h1>
          @if (settings.description(); as d) {
            <p class="prose-am mt-6 max-w-xl text-[15px] leading-relaxed text-[#c9cec9]">{{ d }}</p>
          }
          <a routerLink="/inventory" class="btn btn-gold btn-lg mt-8">{{ 'about.cta' | t }} <app-icon name="arrow-right" [size]="16" class="flip-rtl" /></a>
        </div>
        <app-vehicle-image class="aspect-[5/4] rounded-[18px]" [image]="images.showroomRow" alt="" sizes="(min-width: 1024px) 45vw, 100vw" [priority]="true" />
      </div>
    </section>

    <section class="bg-cream py-16 text-ink-950 sm:py-24">
      <div class="container-x">
        <p class="kicker kicker-dark">{{ 'about.whatWeDo' | t }}</p>
        <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          @for (s of services; track s.title; let i = $index) {
            <article class="rounded-[18px] border border-[#d5cec1] bg-paper p-6" [appReveal]="i * 70">
              <span class="grid size-11 place-items-center rounded-xl bg-ink-950 text-gold"><app-icon [name]="s.icon" [size]="20" /></span>
              <h2 class="mt-5 font-serif text-2xl">{{ s.title | t }}</h2>
              <p class="mt-2 text-sm text-muted-ink">{{ s.text | t }}</p>
            </article>
          }
        </div>
      </div>
    </section>

    <section class="bg-ink-900 py-16 sm:py-24">
      <div class="container-x">
        <p class="kicker">{{ 'about.howItWorks' | t }}</p>
        <ol class="mt-8 grid gap-6 md:grid-cols-4">
          @for (step of steps; track step.title; let i = $index) {
            <li class="border-t border-white/15 pt-5">
              <span class="font-serif text-3xl text-gold ltr-nums">0{{ i + 1 }}</span>
              <h3 class="mt-3 font-serif text-xl">{{ step.title | t }}</h3>
              <p class="mt-2 text-sm text-muted">{{ step.text | t }}</p>
            </li>
          }
        </ol>
      </div>
    </section>

    <section class="bg-ink-950 py-16 sm:py-24">
      <div class="container-x">
        <h2 class="display-3 mb-8">{{ 'about.visit' | t }}</h2>
        <div class="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
          <app-showroom-info />
          <div class="min-h-[360px] overflow-hidden rounded-[18px] border border-white/10 bg-ink-700">
            @defer (on viewport) {
              <app-map-embed class="h-full min-h-[inherit]" [url]="settings.settings()?.mapEmbedUrl" [name]="settings.businessName()" />
            } @placeholder {
              <div class="grid h-full min-h-[360px] place-items-center text-sm text-muted">{{ 'showroom.mapLoading' | t }}</div>
            }
          </div>
        </div>
      </div>
    </section>
  `,
})
export class AboutPage {
  protected readonly settings = inject(SettingsService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  protected readonly images = HOME_IMAGES;

  protected readonly services: { icon: string; title: TranslationKey; text: TranslationKey }[] = [
    { icon: 'car', title: 'services.buy.title', text: 'services.buy.text' },
    { icon: 'tag', title: 'services.sell.title', text: 'services.sell.text' },
    { icon: 'swap', title: 'services.exchange.title', text: 'services.exchange.text' },
    { icon: 'wrench', title: 'services.assist.title', text: 'services.assist.text' },
  ];
  protected readonly steps: { title: TranslationKey; text: TranslationKey }[] = [
    { title: 'home.trust.1.title', text: 'home.trust.1.text' },
    { title: 'home.trust.2.title', text: 'home.trust.2.text' },
    { title: 'home.trust.3.title', text: 'home.trust.3.text' },
    { title: 'home.trust.4.title', text: 'home.trust.4.text' },
  ];

  constructor() {
    effect(() => this.seo.set({ title: this.i18n.t('seo.about.title'), description: this.i18n.t('seo.about.description'), path: '/about' }));
  }
}
