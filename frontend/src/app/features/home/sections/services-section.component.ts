import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { SettingsService } from '../../../core/services/settings.service';
import { VehicleImageComponent } from '../../../shared/components/vehicle-image.component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { IconComponent } from '../../../shared/ui/icon.component';
import { HOME_IMAGES } from '../home-images';

/** Buy · Sell · Exchange · Vehicle assistance — editorial grid on a cream surface. */
@Component({
  selector: 'app-services-section',
  imports: [RouterLink, TranslatePipe, VehicleImageComponent, RevealDirective, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-cream py-20 text-ink-950 sm:py-28" aria-labelledby="services-title">
      <div class="container-x">
        <div class="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p class="kicker kicker-dark">{{ 'home.services.kicker' | t }}</p>
            <h2 id="services-title" class="display-2 mt-3">{{ 'home.services.titleLead' | t }} <em class="accent-dark">{{ 'home.services.titleAccent' | t }}</em></h2>
          </div>
          <p class="max-w-md text-sm text-muted-ink">{{ 'home.services.text' | t }}</p>
        </div>

        <div class="grid gap-4 lg:grid-cols-[1.15fr_1fr_1fr] lg:grid-rows-[minmax(250px,auto)_minmax(250px,auto)]">
          <!-- Buy -->
          <article class="group relative min-h-[420px] overflow-hidden rounded-[18px] bg-ink-850 text-white lg:row-span-2 lg:min-h-[560px]" appReveal>
            <app-vehicle-image class="absolute inset-0" [image]="images.showroomRow" alt="" sizes="(min-width: 1024px) 40vw, 100vw" imgClass="transition-transform duration-[1200ms] group-hover:scale-[1.04]" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>
            <div class="absolute inset-x-7 bottom-7">
              <span class="kicker">01</span>
              <h3 class="mt-2 font-serif text-[2.6rem] leading-none">{{ 'services.buy.title' | t }}</h3>
              <p class="mt-3 max-w-sm text-sm text-[#d0d5d1]">{{ 'services.buy.text' | t }}</p>
              <a routerLink="/inventory" class="btn btn-light mt-5">{{ 'services.buy.cta' | t }} <app-icon name="arrow-right" [size]="15" class="flip-rtl" /></a>
            </div>
          </article>

          <!-- Sell -->
          <article class="relative flex flex-col rounded-[18px] border border-[#d5cec1] bg-stone p-7" appReveal="80">
            <span class="absolute end-6 top-5 font-serif text-4xl text-gold">02</span>
            <span class="grid size-11 place-items-center rounded-xl bg-ink-950 text-gold"><app-icon name="tag" [size]="20" /></span>
            <h3 class="mt-6 font-serif text-[2rem] leading-none">{{ 'services.sell.title' | t }}</h3>
            <p class="mt-3 max-w-xs text-sm text-muted-ink">{{ 'services.sell.text' | t }}</p>
            <a routerLink="/sell-exchange" [queryParams]="{ intent: 'SELL' }" class="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-bold">
              {{ 'services.sell.cta' | t }} <app-icon name="arrow-right" [size]="15" class="flip-rtl" />
            </a>
          </article>

          <!-- Exchange -->
          <article class="relative flex flex-col rounded-[18px] bg-ink-850 p-7 text-white" appReveal="160">
            <span class="absolute end-6 top-5 font-serif text-4xl text-gold">03</span>
            <span class="grid size-11 place-items-center rounded-xl bg-white/10 text-gold"><app-icon name="swap" [size]="20" /></span>
            <h3 class="mt-6 font-serif text-[2rem] leading-none">{{ 'services.exchange.title' | t }}</h3>
            <p class="mt-3 max-w-xs text-sm text-[#abb2ad]">{{ 'services.exchange.text' | t }}</p>
            <a routerLink="/sell-exchange" [queryParams]="{ intent: 'EXCHANGE' }" class="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-bold text-gold-light">
              {{ 'services.exchange.cta' | t }} <app-icon name="arrow-right" [size]="15" class="flip-rtl" />
            </a>
          </article>

          <!-- Assistance -->
          <article class="group relative grid overflow-hidden rounded-[18px] border border-[#d5cec1] bg-paper sm:grid-cols-[1fr_.9fr] lg:col-span-2" appReveal="120">
            <div class="flex flex-col p-7">
              <span class="font-serif text-4xl text-gold-dark">04</span>
              <h3 class="mt-4 font-serif text-[2rem] leading-none">{{ 'services.assist.title' | t }}</h3>
              <p class="mt-3 max-w-sm text-sm text-muted-ink">{{ 'services.assist.text' | t }}</p>
              <div class="mt-auto flex flex-wrap gap-2 pt-6">
                @if (settings.whatsappUrl(); as wa) {
                  <a [href]="wa" target="_blank" rel="noopener" class="btn btn-dark btn-sm"><app-icon name="whatsapp" [size]="15" /> {{ 'nav.whatsapp' | t }}</a>
                }
                <a routerLink="/contact" class="btn btn-outline-dark btn-sm">{{ 'services.assist.cta' | t }}</a>
              </div>
            </div>
            <app-vehicle-image class="min-h-[220px]" [image]="images.assistance" alt="" sizes="(min-width: 1024px) 25vw, 100vw" imgClass="transition-transform duration-[1200ms] group-hover:scale-[1.04]" />
          </article>
        </div>
      </div>
    </section>
  `,
})
export class ServicesSectionComponent {
  protected readonly settings = inject(SettingsService);
  protected readonly images = HOME_IMAGES;
}
