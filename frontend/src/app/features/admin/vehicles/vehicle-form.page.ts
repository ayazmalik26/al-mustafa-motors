import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { concatMap, from, last } from 'rxjs';
import { toAppError } from '../../../core/http/api';
import { formatPkrCompact } from '../../../core/i18n/format';
import {
  BODY_TYPES,
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_CONDITIONS,
  VEHICLE_STATUSES,
  type Vehicle,
  type VehicleImage,
  type VehicleInput,
} from '../../../core/models/vehicle.models';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { VehicleService } from '../../../core/services/vehicle.service';
import { applyServerErrors, integerValidator, requiredTrimmed, toInt, yearValidator } from '../../../shared/forms/validators';
import { FieldErrorComponent } from '../../../shared/ui/field-error.component';
import { IconComponent } from '../../../shared/ui/icon.component';
import { ErrorStateComponent } from '../../../shared/ui/states.component';
import { titleCase } from '../shared/admin-ui';
import { IMAGE_TYPES, ImageManagerComponent, MAX_IMAGE_MB } from './image-manager.component';

interface QueuedImage {
  file: File;
  preview: string;
}

@Component({
  selector: 'app-vehicle-form-page',
  imports: [ReactiveFormsModule, RouterLink, FieldErrorComponent, IconComponent, ErrorStateComponent, ImageManagerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/admin/vehicles" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-ink hover:text-ink-950"><app-icon name="arrow-left" [size]="15" /> All vehicles</a>

    @if (loadError()) {
      <app-error-state tone="light" (retry)="load()" />
    } @else if (loading()) {
      <div class="skeleton-light h-10 w-72"></div>
      <div class="skeleton-light mt-6 h-[480px] rounded-xl"></div>
    } @else {
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-serif text-4xl" data-testid="vehicle-form-title">{{ vehicle() ? 'Edit vehicle' : 'Add a vehicle' }}</h1>
          @if (vehicle(); as v) {
            <p class="text-sm text-muted-ink">{{ v.title }} {{ v.year }} · <a [href]="'/inventory/' + v.slug" target="_blank" rel="noopener" class="underline">View on website</a></p>
          }
        </div>
        @if (vehicle() && auth.isAdmin()) {
          <button type="button" class="btn btn-sm text-danger hover:bg-danger/10" (click)="remove()" data-testid="delete-vehicle"><app-icon name="trash" [size]="15" /> Delete vehicle</button>
        }
      </div>

      <form [formGroup]="form" (ngSubmit)="save()" novalidate class="grid gap-4 xl:grid-cols-[1.4fr_1fr]" data-testid="vehicle-form">
        <div class="space-y-4">
          <section class="card p-5 sm:p-6">
            <h2 class="mb-4 font-serif text-2xl">Vehicle details</h2>
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label class="field-label" for="v-make">Make *</label>
                <input id="v-make" class="input" formControlName="make" list="v-makes" [attr.aria-invalid]="invalid('make')" aria-describedby="v-make-err" data-testid="v-make" />
                <datalist id="v-makes">@for (m of commonMakes; track m) { <option [value]="m"></option> }</datalist>
                <app-field-error [control]="form.controls.make" id="v-make-err" [show]="submitted()" />
              </div>
              <div>
                <label class="field-label" for="v-model">Model *</label>
                <input id="v-model" class="input" formControlName="model" [attr.aria-invalid]="invalid('model')" aria-describedby="v-model-err" data-testid="v-model" />
                <app-field-error [control]="form.controls.model" id="v-model-err" [show]="submitted()" />
              </div>
              <div>
                <label class="field-label" for="v-variant">Variant</label>
                <input id="v-variant" class="input" formControlName="variant" placeholder="e.g. Grande 1.8 CVT" data-testid="v-variant" />
              </div>
              <div>
                <label class="field-label" for="v-year">Year *</label>
                <input id="v-year" class="input" formControlName="year" inputmode="numeric" maxlength="4" [attr.aria-invalid]="invalid('year')" aria-describedby="v-year-err" data-testid="v-year" />
                <app-field-error [control]="form.controls.year" id="v-year-err" [show]="submitted()" />
              </div>
              <div>
                <label class="field-label" for="v-condition">Condition *</label>
                <select id="v-condition" class="input" formControlName="condition" data-testid="v-condition">
                  @for (c of conditions; track c) { <option [value]="c">{{ tc(c) }}</option> }
                </select>
              </div>
              <div>
                <label class="field-label" for="v-body">Body type *</label>
                <select id="v-body" class="input" formControlName="bodyType" data-testid="v-body">
                  @for (b of bodyTypes; track b) { <option [value]="b">{{ b === 'SUV' || b === 'MPV' ? b : tc(b) }}</option> }
                </select>
              </div>
              <div>
                <label class="field-label" for="v-fuel">Fuel *</label>
                <select id="v-fuel" class="input" formControlName="fuelType">
                  @for (f of fuelTypes; track f) { <option [value]="f">{{ f === 'CNG' ? f : tc(f) }}</option> }
                </select>
              </div>
              <div>
                <label class="field-label" for="v-transmission">Transmission *</label>
                <select id="v-transmission" class="input" formControlName="transmission">
                  @for (t of transmissions; track t) { <option [value]="t">{{ tc(t) }}</option> }
                </select>
              </div>
              <div>
                <label class="field-label" for="v-mileage">Mileage (km)</label>
                <input id="v-mileage" class="input" formControlName="mileage" inputmode="numeric" placeholder="Leave empty if unknown" [attr.aria-invalid]="invalid('mileage')" aria-describedby="v-mileage-err" data-testid="v-mileage" />
                <app-field-error [control]="form.controls.mileage" id="v-mileage-err" [show]="submitted()" />
              </div>
              <div>
                <label class="field-label" for="v-engine">Engine</label>
                <input id="v-engine" class="input" formControlName="engine" placeholder="e.g. 1.8L Petrol" />
              </div>
              <div>
                <label class="field-label" for="v-color">Colour</label>
                <input id="v-color" class="input" formControlName="color" />
              </div>
            </div>
            <div class="mt-3">
              <label class="field-label" for="v-description">Description</label>
              <textarea id="v-description" class="input" rows="6" formControlName="description" placeholder="Condition, features, service history, documents…" aria-describedby="v-description-err"></textarea>
              <app-field-error [control]="form.controls.description" id="v-description-err" [show]="submitted()" />
            </div>
          </section>

          <section class="card p-5 sm:p-6">
            <h2 class="mb-1 font-serif text-2xl">Photos</h2>
            @if (vehicle(); as v) {
              <app-image-manager [vehicleId]="v.id" [(images)]="images" />
            } @else {
              <p class="mb-4 text-xs text-muted-ink">Photos are uploaded right after the vehicle is created. You can reorder them and pick the primary photo on the next screen.</p>
              <label class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-black/15 px-4 py-8 text-center hover:border-black/35">
                <app-icon name="upload" [size]="24" class="text-muted-ink" />
                <span class="mt-2 text-sm font-semibold">Choose photos</span>
                <span class="mt-1 text-xs text-muted-ink">JPEG, PNG, WebP or AVIF · up to {{ maxMb }} MB each</span>
                <input type="file" class="sr-only" multiple [accept]="accept" (change)="queue($event)" data-testid="queue-images-input" />
              </label>
              @if (queued().length) {
                <ul class="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  @for (q of queued(); track q.preview; let i = $index) {
                    <li class="relative aspect-[4/3] overflow-hidden rounded-lg border border-black/10">
                      <img [src]="q.preview" alt="" class="size-full object-cover" />
                      @if (i === 0) { <span class="chip absolute start-1 top-1 bg-gold text-ink-950">Primary</span> }
                      <button type="button" class="absolute end-1 top-1 grid size-7 place-items-center rounded-full bg-black/60 text-white" (click)="unqueue(i)" [attr.aria-label]="'Remove photo ' + (i + 1)"><app-icon name="x" [size]="13" /></button>
                    </li>
                  }
                </ul>
              }
            }
          </section>
        </div>

        <div class="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <section class="card p-5 sm:p-6">
            <h2 class="mb-4 font-serif text-2xl">Price & availability</h2>
            <div class="space-y-3">
              <div>
                <label class="field-label" for="v-price">Price (PKR)</label>
                <input id="v-price" class="input" formControlName="price" inputmode="numeric" placeholder="Leave empty for “Price on request”" [attr.aria-invalid]="invalid('price')" aria-describedby="v-price-err v-price-hint" data-testid="v-price" />
                <p id="v-price-hint" class="mt-1 text-xs text-muted-ink">{{ pricePreview() }}</p>
                <app-field-error [control]="form.controls.price" id="v-price-err" [show]="submitted()" />
              </div>
              <div>
                <label class="field-label" for="v-price-display">Price label (optional)</label>
                <input id="v-price-display" class="input" formControlName="priceDisplay" placeholder="e.g. Call for best price" />
                <p class="mt-1 text-xs text-muted-ink">Shown instead of the formatted price when set.</p>
              </div>
              <div>
                <label class="field-label" for="v-status">Status</label>
                <select id="v-status" class="input" formControlName="status" data-testid="v-status">
                  @for (s of statuses; track s) { <option [value]="s">{{ tc(s) }}</option> }
                </select>
              </div>
              <label class="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-black/10 px-3">
                <input type="checkbox" class="size-4 accent-[#090c0b]" formControlName="featured" data-testid="v-featured" />
                <span class="text-sm"><span class="font-semibold">Featured</span> — show on the homepage</span>
              </label>
              @if (vehicle()) {
                <label class="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-black/10 px-3">
                  <input type="checkbox" class="size-4 accent-[#090c0b]" formControlName="isDemo" />
                  <span class="text-sm"><span class="font-semibold">Demo listing</span> — labelled as sample data and hidden from search engines</span>
                </label>
                <div>
                  <label class="field-label" for="v-slug">URL slug</label>
                  <div class="flex gap-2">
                    <input id="v-slug" class="input" formControlName="slug" [attr.aria-invalid]="invalid('slug')" aria-describedby="v-slug-err v-slug-hint" />
                    <button type="button" class="btn btn-outline-dark btn-sm shrink-0" (click)="regenerateSlug()">Regenerate</button>
                  </div>
                  <p id="v-slug-hint" class="mt-1 text-xs text-muted-ink">/inventory/{{ form.controls.slug.value }} — changing it breaks links already shared.</p>
                  <app-field-error [control]="form.controls.slug" id="v-slug-err" [show]="submitted()" />
                </div>
              }
            </div>
          </section>

          <div class="card p-4">
            <div aria-live="assertive">
              @if (error()) { <p class="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{{ error() }}</p> }
            </div>
            <div class="flex gap-2">
              <a routerLink="/admin/vehicles" class="btn btn-outline-dark flex-1">Cancel</a>
              <button type="submit" class="btn btn-dark flex-[2]" [disabled]="saving()" data-testid="save-vehicle">
                @if (saving()) { <span class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span> {{ savingLabel() }} }
                @else { {{ vehicle() ? 'Save changes' : 'Create vehicle' }} }
              </button>
            </div>
          </div>
        </div>
      </form>
    }
  `,
  styles: `.card { background: #fff; border: 1px solid rgb(0 0 0 / .08); border-radius: 14px; }`,
})
export class VehicleFormPage implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly vehicles = inject(VehicleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly auth = inject(AuthService);

  protected readonly conditions = VEHICLE_CONDITIONS;
  protected readonly bodyTypes = BODY_TYPES;
  protected readonly fuelTypes = FUEL_TYPES;
  protected readonly transmissions = TRANSMISSIONS;
  protected readonly statuses = VEHICLE_STATUSES;
  protected readonly commonMakes = ['Toyota', 'Honda', 'Suzuki', 'Hyundai', 'Kia', 'Changan', 'MG', 'Haval', 'Nissan', 'Mitsubishi', 'Daihatsu'];
  protected readonly accept = IMAGE_TYPES.join(',');
  protected readonly maxMb = MAX_IMAGE_MB;
  protected readonly tc = titleCase;

  private readonly id = this.route.snapshot.paramMap.get('id');
  protected readonly vehicle = signal<Vehicle | null>(null);
  protected readonly images = signal<VehicleImage[]>([]);
  protected readonly queued = signal<QueuedImage[]>([]);
  protected readonly loading = signal(!!this.id);
  protected readonly loadError = signal(false);
  protected readonly saving = signal(false);
  protected readonly savingLabel = signal('Saving…');
  protected readonly submitted = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly priceValue = signal<number | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    make: ['', [requiredTrimmed, Validators.maxLength(40)]],
    model: ['', [requiredTrimmed, Validators.maxLength(60)]],
    variant: ['', [Validators.maxLength(80)]],
    year: [String(new Date().getFullYear()), [requiredTrimmed, yearValidator(1950)]],
    condition: ['USED'],
    bodyType: ['SEDAN'],
    fuelType: ['PETROL'],
    transmission: ['AUTOMATIC'],
    mileage: ['', [integerValidator]],
    engine: ['', [Validators.maxLength(60)]],
    color: ['', [Validators.maxLength(40)]],
    price: ['', [integerValidator]],
    priceDisplay: ['', [Validators.maxLength(60)]],
    status: ['AVAILABLE'],
    description: ['', [Validators.maxLength(5000)]],
    featured: [false],
    isDemo: [false],
    slug: ['', [Validators.maxLength(80), Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
  });

  protected readonly pricePreview = computed(() => {
    const n = this.priceValue();
    return n != null && n > 0 ? `≈ ${formatPkrCompact(n, 'en')}` : 'Shown as “Price on request” on the website.';
  });

  constructor() {
    this.form.controls.price.valueChanges.subscribe((v) => this.priceValue.set(toInt(v)));
    if (this.id) this.load();
  }

  load() {
    if (!this.id) return;
    this.loading.set(true);
    this.loadError.set(false);
    this.vehicles.byId(this.id).subscribe({
      next: (v) => {
        this.fill(v);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  protected invalid(name: keyof typeof this.form.controls) {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  protected queue(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []).filter((f) => IMAGE_TYPES.includes(f.type) && f.size <= MAX_IMAGE_MB * 1024 * 1024);
    input.value = '';
    this.queued.update((list) => [...list, ...files.map((file) => ({ file, preview: URL.createObjectURL(file) }))].slice(0, 30));
  }

  protected unqueue(index: number) {
    const item = this.queued()[index];
    if (item) URL.revokeObjectURL(item.preview);
    this.queued.update((list) => list.filter((_, i) => i !== index));
  }

  protected regenerateSlug() {
    const v = this.form.getRawValue();
    const slug = `${v.make} ${v.model} ${v.year}`
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    this.form.controls.slug.setValue(slug);
  }

  save() {
    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Please fix the highlighted fields.');
      return;
    }
    const input = this.toInput();
    this.saving.set(true);
    this.savingLabel.set('Saving…');
    const current = this.vehicle();

    if (current) {
      this.vehicles.update(current.id, input).subscribe({
        next: (v) => {
          this.saving.set(false);
          this.fill(v);
          this.toast.success('Vehicle saved.');
        },
        error: (err) => this.fail(err),
      });
      return;
    }

    this.vehicles.create(input).subscribe({
      next: (created) => {
        const files = this.queued().map((q) => q.file);
        if (!files.length) return this.finishCreate(created);
        this.savingLabel.set('Uploading photos…');
        // Upload in batches of 12 (the API limit per request).
        const batches: File[][] = [];
        for (let i = 0; i < files.length; i += 12) batches.push(files.slice(i, i + 12));
        from(batches)
          .pipe(
            concatMap((batch) => this.vehicles.uploadImages(created.id, batch).pipe(last())),
            last(),
          )
          .subscribe({
            next: () => this.finishCreate(created),
            error: (err) => {
              this.toast.error(`Vehicle created, but some photos failed: ${toAppError(err).message}`);
              this.finishCreate(created);
            },
          });
      },
      error: (err) => this.fail(err),
    });
  }

  protected async remove() {
    const v = this.vehicle();
    if (!v) return;
    const ok = await this.confirm.ask({ title: 'Delete this vehicle?', message: `${v.title} ${v.year} and all of its photos will be permanently removed.`, confirmLabel: 'Delete vehicle', danger: true });
    if (!ok) return;
    this.vehicles.remove(v.id).subscribe({
      next: () => {
        this.toast.success(`${v.title} deleted.`);
        void this.router.navigate(['/admin/vehicles']);
      },
      error: (err) => this.toast.error(toAppError(err).message),
    });
  }

  ngOnDestroy() {
    for (const q of this.queued()) URL.revokeObjectURL(q.preview);
  }

  private finishCreate(created: Vehicle) {
    this.saving.set(false);
    this.toast.success('Vehicle created.');
    for (const q of this.queued()) URL.revokeObjectURL(q.preview);
    this.queued.set([]);
    void this.router.navigate(['/admin/vehicles', created.id, 'edit']);
  }

  private fail(err: unknown) {
    this.saving.set(false);
    const e = toAppError(err);
    if (applyServerErrors(this.form, e.fieldErrors)) this.error.set('Please fix the highlighted fields.');
    else this.error.set(e.message || 'Could not save the vehicle.');
  }

  private fill(v: Vehicle) {
    this.vehicle.set(v);
    this.images.set(v.images);
    this.form.reset({
      make: v.make,
      model: v.model,
      variant: v.variant ?? '',
      year: String(v.year),
      condition: v.condition,
      bodyType: v.bodyType,
      fuelType: v.fuelType,
      transmission: v.transmission,
      mileage: v.mileage != null ? String(v.mileage) : '',
      engine: v.engine ?? '',
      color: v.color ?? '',
      price: v.price != null ? String(v.price) : '',
      priceDisplay: v.priceDisplay ?? '',
      status: v.status,
      description: v.description ?? '',
      featured: v.featured,
      isDemo: v.isDemo,
      slug: v.slug,
    });
    this.submitted.set(false);
  }

  private toInput(): VehicleInput {
    const v = this.form.getRawValue();
    const input: VehicleInput = {
      make: v.make.trim(),
      model: v.model.trim(),
      variant: v.variant.trim() || null,
      year: Number(v.year),
      condition: v.condition as Vehicle['condition'],
      bodyType: v.bodyType as Vehicle['bodyType'],
      fuelType: v.fuelType as Vehicle['fuelType'],
      transmission: v.transmission as Vehicle['transmission'],
      mileage: toInt(v.mileage),
      engine: v.engine.trim() || null,
      color: v.color.trim() || null,
      price: toInt(v.price),
      priceDisplay: v.priceDisplay.trim() || null,
      status: v.status as Vehicle['status'],
      description: v.description.trim() || null,
      featured: v.featured,
    };
    if (this.vehicle()) {
      input.isDemo = v.isDemo;
      if (v.slug && v.slug !== this.vehicle()!.slug) input.slug = v.slug;
    }
    return input;
  }
}
