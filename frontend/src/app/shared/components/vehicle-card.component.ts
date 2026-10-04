import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { Vehicle } from '../../core/models/vehicle.models';
import { IconComponent } from '../ui/icon.component';
import { StatusBadgeComponent } from '../ui/status-badge.component';
import { FavoriteButtonComponent } from './favorite-button.component';
import { VehicleImageComponent } from './vehicle-image.component';

@Component({
  selector: 'app-vehicle-card',
  imports: [RouterLink, TranslatePipe, IconComponent, StatusBadgeComponent, FavoriteButtonComponent, VehicleImageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @let v = vehicle();
    <article
      class="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-ink-800 transition-[transform,border-color,box-shadow] duration-500 ease-[var(--ease-premium)] hover:-translate-y-1 hover:border-gold/45 hover:shadow-[0_30px_60px_-35px_rgba(0,0,0,.9)]"
      [attr.data-testid]="'vehicle-card'"
      [attr.data-slug]="v.slug"
    >
      <a [routerLink]="['/inventory', v.slug]" class="flex h-full flex-col focus-visible:outline-offset-[-3px]">
        <div class="relative aspect-[4/3] overflow-hidden">
          <app-vehicle-image
            class="size-full"
            [image]="v.primaryImage"
            [alt]="v.primaryImage?.alt || v.title + ' ' + v.year"
            [priority]="priority()"
            [sizes]="sizes()"
            imgClass="transition-transform duration-[900ms] ease-[var(--ease-premium)] group-hover:scale-[1.045]"
          />
          <div class="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent"></div>
          <div class="absolute start-3 top-3 flex flex-wrap gap-1.5">
            <app-status-badge [status]="v.status" />
            <span class="chip bg-ink-950/75 text-snow backdrop-blur">{{ i18n.enumLabel('condition', v.condition) }}</span>
          </div>
          @if (v.isDemo) {
            <span class="chip absolute bottom-3 start-3 bg-gold/90 text-ink-950">{{ 'demo.badge' | t }}</span>
          }
          @if (v.imageCount > 1) {
            <span class="absolute bottom-3 end-3 flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[11px] text-white backdrop-blur">
              <app-icon name="camera" [size]="13" /> <span class="ltr-nums">{{ v.imageCount }}</span>
            </span>
          }
        </div>

        <div class="flex flex-1 flex-col p-5">
          <p class="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-2">
            {{ v.make }} · <span class="ltr-nums">{{ v.year }}</span>
          </p>
          <h3 class="mt-1 font-serif text-[1.75rem] leading-[1.1]">
            {{ v.model }}
            @if (v.variant) {
              <span class="block truncate font-sans text-sm font-normal text-muted">{{ v.variant }}</span>
            }
          </h3>
          <ul class="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-b border-white/10 pb-4 text-xs text-muted" [attr.aria-label]="'vehicle.specifications' | t">
            <li class="flex items-center gap-1.5"><app-icon name="gauge" [size]="14" />{{ i18n.km(v.mileage) }}</li>
            <li class="flex items-center gap-1.5"><app-icon name="fuel" [size]="14" />{{ i18n.enumLabel('fuelType', v.fuelType) }}</li>
            <li class="flex items-center gap-1.5"><app-icon name="gear" [size]="14" />{{ i18n.enumLabel('transmission', v.transmission) }}</li>
          </ul>
          <div class="mt-auto flex items-center justify-between gap-3 pt-4">
            <span class="text-sm font-semibold" [class.text-muted]="v.status === 'SOLD'" data-testid="vehicle-price">{{ price() }}</span>
            <span class="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-gold-light">
              {{ 'vehicle.viewDetails' | t }}
              <app-icon name="arrow-right" [size]="14" class="flip-rtl transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </span>
          </div>
        </div>
      </a>
      <app-favorite-button class="absolute end-3 top-3" [vehicleId]="v.id" [label]="v.title" />
    </article>
  `,
})
export class VehicleCardComponent {
  protected readonly i18n = inject(I18nService);
  readonly vehicle = input.required<Vehicle>();
  readonly priority = input(false);
  readonly sizes = input('(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw');

  protected readonly price = computed(() => {
    const v = this.vehicle();
    return v.status === 'SOLD' ? this.i18n.t('enum.status.SOLD') : this.i18n.price(v);
  });
}
