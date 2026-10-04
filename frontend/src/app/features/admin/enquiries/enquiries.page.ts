import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, debounceTime, distinctUntilChanged, map, of, startWith, switchMap, tap } from 'rxjs';
import { toAppError } from '../../../core/http/api';
import { formatDateTime } from '../../../core/i18n/format';
import type { LoadState, Paged } from '../../../core/models/api.models';
import { ENQUIRY_STATUSES, type Enquiry, type EnquiryStatus } from '../../../core/models/lead.models';
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
  selector: 'app-enquiries-page',
  imports: [ReactiveFormsModule, DialogComponent, IconComponent, PaginationComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6">
      <h1 class="font-serif text-4xl">Enquiries</h1>
      <p class="text-sm text-muted-ink">Messages sent from vehicle pages and the contact form.</p>
    </div>

    <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
        <button type="button" class="tab" [class.on]="!status()" (click)="setStatus(null)">All</button>
        @for (s of statuses; track s) { <button type="button" class="tab" [class.on]="status() === s" (click)="setStatus(s)">{{ tc(s) }}</button> }
      </div>
      <div class="relative md:w-80">
        <label for="enquiry-search" class="sr-only">Search enquiries</label>
        <app-icon name="search" [size]="16" class="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-ink" />
        <input id="enquiry-search" type="search" class="input ps-10" placeholder="Search name, phone, vehicle…" [formControl]="search" />
      </div>
    </div>

    @if (state().status === 'error') {
      <app-error-state tone="light" (retry)="reload()" />
    } @else {
      <div class="overflow-hidden rounded-[14px] border border-black/10 bg-white" [class.opacity-60]="state().status === 'loading'">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[900px] text-sm">
            <thead class="border-b border-black/10 bg-[#faf8f4] text-xs uppercase tracking-wider text-muted-ink">
              <tr>
                <th scope="col" class="px-4 py-3 text-start font-semibold">Name / phone</th>
                <th scope="col" class="px-4 py-3 text-start font-semibold">Vehicle</th>
                <th scope="col" class="px-4 py-3 text-start font-semibold">Message</th>
                <th scope="col" class="px-4 py-3 text-start font-semibold">Date</th>
                <th scope="col" class="px-4 py-3 text-start font-semibold">Status</th>
                <th scope="col" class="px-4 py-3 text-end font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-black/5">
              @for (e of rows(); track e.id) {
                <tr class="align-top hover:bg-[#faf8f4]" [attr.data-testid]="'enquiry-row'">
                  <td class="px-4 py-3">
                    <p class="font-semibold">{{ e.name }}</p>
                    <p class="text-xs text-muted-ink" dir="ltr">{{ e.phone }}</p>
                    @if (e.email) { <p class="text-xs text-muted-ink">{{ e.email }}</p> }
                  </td>
                  <td class="px-4 py-3">
                    @if (e.vehicleTitle) {
                      @if (e.vehicle) {
                        <a [href]="'/inventory/' + e.vehicle.slug" target="_blank" rel="noopener" class="hover:underline">{{ e.vehicleTitle }}</a>
                      } @else {
                        {{ e.vehicleTitle }} <span class="text-xs text-muted-ink">(removed)</span>
                      }
                    } @else {
                      <span class="text-muted-ink">General · {{ tc(e.source) }}</span>
                    }
                  </td>
                  <td class="max-w-[280px] px-4 py-3"><p class="line-clamp-2 text-muted-ink" dir="auto">{{ e.message }}</p></td>
                  <td class="px-4 py-3 whitespace-nowrap text-xs text-muted-ink">{{ dt(e.createdAt) }}</td>
                  <td class="px-4 py-3"><span class="chip" [class]="style[e.status]" data-testid="enquiry-status">{{ tc(e.status) }}</span></td>
                  <td class="px-4 py-3">
                    <div class="flex justify-end gap-1">
                      @if (e.status === 'NEW') {
                        <button type="button" class="btn btn-outline-dark btn-sm" (click)="setEnquiryStatus(e, 'CONTACTED')" [disabled]="busy() === e.id" data-testid="mark-contacted">Mark contacted</button>
                      } @else if (e.status === 'CONTACTED') {
                        <button type="button" class="btn btn-outline-dark btn-sm" (click)="setEnquiryStatus(e, 'CLOSED')" [disabled]="busy() === e.id" data-testid="mark-closed">Mark closed</button>
                      }
                      <a [href]="wa(e)" target="_blank" rel="noopener" class="ibtn text-[#128c7e]" [attr.aria-label]="'WhatsApp ' + e.name"><app-icon name="whatsapp" [size]="16" /></a>
                      <a [href]="tel(e)" class="ibtn" [attr.aria-label]="'Call ' + e.name"><app-icon name="phone" [size]="16" /></a>
                      <button type="button" class="ibtn" (click)="open(e)" [attr.aria-label]="'View details for ' + e.name" data-testid="view-enquiry"><app-icon name="eye" [size]="16" /></button>
                    </div>
                  </td>
                </tr>
              } @empty {
                @if (state().status === 'loading') {
                  @for (i of [1, 2, 3]; track i) { <tr><td colspan="6" class="px-4 py-3"><div class="skeleton-light h-10"></div></td></tr> }
                } @else {
                  <tr><td colspan="6" class="px-4 py-12 text-center text-muted-ink">No enquiries found.</td></tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
      @if (meta(); as m) {
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-ink">
          <span>{{ m.total }} enquiries</span>
          <app-pagination class="[--pg-border:rgb(0_0_0/.12)] [--pg-active-bg:var(--color-ink-950)] [--pg-active-fg:#fff]" [page]="m.page" [totalPages]="m.totalPages" (pageChange)="page.set($event)" />
        </div>
      }
    }

    <app-dialog [open]="!!selected()" labelledBy="enquiry-detail-title" (closed)="selected.set(null)">
      @if (selected(); as e) {
        <div class="max-h-[calc(100dvh-24px)] overflow-y-auto rounded-2xl bg-white p-6 text-ink-950 shadow-2xl sm:p-8" data-testid="enquiry-detail">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 id="enquiry-detail-title" class="font-serif text-3xl">{{ e.name }}</h2>
              <p class="text-sm text-muted-ink">{{ dt(e.createdAt) }} · {{ tc(e.source) }} · ref {{ e.id.slice(0, 8).toUpperCase() }}</p>
            </div>
            <button type="button" class="ibtn" (click)="selected.set(null)" aria-label="Close"><app-icon name="x" [size]="18" /></button>
          </div>
          <dl class="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt class="text-xs text-muted-ink">Phone</dt><dd dir="ltr">{{ e.phone }}</dd></div>
            <div><dt class="text-xs text-muted-ink">Email</dt><dd>{{ e.email || '—' }}</dd></div>
            <div class="sm:col-span-2"><dt class="text-xs text-muted-ink">Vehicle</dt><dd>{{ e.vehicleTitle || 'General enquiry' }}</dd></div>
          </dl>
          <div class="mt-5 rounded-xl bg-[#faf8f4] p-4 text-sm whitespace-pre-line" dir="auto">{{ e.message }}</div>
          <div class="mt-5">
            <label class="field-label" for="enquiry-notes">Internal notes</label>
            <textarea id="enquiry-notes" class="input" rows="3" [formControl]="notes" placeholder="Visible to staff only"></textarea>
          </div>
          <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div class="flex gap-2">
              <a [href]="wa(e)" target="_blank" rel="noopener" class="btn btn-whatsapp btn-sm"><app-icon name="whatsapp" [size]="15" /> WhatsApp</a>
              <a [href]="tel(e)" class="btn btn-outline-dark btn-sm"><app-icon name="phone" [size]="15" /> Call</a>
            </div>
            <div class="flex items-center gap-2">
              <label class="sr-only" for="enquiry-status">Status</label>
              <select id="enquiry-status" class="input !min-h-10 w-40 !py-1.5" [formControl]="detailStatus">
                @for (s of statuses; track s) { <option [value]="s">{{ tc(s) }}</option> }
              </select>
              <button type="button" class="btn btn-dark btn-sm" (click)="saveDetail(e)" [disabled]="busy() === e.id" data-testid="save-enquiry">Save</button>
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
export class EnquiriesPage {
  private readonly leads = inject(LeadService);
  private readonly toast = inject(ToastService);
  private readonly settings = inject(SettingsService);
  private readonly route = inject(ActivatedRoute);

  protected readonly statuses = ENQUIRY_STATUSES;
  protected readonly style = ENQUIRY_STATUS_STYLE;
  protected readonly tc = titleCase;
  protected readonly dt = formatDateTime;

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly notes = new FormControl('', { nonNullable: true });
  protected readonly detailStatus = new FormControl<EnquiryStatus>('NEW', { nonNullable: true });
  protected readonly status = signal<EnquiryStatus | null>((this.route.snapshot.queryParamMap.get('status') as EnquiryStatus) || null);
  protected readonly page = signal(1);
  protected readonly busy = signal<string | null>(null);
  protected readonly selected = signal<Enquiry | null>(null);
  private readonly overrides = signal<Record<string, Enquiry>>({});
  private readonly lastPage = signal<Paged<Enquiry> | null>(null);
  private readonly reload$ = new BehaviorSubject(0);
  private readonly q = toSignal(this.search.valueChanges.pipe(debounceTime(300), map((v) => v.trim()), distinctUntilChanged()), { initialValue: '' });
  private readonly params = computed(() => ({ q: this.q() || undefined, status: this.status() ?? undefined, page: this.page(), pageSize: 20 }));

  protected readonly state = toSignal(
    combineLatest([toObservable(this.params), this.reload$]).pipe(
      switchMap(([params]) =>
        this.leads.enquiries(params).pipe(
          tap((data) => this.lastPage.set(data)),
          map((data): LoadState<Paged<Enquiry>> => ({ status: 'success', data })),
          catchError((err) => of<LoadState<Paged<Enquiry>>>({ status: 'error', error: toAppError(err) })),
          startWith<LoadState<Paged<Enquiry>>>({ status: 'loading' }),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as LoadState<Paged<Enquiry>> },
  );
  protected readonly rows = computed(() => {
    const o = this.overrides();
    return (this.lastPage()?.items ?? []).map((e) => o[e.id] ?? e);
  });
  protected readonly meta = computed(() => this.lastPage()?.meta);

  constructor() {
    this.search.valueChanges.subscribe(() => this.page.set(1));
  }

  protected setStatus(status: EnquiryStatus | null) {
    this.status.set(status);
    this.page.set(1);
  }

  protected reload() {
    this.overrides.set({});
    this.reload$.next(this.reload$.value + 1);
  }

  protected open(e: Enquiry) {
    this.notes.setValue(e.notes ?? '');
    this.detailStatus.setValue(e.status);
    this.selected.set(e);
  }

  protected setEnquiryStatus(e: Enquiry, status: EnquiryStatus) {
    this.update(e, { status }, `Marked ${status.toLowerCase()}.`);
  }

  protected saveDetail(e: Enquiry) {
    this.update(e, { status: this.detailStatus.value, notes: this.notes.value.trim() || null }, 'Enquiry updated.', true);
  }

  protected wa(e: Enquiry) {
    const greeting = `Assalam o Alaikum ${e.name}, this is ${this.settings.businessName()} replying to your enquiry${e.vehicleTitle ? ` about the ${e.vehicleTitle}` : ''}.`;
    return whatsappLink(e.phone, greeting);
  }

  protected tel(e: Enquiry) {
    return telLink(e.phone);
  }

  private update(e: Enquiry, input: { status?: EnquiryStatus; notes?: string | null }, message: string, close = false) {
    this.busy.set(e.id);
    this.leads.updateEnquiry(e.id, input).subscribe({
      next: (updated) => {
        this.busy.set(null);
        this.overrides.update((o) => ({ ...o, [e.id]: updated }));
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
