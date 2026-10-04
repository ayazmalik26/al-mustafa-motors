import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../ui/icon.component';

@Component({
  selector: 'app-favorite-button',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="grid place-items-center rounded-full border transition-[transform,background-color,border-color] duration-300 hover:scale-105 active:scale-95"
      [class]="buttonClass()"
      [attr.aria-pressed]="saved()"
      [attr.aria-label]="(saved() ? i18n.t('vehicle.unsave') : i18n.t('vehicle.save')) + ' — ' + label()"
      (click)="toggle($event)"
      data-testid="favorite-button"
    >
      <app-icon [name]="saved() ? 'heart-filled' : 'heart'" [size]="18" />
    </button>
  `,
})
export class FavoriteButtonComponent {
  protected readonly i18n = inject(I18nService);
  private readonly favorites = inject(FavoritesService);
  private readonly toast = inject(ToastService);

  readonly vehicleId = input.required<string>();
  readonly label = input('');
  readonly variant = input<'overlay' | 'solid'>('overlay');

  protected readonly saved = computed(() => this.favorites.ids().includes(this.vehicleId()));
  protected readonly buttonClass = computed(() => {
    const base = this.variant() === 'overlay' ? 'size-11 border-white/25 bg-black/45 backdrop-blur-md' : 'size-12 border-white/15 bg-white/5 hover:border-gold';
    return `${base} ${this.saved() ? 'text-gold' : this.variant() === 'overlay' ? 'text-white' : 'text-snow'}`;
  });

  protected toggle(event: Event) {
    // The button sits inside a card link — don't navigate.
    event.preventDefault();
    event.stopPropagation();
    const nowSaved = this.favorites.toggle(this.vehicleId());
    this.toast.show(this.i18n.t(nowSaved ? 'vehicle.savedToast' : 'vehicle.removedToast'), nowSaved ? 'success' : 'info', 2500);
  }
}
