import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { TranslationKey } from '../../core/i18n/translations/en';
import type { VehicleStatus } from '../../core/models/vehicle.models';

const STYLES: Record<VehicleStatus, string> = {
  AVAILABLE: 'bg-[#e7f4ec] text-[#1d6b45]',
  RESERVED: 'bg-[#fbf0d9] text-[#7a5410]',
  SOLD: 'bg-[#2a2f2c] text-[#d9ddd9]',
};

/** Clear Available / Reserved / Sold indicator (colour + text, never colour alone). */
@Component({
  selector: 'app-status-badge',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="chip" [class]="'chip ' + style()" [attr.data-status]="status()">
      <span class="inline-block size-1.5 rounded-full bg-current" aria-hidden="true"></span>
      {{ labelKey() | t }}
    </span>
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<VehicleStatus>();
  protected readonly style = computed(() => STYLES[this.status()]);
  protected readonly labelKey = computed(() => `enum.status.${this.status()}` as TranslationKey);
}
