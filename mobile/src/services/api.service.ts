import { getApiBaseUrl } from '../config/apiConfig';
import { StorageService } from './storage.service';
import {
  RequestOtpResponse,
  VerifyOtpResponse,
  GetLoansResponse,
  LoanActionResponse,
  SummaryResponse,
  CreateLoanPayload,
  LoanFilterStatus,
} from '../types/api';

export class ApiError extends Error {
  statusCode: number;
  details?: Array<{ field: string; message: string }>;

  constructor(message: string, statusCode: number, details?: Array<{ field: string; message: string }>) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Core HTTP helper that performs fetch calls with timeout, dynamic Base URL,
 * auth header injection, and structured error parsing.
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth: boolean = true
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (requiresAuth) {
    const token = await StorageService.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Set 12-second timeout to handle bad network or offline server gracefully
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        data?.error ||
        data?.message ||
        `Server returned ${response.status} (${response.statusText || 'Error'})`;

      throw new ApiError(errorMessage, response.status, data?.details);
    }

    return data as T;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new ApiError(
        `Connection timed out. Could not reach server at ${baseUrl}. Ensure your backend is running and the device is on the same network.`,
        408
      );
    }

    // Network / offline error
    const friendlyMessage =
      `Failed to connect to ${baseUrl}. Check your Wi-Fi network and verify the backend server is running on port 5000.`;
    throw new ApiError(friendlyMessage, 0);
  }
}

export const ApiService = {
  /**
   * Health check to quickly test connectivity from the mobile device to the backend.
   */
  async checkHealth(): Promise<{ status: string; service: string }> {
    return request<{ status: string; service: string }>('/health', { method: 'GET' }, false);
  },

  /**
   * POST /api/auth/request-otp
   */
  async requestOtp(phone: string): Promise<RequestOtpResponse> {
    return request<RequestOtpResponse>(
      '/auth/request-otp',
      {
        method: 'POST',
        body: JSON.stringify({ phone }),
      },
      false
    );
  },

  /**
   * POST /api/auth/verify-otp
   */
  async verifyOtp(phone: string, otp: string): Promise<VerifyOtpResponse> {
    const res = await request<VerifyOtpResponse>(
      '/auth/verify-otp',
      {
        method: 'POST',
        body: JSON.stringify({ phone, otp }),
      },
      false
    );

    // Persist token and user in secure storage upon successful verification
    if (res.token) {
      await StorageService.saveToken(res.token);
      await StorageService.saveUser(res.user);
    }

    return res;
  },

  /**
   * GET /api/loans
   */
  async getLoans(status?: LoanFilterStatus): Promise<GetLoansResponse> {
    const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    return request<GetLoansResponse>(`/loans${query}`, { method: 'GET' }, true);
  },

  /**
   * POST /api/loans
   */
  async createLoan(payload: CreateLoanPayload): Promise<LoanActionResponse> {
    return request<LoanActionResponse>(
      '/loans',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      true
    );
  },

  /**
   * PATCH /api/loans/:id/repay
   */
  async repayLoan(loanId: string): Promise<LoanActionResponse> {
    return request<LoanActionResponse>(
      `/loans/${encodeURIComponent(loanId)}/repay`,
      {
        method: 'PATCH',
      },
      true
    );
  },

  /**
   * GET /api/summary
   */
  async getSummary(): Promise<SummaryResponse> {
    return request<SummaryResponse>('/summary', { method: 'GET' }, true);
  },
};
