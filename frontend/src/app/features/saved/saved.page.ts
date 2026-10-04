import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { toAppError } from '../../core/http/api';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { LoadState } from '../../core/models/api.models';
import type { Vehicle } from '../../core/models/vehicle.models';
import { FavoritesService } from '../../core/services/favorites.service';
import { SeoService } from '../../core/services/seo.service';
import { VehicleService } from '../../core/services/vehicle.service';
import { VehicleCardComponent } from '../../shared/components/vehicle-card.component';
import { EmptyStateComponent, ErrorStateComponent, VehicleCardSkeletonComponent } from '../../shared/ui/states.component';

@Component({
  selector: 'app-saved-page',
  imports: [RouterLink, TranslatePipe, VehicleCardComponent, EmptyStateComponent, ErrorStateComponent, VehicleCardSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container-x min-h-[60vh] pb-20 pt-10 sm:pt-14">
      <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="kicker">{{ 'saved.kicker' | t }}</p>
          <h1 class="display-2 mt-3">{{ 'saved.title' | t }}</h1>
          <p class="mt-3 text-sm text-muted">{{ 'saved.note' | t }}</p>
        </div>
        @if (favorites.count()) {
          <button type="button" class="btn btn-ghost btn-sm" (click)="favorites.clear()">{{ 'saved.clear' | t }}</button>
        }
      </div>

      @if (!favorites.count()) {
        <app-empty-state [title]="'saved.emptyTitle' | t" [message]="'saved.emptyBody' | t" icon="heart">
          <a routerLink="/inventory" class="btn btn-light">{{ 'nav.browseCars' | t }}</a>
        </app-empty-state>
      } @else {
        @switch (state().status) {
          @case ('loading') {
            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">@for (i of [1, 2, 3]; track i) { <app-vehicle-card-skeleton /> }</div>
          }
          @case ('error') {
            <app-error-state (retry)="retry$.next(retry$.value + 1)" />
          }
          @case ('success') {
            @if (missing()) { <p class="mb-4 text-sm text-muted">{{ 'saved.missing' | t }}</p> }
            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="saved-grid">
              @for (v of ordered(); track v.id) { <app-vehicle-card [vehicle]="v" /> }
            </div>
          }
        }
      }
    </section>
  `,
})
export class SavedPage {
  protected readonly favorites = inject(FavoritesService);
  private readonly vehicles = inject(VehicleService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  protected readonly retry$ = new BehaviorSubject(0);
  protected readonly state = toSignal(
    combineLatest([
      toObservable(this.favorites.ids).pipe(
        map((ids) => ids.join(',')),
        distinctUntilChanged(),
      ),
      this.retry$,
    ]).pipe(
      switchMap(([key]) =>
        this.vehicles.byIds(key ? key.split(',') : []).pipe(
          map((data): LoadState<Vehicle[]> => ({ status: 'success', data })),
          catchError((err) => of<LoadState<Vehicle[]>>({ status: 'error', error: toAppError(err) })),
          startWith<LoadState<Vehicle[]>>({ status: 'loading' }),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as LoadState<Vehicle[]> },
  );

  /** Keeps the order the user saved them in (newest first). */
  protected readonly ordered = computed(() => {
    const s = this.state();
    if (s.status !== 'success') return [];
    const byId = new Map(s.data.map((v) => [v.id, v]));
    return this.favorites.ids().map((id) => byId.get(id)).filter((v): v is Vehicle => !!v);
  });
  protected readonly missing = computed(() => {
    const s = this.state();
    return s.status === 'success' && s.data.length < this.favorites.count();
  });

  constructor() {
    effect(() => this.seo.set({ title: this.i18n.t('seo.saved.title'), path: '/saved', noindex: true }));
  }
}
