import { describe, it, expect, beforeEach } from '@jest/globals';
import { query } from '../src/config/db';
import { LoanService } from '../src/services/loan.service';

describe('PostgreSQL Database Integration & Constraint Verification', () => {
  beforeEach(async () => {
    // Clean tables before each test
    await query('DELETE FROM loans');
    await query('DELETE FROM otp_codes');
    await query('DELETE FROM users');
  });

  describe('1. Phone Number Uniqueness Constraint (users.phone_number)', () => {
    it('should enforce unique phone numbers and reject duplicate inserts', async () => {
      const phone = '+919876543210';

      // First insert succeeds
      await query(`INSERT INTO users (phone_number) VALUES ($1)`, [phone]);

      // Second insert with duplicate phone number must fail
      let duplicateError: any = null;
      try {
        await query(`INSERT INTO users (phone_number) VALUES ($1)`, [phone]);
      } catch (err: any) {
        duplicateError = err;
      }

      expect(duplicateError).not.toBeNull();
      // PostgreSQL unique constraint error code is 23505
      expect(duplicateError.code || duplicateError.data?.code).toBe('23505');
    });
  });

  describe('2. Monetary Check Constraint (loans.amount > 0)', () => {
    it('should reject loans with zero amount', async () => {
      const userRes = await query(
        `INSERT INTO users (phone_number) VALUES ($1) RETURNING id`,
        ['+919876543210']
      );
      const userId = userRes.rows[0].id;

      let checkError: any = null;
      try {
        await query(
          `INSERT INTO loans (user_id, friend_name, amount, due_date) VALUES ($1, $2, $3, $4)`,
          [userId, 'Test Friend', 0, '2026-12-01']
        );
      } catch (err: any) {
        checkError = err;
      }

      expect(checkError).not.toBeNull();
      // Check constraint violation (PostgreSQL code 23514 or check constraint message)
      expect(checkError.message).toMatch(/check constraint.*is violated/i);
    });

    it('should reject loans with negative amount', async () => {
      const userRes = await query(
        `INSERT INTO users (phone_number) VALUES ($1) RETURNING id`,
        ['+919876543210']
      );
      const userId = userRes.rows[0].id;

      let checkError: any = null;
      try {
        await query(
          `INSERT INTO loans (user_id, friend_name, amount, due_date) VALUES ($1, $2, $3, $4)`,
          [userId, 'Test Friend', -500.5, '2026-12-01']
        );
      } catch (err: any) {
        checkError = err;
      }

      expect(checkError).not.toBeNull();
      expect(checkError.message).toMatch(/check constraint.*is violated/i);
    });
  });

  describe('3. Foreign Key & Cascading Deletion (loans.user_id -> users.id)', () => {
    it('should reject loan creation if referenced user_id does not exist', async () => {
      const nonExistentUserId = '99999999-9999-4999-a999-999999999999';

      let fkError: any = null;
      try {
        await query(
          `INSERT INTO loans (user_id, friend_name, amount, due_date) VALUES ($1, $2, $3, $4)`,
          [nonExistentUserId, 'Test Friend', 1000, '2026-12-01']
        );
      } catch (err: any) {
        fkError = err;
      }

      expect(fkError).not.toBeNull();
      // Foreign key violation (PostgreSQL code 23503 or foreign key constraint message)
      expect(fkError.message).toMatch(/violates foreign key constraint/i);
    });

    it('should automatically cascade delete all loans when parent user is deleted', async () => {
      const userRes = await query(
        `INSERT INTO users (phone_number) VALUES ($1) RETURNING id`,
        ['+919876543210']
      );
      const userId = userRes.rows[0].id;

      // Insert two loans for this user
      await query(
        `INSERT INTO loans (user_id, friend_name, amount, due_date) VALUES ($1, $2, $3, $4)`,
        [userId, 'Friend 1', 1000, '2026-12-01']
      );
      await query(
        `INSERT INTO loans (user_id, friend_name, amount, due_date) VALUES ($1, $2, $3, $4)`,
        [userId, 'Friend 2', 2000, '2026-12-05']
      );

      const beforeDelete = await query(`SELECT * FROM loans WHERE user_id = $1`, [userId]);
      expect(beforeDelete.rows).toHaveLength(2);

      // Delete the parent user
      await query(`DELETE FROM users WHERE id = $1`, [userId]);

      // Verify that all loans for this user were purged via CASCADE
      const afterDelete = await query(`SELECT * FROM loans WHERE user_id = $1`, [userId]);
      expect(afterDelete.rows).toHaveLength(0);
    });
  });

  describe('4. Parameterized User Scoping & Tenant Security', () => {
    it('should strictly isolate data between different users using parameterized SQL', async () => {
      // Create User 1 and User 2
      const u1Res = await query(`INSERT INTO users (phone_number) VALUES ($1) RETURNING id`, [
        '+919876543210',
      ]);
      const user1Id = u1Res.rows[0].id;

      const u2Res = await query(`INSERT INTO users (phone_number) VALUES ($1) RETURNING id`, [
        '+919123456789',
      ]);
      const user2Id = u2Res.rows[0].id;

      // User 1 creates a loan
      const loan1 = await LoanService.createLoan(user1Id, {
        friend_name: 'Friend of User 1',
        amount: 1500,
        due_date: '2026-11-20',
        notes: 'Loan 1',
      });

      // User 2 creates a loan
      const loan2 = await LoanService.createLoan(user2Id, {
        friend_name: 'Friend of User 2',
        amount: 3000,
        due_date: '2026-11-25',
        notes: 'Loan 2',
      });

      // Query User 1 loans
      const user1Loans = await LoanService.getLoans(user1Id);
      expect(user1Loans).toHaveLength(1);
      expect(user1Loans[0].id).toBe(loan1.id);
      expect(user1Loans[0].friend_name).toBe('Friend of User 1');

      // Query User 2 loans
      const user2Loans = await LoanService.getLoans(user2Id);
      expect(user2Loans).toHaveLength(1);
      expect(user2Loans[0].id).toBe(loan2.id);
      expect(user2Loans[0].friend_name).toBe('Friend of User 2');

      // User 1 cannot mark User 2's loan as repaid
      await expect(LoanService.repayLoan(user1Id, loan2.id)).rejects.toThrow('Loan not found');
    });
  });

  describe('5. Summary Calculation & Overdue Exclusion Rules', () => {
    it('should strictly exclude repaid loans from overdue amount even when due_date is in the past', async () => {
      const uRes = await query(`INSERT INTO users (phone_number) VALUES ($1) RETURNING id`, [
        '+919876543210',
      ]);
      const userId = uRes.rows[0].id;

      // 1. Pending future loan: 1000.50 (NOT overdue, NOT repaid)
      await query(
        `INSERT INTO loans (user_id, friend_name, amount, due_date, is_repaid)
         VALUES ($1, 'Future Friend', 1000.50, CURRENT_DATE + 10, FALSE)`,
        [userId]
      );

      // 2. Overdue loan: 2000.25 (unpaid and due_date < CURRENT_DATE -> MUST be overdue)
      await query(
        `INSERT INTO loans (user_id, friend_name, amount, due_date, is_repaid)
         VALUES ($1, 'Overdue Friend', 2000.25, CURRENT_DATE - 5, FALSE)`,
        [userId]
      );

      // 3. Past loan that WAS repaid: 3000.25 (due_date < CURRENT_DATE BUT is_repaid = TRUE -> MUST NOT be overdue)
      await query(
        `INSERT INTO loans (user_id, friend_name, amount, due_date, is_repaid, repaid_at)
         VALUES ($1, 'Repaid Friend', 3000.25, CURRENT_DATE - 15, TRUE, CURRENT_TIMESTAMP)`,
        [userId]
      );

      const summary = await LoanService.getSummary(userId);

      // Total lent = 1000.50 + 2000.25 + 3000.25 = 6001.00
      expect(summary.total_lent).toBeCloseTo(6001.0, 2);

      // Total repaid = 3000.25
      expect(summary.total_repaid).toBeCloseTo(3000.25, 2);

      // Overdue amount = 2000.25 (strictly excludes the repaid 3000.25)
      expect(summary.overdue_amount).toBeCloseTo(2000.25, 2);

      // Pending amount = 1000.50 + 2000.25 = 3000.75
      expect(summary.pending_amount).toBeCloseTo(3000.75, 2);
    });
  });

  describe('6. Date Formatting Consistency', () => {
    it('should store and return due_date in exact YYYY-MM-DD string representation', async () => {
      const uRes = await query(`INSERT INTO users (phone_number) VALUES ($1) RETURNING id`, [
        '+919876543210',
      ]);
      const userId = uRes.rows[0].id;

      const targetDate = '2026-11-20';
      const createdLoan = await LoanService.createLoan(userId, {
        friend_name: 'Date Check Friend',
        amount: 500,
        due_date: targetDate,
      });

      expect(createdLoan.due_date).toBe(targetDate);

      const fetchedLoans = await LoanService.getLoans(userId);
      expect(fetchedLoans[0].due_date).toBe(targetDate);
    });
  });
});
