import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../ui/icon.component';

/** Uses the native share sheet when available (mobile), otherwise copies the link. */
@Component({
  selector: 'app-share-button',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="btn btn-ghost" (click)="share()" data-testid="share-button">
      <app-icon name="share" [size]="16" /> {{ i18n.t('vehicle.share') }}
    </button>
  `,
})
export class ShareButtonComponent {
  protected readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);
  private readonly document = inject(DOCUMENT);

  readonly title = input.required<string>();
  readonly text = input('');
  readonly url = input<string>();

  async share() {
    const url = this.url() || this.document.location.href;
    const nav = this.document.defaultView?.navigator;
    if (nav?.share) {
      try {
        await nav.share({ title: this.title(), text: this.text(), url });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return;
      }
    }
    try {
      await nav?.clipboard.writeText(url);
      this.toast.success(this.i18n.t('common.linkCopied'));
    } catch {
      this.toast.show(url, 'info', 6000);
    }
  }
}
