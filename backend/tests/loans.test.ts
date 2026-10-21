import request from 'supertest';
import app from '../src/app';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/env';
import { query } from '../src/config/db';

describe('Loans API Tests', () => {
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

  describe('Authentication Enforcement', () => {
    it('should reject requests with missing Authorization header with 401', async () => {
      const res = await request(app).get('/api/loans');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Missing or malformed Bearer authorization token');
    });

    it('should reject malformed Authorization headers (not Bearer <token>) with 401', async () => {
      const res = await request(app)
        .get('/api/loans')
        .set('Authorization', 'Basic dXNlcjpwYXNz');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Missing or malformed Bearer authorization token');
    });

    it('should reject invalid or tampered tokens with 401', async () => {
      const tamperedToken = userA.token.slice(0, -6) + 'abcdef';
      const res = await request(app)
        .get('/api/loans')
        .set('Authorization', `Bearer ${tamperedToken}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid token signature.');
    });

    it('should reject expired tokens with 401', async () => {
      const expiredToken = jwt.sign({ id: userA.id, phone: userA.phone }, config.jwtSecret, {
        expiresIn: '-10s', // Expired 10 seconds ago
      });
      const res = await request(app)
        .get('/api/loans')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Token expired. Please log in again.');
    });

    it('should reject tokens signed with a different secret with 401', async () => {
      const rogueToken = jwt.sign({ id: userA.id, phone: userA.phone }, 'wrong_secret_123456');
      const res = await request(app)
        .get('/api/loans')
        .set('Authorization', `Bearer ${rogueToken}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid token signature.');
    });
  });

  describe('POST /api/loans (Create Loan Validation)', () => {
    it('should create a valid loan associated with authenticated user', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          friend_name: 'Rohan Sharma',
          amount: 1500,
          due_date: '2026-11-20',
          notes: 'Dinner expenses',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.friend_name).toBe('Rohan Sharma');
      expect(res.body.data.amount).toBe(1500);
      expect(res.body.data.due_date).toBe('2026-11-20');
      expect(res.body.data.is_repaid).toBe(false);
      expect(res.body.data.repaid_at).toBeNull();
      expect(res.body.data.notes).toBe('Dinner expenses');
      expect(res.body.data.user_id).toBe(userA.id);
    });

    it('should reject zero amount with 400', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          friend_name: 'Bob',
          amount: 0,
          due_date: '2026-12-01',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details.some((d: any) => d.field === 'amount')).toBe(true);
    });

    it('should reject negative amounts with 400', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          friend_name: 'Bob',
          amount: -500,
          due_date: '2026-12-01',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details.some((d: any) => d.field === 'amount')).toBe(true);
    });

    it('should reject non-numeric amount values with 400', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          friend_name: 'Bob',
          amount: 'five-hundred',
          due_date: '2026-12-01',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject amount exceeding maximum threshold (100,000,000)', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          friend_name: 'Bob',
          amount: 999999999,
          due_date: '2026-12-01',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details.some((d: any) => d.field === 'amount')).toBe(true);
    });

    it('should reject empty or whitespace friend name with 400', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          friend_name: '   ',
          amount: 500,
          due_date: '2026-12-01',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details.some((d: any) => d.field === 'friend_name')).toBe(true);
    });

    it('should reject friend name exceeding 100 characters with 400', async () => {
      const longName = 'A'.repeat(105);
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          friend_name: longName,
          amount: 500,
          due_date: '2026-12-01',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details.some((d: any) => d.field === 'friend_name')).toBe(true);
    });

    it('should reject invalid date format with 400', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          friend_name: 'Bob',
          amount: 500,
          due_date: '01/12/2026', // DD/MM/YYYY instead of YYYY-MM-DD
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details.some((d: any) => d.field === 'due_date')).toBe(true);
    });

    it('should reject non-date string with 400', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          friend_name: 'Bob',
          amount: 500,
          due_date: 'tomorrow',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/loans & Tenant Isolation', () => {
    it('should only return loans belonging to the authenticated user', async () => {
      // User A creates a loan
      await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          friend_name: 'Friend of A',
          amount: 1000,
          due_date: '2026-11-20',
        });

      // User B creates a loan
      await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userB.token}`)
        .send({
          friend_name: 'Friend of B',
          amount: 2000,
          due_date: '2026-11-25',
        });

      // Fetch loans as User A
      const resA = await request(app)
        .get('/api/loans')
        .set('Authorization', `Bearer ${userA.token}`);

      expect(resA.status).toBe(200);
      expect(resA.body.data).toHaveLength(1);
      expect(resA.body.data[0].friend_name).toBe('Friend of A');
      expect(resA.body.data[0].user_id).toBe(userA.id);

      // Fetch loans as User B
      const resB = await request(app)
        .get('/api/loans')
        .set('Authorization', `Bearer ${userB.token}`);

      expect(resB.status).toBe(200);
      expect(resB.body.data).toHaveLength(1);
      expect(resB.body.data[0].friend_name).toBe('Friend of B');
      expect(resB.body.data[0].user_id).toBe(userB.id);
    });

    it('should support status query filtering: pending, repaid, overdue, all', async () => {
      // 1. Pending loan (future due date)
      await query(
        `INSERT INTO loans (user_id, friend_name, amount, due_date, is_repaid)
         VALUES ($1, 'Future Friend', 1000, CURRENT_DATE + 5, FALSE)`,
        [userA.id]
      );

      // 2. Overdue loan (past due date, unpaid)
      await query(
        `INSERT INTO loans (user_id, friend_name, amount, due_date, is_repaid)
         VALUES ($1, 'Past Friend', 2000, CURRENT_DATE - 5, FALSE)`,
        [userA.id]
      );

      // 3. Repaid loan
      await query(
        `INSERT INTO loans (user_id, friend_name, amount, due_date, is_repaid, repaid_at)
         VALUES ($1, 'Repaid Friend', 1500, CURRENT_DATE - 10, TRUE, CURRENT_TIMESTAMP)`,
        [userA.id]
      );

      // Test ?status=all
      const resAll = await request(app)
        .get('/api/loans?status=all')
        .set('Authorization', `Bearer ${userA.token}`);
      expect(resAll.body.data).toHaveLength(3);

      // Test ?status=pending (unrepaid, both future and overdue)
      const resPending = await request(app)
        .get('/api/loans?status=pending')
        .set('Authorization', `Bearer ${userA.token}`);
      expect(resPending.body.data).toHaveLength(2);

      // Test ?status=overdue (unrepaid AND due_date < CURRENT_DATE)
      const resOverdue = await request(app)
        .get('/api/loans?status=overdue')
        .set('Authorization', `Bearer ${userA.token}`);
      expect(resOverdue.body.data).toHaveLength(1);
      expect(resOverdue.body.data[0].friend_name).toBe('Past Friend');
      expect(resOverdue.body.data[0].is_overdue).toBe(true);

      // Test ?status=repaid
      const resRepaid = await request(app)
        .get('/api/loans?status=repaid')
        .set('Authorization', `Bearer ${userA.token}`);
      expect(resRepaid.body.data).toHaveLength(1);
      expect(resRepaid.body.data[0].friend_name).toBe('Repaid Friend');
    });

    it('should reject invalid status query parameter with 400', async () => {
      const res = await request(app)
        .get('/api/loans?status=invalid_status')
        .set('Authorization', `Bearer ${userA.token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Query validation failed');
    });
  });

  describe('PATCH /api/loans/:id/repay', () => {
    let loanAId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          friend_name: 'Charlie',
          amount: 750,
          due_date: '2026-12-10',
        });
      loanAId = res.body.data.id;
    });

    it('should prevent User B from repaying or accessing User A loan (returns 404)', async () => {
      const res = await request(app)
        .patch(`/api/loans/${loanAId}/repay`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Loan not found');
    });

    it('should allow User A to mark their loan as repaid', async () => {
      const res = await request(app)
        .patch(`/api/loans/${loanAId}/repay`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_repaid).toBe(true);
      expect(res.body.data.repaid_at).not.toBeNull();
    });

    it('should reject repaying an already repaid loan with 400', async () => {
      // First repayment succeeds
      await request(app)
        .patch(`/api/loans/${loanAId}/repay`)
        .set('Authorization', `Bearer ${userA.token}`);

      // Second attempt must be rejected
      const secondRes = await request(app)
        .patch(`/api/loans/${loanAId}/repay`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(secondRes.status).toBe(400);
      expect(secondRes.body.success).toBe(false);
      expect(secondRes.body.error).toBe('Loan has already been repaid');
    });
  });
});
