import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { imageSmall, imageSrcset, type ImageLike } from '../../core/utils/images';
import { IconComponent } from '../ui/icon.component';

/** Responsive, lazy-loaded image with a graceful fallback when the image is missing or fails. */
@Component({
  selector: 'app-vehicle-image',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block relative overflow-hidden bg-ink-700' },
  template: `
    @if (src() && !failed()) {
      <img
        [src]="src()"
        [attr.srcset]="srcset()"
        [attr.sizes]="srcset() ? sizes() : null"
        [alt]="alt()"
        [attr.loading]="priority() ? 'eager' : 'lazy'"
        [attr.fetchpriority]="priority() ? 'high' : null"
        decoding="async"
        class="size-full object-cover"
        [class]="imgClass()"
        (error)="failed.set(true)"
      />
    } @else {
      <div class="grid size-full place-items-center text-muted-2" role="img" [attr.aria-label]="alt()">
        <div class="flex flex-col items-center gap-2 text-xs">
          <app-icon name="car" [size]="34" [strokeWidth]="1.2" />
          @if (fallbackLabel()) { <span>{{ fallbackLabel() }}</span> }
        </div>
      </div>
    }
  `,
})
export class VehicleImageComponent {
  readonly image = input<ImageLike | null | undefined>(null);
  readonly alt = input('');
  readonly sizes = input('(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw');
  readonly priority = input(false);
  /** Use the small variant only (thumbnails). */
  readonly small = input(false);
  readonly imgClass = input('');
  readonly fallbackLabel = input('');

  protected readonly failed = signal(false);
  protected readonly src = computed(() => (this.small() ? imageSmall(this.image()) : (this.image()?.url ?? null)));
  protected readonly srcset = computed(() => (this.small() ? null : imageSrcset(this.image())));
}
