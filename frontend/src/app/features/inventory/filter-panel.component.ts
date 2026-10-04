import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import {
  BODY_TYPES,
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_CONDITIONS,
  VEHICLE_STATUSES,
  type VehicleFacets,
  type VehicleFilters,
} from '../../core/models/vehicle.models';
import { MILEAGE_STEPS, PRICE_STEPS, yearOptions } from '../../shared/components/price-options';

let uid = 0;

/** All inventory filters. Emits partial updates; the page writes them to the URL. */
@Component({
  selector: 'app-filter-panel',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let f = filters();
    <div class="space-y-6 text-sm">
      <!-- Make / model -->
      <div class="grid gap-3">
        <div>
          <label class="lbl" [for]="id + 'make'">{{ 'filters.make' | t }}</label>
          <select class="input input-dark" [id]="id + 'make'" (change)="set({ make: val($event), model: undefined })" data-testid="filter-make">
            <option value="" [selected]="!f.make">{{ 'finder.anyMake' | t }}</option>
            @for (m of facets()?.makes ?? []; track m.value) {
              <option [value]="m.value" [selected]="m.value.toLowerCase() === f.make?.toLowerCase()">{{ m.value }} ({{ m.count }})</option>
            }
          </select>
        </div>
        <div>
          <label class="lbl" [for]="id + 'model'">{{ 'filters.model' | t }}</label>
          <select class="input input-dark" [id]="id + 'model'" [disabled]="!f.make" (change)="set({ model: val($event) })" data-testid="filter-model">
            <option value="" [selected]="!f.model">{{ (f.make ? 'finder.anyModel' : 'finder.selectMakeFirst') | t }}</option>
            @for (m of models(); track m.model) {
              <option [value]="m.model" [selected]="m.model.toLowerCase() === f.model?.toLowerCase()">{{ m.model }} ({{ m.count }})</option>
            }
          </select>
        </div>
      </div>

      <!-- Condition -->
      <fieldset>
        <legend class="lbl">{{ 'filters.condition' | t }}</legend>
        <div class="seg">
          <button type="button" [class.on]="!f.condition" [attr.aria-pressed]="!f.condition" (click)="set({ condition: undefined })">{{ 'common.any' | t }}</button>
          @for (c of conditions; track c) {
            <button type="button" [class.on]="f.condition === c" [attr.aria-pressed]="f.condition === c" (click)="set({ condition: c })" [attr.data-testid]="'filter-condition-' + c">
              {{ i18n.enumLabel('condition', c) }}
            </button>
          }
        </div>
      </fieldset>

      <!-- Body type -->
      <fieldset>
        <legend class="lbl">{{ 'filters.bodyType' | t }}</legend>
        <div class="flex flex-wrap gap-1.5">
          @for (b of bodyTypes(); track b) {
            <button
              type="button"
              class="chip-btn"
              [class.on]="f.bodyType === b"
              [attr.aria-pressed]="f.bodyType === b"
              (click)="set({ bodyType: f.bodyType === b ? undefined : b })"
              [attr.data-testid]="'filter-body-' + b"
            >
              {{ i18n.enumLabel('bodyType', b) }}
            </button>
          }
        </div>
      </fieldset>

      <!-- Fuel / transmission -->
      <div>
        <label class="lbl" [for]="id + 'fuel'">{{ 'filters.fuel' | t }}</label>
        <select class="input input-dark" [id]="id + 'fuel'" (change)="set({ fuelType: $any(val($event)) })">
          <option value="" [selected]="!f.fuelType">{{ 'common.any' | t }}</option>
          @for (fuel of fuelTypes; track fuel) {
            <option [value]="fuel" [selected]="f.fuelType === fuel">{{ i18n.enumLabel('fuelType', fuel) }}</option>
          }
        </select>
      </div>
      <fieldset>
        <legend class="lbl">{{ 'filters.transmission' | t }}</legend>
        <div class="seg">
          <button type="button" [class.on]="!f.transmission" [attr.aria-pressed]="!f.transmission" (click)="set({ transmission: undefined })">{{ 'common.any' | t }}</button>
          @for (tr of transmissions; track tr) {
            <button type="button" [class.on]="f.transmission === tr" [attr.aria-pressed]="f.transmission === tr" (click)="set({ transmission: tr })">{{ i18n.enumLabel('transmission', tr) }}</button>
          }
        </div>
      </fieldset>

      <!-- Year -->
      <fieldset>
        <legend class="lbl">{{ 'filters.year' | t }}</legend>
        <div class="grid grid-cols-2 gap-2">
          <select class="input input-dark" [attr.aria-label]="('filters.year' | t) + ' — ' + ('filters.yearFrom' | t)" (change)="set({ minYear: num($event) })">
            <option value="" [selected]="!f.minYear">{{ 'filters.yearFrom' | t }}</option>
            @for (y of years(); track y) { <option [value]="y" [selected]="f.minYear === y">{{ y }}</option> }
          </select>
          <select class="input input-dark" [attr.aria-label]="('filters.year' | t) + ' — ' + ('filters.yearTo' | t)" (change)="set({ maxYear: num($event) })">
            <option value="" [selected]="!f.maxYear">{{ 'filters.yearTo' | t }}</option>
            @for (y of years(); track y) { <option [value]="y" [selected]="f.maxYear === y">{{ y }}</option> }
          </select>
        </div>
      </fieldset>

      <!-- Price -->
      <fieldset>
        <legend class="lbl">{{ 'filters.price' | t }}</legend>
        <div class="grid grid-cols-2 gap-2">
          <select class="input input-dark" [attr.aria-label]="'finder.minPrice' | t" (change)="set({ minPrice: num($event) })" data-testid="filter-min-price">
            <option value="" [selected]="!f.minPrice">{{ 'filters.minPrice' | t }}</option>
            @for (p of prices; track p) { <option [value]="p" [selected]="f.minPrice === p">{{ i18n.money(p, true) }}</option> }
          </select>
          <select class="input input-dark" [attr.aria-label]="'finder.maxPrice' | t" (change)="set({ maxPrice: num($event) })" data-testid="filter-max-price">
            <option value="" [selected]="!f.maxPrice">{{ 'filters.maxPrice' | t }}</option>
            @for (p of prices; track p) { <option [value]="p" [selected]="f.maxPrice === p">{{ i18n.money(p, true) }}</option> }
          </select>
        </div>
      </fieldset>

      <!-- Mileage -->
      <div>
        <label class="lbl" [for]="id + 'mileage'">{{ 'filters.mileage' | t }}</label>
        <select class="input input-dark" [id]="id + 'mileage'" (change)="set({ maxMileage: num($event) })">
          <option value="" [selected]="!f.maxMileage">{{ 'filters.anyMileage' | t }}</option>
          @for (m of mileages; track m) { <option [value]="m" [selected]="f.maxMileage === m">{{ 'filters.upToKm' | t: { value: format(m) } }}</option> }
        </select>
      </div>

      <!-- Status -->
      <fieldset>
        <legend class="lbl">{{ 'filters.status' | t }}</legend>
        <div class="seg seg-wrap">
          <button type="button" [class.on]="!f.status" [attr.aria-pressed]="!f.status" (click)="set({ status: undefined })">{{ 'common.any' | t }}</button>
          @for (s of statuses; track s) {
            <button type="button" [class.on]="f.status === s" [attr.aria-pressed]="f.status === s" (click)="set({ status: s })" [attr.data-testid]="'filter-status-' + s">{{ i18n.enumLabel('status', s) }}</button>
          }
        </div>
      </fieldset>
    </div>
  `,
  styles: `
    .lbl { display: block; margin-bottom: 8px; font-size: 11px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--color-muted-2); }
    :host-context(html[lang='ur']) .lbl { letter-spacing: 0; text-transform: none; font-size: 13px; }
    .seg { display: flex; padding: 3px; border-radius: 10px; border: 1px solid rgb(255 255 255 / .12); }
    .seg button { flex: 1; min-height: 38px; padding: 0 8px; border-radius: 7px; font-size: 12.5px; color: #c4c9c5; transition: background-color .2s, color .2s; }
    .seg button:hover { color: #fff; }
    .seg button.on { background: var(--color-cream); color: var(--color-ink-950); font-weight: 600; }
    .seg-wrap { flex-wrap: wrap; }
    .chip-btn { min-height: 36px; padding: 0 12px; border-radius: 999px; border: 1px solid rgb(255 255 255 / .14); font-size: 12.5px; color: #c4c9c5; transition: all .2s; }
    .chip-btn:hover { border-color: var(--color-gold); color: #fff; }
    .chip-btn.on { background: var(--color-cream); border-color: var(--color-cream); color: var(--color-ink-950); font-weight: 600; }
  `,
})
export class FilterPanelComponent {
  protected readonly i18n = inject(I18nService);
  readonly filters = input.required<VehicleFilters>();
  readonly facets = input<VehicleFacets | null>(null);
  readonly filtersChange = output<Partial<VehicleFilters>>();

  protected readonly id = `fp${uid++}-`;
  protected readonly conditions = VEHICLE_CONDITIONS;
  protected readonly fuelTypes = FUEL_TYPES;
  protected readonly transmissions = TRANSMISSIONS;
  protected readonly statuses = VEHICLE_STATUSES;
  protected readonly prices = PRICE_STEPS;
  protected readonly mileages = MILEAGE_STEPS;

  protected readonly models = computed(() => (this.facets()?.models ?? []).filter((m) => m.make.toLowerCase() === this.filters().make?.toLowerCase()));
  protected readonly bodyTypes = computed(() => {
    const present = this.facets()?.bodyTypes.map((b) => b.value);
    return present?.length ? BODY_TYPES.filter((b) => present.includes(b) || b === this.filters().bodyType) : BODY_TYPES;
  });
  protected readonly years = computed(() => yearOptions(this.facets()?.years.min, this.facets()?.years.max));

  protected set(patch: Partial<VehicleFilters>) {
    this.filtersChange.emit(patch);
  }

  protected val(event: Event): string | undefined {
    return (event.target as HTMLSelectElement).value || undefined;
  }

  protected num(event: Event): number | undefined {
    const v = (event.target as HTMLSelectElement).value;
    return v ? Number(v) : undefined;
  }

  protected format(n: number) {
    return new Intl.NumberFormat('en-PK').format(n);
  }
}
