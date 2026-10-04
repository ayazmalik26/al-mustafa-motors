import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-toast-outlet',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pointer-events-none fixed inset-x-0 bottom-24 z-[300] flex flex-col items-center gap-2 px-4 md:bottom-8" aria-live="polite" aria-atomic="false">
      @for (toast of toasts.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex max-w-md animate-fade-up items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl"
          [class]="
            toast.tone === 'error'
              ? 'border-danger/40 bg-[#2a1614] text-[#ffd9d5]'
              : toast.tone === 'success'
                ? 'border-success/40 bg-[#122219] text-[#cdeedc]'
                : 'border-white/15 bg-ink-800 text-snow'
          "
          role="status"
        >
          <app-icon [name]="toast.tone === 'error' ? 'alert' : toast.tone === 'success' ? 'check' : 'info'" [size]="16" />
          <span>{{ toast.message }}</span>
          <button type="button" class="ms-2 rounded p-1 opacity-70 hover:opacity-100" (click)="toasts.dismiss(toast.id)" aria-label="Dismiss">
            <app-icon name="x" [size]="14" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastOutletComponent {
  protected readonly toasts = inject(ToastService);
}
