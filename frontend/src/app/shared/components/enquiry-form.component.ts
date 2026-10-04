import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { toAppError } from '../../core/http/api';
import type { EnquiryCreated, EnquirySource } from '../../core/models/lead.models';
import type { Vehicle } from '../../core/models/vehicle.models';
import { LeadService } from '../../core/services/lead.service';
import { SettingsService } from '../../core/services/settings.service';
import { enquiryFollowUpMessage, whatsappLink } from '../../core/utils/whatsapp';
import { applyServerErrors, emailValidator, phoneValidator, requiredTrimmed } from '../forms/validators';
import { FieldErrorComponent } from '../ui/field-error.component';
import { IconComponent } from '../ui/icon.component';

export const ENQUIRY_MIN_MESSAGE = 10;
let nextId = 0;

/**
 * Enquiry form used on vehicle pages (with the vehicle attached) and the contact page.
 * Validates on the client, POSTs to /api/enquiries, then offers a WhatsApp follow-up.
 */
@Component({
  selector: 'app-enquiry-form',
  imports: [ReactiveFormsModule, TranslatePipe, FieldErrorComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (result(); as done) {
      <div class="py-4 text-center" role="status" aria-live="polite" data-testid="enquiry-success">
        <span class="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-success/15 text-success"><app-icon name="check" [size]="26" /></span>
        <p class="font-serif text-3xl">{{ 'enquiry.successTitle' | t }}</p>
        <p class="mx-auto mt-3 max-w-sm text-sm" [class]="muted()">{{ 'enquiry.successBody' | t }}</p>
        <div class="mt-6 flex flex-wrap justify-center gap-2">
          @if (followUpUrl(); as url) {
            <a class="btn btn-whatsapp" [href]="url" target="_blank" rel="noopener" data-testid="enquiry-whatsapp">
              <app-icon name="whatsapp" [size]="16" /> {{ 'enquiry.continueWhatsApp' | t }}
            </a>
          }
          <button type="button" class="btn" [class]="tone() === 'light' ? 'btn-outline-dark' : 'btn-ghost'" (click)="reset()">{{ 'enquiry.sendAnother' | t }}</button>
        </div>
      </div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate [attr.aria-describedby]="uid + '-status'" data-testid="enquiry-form">
        @if (vehicle(); as v) {
          <p class="mb-4 rounded-lg px-3 py-2 text-sm" [class]="tone() === 'light' ? 'bg-black/5' : 'bg-white/5'">{{ 'enquiry.about' | t: { title: v.title + ' ' + v.year } }}</p>
        }
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="field-label" [class.field-label-dark]="tone() === 'dark'" [for]="uid + '-name'">{{ 'form.name' | t }} *</label>
            <input class="input" [class.input-dark]="tone() === 'dark'" [id]="uid + '-name'" formControlName="name" autocomplete="name" [placeholder]="'form.namePlaceholder' | t"
              [attr.aria-invalid]="invalid('name')" [attr.aria-describedby]="uid + '-name-err'" />
            <app-field-error [control]="form.controls.name" [id]="uid + '-name-err'" [show]="submitted()" [overrides]="{ required: 'validation.nameRequired' }" />
          </div>
          <div>
            <label class="field-label" [class.field-label-dark]="tone() === 'dark'" [for]="uid + '-phone'">{{ 'form.phone' | t }} *</label>
            <input class="input ltr-nums" [class.input-dark]="tone() === 'dark'" [id]="uid + '-phone'" formControlName="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr"
              [placeholder]="'form.phonePlaceholder' | t" [attr.aria-invalid]="invalid('phone')" [attr.aria-describedby]="uid + '-phone-err'" />
            <app-field-error [control]="form.controls.phone" [id]="uid + '-phone-err'" [show]="submitted()" [overrides]="{ required: 'validation.phoneRequired' }" />
          </div>
        </div>
        <div class="mt-3">
          <label class="field-label" [class.field-label-dark]="tone() === 'dark'" [for]="uid + '-email'">{{ 'form.email' | t }} <span class="normal-case tracking-normal opacity-70">({{ 'common.optional' | t }})</span></label>
          <input class="input" [class.input-dark]="tone() === 'dark'" [id]="uid + '-email'" formControlName="email" type="email" autocomplete="email" dir="ltr"
            [placeholder]="'form.emailPlaceholder' | t" [attr.aria-invalid]="invalid('email')" [attr.aria-describedby]="uid + '-email-err'" />
          <app-field-error [control]="form.controls.email" [id]="uid + '-email-err'" [show]="submitted()" />
        </div>
        <div class="mt-3">
          <label class="field-label" [class.field-label-dark]="tone() === 'dark'" [for]="uid + '-message'">{{ 'form.message' | t }} *</label>
          <textarea class="input" [class.input-dark]="tone() === 'dark'" [id]="uid + '-message'" formControlName="message" rows="4" [placeholder]="'form.messagePlaceholder' | t"
            [attr.aria-invalid]="invalid('message')" [attr.aria-describedby]="uid + '-message-err'"></textarea>
          <app-field-error [control]="form.controls.message" [id]="uid + '-message-err'" [show]="submitted()" />
        </div>
        <!-- Honeypot: hidden from people and assistive tech; bots tend to fill it in. -->
        <div class="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
          <label [for]="uid + '-website'">Website</label>
          <input [id]="uid + '-website'" formControlName="website" tabindex="-1" autocomplete="off" />
        </div>

        <div [id]="uid + '-status'" aria-live="assertive">
          @if (error()) {
            <p class="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{{ error() }}</p>
          }
        </div>

        <button type="submit" class="btn btn-lg mt-5 w-full" [class]="tone() === 'light' ? 'btn-dark' : 'btn-gold'" [disabled]="submitting()" data-testid="enquiry-submit">
          @if (submitting()) {
            <span class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span>
            {{ 'form.sending' | t }}
          } @else {
            {{ 'enquiry.submit' | t }} <app-icon name="arrow-right" [size]="16" class="flip-rtl" />
          }
        </button>
        <p class="mt-3 text-center text-xs" [class]="muted()">{{ 'form.privacy' | t }}</p>
      </form>
    }
  `,
})
export class EnquiryFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly leads = inject(LeadService);
  private readonly settings = inject(SettingsService);
  private readonly i18n = inject(I18nService);

  readonly vehicle = input<Pick<Vehicle, 'id' | 'title' | 'year' | 'slug'> | null>(null);
  readonly source = input<EnquirySource>('GENERAL');
  readonly tone = input<'light' | 'dark'>('light');
  readonly submittedEnquiry = output<EnquiryCreated>();

  protected readonly uid = `enq-${nextId++}`;
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly result = signal<EnquiryCreated | null>(null);
  private submittedName = '';

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [requiredTrimmed, Validators.minLength(2), Validators.maxLength(80)]],
    phone: ['', [requiredTrimmed, phoneValidator]],
    email: ['', [emailValidator, Validators.maxLength(254)]],
    message: ['', [requiredTrimmed, Validators.minLength(ENQUIRY_MIN_MESSAGE), Validators.maxLength(2000)]],
    website: [''],
  });

  protected readonly muted = computed(() => (this.tone() === 'light' ? 'text-muted-ink' : 'text-muted'));

  protected readonly followUpUrl = computed(() => {
    const done = this.result();
    if (!done) return null;
    const message = enquiryFollowUpMessage({ name: this.submittedName, vehicleTitle: done.vehicleTitle, reference: done.id.slice(0, 8).toUpperCase() }, this.i18n.tr);
    return whatsappLink(this.settings.settings()?.whatsapp, message);
  });

  ngOnInit() {
    // Pre-fill a helpful message when the form is opened for a specific vehicle.
    const v = this.vehicle();
    if (v && !this.form.controls.message.value) {
      this.form.controls.message.setValue(this.i18n.t('enquiry.defaultMessage', { title: `${v.title} ${v.year}` }));
    }
  }

  protected invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  submit() {
    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set(this.i18n.t('form.checkFields'));
      return;
    }
    const value = this.form.getRawValue();
    this.submitting.set(true);
    this.leads
      .createEnquiry({
        name: value.name.trim(),
        phone: value.phone.trim(),
        email: value.email.trim() || undefined,
        message: value.message.trim(),
        vehicleId: this.vehicle()?.id,
        source: this.vehicle() ? 'VEHICLE_PAGE' : this.source(),
        locale: this.i18n.lang(),
        website: value.website || undefined,
      })
      .subscribe({
        next: (created) => {
          this.submittedName = value.name.trim();
          this.submitting.set(false);
          this.result.set(created);
          this.submittedEnquiry.emit(created);
        },
        error: (err) => {
          this.submitting.set(false);
          const e = toAppError(err);
          if (e.status === 429) this.error.set(this.i18n.t('form.rateLimited'));
          else if (applyServerErrors(this.form, e.fieldErrors)) this.error.set(this.i18n.t('form.checkFields'));
          else this.error.set(this.i18n.t('form.serverError'));
        },
      });
  }

  reset() {
    this.result.set(null);
    this.submitted.set(false);
    this.form.reset({ name: this.form.controls.name.value, phone: this.form.controls.phone.value, email: this.form.controls.email.value, message: '', website: '' });
  }
}
