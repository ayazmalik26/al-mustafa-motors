import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, PLATFORM_ID, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, debounceTime, distinctUntilChanged, map, of, startWith, switchMap, tap } from 'rxjs';
import { toAppError } from '../../core/http/api';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { AppError, Paged } from '../../core/models/api.models';
import { VEHICLE_SORTS, type Vehicle, type VehicleFilters, type VehicleSort } from '../../core/models/vehicle.models';
import { SeoService } from '../../core/services/seo.service';
import { SettingsService } from '../../core/services/settings.service';
import { VehicleService } from '../../core/services/vehicle.service';
import { countActiveFilters, filtersFromParams, filtersToQueryParams, withoutFilters } from '../../core/utils/vehicle-filters';
import { VehicleCardComponent } from '../../shared/components/vehicle-card.component';
import { DialogComponent } from '../../shared/ui/dialog.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { EmptyStateComponent, ErrorStateComponent, VehicleCardSkeletonComponent } from '../../shared/ui/states.component';
import { FilterPanelComponent } from './filter-panel.component';

type ResultState = { status: 'loading' } | { status: 'success'; data: Paged<Vehicle> } | { status: 'error'; error: AppError };

interface ActiveChip {
  label: string;
  keys: (keyof VehicleFilters)[];
}

@Component({
  selector: 'app-inventory-page',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    VehicleCardComponent,
    FilterPanelComponent,
    DialogComponent,
    IconComponent,
    PaginationComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    VehicleCardSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="border-b border-white/10 bg-ink-950 pb-8 pt-10 sm:pt-14">
      <div class="container-x">
        <p class="kicker">{{ 'inventory.kicker' | t }}</p>
        <h1 class="display-2 mt-3">{{ 'inventory.title' | t }}</h1>
        <p class="mt-3 max-w-xl text-sm text-muted">{{ 'inventory.subtitle' | t }}</p>
        <div class="relative mt-7 max-w-2xl">
          <label for="inventory-search" class="sr-only">{{ 'inventory.searchLabel' | t }}</label>
          <app-icon name="search" [size]="18" class="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="inventory-search"
            type="search"
            class="input input-dark !min-h-[54px] rounded-xl ps-12 pe-12 text-base"
            [formControl]="search"
            [placeholder]="'inventory.searchPlaceholder' | t"
            autocomplete="off"
            enterkeyhint="search"
            data-testid="inventory-search"
          />
          @if (search.value) {
            <button type="button" class="absolute end-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-white" (click)="search.setValue('')" [attr.aria-label]="'common.close' | t">
              <app-icon name="x" [size]="16" />
            </button>
          }
        </div>
      </div>
    </section>

    <section class="container-x grid gap-8 py-8 lg:grid-cols-[290px_1fr] lg:py-10">
      <aside class="hidden lg:block" [attr.aria-label]="'inventory.filters' | t">
        <div class="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pe-2 scrollbar-none">
          <div class="mb-5 flex items-center justify-between">
            <h2 class="font-serif text-2xl">{{ 'inventory.filters' | t }}</h2>
            @if (activeCount()) {
              <button type="button" class="text-xs font-semibold text-gold-light hover:underline" (click)="clearAll()">{{ 'inventory.clearAll' | t }}</button>
            }
          </div>
          <app-filter-panel [filters]="filters()" [facets]="facets()" (filtersChange)="update($event)" />
        </div>
      </aside>

      <div #results class="min-w-0 scroll-mt-24">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-muted" aria-live="polite" data-testid="results-count">
            @if (lastData(); as d) {
              {{ d.meta.total === 1 ? ('inventory.resultsOne' | t) : ('inventory.results' | t: { count: d.meta.total }) }}
            }
          </p>
          <div class="flex items-center gap-2">
            <button type="button" class="btn btn-ghost btn-sm lg:hidden" (click)="filtersOpen.set(true)" aria-haspopup="dialog" data-testid="open-filters">
              <app-icon name="sliders" [size]="16" />
              {{ activeCount() ? ('inventory.filtersCount' | t: { count: activeCount() }) : ('inventory.filters' | t) }}
            </button>
            <label for="inventory-sort" class="sr-only">{{ 'inventory.sortBy' | t }}</label>
            <select id="inventory-sort" class="input input-dark !min-h-[38px] w-auto !py-1.5 text-sm" (change)="setSort($event)" data-testid="inventory-sort">
              @for (s of sorts; track s) {
                <option [value]="s" [selected]="(filters().sort ?? 'newest') === s">{{ sortLabel(s) }}</option>
              }
            </select>
          </div>
        </div>

        @if (chips().length) {
          <div class="mb-5 flex flex-wrap gap-2" data-testid="active-filters">
            @for (chip of chips(); track chip.label) {
              <button type="button" class="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 text-xs hover:border-gold" (click)="remove(chip)" [attr.aria-label]="'inventory.removeFilter' | t: { label: chip.label }">
                {{ chip.label }} <app-icon name="x" [size]="13" />
              </button>
            }
            <button type="button" class="min-h-9 px-2 text-xs font-semibold text-gold-light hover:underline" (click)="clearAll()">{{ 'inventory.clearAll' | t }}</button>
          </div>
        }
        @if (filters().minPrice || filters().maxPrice) {
          <p class="mb-5 flex items-center gap-2 text-xs text-muted-2"><app-icon name="info" [size]="14" /> {{ 'inventory.priceNote' | t }}</p>
        }

        @switch (state().status) {
          @case ('error') {
            <app-error-state [network]="errorStatus() === 0" (retry)="retry()" />
          }
          @default {
            @if (lastData(); as d) {
              @if (d.items.length) {
                <div class="grid gap-4 transition-opacity duration-300 sm:grid-cols-2 xl:grid-cols-3" [class.opacity-50]="state().status === 'loading'" [attr.aria-busy]="state().status === 'loading'" data-testid="inventory-grid">
                  @for (v of d.items; track v.id; let i = $index) {
                    <app-vehicle-card [vehicle]="v" [priority]="i < 2" />
                  }
                </div>
                <div class="mt-10">
                  <app-pagination [page]="d.meta.page" [totalPages]="d.meta.totalPages" (pageChange)="goToPage($event)" />
                </div>
              } @else {
                <app-empty-state [title]="'inventory.emptyTitle' | t" [message]="'inventory.emptyBody' | t">
                  @if (activeCount() || filters().q) {
                    <button type="button" class="btn btn-light" (click)="clearAll()">{{ 'inventory.clearAll' | t }}</button>
                  }
                  @if (settings.whatsappUrl(); as wa) {
                    <a [href]="wa" target="_blank" rel="noopener" class="btn btn-ghost"><app-icon name="whatsapp" [size]="16" /> {{ 'inventory.emptyAsk' | t }}</a>
                  }
                </app-empty-state>
              }
            } @else {
              <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
                @for (i of [1, 2, 3, 4, 5, 6]; track i) { <app-vehicle-card-skeleton /> }
              </div>
            }
          }
        }
      </div>
    </section>

    <app-dialog [open]="filtersOpen()" size="sheet" [ariaLabel]="'inventory.filters' | t" (closed)="filtersOpen.set(false)">
      <div class="flex h-full flex-col bg-ink-900 text-snow">
        <div class="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <h2 class="font-serif text-2xl">{{ 'inventory.filters' | t }}</h2>
          <button type="button" class="grid size-11 place-items-center rounded-full border border-white/20" (click)="filtersOpen.set(false)" [attr.aria-label]="'common.close' | t">
            <app-icon name="x" [size]="18" />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto px-5 py-5">
          <app-filter-panel [filters]="filters()" [facets]="facets()" (filtersChange)="update($event)" />
        </div>
        <div class="grid grid-cols-[auto_1fr] gap-2 border-t border-white/10 p-4">
          <button type="button" class="btn btn-ghost" (click)="clearAll()">{{ 'inventory.clearAll' | t }}</button>
          <button type="button" class="btn btn-gold" (click)="filtersOpen.set(false)" data-testid="apply-filters">
            {{ 'inventory.showResults' | t }}
            @if (lastData(); as d) { <span class="ltr-nums">({{ d.meta.total }})</span> }
          </button>
        </div>
      </div>
    </app-dialog>
  `,
})
export class InventoryPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly vehicles = inject(VehicleService);
  private readonly seo = inject(SeoService);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly i18n = inject(I18nService);
  protected readonly settings = inject(SettingsService);

  protected readonly sorts = VEHICLE_SORTS;
  protected readonly filtersOpen = signal(false);
  protected readonly search = new FormControl('', { nonNullable: true });
  private readonly resultsEl = viewChild<ElementRef<HTMLElement>>('results');

  protected readonly filters = toSignal(this.route.queryParamMap.pipe(map(filtersFromParams)), { initialValue: filtersFromParams(this.route.snapshot.queryParamMap) });
  protected readonly facets = toSignal(this.vehicles.facets().pipe(catchError(() => of(null))), { initialValue: null });
  protected readonly activeCount = computed(() => countActiveFilters(this.filters()));

  private readonly lastSuccess = signal<Paged<Vehicle> | null>(null);
  private readonly retry$ = new BehaviorSubject(0);
  protected readonly state = toSignal(
    combineLatest([
      this.route.queryParamMap.pipe(
        map((params) => JSON.stringify(filtersFromParams(params))),
        distinctUntilChanged(),
      ),
      this.retry$,
    ]).pipe(
      switchMap(([key]) =>
        this.vehicles.list(JSON.parse(key) as VehicleFilters).pipe(
          tap((data) => this.lastSuccess.set(data)),
          map((data): ResultState => ({ status: 'success', data })),
          catchError((err) => of<ResultState>({ status: 'error', error: toAppError(err) })),
          startWith<ResultState>({ status: 'loading' }),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as ResultState },
  );
  protected readonly lastData = computed(() => {
    const s = this.state();
    return s.status === 'success' ? s.data : this.lastSuccess();
  });
  protected readonly errorStatus = computed(() => {
    const s = this.state();
    return s.status === 'error' ? s.error.status : null;
  });

  protected readonly chips = computed<ActiveChip[]>(() => {
    const f = this.filters();
    const t = this.i18n;
    const chips: ActiveChip[] = [];
    if (f.make) chips.push({ label: f.make, keys: ['make', 'model'] });
    if (f.model) chips.push({ label: f.model, keys: ['model'] });
    if (f.condition) chips.push({ label: t.enumLabel('condition', f.condition), keys: ['condition'] });
    if (f.bodyType) chips.push({ label: t.enumLabel('bodyType', f.bodyType), keys: ['bodyType'] });
    if (f.fuelType) chips.push({ label: t.enumLabel('fuelType', f.fuelType), keys: ['fuelType'] });
    if (f.transmission) chips.push({ label: t.enumLabel('transmission', f.transmission), keys: ['transmission'] });
    if (f.status) chips.push({ label: t.enumLabel('status', f.status), keys: ['status'] });
    if (f.minYear || f.maxYear) chips.push({ label: t.t('filters.yearChip', { from: f.minYear ?? '…', to: f.maxYear ?? '…' }), keys: ['minYear', 'maxYear'] });
    if (f.minPrice || f.maxPrice) {
      chips.push({
        label: `${f.minPrice ? t.money(f.minPrice, true) : '…'} – ${f.maxPrice ? t.money(f.maxPrice, true) : '…'}`,
        keys: ['minPrice', 'maxPrice'],
      });
    }
    if (f.maxMileage) chips.push({ label: t.t('filters.upToKm', { value: new Intl.NumberFormat('en-PK').format(f.maxMileage) }), keys: ['maxMileage'] });
    return chips;
  });

  constructor() {
    // Keep the search box in sync with the URL (back/forward, "clear all").
    effect(() => {
      const q = this.filters().q ?? '';
      if (q !== this.search.value) this.search.setValue(q, { emitEvent: false });
    });

    // Debounced search → URL.
    this.search.valueChanges
      .pipe(
        map((v) => v.trim()),
        debounceTime(350),
        distinctUntilChanged(),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((q) => {
        if (q !== (this.filters().q ?? '')) this.navigate({ ...this.filters(), q: q || undefined, page: undefined }, true);
      });

    effect(() => {
      this.seo.set({ title: this.i18n.t('seo.inventory.title'), description: this.i18n.t('seo.inventory.description'), path: '/inventory' });
    });
  }

  protected update(patch: Partial<VehicleFilters>) {
    this.navigate({ ...this.filters(), ...patch, page: undefined });
  }

  protected setSort(event: Event) {
    const sort = (event.target as HTMLSelectElement).value as VehicleSort;
    this.navigate({ ...this.filters(), sort, page: undefined });
  }

  protected goToPage(page: number) {
    this.navigate({ ...this.filters(), page });
    if (this.isBrowser) this.resultsEl()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected remove(chip: ActiveChip) {
    this.navigate(withoutFilters(this.filters(), ...chip.keys));
  }

  protected clearAll() {
    this.search.setValue('', { emitEvent: false });
    this.navigate({ sort: this.filters().sort });
  }

  protected retry() {
    this.retry$.next(this.retry$.value + 1);
  }

  protected sortLabel(sort: VehicleSort): string {
    return this.i18n.t(`sort.${sort}`);
  }

  private navigate(filters: VehicleFilters, replaceUrl = false) {
    void this.router.navigate([], { relativeTo: this.route, queryParams: filtersToQueryParams(filters), replaceUrl });
  }
}
