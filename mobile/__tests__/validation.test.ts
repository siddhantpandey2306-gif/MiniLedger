import { describe, it, expect } from '@jest/globals';
import {
  validatePhoneNumber,
  validateOtpCode,
  validateLoanForm,
} from '../src/utils/validation';

describe('Frontend Validation Tests', () => {
  describe('validatePhoneNumber', () => {
    it('should accept valid international phone numbers', () => {
      expect(validatePhoneNumber('+919876543210').isValid).toBe(true);
      expect(validatePhoneNumber('+14155552671').isValid).toBe(true);
      expect(validatePhoneNumber('9876543210').isValid).toBe(true);
    });

    it('should reject empty or whitespace phone numbers', () => {
      const res = validatePhoneNumber('   ');
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('Phone number is required');
    });

    it('should reject malformed or too short phone numbers', () => {
      expect(validatePhoneNumber('12345').isValid).toBe(false);
      expect(validatePhoneNumber('+0123456789').isValid).toBe(false);
      expect(validatePhoneNumber('abc12345678').isValid).toBe(false);
    });
  });

  describe('validateOtpCode', () => {
    it('should accept valid 6-digit numeric OTP', () => {
      expect(validateOtpCode('123456').isValid).toBe(true);
      expect(validateOtpCode('000000').isValid).toBe(true);
    });

    it('should reject non-6-digit or non-numeric codes', () => {
      expect(validateOtpCode('12345').isValid).toBe(false);
      expect(validateOtpCode('1234567').isValid).toBe(false);
      expect(validateOtpCode('12a456').isValid).toBe(false);
      expect(validateOtpCode('      ').isValid).toBe(false);
    });
  });

  describe('validateLoanForm', () => {
    it('should validate and pass a complete valid loan form', () => {
      const res = validateLoanForm('Rahul Sharma', '1500', '2026-12-15', 'Dinner share');
      expect(res.isValid).toBe(true);
      expect(res.errors).toEqual({});
    });

    it('should reject empty friend name', () => {
      const res = validateLoanForm('', '500', '2026-12-15');
      expect(res.isValid).toBe(false);
      expect(res.errors.friendName).toBe('Friend name is required');
    });

    it('should reject friend name exceeding 100 characters', () => {
      const res = validateLoanForm('A'.repeat(101), '500', '2026-12-15');
      expect(res.isValid).toBe(false);
      expect(res.errors.friendName).toBe('Friend name cannot exceed 100 characters');
    });

    it('should reject zero or negative amount', () => {
      const resZero = validateLoanForm('Rahul', '0', '2026-12-15');
      expect(resZero.isValid).toBe(false);
      expect(resZero.errors.amount).toBe('Loan amount must be greater than zero');

      const resNeg = validateLoanForm('Rahul', '-250', '2026-12-15');
      expect(resNeg.isValid).toBe(false);
      expect(resNeg.errors.amount).toBe('Loan amount must be greater than zero');
    });

    it('should reject non-numeric amount', () => {
      const res = validateLoanForm('Rahul', 'abc', '2026-12-15');
      expect(res.isValid).toBe(false);
      expect(res.errors.amount).toBe('Loan amount must be greater than zero');
    });

    it('should reject amount exceeding threshold', () => {
      const res = validateLoanForm('Rahul', '100000001', '2026-12-15');
      expect(res.isValid).toBe(false);
      expect(res.errors.amount).toBe('Amount exceeds maximum allowable threshold');
    });

    it('should reject invalid due date format or invalid calendar date', () => {
      // Invalid format DD/MM/YYYY
      const resFormat = validateLoanForm('Rahul', '500', '15/12/2026');
      expect(resFormat.isValid).toBe(false);
      expect(resFormat.errors.dueDate).toBe('Due date must be in YYYY-MM-DD format');

      // Non-existent calendar date (February 31)
      const resCalendar = validateLoanForm('Rahul', '500', '2026-02-31');
      expect(resCalendar.isValid).toBe(false);
      expect(resCalendar.errors.dueDate).toBe('Due date must be a valid calendar date');
    });

    it('should reject notes exceeding 500 characters', () => {
      const res = validateLoanForm('Rahul', '500', '2026-12-15', 'N'.repeat(505));
      expect(res.isValid).toBe(false);
      expect(res.errors.notes).toBe('Notes cannot exceed 500 characters');
    });
  });
});
