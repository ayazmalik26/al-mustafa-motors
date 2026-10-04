import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { DashboardStats } from '../../../core/models/settings.models';

type Day = DashboardStats['leadsByDay'][number];

/**
 * Daily leads for the last 14 days as stacked bars (enquiries + sell requests).
 * Colours validated for colour-vision deficiency and contrast; identity is also
 * carried by the legend, hover tooltip and the accessible data table.
 */
@Component({
  selector: 'app-leads-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="viz-root">
      <div class="mb-4 flex flex-wrap items-center gap-4 text-xs text-[#52514e]" aria-hidden="true">
        <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-sm bg-[var(--series-1)]"></span> Enquiries</span>
        <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-sm bg-[var(--series-2)]"></span> Sell / exchange requests</span>
      </div>

      <div class="relative">
        <div class="flex h-44 items-end gap-1.5 border-b border-black/15 sm:gap-2" role="img" [attr.aria-label]="summary()">
          @for (day of days(); track day.date; let i = $index) {
            <button
              type="button"
              class="group relative flex h-full flex-1 cursor-default flex-col justify-end outline-none"
              (mouseenter)="hover.set(i)"
              (mouseleave)="hover.set(null)"
              (focus)="hover.set(i)"
              (blur)="hover.set(null)"
              [attr.aria-label]="label(day)"
            >
              <span class="absolute inset-0 rounded-md transition-colors group-hover:bg-black/[0.04] group-focus-visible:bg-black/[0.06]"></span>
              @if (day.sellRequests) {
                <span class="relative mb-[2px] rounded-t-[4px] bg-[var(--series-2)]" [style.height.%]="pct(day.sellRequests)"></span>
              }
              @if (day.enquiries) {
                <span class="relative bg-[var(--series-1)]" [class]="day.sellRequests ? '' : 'rounded-t-[4px]'" [style.height.%]="pct(day.enquiries)"></span>
              }
            </button>
          }
        </div>
        @if (hoveredDay(); as d) {
          <div class="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs shadow-lg" [style.left.%]="tooltipLeft()">
            <p class="font-semibold text-[#0b0b0b]">{{ format(d.date) }}</p>
            <p class="mt-1 flex items-center gap-1.5 text-[#52514e]"><span class="size-2 rounded-sm bg-[var(--series-1)]"></span> Enquiries: {{ d.enquiries }}</p>
            <p class="flex items-center gap-1.5 text-[#52514e]"><span class="size-2 rounded-sm bg-[var(--series-2)]"></span> Sell requests: {{ d.sellRequests }}</p>
          </div>
        }
        <div class="mt-2 flex justify-between text-[11px] text-[#52514e]" aria-hidden="true">
          <span>{{ format(days()[0]?.date) }}</span>
          <span>{{ format(days().at(-1)?.date) }}</span>
        </div>
      </div>

      <table class="sr-only">
        <caption>Leads per day, last 14 days</caption>
        <thead><tr><th scope="col">Date</th><th scope="col">Enquiries</th><th scope="col">Sell requests</th></tr></thead>
        <tbody>
          @for (day of days(); track day.date) {
            <tr><th scope="row">{{ format(day.date) }}</th><td>{{ day.enquiries }}</td><td>{{ day.sellRequests }}</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .viz-root { --series-1: #2a78d6; --series-2: #b5741f; }
  `,
})
export class LeadsChartComponent {
  readonly days = input.required<Day[]>();
  protected readonly hover = signal<number | null>(null);

  private readonly max = computed(() => Math.max(1, ...this.days().map((d) => d.enquiries + d.sellRequests)));
  protected readonly hoveredDay = computed(() => {
    const i = this.hover();
    return i === null ? null : this.days()[i];
  });
  protected readonly tooltipLeft = computed(() => {
    const i = this.hover() ?? 0;
    const n = this.days().length || 1;
    return Math.min(88, Math.max(12, ((i + 0.5) / n) * 100));
  });
  protected readonly summary = computed(() => {
    const total = this.days().reduce((sum, d) => sum + d.enquiries + d.sellRequests, 0);
    return `${total} leads in the last 14 days. Full figures in the table below.`;
  });

  protected pct(value: number) {
    return (value / this.max()) * 100;
  }

  protected label(day: Day) {
    return `${this.format(day.date)}: ${day.enquiries} enquiries, ${day.sellRequests} sell requests`;
  }

  protected format(date: string | undefined) {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`));
  }
}
