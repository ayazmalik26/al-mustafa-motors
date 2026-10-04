import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, debounceTime, distinctUntilChanged, map, of, startWith, switchMap, tap } from 'rxjs';
import { toAppError } from '../../../core/http/api';
import { formatPkrCompact } from '../../../core/i18n/format';
import type { LoadState, Paged } from '../../../core/models/api.models';
import { VEHICLE_STATUSES, type Vehicle, type VehicleStatus } from '../../../core/models/vehicle.models';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { VehicleService } from '../../../core/services/vehicle.service';
import { imageSmall } from '../../../core/utils/images';
import { IconComponent } from '../../../shared/ui/icon.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { ErrorStateComponent } from '../../../shared/ui/states.component';
import { VEHICLE_STATUS_LABEL } from '../shared/admin-ui';

@Component({
  selector: 'app-vehicle-list-page',
  imports: [RouterLink, ReactiveFormsModule, IconComponent, PaginationComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-serif text-4xl">Vehicles</h1>
        <p class="text-sm text-muted-ink">Add, edit and update the status of listed vehicles.</p>
      </div>
      <a routerLink="/admin/vehicles/new" class="btn btn-dark" data-testid="add-vehicle"><app-icon name="plus" [size]="16" /> Add vehicle</a>
    </div>

    <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
        <button type="button" class="tab" [class.on]="!status()" (click)="setStatus(null)">All</button>
        @for (s of statuses; track s) {
          <button type="button" class="tab" [class.on]="status() === s" (click)="setStatus(s)">{{ statusLabel[s] }}</button>
        }
      </div>
      <div class="relative md:w-80">
        <label for="vehicle-search" class="sr-only">Search vehicles</label>
        <app-icon name="search" [size]="16" class="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-ink" />
        <input id="vehicle-search" type="search" class="input ps-10" placeholder="Search make, model, variant…" [formControl]="search" data-testid="admin-vehicle-search" />
      </div>
    </div>

    @switch (state().status) {
      @case ('error') { <app-error-state tone="light" (retry)="reload()" /> }
      @default {
        <div class="overflow-hidden rounded-[14px] border border-black/10 bg-white" [class.opacity-60]="state().status === 'loading'">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[860px] text-sm">
              <thead class="border-b border-black/10 bg-[#faf8f4] text-start text-xs uppercase tracking-wider text-muted-ink">
                <tr>
                  <th scope="col" class="px-4 py-3 text-start font-semibold">Vehicle</th>
                  <th scope="col" class="px-4 py-3 text-start font-semibold">Price</th>
                  <th scope="col" class="px-4 py-3 text-start font-semibold">Status</th>
                  <th scope="col" class="px-4 py-3 text-center font-semibold">Featured</th>
                  <th scope="col" class="px-4 py-3 text-start font-semibold">Updated</th>
                  <th scope="col" class="px-4 py-3 text-end font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-black/5">
                @for (v of rows(); track v.id) {
                  <tr class="hover:bg-[#faf8f4]" [attr.data-testid]="'vehicle-row-' + v.slug">
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        <div class="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-black/5">
                          @if (thumb(v); as src) { <img [src]="src" alt="" class="size-full object-cover" loading="lazy" /> }
                        </div>
                        <div class="min-w-0">
                          <a [routerLink]="['/admin/vehicles', v.id, 'edit']" class="font-semibold hover:underline">{{ v.title }} {{ v.year }}</a>
                          <p class="truncate text-xs text-muted-ink">/{{ v.slug }} @if (v.isDemo) { · <span class="font-semibold text-gold-dark">demo</span> }</p>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap">{{ v.priceDisplay || (v.price != null ? pkr(v.price) : 'On request') }}</td>
                    <td class="px-4 py-3">
                      <label class="sr-only" [for]="'status-' + v.id">Status for {{ v.title }}</label>
                      <select [id]="'status-' + v.id" class="input !min-h-9 w-36 !py-1 text-sm" (change)="changeStatus(v, $event)" [disabled]="busy() === v.id" [attr.data-testid]="'status-select-' + v.slug">
                        @for (s of statuses; track s) { <option [value]="s" [selected]="v.status === s">{{ statusLabel[s] }}</option> }
                      </select>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <button type="button" class="inline-grid size-9 place-items-center rounded-full transition-colors hover:bg-black/5" [class]="v.featured ? 'text-gold-dark' : 'text-black/30'"
                        (click)="toggleFeatured(v)" [attr.aria-pressed]="v.featured" [attr.aria-label]="(v.featured ? 'Remove from featured: ' : 'Mark as featured: ') + v.title" [disabled]="busy() === v.id" [attr.data-testid]="'featured-' + v.slug">
                        <app-icon [name]="v.featured ? 'star-filled' : 'star'" [size]="18" />
                      </button>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-xs text-muted-ink">{{ date(v.updatedAt) }}</td>
                    <td class="px-4 py-3">
                      <div class="flex justify-end gap-1">
                        @if (v.status !== 'SOLD') {
                          <button type="button" class="btn btn-outline-dark btn-sm" (click)="setVehicleStatus(v, 'SOLD')" [disabled]="busy() === v.id" [attr.data-testid]="'mark-sold-' + v.slug">Mark sold</button>
                        }
                        <a [routerLink]="['/admin/vehicles', v.id, 'edit']" class="grid size-9 place-items-center rounded-md hover:bg-black/5" [attr.aria-label]="'Edit ' + v.title"><app-icon name="edit" [size]="16" /></a>
                        <a [href]="'/inventory/' + v.slug" target="_blank" rel="noopener" class="grid size-9 place-items-center rounded-md hover:bg-black/5" [attr.aria-label]="'View ' + v.title + ' on the website'"><app-icon name="external" [size]="16" /></a>
                        @if (auth.isAdmin()) {
                          <button type="button" class="grid size-9 place-items-center rounded-md text-danger hover:bg-danger/10" (click)="remove(v)" [attr.aria-label]="'Delete ' + v.title" [attr.data-testid]="'delete-' + v.slug"><app-icon name="trash" [size]="16" /></button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  @if (state().status !== 'loading') {
                    <tr><td colspan="6" class="px-4 py-12 text-center text-muted-ink">No vehicles match. <a routerLink="/admin/vehicles/new" class="font-semibold underline">Add one</a>.</td></tr>
                  } @else {
                    @for (i of [1, 2, 3, 4]; track i) { <tr><td colspan="6" class="px-4 py-3"><div class="skeleton-light h-12"></div></td></tr> }
                  }
                }
              </tbody>
            </table>
          </div>
        </div>
        @if (meta(); as m) {
          <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-ink">
            <span>{{ m.total }} vehicles</span>
            <app-pagination class="[--pg-border:rgb(0_0_0/.12)] [--pg-active-bg:var(--color-ink-950)] [--pg-active-fg:#fff]" [page]="m.page" [totalPages]="m.totalPages" (pageChange)="page.set($event)" />
          </div>
        }
      }
    }
  `,
  styles: `
    .tab { min-height: 36px; padding: 0 14px; border-radius: 999px; border: 1px solid rgb(0 0 0 / .12); font-size: 13px; background: #fff; }
    .tab.on { background: var(--color-ink-950); color: #fff; border-color: var(--color-ink-950); }
  `,
})
export class VehicleListPage {
  private readonly vehicles = inject(VehicleService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  protected readonly statuses = VEHICLE_STATUSES;
  protected readonly statusLabel = VEHICLE_STATUS_LABEL;
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly status = signal<VehicleStatus | null>((this.route.snapshot.queryParamMap.get('status') as VehicleStatus) || null);
  protected readonly page = signal(1);
  protected readonly busy = signal<string | null>(null);
  private readonly reload$ = new BehaviorSubject(0);
  private readonly overrides = signal<Record<string, Vehicle>>({});
  private readonly lastPage = signal<Paged<Vehicle> | null>(null);

  private readonly q = toSignal(this.search.valueChanges.pipe(debounceTime(300), map((v) => v.trim()), distinctUntilChanged()), { initialValue: '' });

  private readonly params = computed(() => ({ q: this.q() || undefined, status: this.status() ?? undefined, page: this.page(), pageSize: 20, sort: 'newest' }));

  protected readonly state = toSignal(
    combineLatest([
      toObservable(this.params),
      this.reload$,
    ]).pipe(
      switchMap(([params]) =>
        this.vehicles.adminList(params).pipe(
          tap((data) => this.lastPage.set(data)),
          map((data): LoadState<Paged<Vehicle>> => ({ status: 'success', data })),
          catchError((err) => of<LoadState<Paged<Vehicle>>>({ status: 'error', error: toAppError(err) })),
          startWith<LoadState<Paged<Vehicle>>>({ status: 'loading' }),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as LoadState<Paged<Vehicle>> },
  );

  protected readonly rows = computed(() => {
    const s = this.state();
    const data = s.status === 'success' ? s.data : this.lastPage();
    const o = this.overrides();
    return (data?.items ?? []).map((v) => o[v.id] ?? v);
  });
  protected readonly meta = computed(() => {
    const s = this.state();
    return s.status === 'success' ? s.data.meta : this.lastPage()?.meta;
  });

  constructor() {
    this.search.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.page.set(1));
  }

  protected setStatus(status: VehicleStatus | null) {
    this.status.set(status);
    this.page.set(1);
    void this.router.navigate([], { relativeTo: this.route, queryParams: status ? { status } : {}, replaceUrl: true });
  }

  protected reload() {
    this.overrides.set({});
    this.reload$.next(this.reload$.value + 1);
  }

  protected changeStatus(v: Vehicle, event: Event) {
    this.setVehicleStatus(v, (event.target as HTMLSelectElement).value as VehicleStatus);
  }

  protected setVehicleStatus(v: Vehicle, status: VehicleStatus) {
    this.patch(v, { status }, `${v.title} marked ${VEHICLE_STATUS_LABEL[status].toLowerCase()}.`);
  }

  protected toggleFeatured(v: Vehicle) {
    this.patch(v, { featured: !v.featured }, v.featured ? `${v.title} removed from featured.` : `${v.title} is now featured.`);
  }

  protected async remove(v: Vehicle) {
    const ok = await this.confirm.ask({
      title: 'Delete this vehicle?',
      message: `${v.title} ${v.year} and all of its photos will be permanently removed. Enquiries about it are kept.`,
      confirmLabel: 'Delete vehicle',
      danger: true,
    });
    if (!ok) return;
    this.busy.set(v.id);
    this.vehicles.remove(v.id).subscribe({
      next: () => {
        this.busy.set(null);
        this.toast.success(`${v.title} deleted.`);
        this.reload();
      },
      error: (err) => {
        this.busy.set(null);
        this.toast.error(toAppError(err).message);
      },
    });
  }

  protected thumb(v: Vehicle) {
    return imageSmall(v.primaryImage);
  }

  protected pkr(n: number) {
    return formatPkrCompact(n, 'en');
  }

  protected date(iso: string) {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(iso));
  }

  private patch(v: Vehicle, input: Partial<Vehicle>, message: string) {
    this.busy.set(v.id);
    this.vehicles.update(v.id, input).subscribe({
      next: (updated) => {
        this.busy.set(null);
        this.overrides.update((o) => ({ ...o, [v.id]: { ...updated, primaryImage: updated.primaryImage ?? v.primaryImage } }));
        this.toast.success(message);
        // Status filter may no longer match — refresh the list when filtering.
        if (this.status() && input.status && input.status !== this.status()) this.reload();
      },
      error: (err) => {
        this.busy.set(null);
        this.toast.error(toAppError(err).message);
        this.reload();
      },
    });
  }
}

