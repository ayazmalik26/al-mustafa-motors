import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, map, of, startWith, switchMap, type Observable } from 'rxjs';
import { toAppError } from '../http/api';
import type { LoadState } from '../models/api.models';

/**
 * Turns a request factory into a loading/success/error signal with a reload() trigger.
 * Must be called in an injection context (e.g. a component field initializer).
 */
export function loadState<T>(factory: () => Observable<T>): { state: Signal<LoadState<T>>; reload: () => void } {
  const trigger = new BehaviorSubject<void>(undefined);
  const state = toSignal(
    trigger.pipe(
      switchMap(() =>
        factory().pipe(
          map((data): LoadState<T> => ({ status: 'success', data })),
          catchError((err) => of<LoadState<T>>({ status: 'error', error: toAppError(err) })),
          startWith<LoadState<T>>({ status: 'loading' }),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as LoadState<T> },
  );
  return { state, reload: () => trigger.next() };
}
