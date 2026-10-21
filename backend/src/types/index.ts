import { Request } from 'express';

export interface User {
  id: string;
  phone_number: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthenticatedUser {
  id: string;
  phone_number: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export interface Loan {
  id: string;
  user_id: string;
  friend_name: string;
  amount: number | string;
  due_date: string;
  is_repaid: boolean;
  repaid_at: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  is_overdue?: boolean;
}

export interface LoanSummary {
  total_lent: number;
  total_repaid: number;
  overdue_amount: number;
  pending_amount: number;
}
