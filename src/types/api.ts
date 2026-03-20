export interface ApiError {
  error: string;
  message: string;
  details?: { field: string; message: string }[];
}

export interface ApiSuccess<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
