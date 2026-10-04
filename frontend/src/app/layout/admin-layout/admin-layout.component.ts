import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';
import { AuthService } from '../../core/services/auth.service';
import { SettingsService } from '../../core/services/settings.service';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { ToastOutletComponent } from '../../shared/ui/toast-outlet.component';

interface AdminNavItem {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, ToastOutletComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-dvh bg-[#f4f1ea] text-ink-950' },
  template: `
    <div class="flex min-h-dvh">
      <!-- Sidebar -->
      <aside
        class="fixed inset-y-0 start-0 z-50 flex w-64 flex-col bg-ink-950 text-snow transition-transform duration-300 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0"
        [class.-translate-x-full]="!navOpen()"
        aria-label="Admin navigation"
      >
        <div class="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <span class="grid size-9 place-items-center rounded-full border border-white/30 font-serif">M</span>
          <div class="leading-tight">
            <p class="font-serif text-lg">{{ settings.businessName() }}</p>
            <p class="text-[10px] uppercase tracking-[0.2em] text-muted">Admin</p>
          </div>
        </div>
        <nav class="flex-1 space-y-1 overflow-y-auto p-3 text-sm">
          @for (item of nav; track item.path) {
            @if (!item.adminOnly || auth.isAdmin()) {
              <a
                [routerLink]="item.path"
                routerLinkActive="bg-white/10 text-white"
                [routerLinkActiveOptions]="{ exact: !!item.exact }"
                class="flex min-h-11 items-center gap-3 rounded-lg px-3 text-[#c5cbc6] transition-colors hover:bg-white/5 hover:text-white"
              >
                <app-icon [name]="item.icon" [size]="17" /> {{ item.label }}
              </a>
            }
          }
          <div class="my-3 border-t border-white/10"></div>
          <a href="/" target="_blank" rel="noopener" class="flex min-h-11 items-center gap-3 rounded-lg px-3 text-[#c5cbc6] hover:bg-white/5 hover:text-white">
            <app-icon name="external" [size]="17" /> View website
          </a>
        </nav>
        @if (auth.user(); as user) {
          <div class="border-t border-white/10 p-4">
            <p class="truncate text-sm font-semibold">{{ user.name }}</p>
            <p class="truncate text-xs text-muted">{{ user.email }} · {{ user.role }}</p>
            <button type="button" class="btn btn-ghost btn-sm mt-3 w-full" (click)="logout()" data-testid="logout-button">
              <app-icon name="logout" [size]="15" /> Log out
            </button>
          </div>
        }
      </aside>

      @if (navOpen()) {
        <button type="button" class="fixed inset-0 z-40 bg-black/50 lg:hidden" aria-label="Close navigation" (click)="navOpen.set(false)"></button>
      }

      <div class="flex min-w-0 flex-1 flex-col">
        <header class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-black/10 bg-[#f4f1ea]/90 px-4 backdrop-blur lg:hidden">
          <button type="button" class="grid size-10 place-items-center rounded-lg border border-black/15" (click)="navOpen.set(true)" aria-label="Open navigation">
            <app-icon name="menu" [size]="20" />
          </button>
          <span class="font-serif text-lg">Admin</span>
        </header>
        <main class="mx-auto w-full max-w-[1400px] flex-1 p-4 sm:p-6 lg:p-8" id="main">
          <router-outlet />
        </main>
      </div>
    </div>
    <app-confirm-dialog />
    <app-toast-outlet />
  `,
})
export class AdminLayoutComponent implements OnDestroy {
  protected readonly auth = inject(AuthService);
  protected readonly settings = inject(SettingsService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  protected readonly navOpen = signal(false);

  protected readonly nav: AdminNavItem[] = [
    { path: '/admin', label: 'Dashboard', icon: 'grid', exact: true },
    { path: '/admin/vehicles', label: 'Vehicles', icon: 'car' },
    { path: '/admin/enquiries', label: 'Enquiries', icon: 'inbox' },
    { path: '/admin/sell-requests', label: 'Sell requests', icon: 'swap' },
    { path: '/admin/settings', label: 'Settings', icon: 'settings', adminOnly: true },
  ];

  constructor() {
    // The admin panel is English / left-to-right regardless of the public-site language.
    this.i18n.setDocumentOverride('en');
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.navOpen.set(false));
  }

  ngOnDestroy() {
    this.i18n.setDocumentOverride(null);
  }

  logout() {
    this.auth.logout().subscribe(() => void this.router.navigate(['/admin/login']));
  }
}
