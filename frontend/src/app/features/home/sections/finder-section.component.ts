import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { BODY_TYPES, VEHICLE_CONDITIONS, type VehicleFilters } from '../../../core/models/vehicle.models';
import { VehicleService } from '../../../core/services/vehicle.service';
import { filtersToQueryParams, filtersFromParams } from '../../../core/utils/vehicle-filters';
import { PRICE_STEPS, yearOptions } from '../../../shared/components/price-options';
import { IconComponent } from '../../../shared/ui/icon.component';

/** Homepage vehicle finder — navigates to /inventory with the chosen filters as query params. */
@Component({
  selector: 'app-finder-section',
  imports: [ReactiveFormsModule, TranslatePipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-cream py-8 text-ink-950 sm:py-10" aria-labelledby="finder-title">
      <div class="container-x">
        <h2 id="finder-title" class="sr-only">{{ 'finder.heading' | t }}</h2>
        <form [formGroup]="form" (ngSubmit)="search()" class="grid grid-cols-2 gap-x-2.5 gap-y-3 md:grid-cols-4 xl:grid-cols-[1.1fr_1fr_1fr_1fr_1fr_1fr_.9fr_auto] xl:items-end" data-testid="vehicle-finder">
          <div class="col-span-2 md:col-span-1">
            <label class="field-label" for="finder-make">{{ 'finder.make' | t }}</label>
            <select id="finder-make" class="input" formControlName="make" (change)="form.controls.model.setValue('')">
              <option value="">{{ 'finder.anyMake' | t }}</option>
              @for (m of makes(); track m) { <option [value]="m">{{ m }}</option> }
            </select>
          </div>
          <div class="col-span-2 md:col-span-1">
            <label class="field-label" for="finder-model">{{ 'finder.model' | t }}</label>
            <select id="finder-model" class="input" formControlName="model">
              <option value="">{{ 'finder.anyModel' | t }}</option>
              @for (m of models(); track m) { <option [value]="m">{{ m }}</option> }
            </select>
          </div>
          <div>
            <label class="field-label" for="finder-condition">{{ 'finder.condition' | t }}</label>
            <select id="finder-condition" class="input" formControlName="condition">
              <option value="">{{ 'common.any' | t }}</option>
              @for (c of conditions; track c) { <option [value]="c">{{ i18n.enumLabel('condition', c) }}</option> }
            </select>
          </div>
          <div>
            <label class="field-label" for="finder-body">{{ 'finder.bodyType' | t }}</label>
            <select id="finder-body" class="input" formControlName="bodyType">
              <option value="">{{ 'common.any' | t }}</option>
              @for (b of bodyTypes(); track b) { <option [value]="b">{{ i18n.enumLabel('bodyType', b) }}</option> }
            </select>
          </div>
          <div>
            <label class="field-label" for="finder-min">{{ 'finder.minPrice' | t }}</label>
            <select id="finder-min" class="input" formControlName="minPrice">
              <option value="">{{ 'finder.noMin' | t }}</option>
              @for (p of prices; track p) { <option [value]="p">{{ i18n.money(p, true) }}</option> }
            </select>
          </div>
          <div>
            <label class="field-label" for="finder-max">{{ 'finder.maxPrice' | t }}</label>
            <select id="finder-max" class="input" formControlName="maxPrice">
              <option value="">{{ 'finder.noMax' | t }}</option>
              @for (p of prices; track p) { <option [value]="p">{{ i18n.money(p, true) }}</option> }
            </select>
          </div>
          <div class="col-span-2 md:col-span-1">
            <label class="field-label" for="finder-year">{{ 'finder.year' | t }}</label>
            <select id="finder-year" class="input" formControlName="minYear">
              <option value="">{{ 'finder.anyYear' | t }}</option>
              @for (y of years(); track y) { <option [value]="y">{{ 'finder.yearOrNewer' | t: { year: y } }}</option> }
            </select>
          </div>
          <button type="submit" class="btn btn-dark btn-lg col-span-2 md:col-span-1 xl:min-w-[150px]" data-testid="finder-search">
            <app-icon name="search" [size]="16" /> {{ 'finder.search' | t }}
          </button>
        </form>
      </div>
    </section>
  `,
})
export class FinderSectionComponent {
  protected readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly vehicles = inject(VehicleService);
  private readonly fb = inject(FormBuilder);

  protected readonly conditions = VEHICLE_CONDITIONS;
  protected readonly prices = PRICE_STEPS;

  protected readonly form = this.fb.nonNullable.group({
    make: '',
    model: '',
    condition: '',
    bodyType: '',
    minPrice: '',
    maxPrice: '',
    minYear: '',
  });

  private readonly facets = toSignal(this.vehicles.facets().pipe(catchError(() => of(null))), { initialValue: null });
  protected readonly selectedMake = toSignal(this.form.controls.make.valueChanges, { initialValue: '' });

  protected readonly makes = computed(() => this.facets()?.makes.map((m) => m.value) ?? []);
  protected readonly models = computed(() => {
    const make = this.selectedMake();
    if (!make) return [];
    return (this.facets()?.models ?? []).filter((m) => m.make === make).map((m) => m.model);
  });
  protected readonly bodyTypes = computed(() => {
    const present = this.facets()?.bodyTypes.map((b) => b.value);
    return present?.length ? BODY_TYPES.filter((b) => present.includes(b)) : BODY_TYPES;
  });
  protected readonly years = computed(() => yearOptions(this.facets()?.years.min, this.facets()?.years.max));

  search() {
    const filters: VehicleFilters = filtersFromParams(this.form.getRawValue());
    void this.router.navigate(['/inventory'], { queryParams: filtersToQueryParams(filters) });
  }
}
