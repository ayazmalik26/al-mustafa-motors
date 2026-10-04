import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { SettingsService } from '../../../core/services/settings.service';
import { MapEmbedComponent } from '../../../shared/components/map-embed.component';
import { ShowroomInfoComponent } from '../../../shared/components/showroom-info.component';

@Component({
  selector: 'app-showroom-section',
  imports: [TranslatePipe, MapEmbedComponent, ShowroomInfoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="showroom" class="bg-ink-950 py-20 sm:py-28" aria-labelledby="showroom-title">
      <div class="container-x">
        <div class="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p class="kicker">{{ 'home.showroom.kicker' | t }}</p>
            <h2 id="showroom-title" class="display-2 mt-3">{{ 'home.showroom.titleLead' | t }} <em class="accent">{{ 'home.showroom.titleAccent' | t }}</em></h2>
          </div>
          <p class="max-w-md text-sm text-muted">{{ 'home.showroom.text' | t }}</p>
        </div>
        <div class="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
          <app-showroom-info />
          <div class="min-h-[360px] overflow-hidden rounded-[18px] border border-white/10 bg-ink-700 lg:min-h-[480px]">
            @defer (on viewport) {
              <app-map-embed class="h-full min-h-[inherit]" [url]="settings.settings()?.mapEmbedUrl" [name]="settings.businessName()" />
            } @placeholder {
              <div class="grid h-full min-h-[inherit] place-items-center text-sm text-muted">{{ 'showroom.mapLoading' | t }}</div>
            }
          </div>
        </div>
      </div>
    </section>
  `,
})
export class ShowroomSectionComponent {
  protected readonly settings = inject(SettingsService);
}
