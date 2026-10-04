import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 1;

  show(message: string, tone: Toast['tone'] = 'info', durationMs = 3500) {
    const id = this.nextId++;
    this.toasts.update((list) => [...list.slice(-2), { id, message, tone }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  success(message: string) {
    this.show(message, 'success');
  }

  error(message: string) {
    this.show(message, 'error', 5000);
  }

  dismiss(id: number) {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
