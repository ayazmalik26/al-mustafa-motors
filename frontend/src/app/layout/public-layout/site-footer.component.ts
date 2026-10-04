import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { SettingsService } from '../../core/services/settings.service';
import { formatPhone } from '../../core/utils/whatsapp';
import { IconComponent } from '../../shared/ui/icon.component';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, TranslatePipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="border-t border-white/10 bg-ink-950 pb-28 pt-16 md:pb-14">
      <div class="container-x">
        <p class="font-serif text-[clamp(3rem,11vw,9rem)] leading-none tracking-[-0.03em] text-white/[0.07]" aria-hidden="true">AL-MUSTAFA</p>
        <div class="mt-10 grid gap-10 text-sm md:grid-cols-[1.3fr_1fr_1.2fr]">
          <div>
            <p class="font-serif text-2xl">{{ settings.businessName() }}</p>
            <p class="mt-2 text-muted">{{ 'footer.tagline' | t }}</p>
            @if (settings.settings()?.facebookUrl || settings.settings()?.instagramUrl) {
              <div class="mt-5 flex gap-2">
                @if (settings.settings()?.facebookUrl; as fb) {
                  <a [href]="fb" target="_blank" rel="noopener" class="grid size-10 place-items-center rounded-full border border-white/15 hover:border-gold" [attr.aria-label]="'showroom.facebook' | t">
                    <app-icon name="facebook" [size]="16" />
                  </a>
                }
                @if (settings.settings()?.instagramUrl; as ig) {
                  <a [href]="ig" target="_blank" rel="noopener" class="grid size-10 place-items-center rounded-full border border-white/15 hover:border-gold" [attr.aria-label]="'showroom.instagram' | t">
                    <app-icon name="instagram" [size]="16" />
                  </a>
                }
              </div>
            }
          </div>
          <nav [attr.aria-label]="'footer.explore' | t">
            <p class="kicker mb-4">{{ 'footer.explore' | t }}</p>
            <ul class="space-y-2.5 text-[#c9cec9]">
              <li><a routerLink="/inventory" class="hover:text-white">{{ 'nav.inventory' | t }}</a></li>
              <li><a routerLink="/sell-exchange" class="hover:text-white">{{ 'nav.sellExchange' | t }}</a></li>
              <li><a routerLink="/about" class="hover:text-white">{{ 'nav.about' | t }}</a></li>
              <li><a routerLink="/contact" class="hover:text-white">{{ 'nav.contact' | t }}</a></li>
              <li><a routerLink="/saved" class="hover:text-white">{{ 'nav.saved' | t }}</a></li>
            </ul>
          </nav>
          <div>
            <p class="kicker mb-4">{{ 'footer.contact' | t }}</p>
            @if (settings.settings(); as s) {
              <address class="space-y-2.5 not-italic text-[#c9cec9]">
                <p>{{ settings.address() }}</p>
                <p><a class="ltr-nums hover:text-white" dir="ltr" [href]="settings.phoneUrl()">{{ phone(s.phone) }}</a></p>
                @if (settings.whatsappUrl(); as wa) {
                  <p><a class="ltr-nums hover:text-white" dir="ltr" [href]="wa" target="_blank" rel="noopener">WhatsApp {{ phone(s.whatsapp) }}</a></p>
                }
              </address>
            }
          </div>
        </div>
        <div class="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-muted-2 sm:flex-row sm:items-center sm:justify-between">
          <p>{{ 'footer.rights' | t: { year: year, name: settings.businessName() } }}</p>
          <div class="flex gap-5">
            <a routerLink="/admin/login" class="hover:text-white">{{ 'footer.staff' | t }}</a>
            <a href="#top" class="hover:text-white">{{ 'footer.backToTop' | t }} ↑</a>
          </div>
        </div>
      </div>
    </footer>
  `,
})
export class SiteFooterComponent {
  protected readonly settings = inject(SettingsService);
  protected readonly year = new Date().getFullYear();
  protected readonly phone = formatPhone;
}
