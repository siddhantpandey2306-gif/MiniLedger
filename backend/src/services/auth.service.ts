import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { config } from '../config/env';
import { AppError } from '../middlewares/errorHandler';
import { User } from '../types';

export class AuthService {
  /**
   * Generates a 6-digit mock OTP, saves it with expiry and attempt limits,
   * and logs it strictly to the server console.
   */
  static async requestOtp(phone: string): Promise<{ success: boolean; message: string }> {
    // Generate secure 6-digit numeric string
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000);

    // Invalidate any existing unused OTPs for this phone number
    await query(
      `UPDATE otp_codes 
       SET is_used = TRUE 
       WHERE phone_number = $1 AND is_used = FALSE`,
      [phone]
    );

    // Save the new OTP record
    await query(
      `INSERT INTO otp_codes (phone_number, otp_code, expires_at, attempts, max_attempts, is_used)
       VALUES ($1, $2, $3, 0, $4, FALSE)`,
      [phone, otpCode, expiresAt, config.otpMaxAttempts]
    );

    // Log OTP strictly to backend server console
    console.log('\n======================================================');
    console.log(`[MOCK OTP SERVICE] Verification Code Generated`);
    console.log(`Phone: ${phone}`);
    console.log(`Code:  ${otpCode}`);
    console.log(`Valid: ${config.otpExpiryMinutes} minutes (Max attempts: ${config.otpMaxAttempts})`);
    console.log('======================================================\n');

    return {
      success: true,
      message: 'OTP sent successfully. Please check server console logs for the mock OTP code.',
    };
  }

  /**
   * Verifies an OTP code, enforces expiry and attempt limits, ensures single-use,
   * retrieves or provisions the user record, and returns a signed JWT.
   */
  static async verifyOtp(
    phone: string,
    otp: string
  ): Promise<{ token: string; user: { id: string; phone_number: string } }> {
    // Find the latest active OTP record for this phone number
    const result = await query(
      `SELECT * FROM otp_codes 
       WHERE phone_number = $1 AND is_used = FALSE 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [phone]
    );

    if (result.rows.length === 0) {
      throw new AppError('No active OTP request found for this phone number. Please request a new OTP.', 400);
    }

    const otpRecord = result.rows[0];
    const now = new Date();
    const expiresAt = new Date(otpRecord.expires_at);

    // Check if expired
    if (now > expiresAt) {
      await query(`UPDATE otp_codes SET is_used = TRUE WHERE id = $1`, [otpRecord.id]);
      throw new AppError('OTP has expired. Please request a new one.', 400);
    }

    // Check if already exceeded attempts
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      await query(`UPDATE otp_codes SET is_used = TRUE WHERE id = $1`, [otpRecord.id]);
      throw new AppError('Maximum verification attempts exceeded. Please request a new OTP.', 400);
    }

    // Verify OTP match
    if (otpRecord.otp_code !== otp) {
      const newAttempts = otpRecord.attempts + 1;
      const remainingAttempts = otpRecord.max_attempts - newAttempts;

      if (remainingAttempts <= 0) {
        await query(`UPDATE otp_codes SET attempts = $1, is_used = TRUE WHERE id = $2`, [
          newAttempts,
          otpRecord.id,
        ]);
        throw new AppError('Invalid OTP code. Maximum attempts reached. Please request a new OTP.', 400);
      }

      await query(`UPDATE otp_codes SET attempts = $1 WHERE id = $2`, [newAttempts, otpRecord.id]);
      throw new AppError(`Invalid OTP code. ${remainingAttempts} attempt(s) remaining.`, 400);
    }

    // Mark OTP as used (strictly single-use)
    await query(`UPDATE otp_codes SET is_used = TRUE WHERE id = $1`, [otpRecord.id]);

    // Provision or fetch the user
    let userResult = await query<User>(`SELECT * FROM users WHERE phone_number = $1`, [phone]);

    if (userResult.rows.length === 0) {
      userResult = await query<User>(
        `INSERT INTO users (phone_number) VALUES ($1) RETURNING *`,
        [phone]
      );
    }

    const user = userResult.rows[0];

    // Issue signed JWT token
    const token = jwt.sign(
      {
        id: user.id,
        phone: user.phone_number,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    return {
      token,
      user: {
        id: user.id,
        phone_number: user.phone_number,
      },
    };
  }
}
