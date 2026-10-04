import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toAppError } from '../../../core/http/api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthService } from '../../../core/services/auth.service';
import { SettingsService } from '../../../core/services/settings.service';
import { IconComponent } from '../../../shared/ui/icon.component';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="grid min-h-dvh lg:grid-cols-[1.1fr_.9fr]">
      <div class="relative hidden overflow-hidden bg-ink-850 lg:block">
        <img src="https://images.unsplash.com/photo-1758393461426-6b5f9b143825?auto=format&fit=crop&w=1600&q=80" alt="" class="absolute inset-0 size-full object-cover opacity-60" />
        <div class="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent"></div>
        <div class="absolute inset-x-12 bottom-12 text-white">
          <p class="kicker">Admin</p>
          <p class="mt-3 font-serif text-5xl leading-none">{{ settings.businessName() }}</p>
          <p class="mt-3 max-w-sm text-sm text-[#c9cec9]">Manage vehicles, enquiries, sell requests and showroom details.</p>
        </div>
      </div>

      <div class="flex items-center justify-center bg-[#f4f1ea] px-5 py-12 text-ink-950">
        <div class="w-full max-w-sm">
          <a routerLink="/" class="mb-10 inline-flex items-center gap-2 text-sm text-muted-ink hover:text-ink-950"><app-icon name="arrow-left" [size]="15" /> Back to website</a>
          <h1 class="font-serif text-4xl">Sign in</h1>
          <p class="mt-2 text-sm text-muted-ink">Staff and administrators only.</p>

          @if (expired()) {
            <p class="mt-5 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-[#7a5410]" role="status">Your session expired. Please sign in again.</p>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" class="mt-8 space-y-4" novalidate data-testid="login-form">
            <div>
              <label class="field-label" for="login-email">Email</label>
              <input id="login-email" class="input" type="email" formControlName="email" autocomplete="username" [attr.aria-invalid]="showError('email')" aria-describedby="login-email-err" />
              @if (showError('email')) { <p id="login-email-err" class="field-error" role="alert">Enter a valid email address.</p> }
            </div>
            <div>
              <label class="field-label" for="login-password">Password</label>
              <div class="relative">
                <input id="login-password" class="input pe-12" [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" [attr.aria-invalid]="showError('password')" aria-describedby="login-password-err" />
                <button type="button" class="absolute end-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-ink hover:text-ink-950" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'" [attr.aria-pressed]="showPassword()">
                  <app-icon name="eye" [size]="17" />
                </button>
              </div>
              @if (showError('password')) { <p id="login-password-err" class="field-error" role="alert">Enter your password.</p> }
            </div>
            <div aria-live="assertive">
              @if (error()) { <p class="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert" data-testid="login-error">{{ error() }}</p> }
            </div>
            <button type="submit" class="btn btn-dark btn-lg w-full" [disabled]="loading()" data-testid="login-submit">
              @if (loading()) { <span class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span> Signing in… } @else { Sign in }
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class LoginPage implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject(I18nService);
  protected readonly settings = inject(SettingsService);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly submitted = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly expired = signal(this.route.snapshot.queryParamMap.has('expired'));

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  constructor() {
    this.i18n.setDocumentOverride('en');
  }

  ngOnDestroy() {
    this.i18n.setDocumentOverride(null);
  }

  protected showError(name: 'email' | 'password') {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  submit() {
    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) return;
    this.loading.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email.trim(), password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const target = returnUrl && returnUrl.startsWith('/admin') && !returnUrl.startsWith('/admin/login') ? returnUrl : '/admin';
        void this.router.navigateByUrl(target);
      },
      error: (err) => {
        this.loading.set(false);
        const e = toAppError(err);
        this.error.set(
          e.status === 401 ? 'Incorrect email or password.' : e.status === 429 ? 'Too many attempts. Please wait a minute and try again.' : 'Could not sign in. Please try again.',
        );
      },
    });
  }
}
