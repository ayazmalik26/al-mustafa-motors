export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Returned by services for paginated lists; the response interceptor lifts `meta` next to `data`. */
export class Paginated<T> {
  constructor(
    public readonly items: T[],
    public readonly meta: PageMeta,
  ) {}

  static of<T>(items: T[], total: number, page: number, pageSize: number): Paginated<T> {
    return new Paginated(items, { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  }
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PageMeta;
}

export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
}
