export interface User {
  id: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: string;
  user_id: string;
  friend_name: string;
  amount: number;
  due_date: string; // YYYY-MM-DD
  is_repaid: boolean;
  repaid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_overdue: boolean;
}

export interface LoanSummary {
  total_lent: number;
  total_repaid: number;
  overdue_amount: number;
  pending_amount: number;
}

export interface RequestOtpResponse {
  success: boolean;
  message: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

export interface GetLoansResponse {
  success: boolean;
  count: number;
  data: Loan[];
}

export interface LoanActionResponse {
  success: boolean;
  message: string;
  data: Loan;
}

export interface SummaryResponse {
  success: boolean;
  data: LoanSummary;
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: ApiErrorDetail[];
}

export interface CreateLoanPayload {
  friend_name: string;
  amount: number;
  due_date: string; // YYYY-MM-DD
  notes?: string | null;
}

export type LoanFilterStatus = 'all' | 'pending' | 'overdue' | 'repaid';
