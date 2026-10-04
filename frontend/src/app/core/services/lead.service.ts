import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_BASE, cleanParams, unwrap, unwrapPage } from '../http/api';
import type { ApiSuccess, Paged } from '../models/api.models';
import type {
  Enquiry,
  EnquiryCreated,
  EnquiryInput,
  EnquiryStatus,
  SellRequest,
  SellRequestCreated,
  SellRequestStatus,
} from '../models/lead.models';

export interface LeadQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  intent?: string;
}

/** Public lead capture (enquiries, sell/exchange requests) and their admin management. */
@Injectable({ providedIn: 'root' })
export class LeadService {
  private readonly http = inject(HttpClient);

  createEnquiry(input: EnquiryInput): Observable<EnquiryCreated> {
    return this.http.post<ApiSuccess<EnquiryCreated>>(`${API_BASE}/enquiries`, input).pipe(unwrap());
  }

  /** Sent as multipart so optional photos travel with the request. */
  createSellRequest(fields: Record<string, string | number | null | undefined>, photos: File[]): Observable<SellRequestCreated> {
    const body = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      if (value !== null && value !== undefined && value !== '') body.append(key, String(value));
    }
    for (const photo of photos) body.append('images', photo, photo.name);
    return this.http.post<ApiSuccess<SellRequestCreated>>(`${API_BASE}/sell-requests`, body).pipe(unwrap());
  }

  // ── Admin ──────────────────────────────────────────────

  enquiries(query: LeadQuery): Observable<Paged<Enquiry>> {
    return this.http.get<ApiSuccess<Enquiry[]>>(`${API_BASE}/enquiries`, { params: cleanParams(query) }).pipe(unwrapPage());
  }

  updateEnquiry(id: string, input: { status?: EnquiryStatus; notes?: string | null }): Observable<Enquiry> {
    return this.http.patch<ApiSuccess<Enquiry>>(`${API_BASE}/enquiries/${id}`, input).pipe(unwrap());
  }

  sellRequests(query: LeadQuery): Observable<Paged<SellRequest>> {
    return this.http.get<ApiSuccess<SellRequest[]>>(`${API_BASE}/sell-requests`, { params: cleanParams(query) }).pipe(unwrapPage());
  }

  updateSellRequest(id: string, input: { status?: SellRequestStatus; notes?: string | null }): Observable<SellRequest> {
    return this.http.patch<ApiSuccess<SellRequest>>(`${API_BASE}/sell-requests/${id}`, input).pipe(unwrap());
  }
}
