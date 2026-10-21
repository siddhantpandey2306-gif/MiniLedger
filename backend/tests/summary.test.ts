import request from 'supertest';
import app from '../src/app';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/env';
import { query } from '../src/config/db';

describe('Summary API Tests (GET /api/summary)', () => {
  let userA: { id: string; phone: string; token: string };
  let userB: { id: string; phone: string; token: string };

  beforeEach(async () => {
    // Clear loans and users
    await query('DELETE FROM loans');
    await query('DELETE FROM users');

    // Create User A
    const resA = await query(
      `INSERT INTO users (phone_number) VALUES ($1) RETURNING id, phone_number`,
      ['+919876543210']
    );
    const uA = resA.rows[0];
    const tokenA = jwt.sign({ id: uA.id, phone: uA.phone_number }, config.jwtSecret, {
      expiresIn: '1h',
    });
    userA = { id: uA.id, phone: uA.phone_number, token: tokenA };

    // Create User B
    const resB = await query(
      `INSERT INTO users (phone_number) VALUES ($1) RETURNING id, phone_number`,
      ['+919123456789']
    );
    const uB = resB.rows[0];
    const tokenB = jwt.sign({ id: uB.id, phone: uB.phone_number }, config.jwtSecret, {
      expiresIn: '1h',
    });
    userB = { id: uB.id, phone: uB.phone_number, token: tokenB };
  });

  it('should return zeroes when user has no loans', async () => {
    const res = await request(app)
      .get('/api/summary')
      .set('Authorization', `Bearer ${userA.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      total_lent: 0,
      total_repaid: 0,
      overdue_amount: 0,
      pending_amount: 0,
    });
  });

  it('should correctly calculate total lent, total repaid, pending, and overdue amounts', async () => {
    // 1. Not-yet-due active loan in future: 1000.50 (due in 5 days, unpaid)
    await query(
      `INSERT INTO loans (user_id, friend_name, amount, due_date, is_repaid)
       VALUES ($1, 'Future Friend', 1000.50, CURRENT_DATE + 5, FALSE)`,
      [userA.id]
    );

    // 2. Overdue loan in the past: 2500.25 (due 3 days ago, unpaid)
    await query(
      `INSERT INTO loans (user_id, friend_name, amount, due_date, is_repaid)
       VALUES ($1, 'Overdue Friend', 2500.25, CURRENT_DATE - 3, FALSE)`,
      [userA.id]
    );

    // 3. Past loan repaid late: 1500.00 (past due date, but repaid -> must NOT be counted in overdue)
    await query(
      `INSERT INTO loans (user_id, friend_name, amount, due_date, is_repaid, repaid_at)
       VALUES ($1, 'Past Repaid Friend', 1500.00, CURRENT_DATE - 10, TRUE, CURRENT_TIMESTAMP)`,
      [userA.id]
    );

    // 4. Future loan repaid early: 800.00 (due in future, already repaid -> must NOT be counted in pending)
    await query(
      `INSERT INTO loans (user_id, friend_name, amount, due_date, is_repaid, repaid_at)
       VALUES ($1, 'Early Repaid Friend', 800.00, CURRENT_DATE + 15, TRUE, CURRENT_TIMESTAMP)`,
      [userA.id]
    );

    // 5. User B loans: 5000 overdue (must NOT leak into User A's summary)
    await query(
      `INSERT INTO loans (user_id, friend_name, amount, due_date, is_repaid)
       VALUES ($1, 'User B Friend', 5000.00, CURRENT_DATE - 2, FALSE)`,
      [userB.id]
    );

    // Fetch summary for User A
    const resA = await request(app)
      .get('/api/summary')
      .set('Authorization', `Bearer ${userA.token}`);

    expect(resA.status).toBe(200);
    expect(resA.body.success).toBe(true);

    // Expected sums for User A:
    // total_lent = 1000.50 + 2500.25 + 1500.00 + 800.00 = 5800.75
    expect(resA.body.data.total_lent).toBeCloseTo(5800.75, 2);

    // total_repaid = 1500.00 + 800.00 = 2300.00
    expect(resA.body.data.total_repaid).toBeCloseTo(2300.00, 2);

    // overdue_amount = only unpaid past due: 2500.25
    expect(resA.body.data.overdue_amount).toBeCloseTo(2500.25, 2);

    // pending_amount = all unpaid (future + overdue): 1000.50 + 2500.25 = 3500.75
    expect(resA.body.data.pending_amount).toBeCloseTo(3500.75, 2);

    // Fetch summary for User B - verify complete tenant isolation
    const resB = await request(app)
      .get('/api/summary')
      .set('Authorization', `Bearer ${userB.token}`);

    expect(resB.status).toBe(200);
    expect(resB.body.data.total_lent).toBe(5000.00);
    expect(resB.body.data.total_repaid).toBe(0);
    expect(resB.body.data.overdue_amount).toBe(5000.00);
    expect(resB.body.data.pending_amount).toBe(5000.00);
  });
});
