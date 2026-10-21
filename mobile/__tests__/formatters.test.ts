import { describe, it, expect } from '@jest/globals';
import {
  formatCurrency,
  formatDate,
  getDaysRemaining,
  formatPhoneDisplay,
} from '../src/utils/formatters';

describe('Frontend Formatting Tests', () => {
  describe('formatCurrency', () => {
    it('should format numbers to Indian currency (₹)', () => {
      const formatted = formatCurrency(1500);
      expect(formatted).toContain('1,500');
    });

    it('should format zero correctly', () => {
      const formatted = formatCurrency(0);
      expect(formatted).toContain('0');
    });

    it('should handle numeric string inputs gracefully', () => {
      const formatted = formatCurrency('2500.50');
      expect(formatted).toContain('2,500.5');
    });
  });

  describe('formatDate', () => {
    it('should format YYYY-MM-DD to human readable string', () => {
      const res = formatDate('2026-11-20');
      expect(res).toBe('Nov 20, 2026');
    });

    it('should handle ISO datetime strings', () => {
      const res = formatDate('2026-12-05T14:30:00Z');
      expect(res).toBe('Dec 5, 2026');
    });

    it('should return fallback for empty string', () => {
      expect(formatDate('')).toBe('-');
    });
  });

  describe('getDaysRemaining', () => {
    it('should identify overdue dates', () => {
      // 5 days in past
      const past = new Date();
      past.setDate(past.getDate() - 5);
      const yyyy = past.getFullYear();
      const mm = String(past.getMonth() + 1).padStart(2, '0');
      const dd = String(past.getDate()).padStart(2, '0');

      const res = getDaysRemaining(`${yyyy}-${mm}-${dd}`);
      expect(res.isPast).toBe(true);
      expect(res.text).toContain('5 days overdue');
    });

    it('should identify due today', () => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');

      const res = getDaysRemaining(`${yyyy}-${mm}-${dd}`);
      expect(res.isPast).toBe(false);
      expect(res.text).toBe('Due today');
    });

    it('should identify future due date', () => {
      const future = new Date();
      future.setDate(future.getDate() + 10);
      const yyyy = future.getFullYear();
      const mm = String(future.getMonth() + 1).padStart(2, '0');
      const dd = String(future.getDate()).padStart(2, '0');

      const res = getDaysRemaining(`${yyyy}-${mm}-${dd}`);
      expect(res.isPast).toBe(false);
      expect(res.text).toBe('Due in 10 days');
    });
  });

  describe('formatPhoneDisplay', () => {
    it('should format +91 Indian phone numbers with clean spacing', () => {
      expect(formatPhoneDisplay('+919876543210')).toBe('+91 98765 43210');
    });

    it('should return standard phone numbers unchanged', () => {
      expect(formatPhoneDisplay('+14155552671')).toBe('+14155552671');
    });
  });
});
