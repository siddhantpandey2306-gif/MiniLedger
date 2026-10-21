import { query } from '../config/db';
import { AppError } from '../middlewares/errorHandler';
import { Loan, LoanSummary } from '../types';
import { CreateLoanInput } from '../validators/loan.validator';

const mapLoan = (row: any): Loan => {
  const dueDateStr =
    row.due_date instanceof Date
      ? row.due_date.toISOString().split('T')[0]
      : String(row.due_date).split('T')[0];

  return {
    id: row.id,
    user_id: row.user_id,
    friend_name: row.friend_name,
    amount: Number(row.amount),
    due_date: dueDateStr,
    is_repaid: Boolean(row.is_repaid),
    repaid_at: row.repaid_at ? new Date(row.repaid_at) : null,
    notes: row.notes,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
    is_overdue: Boolean(row.is_overdue),
  };
};

export class LoanService {
  /**
   * Retrieves all loans for a specific user, with optional status filtering.
   * Derives whether a loan is overdue based on CURRENT_DATE.
   */
  static async getLoans(userId: string, status?: string): Promise<Loan[]> {
    let sql = `
      SELECT 
        id,
        user_id,
        friend_name,
        amount,
        due_date,
        is_repaid,
        repaid_at,
        notes,
        created_at,
        updated_at,
        (is_repaid = FALSE AND due_date < CURRENT_DATE) AS is_overdue
      FROM loans
      WHERE user_id = $1
    `;

    const params: any[] = [userId];

    if (status === 'pending') {
      sql += ` AND is_repaid = FALSE`;
    } else if (status === 'repaid') {
      sql += ` AND is_repaid = TRUE`;
    } else if (status === 'overdue') {
      sql += ` AND is_repaid = FALSE AND due_date < CURRENT_DATE`;
    }

    sql += ` ORDER BY due_date ASC, created_at DESC`;

    const result = await query(sql, params);
    return result.rows.map(mapLoan);
  }

  /**
   * Creates a new loan entry attached to the authenticated user.
   */
  static async createLoan(userId: string, data: CreateLoanInput): Promise<Loan> {
    const { friend_name, amount, due_date, notes } = data;

    const result = await query(
      `INSERT INTO loans (user_id, friend_name, amount, due_date, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING 
         id,
         user_id,
         friend_name,
         amount,
         due_date,
         is_repaid,
         repaid_at,
         notes,
         created_at,
         updated_at,
         (is_repaid = FALSE AND due_date < CURRENT_DATE) AS is_overdue`,
      [userId, friend_name, amount, due_date, notes || null]
    );

    return mapLoan(result.rows[0]);
  }

  /**
   * Marks a loan as repaid. Enforces user ownership and rejects already repaid loans.
   */
  static async repayLoan(userId: string, loanId: string): Promise<Loan> {
    // Check if loan exists and belongs to the authenticated user
    const checkResult = await query(
      `SELECT id, user_id, is_repaid FROM loans WHERE id = $1`,
      [loanId]
    );

    if (checkResult.rows.length === 0 || checkResult.rows[0].user_id !== userId) {
      // Return 404 to avoid disclosing existence of other users' loans
      throw new AppError('Loan not found', 404);
    }

    const loan = checkResult.rows[0];

    // Reject attempt to repay already repaid loan
    if (loan.is_repaid) {
      throw new AppError('Loan has already been repaid', 400);
    }

    // Update loan status to repaid
    const updateResult = await query(
      `UPDATE loans
       SET is_repaid = TRUE,
           repaid_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING 
         id,
         user_id,
         friend_name,
         amount,
         due_date,
         is_repaid,
         repaid_at,
         notes,
         created_at,
         updated_at,
         FALSE AS is_overdue`,
      [loanId, userId]
    );

    return mapLoan(updateResult.rows[0]);
  }

  /**
   * Aggregates financial totals (total lent, total repaid, overdue amount, pending amount).
   */
  static async getSummary(userId: string): Promise<LoanSummary> {
    const result = await query(
      `SELECT
         COALESCE(SUM(amount), 0) AS total_lent,
         COALESCE(SUM(CASE WHEN is_repaid = TRUE THEN amount ELSE 0 END), 0) AS total_repaid,
         COALESCE(SUM(CASE WHEN is_repaid = FALSE AND due_date < CURRENT_DATE THEN amount ELSE 0 END), 0) AS overdue_amount,
         COALESCE(SUM(CASE WHEN is_repaid = FALSE THEN amount ELSE 0 END), 0) AS pending_amount
       FROM loans
       WHERE user_id = $1`,
      [userId]
    );

    const row = result.rows[0];

    return {
      total_lent: row ? Number(row.total_lent) : 0,
      total_repaid: row ? Number(row.total_repaid) : 0,
      overdue_amount: row ? Number(row.overdue_amount) : 0,
      pending_amount: row ? Number(row.pending_amount) : 0,
    };
  }
}
