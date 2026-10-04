import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { VehicleImage } from '../../core/models/vehicle.models';
import { imageSmall, imageSrcset } from '../../core/utils/images';
import { VehicleImageComponent } from '../../shared/components/vehicle-image.component';
import { SwipeDirective } from '../../shared/directives/swipe.directive';
import { DialogComponent } from '../../shared/ui/dialog.component';
import { IconComponent } from '../../shared/ui/icon.component';

/**
 * Vehicle gallery: large image, thumbnails, previous/next, swipe on touch devices,
 * arrow-key navigation and a fullscreen viewer (Escape closes it).
 */
@Component({
  selector: 'app-gallery',
  imports: [TranslatePipe, VehicleImageComponent, SwipeDirective, DialogComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="select-none" role="region" [attr.aria-label]="'gallery.label' | t" aria-roledescription="carousel">
      <div
        class="group relative aspect-[4/3] overflow-hidden rounded-[18px] bg-ink-700 outline-none sm:aspect-[16/11]"
        tabindex="0"
        appSwipe
        (swipeLeft)="i18n.isRtl() ? prev() : next()"
        (swipeRight)="i18n.isRtl() ? next() : prev()"
        (keydown)="onKey($event)"
        data-testid="gallery-main"
      >
        @if (images().length) {
          @for (img of [current()]; track img.id) {
            <app-vehicle-image
              class="size-full animate-fade-in"
              [image]="img"
              [alt]="img.alt || title()"
              [priority]="index() === 0"
              sizes="(min-width: 1024px) 62vw, 100vw"
            />
          }
          <button type="button" class="absolute end-3 top-3 grid size-11 place-items-center rounded-full border border-white/25 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65" (click)="fullscreen.set(true)" [attr.aria-label]="'gallery.fullscreen' | t" data-testid="gallery-fullscreen">
            <app-icon name="expand" [size]="18" />
          </button>
          @if (images().length > 1) {
            <button type="button" class="nav start-3" (click)="prev()" [attr.aria-label]="'gallery.prev' | t" data-testid="gallery-prev"><app-icon name="chevron-left" [size]="22" class="flip-rtl" /></button>
            <button type="button" class="nav end-3" (click)="next()" [attr.aria-label]="'gallery.next' | t" data-testid="gallery-next"><app-icon name="chevron-right" [size]="22" class="flip-rtl" /></button>
            <span class="absolute bottom-3 start-3 rounded-md bg-black/55 px-2.5 py-1 text-xs text-white backdrop-blur ltr-nums" aria-live="polite" data-testid="gallery-counter">
              {{ index() + 1 }} / {{ images().length }}
            </span>
          }
        } @else {
          <app-vehicle-image class="size-full" [image]="null" [alt]="title()" [fallbackLabel]="'gallery.noPhotos' | t" />
        }
      </div>

      @if (images().length > 1) {
        <div class="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist">
          @for (img of images(); track img.id; let i = $index) {
            <button
              type="button"
              role="tab"
              class="relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-lg border-2 transition sm:w-28"
              [class]="i === index() ? 'border-gold' : 'border-transparent opacity-60 hover:opacity-100'"
              [attr.aria-selected]="i === index()"
              [attr.aria-label]="'gallery.thumbnail' | t: { index: i + 1 }"
              (click)="go(i)"
            >
              <img [src]="small(img)" alt="" loading="lazy" decoding="async" class="size-full object-cover" />
            </button>
          }
        </div>
      }
    </div>

    <app-dialog [open]="fullscreen()" size="full" [ariaLabel]="'gallery.label' | t" (closed)="fullscreen.set(false)">
      <div class="relative flex h-full flex-col bg-black text-white" (keydown)="onKey($event)">
        <div class="flex items-center justify-between p-4">
          <span class="text-sm text-white/80 ltr-nums">{{ 'gallery.photoOf' | t: { index: index() + 1, total: images().length } }}</span>
          <button type="button" class="grid size-11 place-items-center rounded-full border border-white/25" (click)="fullscreen.set(false)" [attr.aria-label]="'gallery.close' | t" data-testid="gallery-close">
            <app-icon name="x" [size]="20" />
          </button>
        </div>
        <div class="relative flex-1" appSwipe (swipeLeft)="i18n.isRtl() ? prev() : next()" (swipeRight)="i18n.isRtl() ? next() : prev()">
          @for (img of [current()]; track img.id) {
            <img [src]="img.url" [attr.srcset]="srcset(img)" sizes="100vw" [alt]="img.alt || title()" class="absolute inset-0 size-full animate-fade-in object-contain" />
          }
          @if (images().length > 1) {
            <button type="button" class="nav start-4" (click)="prev()" [attr.aria-label]="'gallery.prev' | t"><app-icon name="chevron-left" [size]="24" class="flip-rtl" /></button>
            <button type="button" class="nav end-4" (click)="next()" [attr.aria-label]="'gallery.next' | t"><app-icon name="chevron-right" [size]="24" class="flip-rtl" /></button>
          }
        </div>
      </div>
    </app-dialog>
  `,
  styles: `
    .nav { position: absolute; top: 50%; transform: translateY(-50%); display: grid; place-items: center; width: 46px; height: 46px; border-radius: 999px; background: rgb(0 0 0 / .45); border: 1px solid rgb(255 255 255 / .25); color: #fff; backdrop-filter: blur(8px); transition: background-color .2s, transform .2s; }
    .nav:hover { background: rgb(0 0 0 / .7); }
    .nav:active { transform: translateY(-50%) scale(.94); }
  `,
})
export class GalleryComponent {
  protected readonly i18n = inject(I18nService);
  readonly images = input.required<VehicleImage[]>();
  readonly title = input('');

  protected readonly index = signal(0);
  protected readonly fullscreen = signal(false);
  protected readonly current = computed(() => this.images()[Math.min(this.index(), this.images().length - 1)]);

  next() {
    const n = this.images().length;
    if (n) this.index.update((i) => (i + 1) % n);
  }

  prev() {
    const n = this.images().length;
    if (n) this.index.update((i) => (i - 1 + n) % n);
  }

  go(i: number) {
    this.index.set(i);
  }

  protected onKey(event: KeyboardEvent) {
    const forward = this.i18n.isRtl() ? 'ArrowLeft' : 'ArrowRight';
    const back = this.i18n.isRtl() ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === forward) {
      event.preventDefault();
      this.next();
    } else if (event.key === back) {
      event.preventDefault();
      this.prev();
    }
  }

  protected small(img: VehicleImage) {
    return imageSmall(img);
  }

  protected srcset(img: VehicleImage) {
    return imageSrcset(img, [1200, 1600, 2400]);
  }
}
