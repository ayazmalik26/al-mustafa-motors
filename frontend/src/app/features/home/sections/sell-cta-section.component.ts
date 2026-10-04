import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { SettingsService } from '../../../core/services/settings.service';
import { VehicleImageComponent } from '../../../shared/components/vehicle-image.component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { IconComponent } from '../../../shared/ui/icon.component';
import { HOME_IMAGES } from '../home-images';

@Component({
  selector: 'app-sell-cta-section',
  imports: [RouterLink, TranslatePipe, VehicleImageComponent, RevealDirective, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-sand py-20 text-ink-950 sm:py-28" aria-labelledby="sell-title">
      <div class="container-x grid items-center gap-12 lg:grid-cols-[.95fr_1.05fr] lg:gap-20">
        <div>
          <p class="kicker kicker-dark">{{ 'home.sell.kicker' | t }}</p>
          <h2 id="sell-title" class="display-2 mt-3">{{ 'home.sell.titleLead' | t }} <em class="accent-dark">{{ 'home.sell.titleAccent' | t }}</em></h2>
          <p class="mt-5 max-w-md text-[15px] text-muted-ink">{{ 'home.sell.text' | t }}</p>
          <ul class="mt-7 space-y-3 text-sm">
            @for (p of points; track p) {
              <li class="flex items-center gap-3">
                <span class="grid size-6 place-items-center rounded-full bg-[#cbb07c]"><app-icon name="check" [size]="13" [strokeWidth]="2.4" /></span>
                {{ p | t }}
              </li>
            }
          </ul>
          <div class="mt-8 flex flex-wrap gap-2.5">
            <a routerLink="/sell-exchange" class="btn btn-dark btn-lg" data-testid="home-sell-cta">{{ 'home.sell.cta' | t }} <app-icon name="arrow-right" [size]="16" class="flip-rtl" /></a>
            @if (settings.whatsappUrl(); as wa) {
              <a [href]="wa" target="_blank" rel="noopener" class="btn btn-outline-dark btn-lg"><app-icon name="whatsapp" [size]="16" /> {{ 'nav.whatsapp' | t }}</a>
            }
          </div>
        </div>
        <div class="relative" appReveal>
          <app-vehicle-image class="aspect-[5/4] rounded-[18px]" [image]="images.sell" alt="" sizes="(min-width: 1024px) 50vw, 100vw" />
          <div class="pointer-events-none absolute inset-4 rounded-[12px] border border-white/30"></div>
        </div>
      </div>
    </section>
  `,
})
export class SellCtaSectionComponent {
  protected readonly settings = inject(SettingsService);
  protected readonly images = HOME_IMAGES;
  protected readonly points = ['home.sell.point1', 'home.sell.point2', 'home.sell.point3'] as const;
}
