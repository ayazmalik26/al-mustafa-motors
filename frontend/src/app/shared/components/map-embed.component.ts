import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { I18nService } from '../../core/i18n/i18n.service';

const ALLOWED = /^https:\/\/(www\.)?google\.[a-z.]+\/maps/;

/** Google Maps embed. Only Google Maps URLs are trusted as iframe sources. */
@Component({
  selector: 'app-map-embed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (safeUrl(); as url) {
      <iframe
        [src]="url"
        class="size-full min-h-[inherit] border-0 [filter:grayscale(1)_contrast(.92)]"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        [title]="i18n.t('showroom.mapTitle', { name: name() })"
        allowfullscreen
      ></iframe>
    }
  `,
})
export class MapEmbedComponent {
  protected readonly i18n = inject(I18nService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly url = input<string | null | undefined>();
  readonly name = input('');

  protected readonly safeUrl = computed(() => {
    const url = this.url();
    return url && ALLOWED.test(url) ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });
}
