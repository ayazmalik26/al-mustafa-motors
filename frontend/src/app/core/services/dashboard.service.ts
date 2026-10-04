import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_BASE, unwrap } from '../http/api';
import type { ApiSuccess } from '../models/api.models';
import type { DashboardStats } from '../models/settings.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  stats(): Observable<DashboardStats> {
    return this.http.get<ApiSuccess<DashboardStats>>(`${API_BASE}/dashboard`).pipe(unwrap());
  }
}
