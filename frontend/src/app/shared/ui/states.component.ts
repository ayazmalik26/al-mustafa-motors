import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { IconComponent } from './icon.component';

/** Loading placeholder that mirrors the vehicle card layout. */
@Component({
  selector: 'app-vehicle-card-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'block' },
  template: `
    <div class="overflow-hidden rounded-2xl border border-white/10 bg-ink-800">
      <div class="skeleton aspect-[4/3] w-full rounded-none"></div>
      <div class="space-y-3 p-5">
        <div class="skeleton h-3 w-24"></div>
        <div class="skeleton h-7 w-3/4"></div>
        <div class="skeleton h-3 w-2/3"></div>
        <div class="flex justify-between pt-3"><div class="skeleton h-4 w-28"></div><div class="skeleton h-4 w-16"></div></div>
      </div>
    </div>
  `,
})
export class VehicleCardSkeletonComponent {}

@Component({
  selector: 'app-empty-state',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center rounded-2xl border border-dashed px-6 py-14 text-center" [class]="tone() === 'light' ? 'border-black/15 text-ink-950' : 'border-white/15'">
      <span class="mb-4 grid size-12 place-items-center rounded-full" [class]="tone() === 'light' ? 'bg-black/5 text-gold-dark' : 'bg-white/5 text-gold'">
        <app-icon [name]="icon()" [size]="22" />
      </span>
      <p class="font-serif text-2xl">{{ title() }}</p>
      @if (message()) {
        <p class="mt-2 max-w-md text-sm" [class]="tone() === 'light' ? 'text-muted-ink' : 'text-muted'">{{ message() }}</p>
      }
      <div class="mt-5 flex flex-wrap justify-center gap-2"><ng-content /></div>
    </div>
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input<string>();
  readonly icon = input('search');
  readonly tone = input<'dark' | 'light'>('dark');
}

@Component({
  selector: 'app-error-state',
  imports: [IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="alert" class="flex flex-col items-center rounded-2xl border px-6 py-14 text-center" [class]="tone() === 'light' ? 'border-black/10 bg-white/60 text-ink-950' : 'border-white/10 bg-ink-800'">
      <span class="mb-4 grid size-12 place-items-center rounded-full bg-danger/15 text-danger"><app-icon name="alert" [size]="22" /></span>
      <p class="font-serif text-2xl">{{ 'common.errorTitle' | t }}</p>
      <p class="mt-2 max-w-md text-sm" [class]="tone() === 'light' ? 'text-muted-ink' : 'text-muted'">
        {{ (network() ? 'common.networkError' : 'common.errorBody') | t }}
      </p>
      <button type="button" class="btn btn-sm mt-5" [class]="tone() === 'light' ? 'btn btn-sm mt-5 btn-dark' : 'btn btn-sm mt-5 btn-light'" (click)="retry.emit()">
        <app-icon name="refresh" [size]="16" /> {{ 'common.retry' | t }}
      </button>
    </div>
  `,
})
export class ErrorStateComponent {
  readonly network = input(false);
  readonly tone = input<'dark' | 'light'>('dark');
  readonly retry = output<void>();
}
