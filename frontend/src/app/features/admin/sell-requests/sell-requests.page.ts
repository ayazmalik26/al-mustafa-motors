import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, catchError, combineLatest, debounceTime, distinctUntilChanged, map, of, startWith, switchMap, tap } from 'rxjs';
import { toAppError } from '../../../core/http/api';
import { formatDateTime, formatNumber, formatPkrCompact } from '../../../core/i18n/format';
import type { LoadState, Paged } from '../../../core/models/api.models';
import { SELL_INTENTS, SELL_REQUEST_STATUSES, type SellIntent, type SellRequest, type SellRequestStatus } from '../../../core/models/lead.models';
import { LeadService } from '../../../core/services/lead.service';
import { SettingsService } from '../../../core/services/settings.service';
import { ToastService } from '../../../core/services/toast.service';
import { telLink, whatsappLink } from '../../../core/utils/whatsapp';
import { DialogComponent } from '../../../shared/ui/dialog.component';
import { IconComponent } from '../../../shared/ui/icon.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { ErrorStateComponent } from '../../../shared/ui/states.component';
import { ENQUIRY_STATUS_STYLE, titleCase } from '../shared/admin-ui';

@Component({
  selector: 'app-sell-requests-page',
  imports: [ReactiveFormsModule, DialogComponent, IconComponent, PaginationComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6">
      <h1 class="font-serif text-4xl">Sell & exchange requests</h1>
      <p class="text-sm text-muted-ink">Customers who want to sell their car or trade it in.</p>
    </div>

    <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
        <button type="button" class="tab" [class.on]="!status()" (click)="setStatus(null)">All</button>
        @for (s of statuses; track s) { <button type="button" class="tab" [class.on]="status() === s" (click)="setStatus(s)">{{ tc(s) }}</button> }
      </div>
      <div class="flex flex-wrap gap-2">
        <label class="sr-only" for="intent-filter">Intent</label>
        <select id="intent-filter" class="input w-40" (change)="setIntent($event)">
          <option value="">Sell & exchange</option>
          @for (i of intents; track i) { <option [value]="i">{{ tc(i) }} only</option> }
        </select>
        <div class="relative w-full sm:w-72">
          <label for="sell-search" class="sr-only">Search sell requests</label>
          <app-icon name="search" [size]="16" class="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-ink" />
          <input id="sell-search" type="search" class="input ps-10" placeholder="Search name, phone, make…" [formControl]="search" />
        </div>
      </div>
    </div>

    @if (state().status === 'error') {
      <app-error-state tone="light" (retry)="reload()" />
    } @else {
      <div class="overflow-hidden rounded-[14px] border border-black/10 bg-white" [class.opacity-60]="state().status === 'loading'">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[980px] text-sm">
            <thead class="border-b border-black/10 bg-[#faf8f4] text-xs uppercase tracking-wider text-muted-ink">
              <tr>
                <th scope="col" class="px-4 py-3 text-start font-semibold">Name / phone</th>
                <th scope="col" class="px-4 py-3 text-start font-semibold">Vehicle</th>
                <th scope="col" class="px-4 py-3 text-start font-semibold">Year</th>
                <th scope="col" class="px-4 py-3 text-start font-semibold">Mileage</th>
                <th scope="col" class="px-4 py-3 text-start font-semibold">Intent</th>
                <th scope="col" class="px-4 py-3 text-start font-semibold">Date</th>
                <th scope="col" class="px-4 py-3 text-start font-semibold">Status</th>
                <th scope="col" class="px-4 py-3 text-end font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-black/5">
              @for (r of rows(); track r.id) {
                <tr class="hover:bg-[#faf8f4]" data-testid="sell-row">
                  <td class="px-4 py-3"><p class="font-semibold">{{ r.name }}</p><p class="text-xs text-muted-ink" dir="ltr">{{ r.phone }}</p></td>
                  <td class="px-4 py-3">
                    {{ r.vehicleMake }} {{ r.vehicleModel }}
                    @if (r.images.length) { <span class="ms-1 inline-flex items-center gap-0.5 text-xs text-muted-ink"><app-icon name="camera" [size]="12" /> {{ r.images.length }}</span> }
                  </td>
                  <td class="px-4 py-3">{{ r.vehicleYear }}</td>
                  <td class="px-4 py-3 whitespace-nowrap">{{ r.mileage != null ? num(r.mileage) + ' km' : '—' }}</td>
                  <td class="px-4 py-3">{{ tc(r.intent) }}</td>
                  <td class="px-4 py-3 whitespace-nowrap text-xs text-muted-ink">{{ dt(r.createdAt) }}</td>
                  <td class="px-4 py-3">
                    <label class="sr-only" [for]="'sr-status-' + r.id">Status for {{ r.name }}</label>
                    <select [id]="'sr-status-' + r.id" class="input !min-h-9 w-36 !py-1 text-sm" (change)="changeStatus(r, $event)" [disabled]="busy() === r.id" data-testid="sell-status-select">
                      @for (s of statuses; track s) { <option [value]="s" [selected]="r.status === s">{{ tc(s) }}</option> }
                    </select>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex justify-end gap-1">
                      <a [href]="wa(r)" target="_blank" rel="noopener" class="ibtn text-[#128c7e]" [attr.aria-label]="'WhatsApp ' + r.name"><app-icon name="whatsapp" [size]="16" /></a>
                      <a [href]="tel(r)" class="ibtn" [attr.aria-label]="'Call ' + r.name"><app-icon name="phone" [size]="16" /></a>
                      <button type="button" class="ibtn" (click)="open(r)" [attr.aria-label]="'View details for ' + r.name" data-testid="view-sell-request"><app-icon name="eye" [size]="16" /></button>
                    </div>
                  </td>
                </tr>
              } @empty {
                @if (state().status === 'loading') {
                  @for (i of [1, 2, 3]; track i) { <tr><td colspan="8" class="px-4 py-3"><div class="skeleton-light h-10"></div></td></tr> }
                } @else {
                  <tr><td colspan="8" class="px-4 py-12 text-center text-muted-ink">No sell or exchange requests found.</td></tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
      @if (meta(); as m) {
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-ink">
          <span>{{ m.total }} requests</span>
          <app-pagination class="[--pg-border:rgb(0_0_0/.12)] [--pg-active-bg:var(--color-ink-950)] [--pg-active-fg:#fff]" [page]="m.page" [totalPages]="m.totalPages" (pageChange)="page.set($event)" />
        </div>
      }
    }

    <app-dialog [open]="!!selected()" size="wide" labelledBy="sell-detail-title" (closed)="selected.set(null)">
      @if (selected(); as r) {
        <div class="max-h-[calc(100dvh-24px)] overflow-y-auto rounded-2xl bg-white p-6 text-ink-950 shadow-2xl sm:p-8" data-testid="sell-detail">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-gold-dark">{{ tc(r.intent) }}</p>
              <h2 id="sell-detail-title" class="font-serif text-3xl">{{ r.vehicleMake }} {{ r.vehicleModel }} {{ r.vehicleYear }}</h2>
              <p class="text-sm text-muted-ink">{{ r.name }} · {{ dt(r.createdAt) }} · ref {{ r.id.slice(0, 8).toUpperCase() }}</p>
            </div>
            <button type="button" class="ibtn" (click)="selected.set(null)" aria-label="Close"><app-icon name="x" [size]="18" /></button>
          </div>
          <dl class="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <div><dt class="text-xs text-muted-ink">Phone</dt><dd dir="ltr">{{ r.phone }}</dd></div>
            <div><dt class="text-xs text-muted-ink">Email</dt><dd>{{ r.email || '—' }}</dd></div>
            <div><dt class="text-xs text-muted-ink">Mileage</dt><dd>{{ r.mileage != null ? num(r.mileage) + ' km' : '—' }}</dd></div>
            <div><dt class="text-xs text-muted-ink">Condition</dt><dd>{{ r.condition ? tc(r.condition) : '—' }}</dd></div>
            <div><dt class="text-xs text-muted-ink">Expected price</dt><dd>{{ r.expectedPrice != null ? 'PKR ' + num(r.expectedPrice) + ' (' + pkr(r.expectedPrice) + ')' : '—' }}</dd></div>
            <div><dt class="text-xs text-muted-ink">Language</dt><dd>{{ r.locale === 'ur' ? 'Urdu' : 'English' }}</dd></div>
          </dl>
          @if (r.message) { <div class="mt-5 rounded-xl bg-[#faf8f4] p-4 text-sm whitespace-pre-line" dir="auto">{{ r.message }}</div> }
          @if (r.images.length) {
            <ul class="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              @for (img of r.images; track img.id) {
                <li><a [href]="img.url" target="_blank" rel="noopener" class="block aspect-[4/3] overflow-hidden rounded-lg border border-black/10"><img [src]="img.thumbUrl || img.url" alt="Photo sent by the customer" class="size-full object-cover" loading="lazy" /></a></li>
              }
            </ul>
          }
          <div class="mt-5">
            <label class="field-label" for="sell-notes">Internal notes</label>
            <textarea id="sell-notes" class="input" rows="3" [formControl]="notes" placeholder="Valuation notes, follow-ups… (staff only)"></textarea>
          </div>
          <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div class="flex gap-2">
              <a [href]="wa(r)" target="_blank" rel="noopener" class="btn btn-whatsapp btn-sm"><app-icon name="whatsapp" [size]="15" /> WhatsApp</a>
              <a [href]="tel(r)" class="btn btn-outline-dark btn-sm"><app-icon name="phone" [size]="15" /> Call</a>
            </div>
            <div class="flex items-center gap-2">
              <label class="sr-only" for="sell-detail-status">Status</label>
              <select id="sell-detail-status" class="input !min-h-10 w-40 !py-1.5" [formControl]="detailStatus">
                @for (s of statuses; track s) { <option [value]="s">{{ tc(s) }}</option> }
              </select>
              <button type="button" class="btn btn-dark btn-sm" (click)="saveDetail(r)" [disabled]="busy() === r.id">Save</button>
            </div>
          </div>
        </div>
      }
    </app-dialog>
  `,
  styles: `
    .tab { min-height: 36px; padding: 0 14px; border-radius: 999px; border: 1px solid rgb(0 0 0 / .12); font-size: 13px; background: #fff; }
    .tab.on { background: var(--color-ink-950); color: #fff; border-color: var(--color-ink-950); }
    .ibtn { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 8px; transition: background-color .2s; }
    .ibtn:hover { background: rgb(0 0 0 / .06); }
  `,
})
export class SellRequestsPage {
  private readonly leads = inject(LeadService);
  private readonly toast = inject(ToastService);
  private readonly settings = inject(SettingsService);

  protected readonly statuses = SELL_REQUEST_STATUSES;
  protected readonly intents = SELL_INTENTS;
  protected readonly style = ENQUIRY_STATUS_STYLE;
  protected readonly tc = titleCase;
  protected readonly dt = formatDateTime;
  protected readonly num = formatNumber;

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly notes = new FormControl('', { nonNullable: true });
  protected readonly detailStatus = new FormControl<SellRequestStatus>('NEW', { nonNullable: true });
  protected readonly status = signal<SellRequestStatus | null>(null);
  protected readonly intent = signal<SellIntent | null>(null);
  protected readonly page = signal(1);
  protected readonly busy = signal<string | null>(null);
  protected readonly selected = signal<SellRequest | null>(null);
  private readonly overrides = signal<Record<string, SellRequest>>({});
  private readonly lastPage = signal<Paged<SellRequest> | null>(null);
  private readonly reload$ = new BehaviorSubject(0);
  private readonly q = toSignal(this.search.valueChanges.pipe(debounceTime(300), map((v) => v.trim()), distinctUntilChanged()), { initialValue: '' });
  private readonly params = computed(() => ({ q: this.q() || undefined, status: this.status() ?? undefined, intent: this.intent() ?? undefined, page: this.page(), pageSize: 20 }));

  protected readonly state = toSignal(
    combineLatest([toObservable(this.params), this.reload$]).pipe(
      switchMap(([params]) =>
        this.leads.sellRequests(params).pipe(
          tap((data) => this.lastPage.set(data)),
          map((data): LoadState<Paged<SellRequest>> => ({ status: 'success', data })),
          catchError((err) => of<LoadState<Paged<SellRequest>>>({ status: 'error', error: toAppError(err) })),
          startWith<LoadState<Paged<SellRequest>>>({ status: 'loading' }),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as LoadState<Paged<SellRequest>> },
  );
  protected readonly rows = computed(() => {
    const o = this.overrides();
    return (this.lastPage()?.items ?? []).map((r) => o[r.id] ?? r);
  });
  protected readonly meta = computed(() => this.lastPage()?.meta);

  constructor() {
    this.search.valueChanges.subscribe(() => this.page.set(1));
  }

  protected setStatus(status: SellRequestStatus | null) {
    this.status.set(status);
    this.page.set(1);
  }

  protected setIntent(event: Event) {
    this.intent.set(((event.target as HTMLSelectElement).value as SellIntent) || null);
    this.page.set(1);
  }

  protected reload() {
    this.overrides.set({});
    this.reload$.next(this.reload$.value + 1);
  }

  protected open(r: SellRequest) {
    this.notes.setValue(r.notes ?? '');
    this.detailStatus.setValue(r.status);
    this.selected.set(r);
  }

  protected changeStatus(r: SellRequest, event: Event) {
    const status = (event.target as HTMLSelectElement).value as SellRequestStatus;
    this.update(r, { status }, `Status changed to ${titleCase(status).toLowerCase()}.`);
  }

  protected saveDetail(r: SellRequest) {
    this.update(r, { status: this.detailStatus.value, notes: this.notes.value.trim() || null }, 'Request updated.', true);
  }

  protected wa(r: SellRequest) {
    return whatsappLink(
      r.phone,
      `Assalam o Alaikum ${r.name}, this is ${this.settings.businessName()} about your ${r.vehicleMake} ${r.vehicleModel} ${r.vehicleYear} (${r.intent === 'EXCHANGE' ? 'exchange' : 'sale'} request).`,
    );
  }

  protected tel(r: SellRequest) {
    return telLink(r.phone);
  }

  protected pkr(n: number) {
    return formatPkrCompact(n, 'en');
  }

  private update(r: SellRequest, input: { status?: SellRequestStatus; notes?: string | null }, message: string, close = false) {
    this.busy.set(r.id);
    this.leads.updateSellRequest(r.id, input).subscribe({
      next: (updated) => {
        this.busy.set(null);
        this.overrides.update((o) => ({ ...o, [r.id]: updated }));
        this.toast.success(message);
        if (close) this.selected.set(null);
      },
      error: (err) => {
        this.busy.set(null);
        this.toast.error(toAppError(err).message);
      },
    });
  }
}
