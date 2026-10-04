import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, type AbstractControl, type ValidationErrors } from '@angular/forms';
import { toAppError } from '../../../core/http/api';
import type { BusinessSettings, SettingsInput } from '../../../core/models/settings.models';
import { SettingsService } from '../../../core/services/settings.service';
import { ToastService } from '../../../core/services/toast.service';
import { MapEmbedComponent } from '../../../shared/components/map-embed.component';
import { applyServerErrors, emailValidator, phoneValidator, requiredTrimmed } from '../../../shared/forms/validators';
import { FieldErrorComponent } from '../../../shared/ui/field-error.component';
import { IconComponent } from '../../../shared/ui/icon.component';
import { ErrorStateComponent } from '../../../shared/ui/states.component';

const urlValidator = (control: AbstractControl): ValidationErrors | null => {
  const v = String(control.value ?? '').trim();
  if (!v) return null;
  return /^https?:\/\/[^\s]+\.[^\s]+/.test(v) ? null : { server: 'Enter a full URL starting with https://' };
};

const numberRange = (min: number, max: number) => (control: AbstractControl): ValidationErrors | null => {
  const v = String(control.value ?? '').trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? null : { server: `Enter a number between ${min} and ${max}` };
};

@Component({
  selector: 'app-settings-page',
  imports: [ReactiveFormsModule, FieldErrorComponent, IconComponent, ErrorStateComponent, MapEmbedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6">
      <h1 class="font-serif text-4xl">Settings</h1>
      <p class="text-sm text-muted-ink">Business details and homepage content shown across the website. Verify contact details with the owner before launch.</p>
    </div>

    @if (loadError()) {
      <app-error-state tone="light" (retry)="load()" />
    } @else if (!loaded()) {
      <div class="skeleton-light h-[520px] rounded-xl"></div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="save()" novalidate class="grid gap-4 xl:grid-cols-2" data-testid="settings-form">
        <section class="card p-5 sm:p-6">
          <h2 class="mb-4 font-serif text-2xl">Business</h2>
          <div class="space-y-3">
            <div>
              <label class="field-label" for="s-name">Business name *</label>
              <input id="s-name" class="input" formControlName="businessName" aria-describedby="s-name-err" />
              <app-field-error [control]="form.controls.businessName" id="s-name-err" [show]="submitted()" />
            </div>
            <div>
              <label class="field-label" for="s-desc">Description (English)</label>
              <textarea id="s-desc" class="input" rows="4" formControlName="description"></textarea>
            </div>
            <div>
              <label class="field-label" for="s-desc-ur">Description (Urdu)</label>
              <textarea id="s-desc-ur" class="input font-urdu" rows="4" dir="rtl" lang="ur" formControlName="descriptionUr"></textarea>
            </div>
          </div>
        </section>

        <section class="card p-5 sm:p-6">
          <h2 class="mb-4 font-serif text-2xl">Contact</h2>
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="field-label" for="s-phone">Phone *</label>
              <input id="s-phone" class="input" formControlName="phone" type="tel" dir="ltr" aria-describedby="s-phone-err" />
              <app-field-error [control]="form.controls.phone" id="s-phone-err" [show]="submitted()" />
            </div>
            <div>
              <label class="field-label" for="s-wa">WhatsApp number *</label>
              <input id="s-wa" class="input" formControlName="whatsapp" type="tel" dir="ltr" aria-describedby="s-wa-err s-wa-hint" data-testid="settings-whatsapp" />
              <p id="s-wa-hint" class="mt-1 text-xs text-muted-ink">Include the country code, e.g. +92 336 8440890. Used for every WhatsApp button.</p>
              <app-field-error [control]="form.controls.whatsapp" id="s-wa-err" [show]="submitted()" />
            </div>
            <div class="sm:col-span-2">
              <label class="field-label" for="s-email">Email</label>
              <input id="s-email" class="input" formControlName="email" type="email" aria-describedby="s-email-err" />
              <app-field-error [control]="form.controls.email" id="s-email-err" [show]="submitted()" />
            </div>
            <div>
              <label class="field-label" for="s-hours">Opening hours (English)</label>
              <input id="s-hours" class="input" formControlName="openingHours" />
            </div>
            <div>
              <label class="field-label" for="s-hours-ur">Opening hours (Urdu)</label>
              <input id="s-hours-ur" class="input font-urdu" dir="rtl" lang="ur" formControlName="openingHoursUr" />
            </div>
            <div>
              <label class="field-label" for="s-fb">Facebook URL</label>
              <input id="s-fb" class="input" formControlName="facebookUrl" dir="ltr" aria-describedby="s-fb-err" />
              <app-field-error [control]="form.controls.facebookUrl" id="s-fb-err" [show]="submitted()" />
            </div>
            <div>
              <label class="field-label" for="s-ig">Instagram URL</label>
              <input id="s-ig" class="input" formControlName="instagramUrl" dir="ltr" aria-describedby="s-ig-err" />
              <app-field-error [control]="form.controls.instagramUrl" id="s-ig-err" [show]="submitted()" />
            </div>
          </div>
        </section>

        <section class="card p-5 sm:p-6 xl:col-span-2">
          <h2 class="mb-4 font-serif text-2xl">Location & map</h2>
          <div class="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div class="space-y-3">
              <div>
                <label class="field-label" for="s-address">Address (English) *</label>
                <textarea id="s-address" class="input" rows="2" formControlName="address" aria-describedby="s-address-err"></textarea>
                <app-field-error [control]="form.controls.address" id="s-address-err" [show]="submitted()" />
              </div>
              <div>
                <label class="field-label" for="s-address-ur">Address (Urdu)</label>
                <textarea id="s-address-ur" class="input font-urdu" rows="2" dir="rtl" lang="ur" formControlName="addressUr"></textarea>
              </div>
              <div>
                <label class="field-label" for="s-maps">Google Maps link (“Get directions”)</label>
                <input id="s-maps" class="input" formControlName="googleMapsUrl" dir="ltr" aria-describedby="s-maps-err" />
                <app-field-error [control]="form.controls.googleMapsUrl" id="s-maps-err" [show]="submitted()" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="field-label" for="s-lat">Latitude</label>
                  <input id="s-lat" class="input" formControlName="latitude" inputmode="decimal" dir="ltr" placeholder="e.g. 24.9200" aria-describedby="s-lat-err" />
                  <app-field-error [control]="form.controls.latitude" id="s-lat-err" [show]="submitted()" />
                </div>
                <div>
                  <label class="field-label" for="s-lng">Longitude</label>
                  <input id="s-lng" class="input" formControlName="longitude" inputmode="decimal" dir="ltr" placeholder="e.g. 67.0900" aria-describedby="s-lng-err" />
                  <app-field-error [control]="form.controls.longitude" id="s-lng-err" [show]="submitted()" />
                </div>
              </div>
              <p class="text-xs text-muted-ink">The embedded map uses the coordinates when both are set, otherwise the address.</p>
            </div>
            <div class="min-h-[300px] overflow-hidden rounded-xl border border-black/10 bg-black/5">
              <app-map-embed class="h-full min-h-[300px]" [url]="mapUrl()" [name]="form.controls.businessName.value" />
            </div>
          </div>
        </section>

        <section class="card p-5 sm:p-6 xl:col-span-2">
          <h2 class="mb-1 font-serif text-2xl">Homepage</h2>
          <p class="mb-4 text-xs text-muted-ink">Leave a field empty to use the default text. The last word of the headline is highlighted in gold.</p>
          <div class="grid gap-4 lg:grid-cols-2">
            <div class="space-y-3">
              <div>
                <label class="field-label" for="s-hero-title">Headline (English)</label>
                <input id="s-hero-title" class="input" formControlName="heroTitle" placeholder="Find a car that feels right." />
              </div>
              <div>
                <label class="field-label" for="s-hero-title-ur">Headline (Urdu)</label>
                <input id="s-hero-title-ur" class="input font-urdu" dir="rtl" lang="ur" formControlName="heroTitleUr" />
              </div>
              <div>
                <label class="field-label" for="s-hero-sub">Subheading (English)</label>
                <textarea id="s-hero-sub" class="input" rows="3" formControlName="heroSubtitle"></textarea>
              </div>
              <div>
                <label class="field-label" for="s-hero-sub-ur">Subheading (Urdu)</label>
                <textarea id="s-hero-sub-ur" class="input font-urdu" rows="3" dir="rtl" lang="ur" formControlName="heroSubtitleUr"></textarea>
              </div>
            </div>
            <div class="space-y-3">
              <p class="field-label">Hero image</p>
              <div class="aspect-[16/9] overflow-hidden rounded-xl bg-black/5">
                @if (form.controls.heroImageUrl.value) { <img [src]="form.controls.heroImageUrl.value" alt="Current hero image" class="size-full object-cover" /> }
              </div>
              <div class="flex flex-wrap gap-2">
                <label class="btn btn-outline-dark btn-sm cursor-pointer" [class.opacity-50]="uploadingHero()">
                  <app-icon name="upload" [size]="15" /> {{ uploadingHero() ? 'Uploading…' : 'Upload new image' }}
                  <input type="file" class="sr-only" accept="image/jpeg,image/png,image/webp,image/avif" (change)="uploadHero($event)" [disabled]="uploadingHero()" />
                </label>
              </div>
              <div>
                <label class="field-label" for="s-hero-url">…or image URL</label>
                <input id="s-hero-url" class="input" formControlName="heroImageUrl" dir="ltr" />
              </div>
              <label class="mt-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-black/10 px-3">
                <input type="checkbox" class="size-4 accent-[#090c0b]" formControlName="showDemoNotice" data-testid="settings-demo-notice" />
                <span class="text-sm"><span class="font-semibold">Show “demo inventory” notice</span> across the website. Turn off once real stock is listed.</span>
              </label>
            </div>
          </div>
        </section>

        <div class="sticky bottom-4 z-10 xl:col-span-2">
          <div class="card flex flex-wrap items-center justify-between gap-3 p-4 shadow-lg">
            <div aria-live="assertive" class="text-sm">
              @if (error()) { <span class="text-danger" role="alert">{{ error() }}</span> }
              @else if (form.dirty) { <span class="text-muted-ink">You have unsaved changes.</span> }
              @else { <span class="text-muted-ink">All changes saved.</span> }
            </div>
            <div class="flex gap-2">
              <button type="button" class="btn btn-outline-dark" (click)="reset()" [disabled]="!form.dirty || saving()">Discard</button>
              <button type="submit" class="btn btn-dark" [disabled]="saving()" data-testid="save-settings">{{ saving() ? 'Saving…' : 'Save settings' }}</button>
            </div>
          </div>
        </div>
      </form>
    }
  `,
  styles: `.card { background: #fff; border: 1px solid rgb(0 0 0 / .08); border-radius: 14px; }`,
})
export class SettingsPage {
  private readonly fb = inject(FormBuilder);
  private readonly settings = inject(SettingsService);
  private readonly toast = inject(ToastService);

  protected readonly loaded = signal(false);
  protected readonly loadError = signal(false);
  protected readonly saving = signal(false);
  protected readonly uploadingHero = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mapUrl = signal<string | null>(null);
  private current: BusinessSettings | null = null;

  protected readonly form = this.fb.nonNullable.group({
    businessName: ['', [requiredTrimmed, Validators.maxLength(80)]],
    description: [''],
    descriptionUr: [''],
    phone: ['', [requiredTrimmed, phoneValidator]],
    whatsapp: ['', [requiredTrimmed, phoneValidator]],
    email: ['', [emailValidator]],
    openingHours: [''],
    openingHoursUr: [''],
    facebookUrl: ['', [urlValidator]],
    instagramUrl: ['', [urlValidator]],
    address: ['', [requiredTrimmed, Validators.maxLength(300)]],
    addressUr: [''],
    googleMapsUrl: ['', [urlValidator]],
    latitude: ['', [numberRange(-90, 90)]],
    longitude: ['', [numberRange(-180, 180)]],
    heroTitle: [''],
    heroTitleUr: [''],
    heroSubtitle: [''],
    heroSubtitleUr: [''],
    heroImageUrl: [''],
    showDemoNotice: [true],
  });

  constructor() {
    this.load();
  }

  load() {
    this.loadError.set(false);
    this.settings.fetch().subscribe({
      next: (s) => this.fill(s),
      error: () => this.loadError.set(true),
    });
  }

  protected reset() {
    if (this.current) this.fill(this.current);
  }

  save() {
    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Please fix the highlighted fields.');
      return;
    }
    const v = this.form.getRawValue();
    const text = (s: string) => s.trim() || null;
    const coord = (s: string) => (s.trim() === '' ? null : Number(s));
    const input: SettingsInput = {
      businessName: v.businessName.trim(),
      description: text(v.description),
      descriptionUr: text(v.descriptionUr),
      phone: v.phone.trim(),
      whatsapp: v.whatsapp.trim(),
      email: text(v.email),
      openingHours: text(v.openingHours),
      openingHoursUr: text(v.openingHoursUr),
      facebookUrl: text(v.facebookUrl),
      instagramUrl: text(v.instagramUrl),
      address: v.address.trim(),
      addressUr: text(v.addressUr),
      googleMapsUrl: text(v.googleMapsUrl),
      latitude: coord(v.latitude),
      longitude: coord(v.longitude),
      heroTitle: text(v.heroTitle),
      heroTitleUr: text(v.heroTitleUr),
      heroSubtitle: text(v.heroSubtitle),
      heroSubtitleUr: text(v.heroSubtitleUr),
      heroImageUrl: text(v.heroImageUrl),
      showDemoNotice: v.showDemoNotice,
    };
    this.saving.set(true);
    this.settings.update(input).subscribe({
      next: (s) => {
        this.saving.set(false);
        this.fill(s);
        this.toast.success('Settings saved.');
      },
      error: (err) => {
        this.saving.set(false);
        const e = toAppError(err);
        this.error.set(applyServerErrors(this.form, e.fieldErrors) ? 'Please fix the highlighted fields.' : e.message);
      },
    });
  }

  protected uploadHero(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.uploadingHero.set(true);
    this.settings.uploadHeroImage(file).subscribe({
      next: (s) => {
        this.uploadingHero.set(false);
        this.form.controls.heroImageUrl.setValue(s.heroImageUrl ?? '');
        this.current = s;
        this.toast.success('Hero image updated.');
      },
      error: (err) => {
        this.uploadingHero.set(false);
        this.toast.error(toAppError(err).message);
      },
    });
  }

  private fill(s: BusinessSettings) {
    this.current = s;
    this.mapUrl.set(s.mapEmbedUrl);
    this.form.reset({
      businessName: s.businessName,
      description: s.description ?? '',
      descriptionUr: s.descriptionUr ?? '',
      phone: s.phone,
      whatsapp: s.whatsapp,
      email: s.email ?? '',
      openingHours: s.openingHours ?? '',
      openingHoursUr: s.openingHoursUr ?? '',
      facebookUrl: s.facebookUrl ?? '',
      instagramUrl: s.instagramUrl ?? '',
      address: s.address,
      addressUr: s.addressUr ?? '',
      googleMapsUrl: s.googleMapsUrl ?? '',
      latitude: s.latitude != null ? String(s.latitude) : '',
      longitude: s.longitude != null ? String(s.longitude) : '',
      heroTitle: s.heroTitle ?? '',
      heroTitleUr: s.heroTitleUr ?? '',
      heroSubtitle: s.heroSubtitle ?? '',
      heroSubtitleUr: s.heroSubtitleUr ?? '',
      heroImageUrl: s.heroImageUrl ?? '',
      showDemoNotice: s.showDemoNotice,
    });
    this.submitted.set(false);
    this.loaded.set(true);
  }
}
