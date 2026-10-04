import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, firstValueFrom, map, of, tap, type Observable } from 'rxjs';
import { API_BASE, unwrap } from '../http/api';
import type { ApiSuccess } from '../models/api.models';
import type { BusinessSettings, SettingsInput } from '../models/settings.models';
import { I18nService } from '../i18n/i18n.service';
import { telLink, whatsappLink } from '../utils/whatsapp';

/**
 * Business details (contact numbers, address, map, homepage content) come from
 * the database via /api/settings — never hard-coded in components.
 * Loaded once at startup (and transferred from SSR to the browser).
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);

  readonly settings = signal<BusinessSettings | null>(null);
  readonly loaded = signal(false);

  readonly businessName = computed(() => this.settings()?.businessName ?? this.i18n.t('brand.name'));
  readonly whatsappUrl = computed(() => whatsappLink(this.settings()?.whatsapp, this.i18n.t('wa.general')));
  readonly phoneUrl = computed(() => telLink(this.settings()?.phone));
  readonly siteUrl = computed(() => this.settings()?.siteUrl ?? '');

  /** Localised field: uses the Urdu column when Urdu is active and it has content. */
  readonly address = computed(() => this.localized('address', 'addressUr'));
  readonly openingHours = computed(() => this.localized('openingHours', 'openingHoursUr'));
  readonly description = computed(() => this.localized('description', 'descriptionUr'));
  readonly heroTitle = computed(() => this.localized('heroTitle', 'heroTitleUr'));
  readonly heroSubtitle = computed(() => this.localized('heroSubtitle', 'heroSubtitleUr'));

  /** Called by the app initializer. Never throws — pages show fallbacks when settings are missing. */
  load(): Promise<void> {
    return firstValueFrom(
      this.fetch().pipe(
        tap((s) => this.settings.set(s)),
        map(() => undefined),
        catchError(() => of(undefined)),
      ),
    ).finally(() => this.loaded.set(true));
  }

  fetch(): Observable<BusinessSettings> {
    return this.http.get<ApiSuccess<BusinessSettings>>(`${API_BASE}/settings`).pipe(unwrap());
  }

  update(input: SettingsInput): Observable<BusinessSettings> {
    return this.http.patch<ApiSuccess<BusinessSettings>>(`${API_BASE}/settings`, input).pipe(
      unwrap(),
      tap((s) => this.settings.set(s)),
    );
  }

  uploadHeroImage(file: File): Observable<BusinessSettings> {
    const body = new FormData();
    body.append('image', file);
    return this.http.post<ApiSuccess<BusinessSettings>>(`${API_BASE}/settings/hero-image`, body).pipe(
      unwrap(),
      tap((s) => this.settings.set(s)),
    );
  }

  private localized(en: keyof BusinessSettings, ur: keyof BusinessSettings): string | null {
    const s = this.settings();
    if (!s) return null;
    const urValue = s[ur] as string | null;
    if (this.i18n.lang() === 'ur' && urValue) return urValue;
    return (s[en] as string | null) ?? null;
  }
}
