import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet, type Data } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { SettingsService } from '../../core/services/settings.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { ToastOutletComponent } from '../../shared/ui/toast-outlet.component';
import { SiteFooterComponent } from './site-footer.component';
import { SiteHeaderComponent } from './site-header.component';

function deepestData(router: Router): Data {
  let snapshot = router.routerState.snapshot.root;
  while (snapshot.firstChild) snapshot = snapshot.firstChild;
  return snapshot.data ?? {};
}

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, TranslatePipe, IconComponent, ToastOutletComponent, SiteHeaderComponent, SiteFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a href="#main" class="sr-only-focusable fixed start-3 top-3 z-[400] rounded-lg bg-gold px-4 py-2 font-semibold text-ink-950">{{ 'common.skipToContent' | t }}</a>
    <span id="top"></span>

    @if (settings.settings()?.showDemoNotice) {
      <div class="relative z-[60] bg-sand px-4 py-2 text-center text-[11px] font-medium tracking-wide text-[#27241e]" role="note" data-testid="demo-notice">
        {{ 'demo.notice' | t }}
      </div>
    }

    <app-site-header [overHero]="heroHeader()" />

    <main id="main" tabindex="-1" class="outline-none" [class]="heroHeader() ? '-mt-[72px] md:-mt-[78px]' : ''">
      <router-outlet />
    </main>

    <app-site-footer />

    <!-- Mobile: sticky call / WhatsApp actions (vehicle pages render their own bar). -->
    @if (!hideMobileBar()) {
      <div class="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-white/10 bg-ink-900/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-lg md:hidden" data-testid="mobile-action-bar">
        @if (settings.phoneUrl(); as tel) {
          <a class="btn btn-light" [href]="tel"><app-icon name="phone" [size]="16" /> {{ 'nav.call' | t }}</a>
        }
        @if (settings.whatsappUrl(); as wa) {
          <a class="btn btn-gold" [href]="wa" target="_blank" rel="noopener"><app-icon name="whatsapp" [size]="16" /> {{ 'nav.whatsapp' | t }}</a>
        }
      </div>
    }

    <!-- Desktop: floating WhatsApp button -->
    @if (settings.whatsappUrl(); as wa) {
      <a
        [href]="wa"
        target="_blank"
        rel="noopener"
        class="fixed bottom-6 end-6 z-40 hidden size-14 place-items-center rounded-full bg-whatsapp text-white shadow-[0_14px_30px_-10px_rgba(37,211,102,.7)] transition-transform duration-300 hover:-translate-y-1 md:grid"
        [attr.aria-label]="'home.hero.whatsapp' | t"
      >
        <app-icon name="whatsapp" [size]="26" />
      </a>
    }

    <app-toast-outlet />
  `,
})
export class PublicLayoutComponent {
  protected readonly settings = inject(SettingsService);
  private readonly router = inject(Router);

  protected readonly data = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => deepestData(this.router)),
    ),
    { initialValue: {} as Data },
  );
  protected readonly heroHeader = computed(() => !!this.data()['heroHeader']);
  protected readonly hideMobileBar = computed(() => !!this.data()['hideMobileBar']);
}
