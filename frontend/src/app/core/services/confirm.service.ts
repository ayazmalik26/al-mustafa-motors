import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface PendingConfirm extends ConfirmRequest {
  resolve: (value: boolean) => void;
}

/** Promise-based confirmation dialog, rendered by <app-confirm-dialog> in the admin layout. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly pending = signal<PendingConfirm | null>(null);

  ask(request: ConfirmRequest): Promise<boolean> {
    this.pending()?.resolve(false);
    return new Promise((resolve) => this.pending.set({ ...request, resolve }));
  }

  answer(value: boolean) {
    const current = this.pending();
    this.pending.set(null);
    current?.resolve(value);
  }
}
