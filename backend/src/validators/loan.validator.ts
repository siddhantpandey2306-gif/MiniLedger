import { z } from 'zod';

export const createLoanSchema = z.object({
  friend_name: z
    .string({ required_error: 'Friend name is required' })
    .trim()
    .min(1, 'Friend name cannot be empty')
    .max(100, 'Friend name cannot exceed 100 characters'),
  amount: z
    .number({ required_error: 'Amount is required', invalid_type_error: 'Amount must be a number' })
    .positive('Loan amount must be greater than zero')
    .max(100000000, 'Amount exceeds maximum allowable threshold'),
  due_date: z
    .string({ required_error: 'Due date is required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format')
    .refine((dateStr) => {
      const d = new Date(dateStr);
      return !isNaN(d.getTime());
    }, 'Due date must be a valid date'),
  notes: z
    .string()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .nullable(),
});

export const getLoansQuerySchema = z.object({
  status: z.enum(['all', 'pending', 'repaid', 'overdue']).optional().default('all'),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type GetLoansQueryInput = z.infer<typeof getLoansQuerySchema>;
