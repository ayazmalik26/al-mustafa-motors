import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatDateTime } from '../../../core/i18n/format';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { loadState } from '../../../core/utils/load-state';
import { IconComponent } from '../../../shared/ui/icon.component';
import { ErrorStateComponent } from '../../../shared/ui/states.component';
import { ENQUIRY_STATUS_STYLE, titleCase } from '../shared/admin-ui';
import { LeadsChartComponent } from './leads-chart.component';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, IconComponent, ErrorStateComponent, LeadsChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm text-muted-ink">Welcome back{{ auth.user() ? ', ' + auth.user()!.name : '' }}</p>
        <h1 class="font-serif text-4xl">Dashboard</h1>
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn btn-outline-dark btn-sm" (click)="stats.reload()"><app-icon name="refresh" [size]="15" /> Refresh</button>
        <a routerLink="/admin/vehicles/new" class="btn btn-dark btn-sm"><app-icon name="plus" [size]="15" /> Add vehicle</a>
      </div>
    </div>

    @switch (stats.state().status) {
      @case ('loading') {
        <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-busy="true">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) { <div class="skeleton-light h-28 rounded-xl"></div> }
        </div>
        <div class="skeleton-light mt-4 h-72 rounded-xl"></div>
      }
      @case ('error') {
        <app-error-state tone="light" (retry)="stats.reload()" />
      }
      @case ('success') {
        @if (stats.state().data; as s) {
          <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" data-testid="dashboard-stats">
            <a routerLink="/admin/vehicles" class="card-stat"><span class="lbl">Total vehicles</span><span class="val">{{ s.vehicles.total }}</span><span class="sub">{{ s.vehicles.featured }} featured</span></a>
            <a routerLink="/admin/vehicles" [queryParams]="{ status: 'AVAILABLE' }" class="card-stat"><span class="lbl">Available</span><span class="val text-[#1d6b45]">{{ s.vehicles.available }}</span></a>
            <a routerLink="/admin/vehicles" [queryParams]="{ status: 'RESERVED' }" class="card-stat"><span class="lbl">Reserved</span><span class="val text-[#7a5410]">{{ s.vehicles.reserved }}</span></a>
            <a routerLink="/admin/vehicles" [queryParams]="{ status: 'SOLD' }" class="card-stat"><span class="lbl">Sold</span><span class="val">{{ s.vehicles.sold }}</span></a>
            <a routerLink="/admin/enquiries" [queryParams]="{ status: 'NEW' }" class="card-stat" data-testid="stat-new-enquiries"><span class="lbl">New enquiries</span><span class="val text-[#1f5aa6]">{{ s.enquiries.new }}</span><span class="sub">{{ s.enquiries.total }} total</span></a>
            <a routerLink="/admin/sell-requests" class="card-stat"><span class="lbl">Open sell requests</span><span class="val text-[#7a4b10]">{{ s.sellRequests.open }}</span><span class="sub">{{ s.sellRequests.new }} new</span></a>
          </div>

          <div class="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <section class="card p-5">
              <h2 class="mb-4 font-serif text-2xl">Leads — last 14 days</h2>
              <app-leads-chart [days]="s.leadsByDay" />
            </section>
            <section class="card p-5">
              <h2 class="mb-4 font-serif text-2xl">Inventory by make</h2>
              <ul class="space-y-2.5">
                @for (m of s.inventoryByMake; track m.make) {
                  <li class="grid grid-cols-[90px_1fr_32px] items-center gap-3 text-sm">
                    <span class="truncate">{{ m.make }}</span>
                    <span class="h-2 overflow-hidden rounded-full bg-black/5"><span class="block h-full rounded-full bg-ink-950" [style.width.%]="(m.count / s.vehicles.total) * 100"></span></span>
                    <span class="text-end tabular-nums text-muted-ink">{{ m.count }}</span>
                  </li>
                } @empty {
                  <li class="text-sm text-muted-ink">No vehicles yet.</li>
                }
              </ul>
            </section>
          </div>

          <div class="mt-4 grid gap-4 xl:grid-cols-2">
            <section class="card overflow-hidden">
              <div class="flex items-center justify-between p-5 pb-3">
                <h2 class="font-serif text-2xl">Recent enquiries</h2>
                <a routerLink="/admin/enquiries" class="text-sm font-semibold hover:underline">View all</a>
              </div>
              <ul class="divide-y divide-black/5">
                @for (e of s.recentEnquiries; track e.id) {
                  <li class="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div class="min-w-0">
                      <p class="truncate font-semibold">{{ e.name }}</p>
                      <p class="truncate text-xs text-muted-ink">{{ e.vehicleTitle || 'General enquiry' }} · {{ dt(e.createdAt) }}</p>
                    </div>
                    <span class="chip shrink-0" [class]="statusStyle[e.status]">{{ tc(e.status) }}</span>
                  </li>
                } @empty {
                  <li class="px-5 py-6 text-sm text-muted-ink">No enquiries yet.</li>
                }
              </ul>
            </section>
            <section class="card overflow-hidden">
              <div class="flex items-center justify-between p-5 pb-3">
                <h2 class="font-serif text-2xl">Recent sell requests</h2>
                <a routerLink="/admin/sell-requests" class="text-sm font-semibold hover:underline">View all</a>
              </div>
              <ul class="divide-y divide-black/5">
                @for (r of s.recentSellRequests; track r.id) {
                  <li class="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div class="min-w-0">
                      <p class="truncate font-semibold">{{ r.name }} <span class="font-normal text-muted-ink">· {{ tc(r.intent) }}</span></p>
                      <p class="truncate text-xs text-muted-ink">{{ r.vehicleMake }} {{ r.vehicleModel }} {{ r.vehicleYear }} · {{ dt(r.createdAt) }}</p>
                    </div>
                    <span class="chip shrink-0" [class]="statusStyle[r.status]">{{ tc(r.status) }}</span>
                  </li>
                } @empty {
                  <li class="px-5 py-6 text-sm text-muted-ink">No sell requests yet.</li>
                }
              </ul>
            </section>
          </div>
        }
      }
    }
  `,
  styles: `
    .card { background: #fff; border: 1px solid rgb(0 0 0 / .08); border-radius: 14px; }
    .card-stat { display: flex; flex-direction: column; gap: 4px; padding: 16px; background: #fff; border: 1px solid rgb(0 0 0 / .08); border-radius: 14px; transition: border-color .2s, transform .2s; }
    .card-stat:hover { border-color: rgb(0 0 0 / .25); transform: translateY(-2px); }
    .lbl { font-size: 12px; color: var(--color-muted-ink); }
    .val { font-family: var(--font-serif); font-size: 2.4rem; line-height: 1; }
    .sub { font-size: 11px; color: var(--color-muted-ink); }
  `,
})
export class DashboardPage {
  protected readonly auth = inject(AuthService);
  private readonly dashboard = inject(DashboardService);
  protected readonly stats = loadState(() => this.dashboard.stats());
  protected readonly statusStyle = ENQUIRY_STATUS_STYLE;
  protected readonly tc = titleCase;
  protected readonly dt = formatDateTime;
}
