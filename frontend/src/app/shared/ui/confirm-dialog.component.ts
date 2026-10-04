import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ConfirmService } from '../../core/services/confirm.service';
import { DialogComponent } from './dialog.component';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-confirm-dialog',
  imports: [DialogComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog [open]="!!request()" labelledBy="confirm-title" (closed)="confirm.answer(false)">
      @if (request(); as r) {
        <div class="rounded-2xl bg-paper p-6 text-ink-950 shadow-2xl sm:p-8">
          <div class="flex items-start gap-4">
            <span class="grid size-11 shrink-0 place-items-center rounded-full" [class]="r.danger ? 'bg-danger/15 text-danger' : 'bg-gold/20 text-gold-dark'">
              <app-icon [name]="r.danger ? 'alert' : 'info'" [size]="20" />
            </span>
            <div>
              <h2 id="confirm-title" class="font-serif text-2xl">{{ r.title }}</h2>
              <p class="mt-2 text-sm text-muted-ink">{{ r.message }}</p>
            </div>
          </div>
          <div class="mt-7 flex justify-end gap-2">
            <button type="button" class="btn btn-outline-dark" (click)="confirm.answer(false)">Cancel</button>
            <button type="button" class="btn" [class]="r.danger ? 'btn-danger' : 'btn-dark'" (click)="confirm.answer(true)" data-testid="confirm-yes">
              {{ r.confirmLabel ?? 'Confirm' }}
            </button>
          </div>
        </div>
      }
    </app-dialog>
  `,
})
export class ConfirmDialogComponent {
  protected readonly confirm = inject(ConfirmService);
  protected readonly request = computed(() => this.confirm.pending());
}
