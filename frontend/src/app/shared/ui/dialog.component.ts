import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

/**
 * Accessible modal built on the native <dialog> element: focus is trapped by the
 * browser, Escape closes it, and clicking the backdrop closes it.
 */
@Component({
  selector: 'app-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="am-dialog"
      [class.am-dialog-wide]="size() === 'wide'"
      [class.am-dialog-full]="size() === 'full'"
      [class.am-dialog-sheet]="size() === 'sheet'"
      [attr.aria-labelledby]="labelledBy() || null"
      [attr.aria-label]="ariaLabel() || null"
      (close)="onNativeClose()"
      (cancel)="onCancel($event)"
      (click)="onBackdropClick($event)"
    >
      @if (open()) {
        <ng-content />
      }
    </dialog>
  `,
})
export class DialogComponent {
  readonly open = input(false);
  readonly size = input<'default' | 'wide' | 'full' | 'sheet'>('default');
  readonly labelledBy = input<string>();
  readonly ariaLabel = input<string>();
  readonly closeOnBackdrop = input(true);
  readonly closed = output<void>();

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    effect(() => {
      if (!this.isBrowser) return;
      const el = this.dialogRef().nativeElement;
      if (this.open() && !el.open) el.showModal();
      else if (!this.open() && el.open) el.close();
    });
  }

  close() {
    this.dialogRef().nativeElement.close();
  }

  protected onNativeClose() {
    this.closed.emit();
  }

  protected onCancel(event: Event) {
    // Escape key: let the native close happen, which triggers (close) → closed.
    event.stopPropagation();
  }

  protected onBackdropClick(event: MouseEvent) {
    if (!this.closeOnBackdrop()) return;
    // Clicks on the backdrop target the <dialog> element itself.
    if (event.target === this.dialogRef().nativeElement) this.close();
  }
}
