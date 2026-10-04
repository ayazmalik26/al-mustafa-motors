export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PageMeta;
}

export interface ApiErrorBody {
  success: false;
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
}

export interface Paged<T> {
  items: T[];
  meta: PageMeta;
}

/** Normalised error passed to components. */
export interface AppError {
  status: number;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export type LoadState<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: undefined; error: AppError };
