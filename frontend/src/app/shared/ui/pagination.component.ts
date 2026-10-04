import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { IconComponent } from './icon.component';

/** Numbered pagination with ellipses: 1 … 4 5 6 … 12 */
export function pageWindow(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

@Component({
  selector: 'app-pagination',
  imports: [IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPages() > 1) {
      <nav class="flex items-center justify-center gap-1.5" [attr.aria-label]="'pagination.label' | t">
        <button type="button" class="pg" [disabled]="page() <= 1" (click)="go(page() - 1)" [attr.aria-label]="'pagination.prev' | t">
          <app-icon name="chevron-left" class="flip-rtl" />
        </button>
        @for (p of pages(); track $index) {
          @if (p === '…') {
            <span class="px-1 text-muted" aria-hidden="true">…</span>
          } @else {
            <button
              type="button"
              class="pg"
              [class.pg-active]="p === page()"
              [attr.aria-current]="p === page() ? 'page' : null"
              [attr.aria-label]="'pagination.page' | t: { page: p }"
              (click)="go(p)"
            >
              <span class="ltr-nums">{{ p }}</span>
            </button>
          }
        }
        <button type="button" class="pg" [disabled]="page() >= totalPages()" (click)="go(page() + 1)" [attr.aria-label]="'pagination.next' | t">
          <app-icon name="chevron-right" class="flip-rtl" />
        </button>
      </nav>
    }
  `,
  styles: `
    .pg { min-width: 44px; height: 44px; padding: 0 10px; border-radius: 10px; border: 1px solid var(--pg-border, rgb(255 255 255 / 0.12)); display: inline-grid; place-items: center; font-size: 14px; font-weight: 600; transition: background-color .2s, border-color .2s, color .2s; }
    .pg:hover:not(:disabled):not(.pg-active) { border-color: var(--color-gold); }
    .pg:disabled { opacity: .35; }
    .pg-active { background: var(--pg-active-bg, var(--color-cream)); color: var(--pg-active-fg, var(--color-ink-950)); border-color: transparent; }
  `,
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pageChange = output<number>();
  protected readonly pages = computed(() => pageWindow(this.page(), this.totalPages()));

  go(page: number) {
    if (page >= 1 && page <= this.totalPages() && page !== this.page()) this.pageChange.emit(page);
  }
}
