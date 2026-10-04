import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { toAppError } from '../../core/http/api';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { SELL_CONDITIONS, SELL_INTENTS, type SellIntent, type SellRequestCreated } from '../../core/models/lead.models';
import { LeadService } from '../../core/services/lead.service';
import { SeoService } from '../../core/services/seo.service';
import { SettingsService } from '../../core/services/settings.service';
import { formatNumber } from '../../core/i18n/format';
import { sellWhatsAppMessage, whatsappLink } from '../../core/utils/whatsapp';
import { applyServerErrors, emailValidator, integerValidator, phoneValidator, requiredTrimmed, toInt, yearValidator } from '../../shared/forms/validators';
import { FieldErrorComponent } from '../../shared/ui/field-error.component';
import { IconComponent } from '../../shared/ui/icon.component';

const MAX_PHOTOS = 6;
const MAX_PHOTO_MB = 8;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const COMMON_MAKES = ['Toyota', 'Honda', 'Suzuki', 'Hyundai', 'Kia', 'Changan', 'MG', 'Haval', 'Nissan', 'Mitsubishi', 'Daihatsu', 'Proton'];

interface Photo {
  file: File;
  preview: string;
}

@Component({
  selector: 'app-sell-exchange-page',
  imports: [ReactiveFormsModule, TranslatePipe, FieldErrorComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="border-b border-white/10 bg-ink-950 pb-12 pt-10 sm:pt-14">
      <div class="container-x">
        <p class="kicker">{{ 'sell.kicker' | t }}</p>
        <h1 class="display-2 mt-3 max-w-[16ch] rtl:max-w-none">{{ 'sell.titleLead' | t }} <em class="accent">{{ 'sell.titleAccent' | t }}</em></h1>
        <p class="mt-4 max-w-xl text-[15px] text-muted">{{ 'sell.subtitle' | t }}</p>
      </div>
    </section>

    <section class="bg-sand py-12 text-ink-950 sm:py-16">
      <div class="container-x grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
        <aside class="lg:sticky lg:top-28 lg:self-start">
          <h2 class="font-serif text-3xl">{{ 'sell.how.title' | t }}</h2>
          <ol class="mt-6 space-y-5">
            @for (step of steps; track step; let i = $index) {
              <li class="flex gap-4">
                <span class="grid size-9 shrink-0 place-items-center rounded-full bg-ink-950 font-serif text-gold ltr-nums">{{ i + 1 }}</span>
                <p class="pt-1.5 text-sm">{{ step | t }}</p>
              </li>
            }
          </ol>
          <p class="mt-8 flex gap-2 text-xs text-muted-ink"><app-icon name="info" [size]="15" class="shrink-0" /> {{ 'sell.note' | t }}</p>
          @if (settings.whatsappUrl(); as wa) {
            <a [href]="wa" target="_blank" rel="noopener" class="mt-6 inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline">
              <app-icon name="whatsapp" [size]="16" /> {{ 'sell.preferWhatsApp' | t }}
            </a>
          }
        </aside>

        <div class="panel-light p-5 sm:p-8">
          @if (result(); as done) {
            <div class="py-6 text-center" role="status" aria-live="polite" data-testid="sell-success">
              <span class="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-success/15 text-success"><app-icon name="check" [size]="26" /></span>
              <h2 class="font-serif text-4xl">{{ 'sell.successTitle' | t }}</h2>
              <p class="mx-auto mt-3 max-w-md text-sm text-muted-ink">{{ 'sell.successBody' | t: { name: submittedName(), vehicle: submittedVehicle() } }}</p>
              <p class="mt-2 text-xs text-muted-ink ltr-nums">#{{ done.id.slice(0, 8).toUpperCase() }}</p>
              <div class="mt-6 flex flex-wrap justify-center gap-2">
                @if (followUpUrl(); as url) {
                  <a class="btn btn-whatsapp" [href]="url" target="_blank" rel="noopener" data-testid="sell-whatsapp"><app-icon name="whatsapp" [size]="16" /> {{ 'sell.continueWhatsApp' | t }}</a>
                }
                <button type="button" class="btn btn-outline-dark" (click)="startOver()">{{ 'sell.newRequest' | t }}</button>
              </div>
            </div>
          } @else {
            <form [formGroup]="form" (ngSubmit)="submit()" novalidate data-testid="sell-form">
              <fieldset class="[&>legend+*]:clear-both">
                <legend class="float-left mb-4 w-full font-serif text-2xl">{{ 'sell.section.contact' | t }}</legend>
                <div class="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label class="field-label" for="sell-name">{{ 'form.name' | t }} *</label>
                    <input id="sell-name" class="input" formControlName="name" autocomplete="name" [placeholder]="'form.namePlaceholder' | t" [attr.aria-invalid]="invalid('name')" aria-describedby="sell-name-err" />
                    <app-field-error [control]="form.controls.name" id="sell-name-err" [show]="submitted()" [overrides]="{ required: 'validation.nameRequired' }" />
                  </div>
                  <div>
                    <label class="field-label" for="sell-phone">{{ 'form.phone' | t }} *</label>
                    <input id="sell-phone" class="input ltr-nums" formControlName="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" [placeholder]="'form.phonePlaceholder' | t" [attr.aria-invalid]="invalid('phone')" aria-describedby="sell-phone-err" />
                    <app-field-error [control]="form.controls.phone" id="sell-phone-err" [show]="submitted()" [overrides]="{ required: 'validation.phoneRequired' }" />
                  </div>
                  <div class="sm:col-span-2">
                    <label class="field-label" for="sell-email">{{ 'form.email' | t }} <span class="normal-case tracking-normal opacity-70">({{ 'common.optional' | t }})</span></label>
                    <input id="sell-email" class="input" formControlName="email" type="email" autocomplete="email" dir="ltr" [placeholder]="'form.emailPlaceholder' | t" [attr.aria-invalid]="invalid('email')" aria-describedby="sell-email-err" />
                    <app-field-error [control]="form.controls.email" id="sell-email-err" [show]="submitted()" />
                  </div>
                </div>
              </fieldset>

              <fieldset class="mt-8 border-t border-black/10 pt-7 [&>legend+*]:clear-both">
                <legend class="float-left mb-4 w-full font-serif text-2xl">{{ 'sell.section.vehicle' | t }}</legend>
                <div class="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label class="field-label" for="sell-make">{{ 'sell.make' | t }} *</label>
                    <input id="sell-make" class="input" formControlName="vehicleMake" list="sell-makes" [placeholder]="'sell.makePlaceholder' | t" [attr.aria-invalid]="invalid('vehicleMake')" aria-describedby="sell-make-err" />
                    <datalist id="sell-makes">@for (m of makes; track m) { <option [value]="m"></option> }</datalist>
                    <app-field-error [control]="form.controls.vehicleMake" id="sell-make-err" [show]="submitted()" />
                  </div>
                  <div>
                    <label class="field-label" for="sell-model">{{ 'sell.model' | t }} *</label>
                    <input id="sell-model" class="input" formControlName="vehicleModel" [placeholder]="'sell.modelPlaceholder' | t" [attr.aria-invalid]="invalid('vehicleModel')" aria-describedby="sell-model-err" />
                    <app-field-error [control]="form.controls.vehicleModel" id="sell-model-err" [show]="submitted()" />
                  </div>
                  <div>
                    <label class="field-label" for="sell-year">{{ 'sell.year' | t }} *</label>
                    <input id="sell-year" class="input ltr-nums" formControlName="vehicleYear" inputmode="numeric" maxlength="4" [placeholder]="'sell.yearPlaceholder' | t" [attr.aria-invalid]="invalid('vehicleYear')" aria-describedby="sell-year-err" />
                    <app-field-error [control]="form.controls.vehicleYear" id="sell-year-err" [show]="submitted()" />
                  </div>
                  <div>
                    <label class="field-label" for="sell-mileage">{{ 'sell.mileage' | t }}</label>
                    <input id="sell-mileage" class="input ltr-nums" formControlName="mileage" inputmode="numeric" [placeholder]="'sell.mileagePlaceholder' | t" [attr.aria-invalid]="invalid('mileage')" aria-describedby="sell-mileage-err" />
                    <app-field-error [control]="form.controls.mileage" id="sell-mileage-err" [show]="submitted()" />
                  </div>
                  <div class="sm:col-span-2">
                    <label class="field-label" for="sell-condition">{{ 'sell.condition' | t }}</label>
                    <select id="sell-condition" class="input" formControlName="condition">
                      <option value="">{{ 'sell.conditionPlaceholder' | t }}</option>
                      @for (c of conditions; track c) { <option [value]="c">{{ i18n.enumLabel('sellCondition', c) }}</option> }
                    </select>
                  </div>
                </div>
              </fieldset>

              <fieldset class="mt-8 border-t border-black/10 pt-7 [&>legend+*]:clear-both">
                <legend class="float-left mb-4 w-full font-serif text-2xl">{{ 'sell.section.request' | t }}</legend>
                <p class="field-label" id="sell-intent-label">{{ 'sell.intent' | t }} *</p>
                <div class="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-labelledby="sell-intent-label">
                  @for (intent of intents; track intent) {
                    <label class="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 transition-colors"
                      [class]="form.controls.intent.value === intent ? 'border-ink-950 bg-ink-950 text-white' : 'border-[#d9d4ca] bg-white hover:border-ink-950/40'">
                      <input type="radio" class="sr-only" formControlName="intent" [value]="intent" [attr.data-testid]="'intent-' + intent" />
                      <app-icon [name]="intent === 'SELL' ? 'tag' : 'swap'" [size]="18" />
                      <span class="text-sm font-semibold">{{ i18n.enumLabel('intent', intent) }}</span>
                    </label>
                  }
                </div>
                <div class="mt-3 grid gap-3">
                  <div>
                    <label class="field-label" for="sell-price">{{ 'sell.expectedPrice' | t }}</label>
                    <input id="sell-price" class="input ltr-nums" formControlName="expectedPrice" inputmode="numeric" [placeholder]="'sell.pricePlaceholder' | t" [attr.aria-invalid]="invalid('expectedPrice')" aria-describedby="sell-price-err sell-price-hint" />
                    @if (pricePreview(); as p) { <p id="sell-price-hint" class="mt-1 text-xs text-muted-ink ltr-nums">≈ {{ p }}</p> }
                    <app-field-error [control]="form.controls.expectedPrice" id="sell-price-err" [show]="submitted()" />
                  </div>
                  <div>
                    <label class="field-label" for="sell-message">{{ 'sell.message' | t }}</label>
                    <textarea id="sell-message" class="input" formControlName="message" rows="4" [placeholder]="'sell.messagePlaceholder' | t"></textarea>
                    <app-field-error [control]="form.controls.message" id="sell-message-err" [show]="submitted()" />
                  </div>

                  <!-- Photos -->
                  <div>
                    <p class="field-label">{{ 'sell.photos' | t }}</p>
                    <p class="mb-3 text-xs text-muted-ink">{{ 'sell.photosHint' | t: { max: maxPhotos, size: maxPhotoMb } }}</p>
                    <div class="flex flex-wrap gap-2">
                      @for (photo of photos(); track photo.preview; let i = $index) {
                        <div class="relative size-24 overflow-hidden rounded-lg border border-black/10">
                          <img [src]="photo.preview" alt="" class="size-full object-cover" />
                          <button type="button" class="absolute end-1 top-1 grid size-7 place-items-center rounded-full bg-black/65 text-white" (click)="removePhoto(i)" [attr.aria-label]="'sell.removePhoto' | t: { index: i + 1 }">
                            <app-icon name="x" [size]="14" />
                          </button>
                        </div>
                      }
                      @if (photos().length < maxPhotos) {
                        <label class="grid size-24 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-black/20 text-center text-[11px] text-muted-ink transition-colors hover:border-ink-950/50 focus-within:border-gold-dark">
                          <span class="flex flex-col items-center gap-1"><app-icon name="camera" [size]="20" />{{ 'sell.addPhotos' | t }}</span>
                          <input type="file" class="sr-only" accept="image/jpeg,image/png,image/webp" multiple (change)="addPhotos($event)" data-testid="sell-photos" />
                        </label>
                      }
                    </div>
                    @if (photoError()) { <p class="field-error" role="alert">{{ photoError() }}</p> }
                  </div>
                </div>
              </fieldset>

              <div class="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
                <label for="sell-website">Website</label>
                <input id="sell-website" formControlName="website" tabindex="-1" autocomplete="off" />
              </div>

              <div aria-live="assertive">
                @if (error()) {
                  <p class="mt-6 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{{ error() }}</p>
                }
              </div>
              <button type="submit" class="btn btn-dark btn-lg mt-6 w-full" [disabled]="submitting()" data-testid="sell-submit">
                @if (submitting()) {
                  <span class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span> {{ 'form.sending' | t }}
                } @else {
                  {{ 'sell.submit' | t }} <app-icon name="arrow-right" [size]="16" class="flip-rtl" />
                }
              </button>
              <p class="mt-3 text-center text-xs text-muted-ink">{{ 'form.privacy' | t }}</p>
            </form>
          }
        </div>
      </div>
    </section>
  `,
})
export class SellExchangePage implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly leads = inject(LeadService);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  protected readonly i18n = inject(I18nService);
  protected readonly settings = inject(SettingsService);

  protected readonly intents = SELL_INTENTS;
  protected readonly conditions = SELL_CONDITIONS;
  protected readonly makes = COMMON_MAKES;
  protected readonly maxPhotos = MAX_PHOTOS;
  protected readonly maxPhotoMb = MAX_PHOTO_MB;
  protected readonly steps = ['sell.how.1', 'sell.how.2', 'sell.how.3'] as const;

  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly photoError = signal<string | null>(null);
  protected readonly photos = signal<Photo[]>([]);
  protected readonly result = signal<SellRequestCreated | null>(null);
  protected readonly submittedName = signal('');
  protected readonly submittedVehicle = signal('');
  private submittedMessageInput: Parameters<typeof sellWhatsAppMessage>[0] | null = null;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [requiredTrimmed, Validators.minLength(2), Validators.maxLength(80)]],
    phone: ['', [requiredTrimmed, phoneValidator]],
    email: ['', [emailValidator]],
    vehicleMake: ['', [requiredTrimmed, Validators.maxLength(40)]],
    vehicleModel: ['', [requiredTrimmed, Validators.maxLength(60)]],
    vehicleYear: ['', [requiredTrimmed, yearValidator()]],
    mileage: ['', [integerValidator]],
    condition: [''],
    intent: [this.initialIntent() as SellIntent, [Validators.required]],
    expectedPrice: ['', [integerValidator]],
    message: ['', [Validators.maxLength(2000)]],
    website: [''],
  });

  private readonly priceValue = signal<number | null>(null);
  protected readonly pricePreview = computed(() => {
    const n = this.priceValue();
    return n && n >= 100_000 ? this.i18n.money(n, true) : null;
  });

  protected readonly followUpUrl = computed(() => {
    const done = this.result();
    if (!done || !this.submittedMessageInput) return null;
    this.i18n.lang();
    return whatsappLink(this.settings.settings()?.whatsapp, sellWhatsAppMessage({ ...this.submittedMessageInput, reference: done.id.slice(0, 8).toUpperCase() }, this.i18n.tr));
  });

  constructor() {
    this.form.controls.expectedPrice.valueChanges.subscribe((v) => this.priceValue.set(toInt(v)));
    effect(() => {
      this.seo.set({ title: this.i18n.t('seo.sell.title'), description: this.i18n.t('seo.sell.description'), path: '/sell-exchange' });
    });
  }

  protected invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  protected addPhotos(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.photoError.set(null);
    const accepted: Photo[] = [];
    for (const file of files) {
      if (!PHOTO_TYPES.includes(file.type)) {
        this.photoError.set(this.i18n.t('validation.fileType'));
        continue;
      }
      if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
        this.photoError.set(this.i18n.t('validation.fileSize', { size: MAX_PHOTO_MB }));
        continue;
      }
      if (this.photos().length + accepted.length >= MAX_PHOTOS) {
        this.photoError.set(this.i18n.t('validation.tooManyFiles', { max: MAX_PHOTOS }));
        break;
      }
      accepted.push({ file, preview: URL.createObjectURL(file) });
    }
    this.photos.update((list) => [...list, ...accepted]);
  }

  protected removePhoto(index: number) {
    const photo = this.photos()[index];
    if (photo) URL.revokeObjectURL(photo.preview);
    this.photos.update((list) => list.filter((_, i) => i !== index));
  }

  submit() {
    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set(this.i18n.t('form.checkFields'));
      return;
    }
    const v = this.form.getRawValue();
    const mileage = toInt(v.mileage);
    const expectedPrice = toInt(v.expectedPrice);
    this.submitting.set(true);
    this.leads
      .createSellRequest(
        {
          name: v.name.trim(),
          phone: v.phone.trim(),
          email: v.email.trim(),
          vehicleMake: v.vehicleMake.trim(),
          vehicleModel: v.vehicleModel.trim(),
          vehicleYear: Number(v.vehicleYear),
          mileage,
          condition: v.condition,
          expectedPrice,
          intent: v.intent,
          message: v.message.trim(),
          locale: this.i18n.lang(),
          website: v.website,
        },
        this.photos().map((p) => p.file),
      )
      .subscribe({
        next: (created) => {
          const vehicle = `${v.vehicleMake.trim()} ${v.vehicleModel.trim()} ${v.vehicleYear}`;
          this.submittedName.set(v.name.trim());
          this.submittedVehicle.set(vehicle);
          this.submittedMessageInput = {
            intent: v.intent,
            name: v.name.trim(),
            vehicle,
            mileage: mileage != null ? `${formatNumber(mileage)} km` : null,
            expectedPrice: expectedPrice != null ? `PKR ${formatNumber(expectedPrice)}` : null,
          };
          this.submitting.set(false);
          this.result.set(created);
          this.clearPhotos();
        },
        error: (err) => {
          this.submitting.set(false);
          const e = toAppError(err);
          if (e.status === 429) this.error.set(this.i18n.t('form.rateLimited'));
          else if (applyServerErrors(this.form, e.fieldErrors)) this.error.set(this.i18n.t('form.checkFields'));
          else if (e.status === 400 || e.status === 413) this.error.set(e.message);
          else this.error.set(this.i18n.t('form.serverError'));
        },
      });
  }

  protected startOver() {
    this.result.set(null);
    this.submitted.set(false);
    this.form.reset({ intent: this.form.controls.intent.value });
  }

  ngOnDestroy() {
    this.clearPhotos();
  }

  private clearPhotos() {
    for (const p of this.photos()) URL.revokeObjectURL(p.preview);
    this.photos.set([]);
  }

  private initialIntent(): SellIntent {
    const intent = this.route.snapshot.queryParamMap.get('intent');
    return intent === 'EXCHANGE' ? 'EXCHANGE' : 'SELL';
  }
}
