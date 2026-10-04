import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { filter, map, of, shareReplay, type Observable } from 'rxjs';
import { API_BASE, cleanParams, unwrap, unwrapPage } from '../http/api';
import type { ApiSuccess, Paged } from '../models/api.models';
import type { Vehicle, VehicleFacets, VehicleFilters, VehicleImage, VehicleInput } from '../models/vehicle.models';
import { filtersToApiParams } from '../utils/vehicle-filters';

export type UploadProgress = { type: 'progress'; percent: number } | { type: 'done'; images: VehicleImage[] };

@Injectable({ providedIn: 'root' })
export class VehicleService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/vehicles`;
  private facets$?: Observable<VehicleFacets>;

  list(filters: VehicleFilters, pageSize?: number): Observable<Paged<Vehicle>> {
    return this.http.get<ApiSuccess<Vehicle[]>>(this.base, { params: filtersToApiParams(filters, pageSize) }).pipe(unwrapPage());
  }

  featured(limit = 6): Observable<Vehicle[]> {
    return this.http
      .get<ApiSuccess<Vehicle[]>>(this.base, { params: { featured: 'true', pageSize: String(limit) } })
      .pipe(unwrapPage(), map((p) => p.items));
  }

  byIds(ids: string[]): Observable<Vehicle[]> {
    if (!ids.length) return of([]);
    return this.http
      .get<ApiSuccess<Vehicle[]>>(this.base, { params: { ids: ids.join(','), pageSize: String(Math.min(ids.length, 60)) } })
      .pipe(unwrapPage(), map((p) => p.items));
  }

  similar(vehicle: Vehicle, limit = 3): Observable<Vehicle[]> {
    return this.http
      .get<ApiSuccess<Vehicle[]>>(this.base, {
        params: cleanParams({ bodyType: vehicle.bodyType, excludeId: vehicle.id, status: 'AVAILABLE', pageSize: limit }),
      })
      .pipe(unwrapPage(), map((p) => p.items));
  }

  /** Filter options; cached for the session because they change rarely. */
  facets(): Observable<VehicleFacets> {
    this.facets$ ??= this.http.get<ApiSuccess<VehicleFacets>>(`${this.base}/facets`).pipe(unwrap(), shareReplay({ bufferSize: 1, refCount: false }));
    return this.facets$;
  }

  invalidateFacets() {
    this.facets$ = undefined;
  }

  bySlug(slug: string): Observable<Vehicle> {
    return this.http.get<ApiSuccess<Vehicle>>(`${this.base}/${encodeURIComponent(slug)}`).pipe(unwrap());
  }

  // ── Admin ──────────────────────────────────────────────

  adminList(params: Record<string, string | number | undefined>): Observable<Paged<Vehicle>> {
    return this.http.get<ApiSuccess<Vehicle[]>>(this.base, { params: cleanParams(params) }).pipe(unwrapPage());
  }

  byId(id: string): Observable<Vehicle> {
    return this.http.get<ApiSuccess<Vehicle>>(`${this.base}/id/${id}`).pipe(unwrap());
  }

  create(input: VehicleInput): Observable<Vehicle> {
    this.invalidateFacets();
    return this.http.post<ApiSuccess<Vehicle>>(this.base, input).pipe(unwrap());
  }

  update(id: string, input: VehicleInput): Observable<Vehicle> {
    this.invalidateFacets();
    return this.http.patch<ApiSuccess<Vehicle>>(`${this.base}/${id}`, input).pipe(unwrap());
  }

  remove(id: string): Observable<{ id: string }> {
    this.invalidateFacets();
    return this.http.delete<ApiSuccess<{ id: string }>>(`${this.base}/${id}`).pipe(unwrap());
  }

  images(id: string): Observable<VehicleImage[]> {
    return this.http.get<ApiSuccess<VehicleImage[]>>(`${this.base}/${id}/images`).pipe(unwrap());
  }

  uploadImages(id: string, files: File[]): Observable<UploadProgress> {
    const body = new FormData();
    for (const file of files) body.append('images', file, file.name);
    return this.http.post<ApiSuccess<VehicleImage[]>>(`${this.base}/${id}/images`, body, { reportProgress: true, observe: 'events' }).pipe(
      filter((e: HttpEvent<ApiSuccess<VehicleImage[]>>) => e.type === HttpEventType.UploadProgress || e.type === HttpEventType.Response),
      map((e): UploadProgress => {
        if (e.type === HttpEventType.UploadProgress) return { type: 'progress', percent: e.total ? Math.round((100 * e.loaded) / e.total) : 0 };
        return { type: 'done', images: (e as { body: ApiSuccess<VehicleImage[]> }).body.data };
      }),
    );
  }

  reorderImages(id: string, imageIds: string[]): Observable<VehicleImage[]> {
    return this.http.patch<ApiSuccess<VehicleImage[]>>(`${this.base}/${id}/images/reorder`, { imageIds }).pipe(unwrap());
  }

  updateImage(id: string, imageId: string, input: { alt?: string | null; isPrimary?: boolean }): Observable<VehicleImage[]> {
    return this.http.patch<ApiSuccess<VehicleImage[]>>(`${this.base}/${id}/images/${imageId}`, input).pipe(unwrap());
  }

  deleteImage(id: string, imageId: string): Observable<VehicleImage[]> {
    return this.http.delete<ApiSuccess<VehicleImage[]>>(`${this.base}/${id}/images/${imageId}`).pipe(unwrap());
  }
}
