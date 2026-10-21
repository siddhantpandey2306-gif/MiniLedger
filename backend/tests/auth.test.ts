import request from 'supertest';
import app from '../src/app';
import { query } from '../src/config/db';

describe('Auth & Health API Tests', () => {
  describe('GET /api/health', () => {
    it('should return 200 with service health info', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body.services.api).toBe('healthy');
    });
  });

  describe('POST /api/auth/request-otp', () => {
    it('should reject invalid phone numbers with 400', async () => {
      const res = await request(app)
        .post('/api/auth/request-otp')
        .send({ phone: '123' }); // Too short

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details[0].field).toBe('phone');
    });

    it('should reject missing phone number with 400', async () => {
      const res = await request(app)
        .post('/api/auth/request-otp')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should successfully generate mock OTP for a valid phone number without leaking OTP', async () => {
      const res = await request(app)
        .post('/api/auth/request-otp')
        .send({ phone: '+919876543210' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('OTP sent successfully');
      // OTP is NEVER leaked in the response payload
      expect(res.body).not.toHaveProperty('otp');
      expect(res.body).not.toHaveProperty('code');
    });

    it('should invalidate previously requested OTP when a new OTP is requested', async () => {
      const phone = '+919876543210';

      // First OTP request
      await request(app).post('/api/auth/request-otp').send({ phone });
      const firstDbRes = await query(
        `SELECT otp_code FROM otp_codes WHERE phone_number = $1 AND is_used = FALSE ORDER BY created_at DESC LIMIT 1`,
        [phone]
      );
      const firstOtp = firstDbRes.rows[0].otp_code;

      // Second OTP request
      await request(app).post('/api/auth/request-otp').send({ phone });
      const secondDbRes = await query(
        `SELECT otp_code FROM otp_codes WHERE phone_number = $1 AND is_used = FALSE ORDER BY created_at DESC LIMIT 1`,
        [phone]
      );
      const secondOtp = secondDbRes.rows[0].otp_code;

      // The first OTP must have been marked as used / invalidated
      const verifyFirstRes = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone, otp: firstOtp });
      expect(verifyFirstRes.status).toBe(400);
      expect(verifyFirstRes.body.error).toContain('Invalid OTP code');

      // The second OTP must succeed
      const verifySecondRes = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone, otp: secondOtp });
      expect(verifySecondRes.status).toBe(200);
      expect(verifySecondRes.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    const testPhone = '+919876543210';

    beforeEach(async () => {
      await query('DELETE FROM otp_codes');
      await query('DELETE FROM users');
      await request(app)
        .post('/api/auth/request-otp')
        .send({ phone: testPhone });
    });

    it('should reject malformed or non-6-digit OTP with 400', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          phone: testPhone,
          otp: '123', // Must be 6 digits
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should reject incorrect OTP code and report remaining attempts', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          phone: testPhone,
          otp: '000000',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid OTP code');
      expect(res.body.error).toContain('2 attempt(s) remaining');
    });

    it('should enforce attempt limits and lock out OTP after 3 consecutive failures', async () => {
      // Attempt 1 (2 remaining)
      const res1 = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: testPhone, otp: '111111' });
      expect(res1.status).toBe(400);
      expect(res1.body.error).toContain('2 attempt(s) remaining');

      // Attempt 2 (1 remaining)
      const res2 = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: testPhone, otp: '222222' });
      expect(res2.status).toBe(400);
      expect(res2.body.error).toContain('1 attempt(s) remaining');

      // Attempt 3 (0 remaining - lockout)
      const res3 = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: testPhone, otp: '333333' });
      expect(res3.status).toBe(400);
      expect(res3.body.error).toContain('Maximum attempts reached');

      // Subsequent attempt even with the REAL OTP must be rejected because is_used = TRUE
      const dbResult = await query(
        `SELECT otp_code FROM otp_codes WHERE phone_number = $1 ORDER BY created_at DESC LIMIT 1`,
        [testPhone]
      );
      const realOtp = dbResult.rows[0].otp_code;

      const res4 = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: testPhone, otp: realOtp });
      expect(res4.status).toBe(400);
      expect(res4.body.error).toContain('No active OTP request found');
    });

    it('should reject expired OTPs and require a new request', async () => {
      // Simulate expiration by setting expires_at to 10 minutes in the past
      await query(
        `UPDATE otp_codes SET expires_at = CURRENT_TIMESTAMP - INTERVAL '10 minutes' WHERE phone_number = $1`,
        [testPhone]
      );

      const dbResult = await query(
        `SELECT otp_code FROM otp_codes WHERE phone_number = $1 ORDER BY created_at DESC LIMIT 1`,
        [testPhone]
      );
      const realOtp = dbResult.rows[0].otp_code;

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          phone: testPhone,
          otp: realOtp,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('OTP has expired');
    });

    it('should verify correct OTP, create user, return signed JWT, and prevent OTP reuse', async () => {
      // Fetch generated OTP from DB
      const dbResult = await query(
        `SELECT otp_code FROM otp_codes WHERE phone_number = $1 AND is_used = FALSE ORDER BY created_at DESC LIMIT 1`,
        [testPhone]
      );
      const generatedOtp = dbResult.rows[0].otp_code;

      // Successful verification
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          phone: testPhone,
          otp: generatedOtp,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.phone_number).toBe(testPhone);

      // Attempting to reuse the exact same OTP must fail (single-use enforcement)
      const reuseRes = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          phone: testPhone,
          otp: generatedOtp,
        });

      expect(reuseRes.status).toBe(400);
      expect(reuseRes.body.error).toContain('No active OTP request found');
    });
  });
});
