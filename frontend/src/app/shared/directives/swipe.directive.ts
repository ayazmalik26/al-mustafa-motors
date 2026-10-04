import { Directive, output } from '@angular/core';

/** Emits swipeLeft / swipeRight for horizontal touch or pen swipes (mouse drags are ignored). */
@Directive({
  selector: '[appSwipe]',
  host: {
    '(pointerdown)': 'onDown($event)',
    '(pointerup)': 'onUp($event)',
    '(pointercancel)': 'reset()',
    style: 'touch-action: pan-y',
  },
})
export class SwipeDirective {
  readonly swipeLeft = output<void>();
  readonly swipeRight = output<void>();

  private startX: number | null = null;
  private startY = 0;
  private startTime = 0;

  protected onDown(event: PointerEvent) {
    if (event.pointerType === 'mouse') return;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startTime = Date.now();
  }

  protected onUp(event: PointerEvent) {
    if (this.startX === null) return;
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;
    const fast = Date.now() - this.startTime < 600;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4 && fast) {
      if (dx < 0) this.swipeLeft.emit();
      else this.swipeRight.emit();
    }
    this.reset();
  }

  protected reset() {
    this.startX = null;
  }
}
