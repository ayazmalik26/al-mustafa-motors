import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { VehicleService } from '../../../core/services/vehicle.service';
import { loadState } from '../../../core/utils/load-state';
import { VehicleCardComponent } from '../../../shared/components/vehicle-card.component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { IconComponent } from '../../../shared/ui/icon.component';
import { EmptyStateComponent, ErrorStateComponent, VehicleCardSkeletonComponent } from '../../../shared/ui/states.component';

@Component({
  selector: 'app-featured-section',
  imports: [RouterLink, TranslatePipe, VehicleCardComponent, RevealDirective, IconComponent, EmptyStateComponent, ErrorStateComponent, VehicleCardSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-ink-900 py-20 sm:py-28" aria-labelledby="featured-title">
      <div class="container-x">
        <div class="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p class="kicker">{{ 'home.featured.kicker' | t }}</p>
            <h2 id="featured-title" class="display-2 mt-3 max-w-[13ch] rtl:max-w-none">{{ 'home.featured.titleLead' | t }} <em class="accent">{{ 'home.featured.titleAccent' | t }}</em></h2>
          </div>
          <div class="max-w-md">
            <p class="text-sm text-muted">{{ 'home.featured.text' | t }}</p>
            <a routerLink="/inventory" class="mt-4 inline-flex items-center gap-2 text-sm font-bold text-gold-light hover:underline">
              {{ 'home.featured.viewAll' | t }} <app-icon name="arrow-right" [size]="15" class="flip-rtl" />
            </a>
          </div>
        </div>

        @switch (featured.state().status) {
          @case ('loading') {
            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
              @for (i of [1, 2, 3]; track i) { <app-vehicle-card-skeleton /> }
            </div>
          }
          @case ('error') {
            <app-error-state [network]="featured.state().error?.status === 0" (retry)="featured.reload()" />
          }
          @case ('success') {
            @if (featured.state().data?.length) {
              <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="featured-grid">
                @for (v of featured.state().data; track v.id; let i = $index) {
                  <app-vehicle-card [vehicle]="v" [appReveal]="(i % 3) * 90" />
                }
              </div>
            } @else {
              <app-empty-state [title]="'home.featured.empty' | t" icon="car">
                <a routerLink="/inventory" class="btn btn-light">{{ 'home.featured.viewAll' | t }}</a>
              </app-empty-state>
            }
          }
        }
      </div>
    </section>
  `,
})
export class FeaturedSectionComponent {
  private readonly vehicles = inject(VehicleService);
  protected readonly featured = loadState(() => this.vehicles.featured(6));
}
