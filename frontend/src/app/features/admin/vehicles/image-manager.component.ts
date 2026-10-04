import { ChangeDetectionStrategy, Component, inject, input, model, signal } from '@angular/core';
import { toAppError } from '../../../core/http/api';
import type { VehicleImage } from '../../../core/models/vehicle.models';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { VehicleService } from '../../../core/services/vehicle.service';
import { imageSmall } from '../../../core/utils/images';
import { IconComponent } from '../../../shared/ui/icon.component';

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const MAX_IMAGE_MB = 8;

/** Upload, reorder (drag or buttons), choose the primary photo and delete photos of a saved vehicle. */
@Component({
  selector: 'app-image-manager',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label
      class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors"
      [class]="dragOver() ? 'border-ink-950 bg-black/[0.03]' : 'border-black/15 hover:border-black/35'"
      (dragover)="$event.preventDefault(); dragOver.set(true)"
      (dragleave)="dragOver.set(false)"
      (drop)="onDrop($event)"
    >
      <app-icon name="upload" [size]="24" class="text-muted-ink" />
      <span class="mt-2 text-sm font-semibold">Drop photos here or click to choose</span>
      <span class="mt-1 text-xs text-muted-ink">JPEG, PNG, WebP or AVIF · up to {{ maxMb }} MB each · max 12 per upload</span>
      <input type="file" class="sr-only" multiple [accept]="accept" (change)="onPick($event)" [disabled]="uploading()" data-testid="image-upload-input" />
    </label>

    @if (uploading()) {
      <div class="mt-3" role="status" aria-live="polite">
        <div class="h-2 overflow-hidden rounded-full bg-black/10"><div class="h-full bg-ink-950 transition-[width]" [style.width.%]="progress()"></div></div>
        <p class="mt-1 text-xs text-muted-ink">Uploading and optimising… {{ progress() }}%</p>
      </div>
    }

    @if (images().length) {
      <p class="mt-5 text-xs text-muted-ink">Drag to reorder, or use the arrow buttons. The ★ primary photo is shown on cards and when sharing.</p>
      <ul class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" data-testid="image-list">
        @for (img of images(); track img.id; let i = $index; let first = $first; let last = $last) {
          <li
            class="group relative overflow-hidden rounded-xl border bg-white"
            [class]="img.isPrimary ? 'border-gold-dark ring-2 ring-gold/50' : 'border-black/10'"
            draggable="true"
            (dragstart)="dragIndex = i"
            (dragover)="$event.preventDefault()"
            (drop)="onReorderDrop($event, i)"
            [attr.data-testid]="'image-item-' + i"
          >
            <div class="aspect-[4/3] bg-black/5"><img [src]="thumb(img)" [alt]="img.alt || 'Vehicle photo ' + (i + 1)" class="size-full object-cover" loading="lazy" /></div>
            @if (img.isPrimary) {
              <span class="chip absolute start-2 top-2 bg-gold text-ink-950">★ Primary</span>
            }
            <span class="absolute end-2 top-2 grid size-8 cursor-grab place-items-center rounded-md bg-black/50 text-white" aria-hidden="true"><app-icon name="grip" [size]="16" [strokeWidth]="3" /></span>
            <div class="flex items-center justify-between gap-1 p-2">
              <div class="flex gap-1">
                <button type="button" class="ibtn" (click)="move(i, -1)" [disabled]="first || busy()" [attr.aria-label]="'Move photo ' + (i + 1) + ' earlier'"><app-icon name="chevron-left" [size]="16" /></button>
                <button type="button" class="ibtn" (click)="move(i, 1)" [disabled]="last || busy()" [attr.aria-label]="'Move photo ' + (i + 1) + ' later'"><app-icon name="chevron-right" [size]="16" /></button>
              </div>
              <div class="flex gap-1">
                @if (!img.isPrimary) {
                  <button type="button" class="ibtn" (click)="setPrimary(img)" [disabled]="busy()" [attr.aria-label]="'Make photo ' + (i + 1) + ' the primary photo'" [attr.data-testid]="'set-primary-' + i"><app-icon name="star" [size]="16" /></button>
                }
                <button type="button" class="ibtn text-danger" (click)="remove(img, i)" [disabled]="busy()" [attr.aria-label]="'Delete photo ' + (i + 1)" [attr.data-testid]="'delete-image-' + i"><app-icon name="trash" [size]="16" /></button>
              </div>
            </div>
            <div class="px-2 pb-2">
              <label class="sr-only" [for]="'alt-' + img.id">Description of photo {{ i + 1 }}</label>
              <input [id]="'alt-' + img.id" class="w-full rounded-md border border-black/10 px-2 py-1.5 text-xs" [value]="img.alt ?? ''" placeholder="Photo description (alt text)" (change)="saveAlt(img, $event)" maxlength="160" />
            </div>
          </li>
        }
      </ul>
    } @else if (!uploading()) {
      <p class="mt-4 text-sm text-muted-ink">No photos yet. Vehicles with photos get far more enquiries.</p>
    }
  `,
  styles: `
    .ibtn { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgb(0 0 0 / .1); transition: background-color .2s; }
    .ibtn:hover:not(:disabled) { background: rgb(0 0 0 / .05); }
    .ibtn:disabled { opacity: .35; }
  `,
})
export class ImageManagerComponent {
  private readonly vehicles = inject(VehicleService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly vehicleId = input.required<string>();
  readonly images = model<VehicleImage[]>([]);

  protected readonly accept = IMAGE_TYPES.join(',');
  protected readonly maxMb = MAX_IMAGE_MB;
  protected readonly uploading = signal(false);
  protected readonly progress = signal(0);
  protected readonly busy = signal(false);
  protected readonly dragOver = signal(false);
  protected dragIndex: number | null = null;

  protected thumb(img: VehicleImage) {
    return imageSmall(img);
  }

  protected onPick(event: Event) {
    const input = event.target as HTMLInputElement;
    this.upload(Array.from(input.files ?? []));
    input.value = '';
  }

  protected onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragOver.set(false);
    if (this.dragIndex !== null) return; // a reorder drag, not a file drop
    this.upload(Array.from(event.dataTransfer?.files ?? []));
  }

  upload(files: File[]) {
    const valid = files.filter((f) => IMAGE_TYPES.includes(f.type) && f.size <= MAX_IMAGE_MB * 1024 * 1024).slice(0, 12);
    if (valid.length < files.length) this.toast.error(`Some files were skipped (only images up to ${MAX_IMAGE_MB} MB, max 12 at a time).`);
    if (!valid.length) return;
    this.uploading.set(true);
    this.progress.set(0);
    this.vehicles.uploadImages(this.vehicleId(), valid).subscribe({
      next: (event) => {
        if (event.type === 'progress') this.progress.set(event.percent);
        else {
          this.images.set(event.images);
          this.toast.success(`${valid.length} photo${valid.length > 1 ? 's' : ''} uploaded.`);
        }
      },
      error: (err) => {
        this.uploading.set(false);
        this.toast.error(toAppError(err).message);
      },
      complete: () => this.uploading.set(false),
    });
  }

  protected onReorderDrop(event: DragEvent, target: number) {
    event.preventDefault();
    event.stopPropagation();
    const from = this.dragIndex;
    this.dragIndex = null;
    if (from === null || from === target) return;
    this.reorder(from, target);
  }

  protected move(index: number, delta: number) {
    this.reorder(index, index + delta);
  }

  private reorder(from: number, to: number) {
    const list = [...this.images()];
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    const previous = this.images();
    this.images.set(list);
    this.run(this.vehicles.reorderImages(this.vehicleId(), list.map((i) => i.id)), previous);
  }

  protected setPrimary(img: VehicleImage) {
    this.run(this.vehicles.updateImage(this.vehicleId(), img.id, { isPrimary: true }), this.images(), 'Primary photo updated.');
  }

  protected saveAlt(img: VehicleImage, event: Event) {
    const alt = (event.target as HTMLInputElement).value.trim() || null;
    this.run(this.vehicles.updateImage(this.vehicleId(), img.id, { alt }), this.images(), 'Photo description saved.');
  }

  protected async remove(img: VehicleImage, index: number) {
    const ok = await this.confirm.ask({ title: 'Delete this photo?', message: `Photo ${index + 1} will be permanently removed.`, confirmLabel: 'Delete photo', danger: true });
    if (ok) this.run(this.vehicles.deleteImage(this.vehicleId(), img.id), this.images(), 'Photo deleted.');
  }

  private run(request: ReturnType<VehicleService['deleteImage']>, previous: VehicleImage[], success?: string) {
    this.busy.set(true);
    request.subscribe({
      next: (images) => {
        this.busy.set(false);
        this.images.set(images);
        if (success) this.toast.success(success);
      },
      error: (err) => {
        this.busy.set(false);
        this.images.set(previous);
        this.toast.error(toAppError(err).message);
      },
    });
  }
}
