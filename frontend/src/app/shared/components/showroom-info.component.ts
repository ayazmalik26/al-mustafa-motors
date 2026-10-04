import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { SettingsService } from '../../core/services/settings.service';
import { formatPhone, whatsappLink } from '../../core/utils/whatsapp';
import { IconComponent } from '../ui/icon.component';

/** Address, hours, phone, WhatsApp, email and social links — all from admin settings. */
@Component({
  selector: 'app-showroom-info',
  imports: [IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (s(); as s) {
      <div class="panel h-full p-6 sm:p-8">
        <h3 class="font-serif text-4xl">{{ s.businessName }}</h3>
        <dl class="mt-6 text-sm">
          <div class="row">
            <dt class="lbl"><app-icon name="map-pin" [size]="15" /> {{ 'showroom.address' | t }}</dt>
            <dd data-testid="showroom-address">{{ settings.address() }}</dd>
          </div>
          @if (settings.openingHours()) {
            <div class="row">
              <dt class="lbl"><app-icon name="clock" [size]="15" /> {{ 'showroom.hours' | t }}</dt>
              <dd>{{ settings.openingHours() }}</dd>
            </div>
          }
          <div class="row">
            <dt class="lbl"><app-icon name="phone" [size]="15" /> {{ 'showroom.phone' | t }}</dt>
            <dd><a class="ltr-nums underline-offset-4 hover:text-gold-light hover:underline" dir="ltr" [href]="settings.phoneUrl()" data-testid="showroom-phone">{{ phone(s.phone) }}</a></dd>
          </div>
          <div class="row">
            <dt class="lbl"><app-icon name="whatsapp" [size]="15" /> {{ 'showroom.whatsapp' | t }}</dt>
            <dd><a class="ltr-nums underline-offset-4 hover:text-gold-light hover:underline" dir="ltr" [href]="waUrl()" target="_blank" rel="noopener">{{ phone(s.whatsapp) }}</a></dd>
          </div>
          @if (s.email) {
            <div class="row">
              <dt class="lbl"><app-icon name="mail" [size]="15" /> {{ 'showroom.email' | t }}</dt>
              <dd><a class="hover:text-gold-light" [href]="'mailto:' + s.email">{{ s.email }}</a></dd>
            </div>
          }
        </dl>
        <div class="mt-6 flex flex-wrap gap-2">
          @if (waUrl()) {
            <a class="btn btn-gold" [href]="waUrl()" target="_blank" rel="noopener"><app-icon name="whatsapp" [size]="16" /> {{ 'nav.whatsapp' | t }}</a>
          }
          @if (s.googleMapsUrl) {
            <a class="btn btn-ghost" [href]="s.googleMapsUrl" target="_blank" rel="noopener" data-testid="directions-link">
              <app-icon name="map-pin" [size]="16" /> {{ 'showroom.directions' | t }}
            </a>
          }
          @if (s.facebookUrl) {
            <a class="btn btn-ghost" [href]="s.facebookUrl" target="_blank" rel="noopener" [attr.aria-label]="('showroom.facebook' | t) + ' — ' + s.businessName">
              <app-icon name="facebook" [size]="16" /> {{ 'showroom.facebook' | t }}
            </a>
          }
          @if (s.instagramUrl) {
            <a class="btn btn-ghost" [href]="s.instagramUrl" target="_blank" rel="noopener" [attr.aria-label]="('showroom.instagram' | t) + ' — ' + s.businessName">
              <app-icon name="instagram" [size]="16" /> {{ 'showroom.instagram' | t }}
            </a>
          }
        </div>
      </div>
    } @else {
      <div class="panel p-8 text-sm text-muted">{{ 'showroom.unavailable' | t }}</div>
    }
  `,
  styles: `
    .row { display: grid; grid-template-columns: 112px 1fr; gap: 12px; padding: 14px 0; border-top: 1px solid rgb(255 255 255 / 0.11); }
    .lbl { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--color-muted-2); }
    :host-context(html[lang='ur']) .lbl { letter-spacing: 0; font-size: 13px; text-transform: none; }
    @media (max-width: 420px) { .row { grid-template-columns: 1fr; gap: 4px; } }
  `,
})
export class ShowroomInfoComponent {
  protected readonly settings = inject(SettingsService);
  private readonly i18n = inject(I18nService);
  protected readonly s = computed(() => this.settings.settings());
  readonly compact = input(false);
  protected readonly waUrl = computed(() => whatsappLink(this.s()?.whatsapp, this.i18n.t('wa.general')));
  protected readonly phone = formatPhone;
}
