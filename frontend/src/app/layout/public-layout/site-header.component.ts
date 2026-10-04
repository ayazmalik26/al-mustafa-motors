import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { TranslationKey } from '../../core/i18n/translations/en';
import { FavoritesService } from '../../core/services/favorites.service';
import { SettingsService } from '../../core/services/settings.service';
import { LanguageSwitchComponent } from '../../shared/components/language-switch.component';
import { DialogComponent } from '../../shared/ui/dialog.component';
import { IconComponent } from '../../shared/ui/icon.component';

interface NavItem {
  path: string;
  label: TranslationKey;
  exact?: boolean;
}

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive, TranslatePipe, LanguageSwitchComponent, DialogComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'sticky top-0 z-50 block' },
  template: `
    <header
      class="transition-[background-color,border-color,backdrop-filter] duration-500"
      [class]="solid() ? 'border-b border-white/10 bg-ink-950/90 backdrop-blur-xl' : 'border-b border-transparent bg-transparent'"
    >
      <div class="container-x flex h-[72px] items-center justify-between gap-4 md:h-[78px]">
        <a routerLink="/" class="flex items-center gap-3" [attr.aria-label]="'brand.homeLink' | t">
          <span class="grid size-11 place-items-center rounded-full border border-white/35 font-serif text-xl">M</span>
          <span class="leading-none">
            <span class="block font-serif text-[1.2rem] tracking-[-0.01em]">{{ settings.businessName() }}</span>
            <span class="mt-1 block text-[9px] font-semibold uppercase tracking-[0.22em] text-[#b6bcb7]">{{ 'brand.city' | t }}</span>
          </span>
        </a>

        <nav class="hidden items-center gap-7 text-[13px] text-[#d6dad6] lg:flex" [attr.aria-label]="'nav.primary' | t">
          @for (item of nav; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="text-white! after:scale-x-100"
              [routerLinkActiveOptions]="{ exact: !!item.exact }"
              class="relative py-2 transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-gold after:transition-transform after:duration-300 hover:text-white hover:after:scale-x-100"
              >{{ item.label | t }}</a
            >
          }
        </nav>

        <div class="flex items-center gap-2">
          <a
            routerLink="/saved"
            class="relative hidden size-10 place-items-center rounded-full border border-white/15 text-white/85 transition-colors hover:border-gold hover:text-white sm:grid"
            [attr.aria-label]="'nav.savedCount' | t: { count: favorites.count() }"
          >
            <app-icon name="heart" [size]="17" />
            @if (favorites.count()) {
              <span class="absolute -end-1 -top-1 grid min-w-5 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-ink-950 ltr-nums">{{ favorites.count() }}</span>
            }
          </a>
          <app-language-switch class="hidden sm:block" />
          @if (settings.whatsappUrl(); as wa) {
            <a class="btn btn-gold btn-sm hidden md:inline-flex" [href]="wa" target="_blank" rel="noopener" data-testid="header-whatsapp">
              <app-icon name="whatsapp" [size]="15" /> {{ 'nav.whatsapp' | t }}
            </a>
          }
          <button
            type="button"
            class="grid size-11 place-items-center rounded-full border border-white/20 lg:hidden"
            (click)="menuOpen.set(true)"
            [attr.aria-label]="'common.openMenu' | t"
            aria-haspopup="dialog"
            [attr.aria-expanded]="menuOpen()"
            data-testid="menu-button"
          >
            <app-icon name="menu" [size]="20" />
          </button>
        </div>
      </div>
    </header>

    <app-dialog [open]="menuOpen()" size="sheet" [ariaLabel]="'nav.primary' | t" (closed)="menuOpen.set(false)">
      <div class="flex h-full flex-col bg-ink-900 text-snow">
        <div class="flex h-[72px] items-center justify-between border-b border-white/10 px-5">
          <span class="font-serif text-xl">{{ settings.businessName() }}</span>
          <button type="button" class="grid size-11 place-items-center rounded-full border border-white/20" (click)="menuOpen.set(false)" [attr.aria-label]="'common.closeMenu' | t">
            <app-icon name="x" [size]="20" />
          </button>
        </div>
        <nav class="flex-1 overflow-y-auto px-5 py-4" [attr.aria-label]="'nav.primary' | t">
          @for (item of mobileNav; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="text-gold"
              [routerLinkActiveOptions]="{ exact: !!item.exact }"
              class="flex items-center justify-between border-b border-white/10 py-4 font-serif text-[1.7rem]"
              (click)="menuOpen.set(false)"
            >
              {{ item.label | t }}
              <app-icon name="arrow-right" [size]="18" class="flip-rtl text-muted" />
            </a>
          }
          <div class="mt-6"><app-language-switch /></div>
        </nav>
        <div class="grid grid-cols-2 gap-2 border-t border-white/10 p-4">
          @if (settings.phoneUrl(); as tel) {
            <a class="btn btn-light" [href]="tel"><app-icon name="phone" [size]="16" /> {{ 'nav.call' | t }}</a>
          }
          @if (settings.whatsappUrl(); as wa) {
            <a class="btn btn-gold" [href]="wa" target="_blank" rel="noopener"><app-icon name="whatsapp" [size]="16" /> {{ 'nav.whatsapp' | t }}</a>
          }
        </div>
      </div>
    </app-dialog>
  `,
})
export class SiteHeaderComponent {
  protected readonly settings = inject(SettingsService);
  protected readonly favorites = inject(FavoritesService);
  /** True on pages with a full-bleed hero: the header starts transparent. */
  readonly overHero = input(false);

  protected readonly menuOpen = signal(false);
  private readonly scrolled = signal(false);
  protected readonly solid = computed(() => !this.overHero() || this.scrolled() || this.menuOpen());

  protected readonly nav: NavItem[] = [
    { path: '/inventory', label: 'nav.inventory' },
    { path: '/sell-exchange', label: 'nav.sellExchange' },
    { path: '/about', label: 'nav.about' },
    { path: '/contact', label: 'nav.contact' },
  ];
  protected readonly mobileNav: NavItem[] = [{ path: '/', label: 'nav.home', exact: true }, ...this.nav, { path: '/saved', label: 'nav.saved' }];

  constructor() {
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (!isBrowser) return;
      const onScroll = () => this.scrolled.set(window.scrollY > 40);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
    });
  }
}
