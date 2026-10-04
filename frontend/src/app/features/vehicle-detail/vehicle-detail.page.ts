import { ChangeDetectionStrategy, Component, RESPONSE_INIT, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { toAppError } from '../../core/http/api';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { TranslationKey } from '../../core/i18n/translations/en';
import type { AppError } from '../../core/models/api.models';
import type { Vehicle } from '../../core/models/vehicle.models';
import { SeoService } from '../../core/services/seo.service';
import { SettingsService } from '../../core/services/settings.service';
import { VehicleService } from '../../core/services/vehicle.service';
import { absoluteUrl } from '../../core/utils/images';
import { telLink, vehicleWhatsAppMessage, whatsappLink } from '../../core/utils/whatsapp';
import { EnquiryFormComponent } from '../../shared/components/enquiry-form.component';
import { FavoriteButtonComponent } from '../../shared/components/favorite-button.component';
import { ShareButtonComponent } from '../../shared/components/share-button.component';
import { VehicleCardComponent } from '../../shared/components/vehicle-card.component';
import { DialogComponent } from '../../shared/ui/dialog.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { EmptyStateComponent, ErrorStateComponent } from '../../shared/ui/states.component';
import { GalleryComponent } from './gallery.component';

type DetailState = { status: 'loading' } | { status: 'success'; vehicle: Vehicle } | { status: 'error'; error: AppError };

@Component({
  selector: 'app-vehicle-detail-page',
  imports: [
    RouterLink,
    TranslatePipe,
    GalleryComponent,
    EnquiryFormComponent,
    FavoriteButtonComponent,
    ShareButtonComponent,
    VehicleCardComponent,
    DialogComponent,
    IconComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (state().status) {
      @case ('loading') {
        <div class="container-x py-10" aria-busy="true">
          <div class="skeleton mb-6 h-4 w-60"></div>
          <div class="grid gap-10 lg:grid-cols-[1.4fr_.8fr]">
            <div class="skeleton aspect-[16/11] rounded-[18px]"></div>
            <div class="space-y-4"><div class="skeleton h-4 w-32"></div><div class="skeleton h-14 w-3/4"></div><div class="skeleton h-8 w-40"></div><div class="skeleton h-40 w-full"></div></div>
          </div>
        </div>
      }
      @case ('error') {
        <div class="container-x py-16">
          @if (errorStatus() === 404) {
            <app-empty-state [title]="'vehicle.notFoundTitle' | t" [message]="'vehicle.notFoundBody' | t" icon="car">
              <a routerLink="/inventory" class="btn btn-light">{{ 'vehicle.backToInventory' | t }}</a>
            </app-empty-state>
          } @else {
            <app-error-state [network]="errorStatus() === 0" (retry)="reload()" />
          }
        </div>
      }
      @case ('success') {
        @if (vehicle(); as v) {
          <article class="page-enter pb-28 md:pb-16" data-testid="vehicle-detail">
            <div class="container-x pt-6 sm:pt-8">
              <nav class="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-muted" aria-label="Breadcrumb">
                <a routerLink="/inventory" class="inline-flex items-center gap-1 hover:text-white">
                  <app-icon name="arrow-left" [size]="14" class="flip-rtl" /> {{ 'nav.inventory' | t }}
                </a>
                <span aria-hidden="true">/</span>
                <a routerLink="/inventory" [queryParams]="{ make: v.make }" class="hover:text-white">{{ v.make }}</a>
                <span aria-hidden="true">/</span>
                <span class="text-snow" aria-current="page">{{ v.model }} {{ v.year }}</span>
              </nav>

              <!-- Phones: gallery → summary & actions → specs. Desktop: summary is a sticky side column. -->
              <div class="grid gap-8 lg:grid-cols-[1.4fr_.8fr] lg:gap-x-12 lg:gap-y-0">
                <div class="min-w-0 lg:col-start-1 lg:row-start-1">
                  <app-gallery [images]="v.images" [title]="v.title + ' ' + v.year" />
                </div>

                <div class="min-w-0 lg:col-start-1 lg:row-start-2">
                  <section class="lg:mt-10" aria-labelledby="specs-title">
                    <h2 id="specs-title" class="font-serif text-3xl">{{ 'vehicle.specifications' | t }}</h2>
                    <dl class="mt-5 grid border-t border-white/10 sm:grid-cols-2" data-testid="vehicle-specs">
                      @for (spec of specs(); track spec.label) {
                        <div class="flex items-baseline justify-between gap-4 border-b border-white/10 py-3.5 sm:[&:nth-child(odd)]:pe-6 sm:[&:nth-child(even)]:ps-6">
                          <dt class="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-2 rtl:text-[13px] rtl:normal-case rtl:tracking-normal">{{ spec.label | t }}</dt>
                          <dd class="text-end text-sm">{{ spec.value }}</dd>
                        </div>
                      }
                    </dl>
                  </section>

                  @if (v.description) {
                    <section class="mt-10" aria-labelledby="desc-title">
                      <h2 id="desc-title" class="font-serif text-3xl">{{ 'vehicle.description' | t }}</h2>
                      <p class="prose-am mt-4 max-w-2xl text-[15px] leading-relaxed text-[#c9cec9]" dir="auto">{{ v.description }}</p>
                    </section>
                  }
                </div>

                <!-- Summary & actions -->
                <aside class="row-start-2 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
                  <div class="panel p-6 sm:p-7">
                    <div class="flex flex-wrap items-center gap-2">
                      <app-status-badge [status]="v.status" />
                      <span class="chip bg-white/10 text-snow">{{ i18n.enumLabel('condition', v.condition) }}</span>
                      @if (v.isDemo) { <span class="chip bg-gold text-ink-950">{{ 'demo.badge' | t }}</span> }
                    </div>
                    <p class="kicker mt-5">{{ v.make }} · <span class="ltr-nums">{{ v.year }}</span></p>
                    <h1 class="mt-2 font-serif text-[2.6rem] leading-[1] sm:text-5xl" data-testid="vehicle-title">
                      {{ v.make }} {{ v.model }}
                      @if (v.variant) { <span class="mt-2 block font-sans text-lg font-normal text-muted">{{ v.variant }}</span> }
                    </h1>
                    <p class="mt-5 font-serif text-3xl text-gold-light" data-testid="vehicle-price-detail">{{ priceLabel() }}</p>
                    @if (v.price != null && !v.priceDisplay) {
                      <p class="mt-1 text-xs text-muted ltr-nums">{{ i18n.money(v.price) }}</p>
                    }

                    <ul class="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
                      <li class="rounded-xl bg-white/5 px-2 py-3"><app-icon name="gauge" [size]="16" class="mx-auto mb-1 text-gold" />{{ i18n.km(v.mileage) }}</li>
                      <li class="rounded-xl bg-white/5 px-2 py-3"><app-icon name="fuel" [size]="16" class="mx-auto mb-1 text-gold" />{{ i18n.enumLabel('fuelType', v.fuelType) }}</li>
                      <li class="rounded-xl bg-white/5 px-2 py-3"><app-icon name="gear" [size]="16" class="mx-auto mb-1 text-gold" />{{ i18n.enumLabel('transmission', v.transmission) }}</li>
                    </ul>

                    @if (v.status !== 'AVAILABLE') {
                      <p class="mt-5 rounded-xl border px-4 py-3 text-sm" [class]="v.status === 'SOLD' ? 'border-white/15 bg-white/5 text-muted' : 'border-warning/30 bg-warning/10 text-[#f1d9a6]'">
                        {{ (v.status === 'SOLD' ? 'vehicle.soldNote' : 'vehicle.reservedNote') | t }}
                      </p>
                    }

                    <div class="mt-6 grid gap-2">
                      @if (whatsappUrl(); as wa) {
                        <a class="btn btn-whatsapp btn-lg" [href]="wa" target="_blank" rel="noopener" data-testid="vehicle-whatsapp">
                          <app-icon name="whatsapp" [size]="18" /> {{ 'vehicle.whatsapp' | t }}
                        </a>
                      }
                      <div class="grid grid-cols-2 gap-2">
                        @if (callUrl(); as tel) {
                          <a class="btn btn-light" [href]="tel" data-testid="vehicle-call"><app-icon name="phone" [size]="16" /> {{ 'vehicle.call' | t }}</a>
                        }
                        <button type="button" class="btn btn-gold" (click)="enquiryOpen.set(true)" data-testid="vehicle-enquire">
                          <app-icon name="mail" [size]="16" /> {{ 'vehicle.sendEnquiry' | t }}
                        </button>
                      </div>
                    </div>
                    <div class="mt-3 flex items-center gap-2">
                      <app-favorite-button [vehicleId]="v.id" [label]="v.title" variant="solid" />
                      <app-share-button class="flex-1 [&>button]:w-full" [title]="v.title + ' ' + v.year" [text]="'vehicle.shareText' | t: { title: v.title, business: settings.businessName() }" [url]="canonicalUrl()" />
                    </div>

                    @if (v.isDemo) {
                      <p class="mt-5 flex gap-2 rounded-xl bg-gold/10 p-3 text-xs leading-relaxed text-[#e6d2ad]" data-testid="demo-disclaimer">
                        <app-icon name="info" [size]="15" class="mt-0.5 shrink-0" /> {{ 'demo.detail' | t }}
                      </p>
                    }
                  </div>

                  <div class="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 p-5 text-sm">
                    <span class="text-muted">{{ 'vehicle.exchangeCta' | t }}</span>
                    <a routerLink="/sell-exchange" [queryParams]="{ intent: 'EXCHANGE' }" class="inline-flex items-center gap-1 font-semibold text-gold-light hover:underline">
                      {{ 'vehicle.exchangeLink' | t }} <app-icon name="arrow-right" [size]="14" class="flip-rtl" />
                    </a>
                  </div>
                </aside>
              </div>
            </div>

            @if (similar().length) {
              <section class="container-x mt-16 border-t border-white/10 pt-12" aria-labelledby="similar-title">
                <h2 id="similar-title" class="display-3 mb-6">{{ 'vehicle.similar' | t }}</h2>
                <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  @for (s of similar(); track s.id) { <app-vehicle-card [vehicle]="s" /> }
                </div>
              </section>
            }
          </article>

          <!-- Mobile sticky actions -->
          <div class="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 gap-2 border-t border-white/10 bg-ink-900/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-lg md:hidden" data-testid="vehicle-mobile-bar">
            @if (callUrl(); as tel) {
              <a class="btn btn-light btn-sm !min-h-12" [href]="tel"><app-icon name="phone" [size]="16" /> {{ 'vehicle.call' | t }}</a>
            }
            @if (whatsappUrl(); as wa) {
              <a class="btn btn-whatsapp btn-sm !min-h-12" [href]="wa" target="_blank" rel="noopener"><app-icon name="whatsapp" [size]="16" /> {{ 'vehicle.whatsapp' | t }}</a>
            }
            <button type="button" class="btn btn-gold btn-sm !min-h-12" (click)="enquiryOpen.set(true)"><app-icon name="mail" [size]="16" /> {{ 'vehicle.enquire' | t }}</button>
          </div>

          <app-dialog [open]="enquiryOpen()" labelledBy="enquiry-dialog-title" (closed)="enquiryOpen.set(false)">
            <div class="relative max-h-[calc(100dvh-24px)] overflow-y-auto rounded-2xl bg-paper p-6 text-ink-950 shadow-2xl sm:p-8">
              <button type="button" class="absolute end-4 top-4 grid size-10 place-items-center rounded-full border border-black/15" (click)="enquiryOpen.set(false)" [attr.aria-label]="'common.close' | t">
                <app-icon name="x" [size]="18" />
              </button>
              <p class="kicker kicker-dark">{{ 'vehicle.interested' | t }}</p>
              <h2 id="enquiry-dialog-title" class="mt-2 pe-10 font-serif text-3xl">{{ 'enquiry.title' | t }}</h2>
              <p class="mb-5 mt-2 text-sm text-muted-ink">{{ 'vehicle.contactPrompt' | t }}</p>
              <app-enquiry-form [vehicle]="v" source="VEHICLE_PAGE" tone="light" />
            </div>
          </app-dialog>
        }
      }
    }
  `,
})
export class VehicleDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly vehicles = inject(VehicleService);
  private readonly seo = inject(SeoService);
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });
  protected readonly i18n = inject(I18nService);
  protected readonly settings = inject(SettingsService);

  protected readonly enquiryOpen = signal(false);

  private readonly retry$ = new BehaviorSubject(0);
  protected readonly state = toSignal(
    combineLatest([
      this.route.paramMap.pipe(
        map((p) => p.get('slug') ?? ''),
        distinctUntilChanged(),
      ),
      this.retry$,
    ]).pipe(
      switchMap(([slug]) =>
        this.vehicles.bySlug(slug).pipe(
          map((vehicle): DetailState => ({ status: 'success', vehicle })),
          catchError((err) => of<DetailState>({ status: 'error', error: toAppError(err) })),
          startWith<DetailState>({ status: 'loading' }),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as DetailState },
  );

  protected readonly vehicle = computed(() => {
    const s = this.state();
    return s.status === 'success' ? s.vehicle : null;
  });
  protected readonly errorStatus = computed(() => {
    const s = this.state();
    return s.status === 'error' ? s.error.status : null;
  });

  protected readonly similar = toSignal(
    toObservable(this.vehicle).pipe(
      map((v) => v?.id ?? null),
      distinctUntilChanged(),
      switchMap(() => {
        const v = this.vehicle();
        return v ? this.vehicles.similar(v, 3).pipe(catchError(() => of([] as Vehicle[]))) : of([] as Vehicle[]);
      }),
    ),
    { initialValue: [] as Vehicle[] },
  );

  protected readonly canonicalUrl = computed(() => {
    const v = this.vehicle();
    return v ? `${this.settings.siteUrl()}/inventory/${v.slug}` : '';
  });

  protected readonly priceLabel = computed(() => {
    const v = this.vehicle();
    if (!v) return '';
    return v.status === 'SOLD' ? this.i18n.t('enum.status.SOLD') : this.i18n.price(v);
  });

  protected readonly whatsappUrl = computed(() => {
    const v = this.vehicle();
    if (!v) return null;
    return whatsappLink(this.settings.settings()?.whatsapp, vehicleWhatsAppMessage(v, this.i18n.tr, this.settings.siteUrl()));
  });
  protected readonly callUrl = computed(() => telLink(this.settings.settings()?.phone));

  protected readonly specs = computed<{ label: TranslationKey; value: string }[]>(() => {
    const v = this.vehicle();
    if (!v) return [];
    const t = this.i18n;
    const none = t.t('common.notSpecified');
    return [
      { label: 'spec.make', value: v.make },
      { label: 'spec.model', value: v.model },
      { label: 'spec.variant', value: v.variant || none },
      { label: 'spec.year', value: String(v.year) },
      { label: 'spec.condition', value: t.enumLabel('condition', v.condition) },
      { label: 'spec.mileage', value: t.km(v.mileage) },
      { label: 'spec.fuel', value: t.enumLabel('fuelType', v.fuelType) },
      { label: 'spec.transmission', value: t.enumLabel('transmission', v.transmission) },
      { label: 'spec.engine', value: v.engine || none },
      { label: 'spec.color', value: v.color || none },
      { label: 'spec.bodyType', value: t.enumLabel('bodyType', v.bodyType) },
      { label: 'spec.status', value: t.enumLabel('status', v.status) },
    ];
  });

  constructor() {
    effect(() => {
      const s = this.state();
      if (s.status === 'error' && s.error.status === 404) {
        if (this.responseInit) this.responseInit.status = 404;
        this.seo.set({ title: this.i18n.t('seo.notFound.title'), path: '/inventory', noindex: true });
        return;
      }
      const v = this.vehicle();
      if (v) this.applySeo(v);
    });
  }

  protected reload() {
    this.retry$.next(this.retry$.value + 1);
  }

  private applySeo(v: Vehicle) {
    const t = this.i18n;
    const siteUrl = this.settings.siteUrl();
    const images = v.images.map((img) => absoluteUrl(img.url, siteUrl)).filter(Boolean);
    const price = v.price != null && v.status !== 'SOLD' ? t.price(v) : v.status === 'SOLD' ? t.enumLabel('status', 'SOLD') : t.t('vehicle.priceOnRequest');
    this.seo.set({
      title: t.t('seo.vehicle.title', { title: v.title, year: v.year }),
      description: t.t('seo.vehicle.description', {
        condition: t.enumLabel('condition', v.condition),
        title: v.title,
        year: v.year,
        mileage: v.mileage ? ` · ${t.km(v.mileage)}` : '',
        fuel: t.enumLabel('fuelType', v.fuelType),
        transmission: t.enumLabel('transmission', v.transmission),
        price,
      }),
      path: `/inventory/${v.slug}`,
      image: v.primaryImage?.url,
      type: 'product',
      // Demo listings must never be indexed as real stock.
      noindex: v.isDemo,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Car',
        name: `${v.title} ${v.year}`,
        brand: { '@type': 'Brand', name: v.make },
        model: v.model,
        vehicleModelDate: String(v.year),
        bodyType: v.bodyType,
        fuelType: v.fuelType,
        vehicleTransmission: v.transmission,
        ...(v.color && { color: v.color }),
        ...(v.mileage != null && { mileageFromOdometer: { '@type': 'QuantitativeValue', value: v.mileage, unitCode: 'KMT' } }),
        itemCondition: v.condition === 'BRAND_NEW' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
        image: images,
        url: `${siteUrl}/inventory/${v.slug}`,
        ...(!v.isDemo &&
          v.price != null && {
            offers: {
              '@type': 'Offer',
              price: v.price,
              priceCurrency: 'PKR',
              availability: v.status === 'AVAILABLE' ? 'https://schema.org/InStock' : v.status === 'RESERVED' ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/SoldOut',
              seller: { '@type': 'AutoDealer', name: this.settings.businessName() },
            },
          }),
      },
    });
  }
}

