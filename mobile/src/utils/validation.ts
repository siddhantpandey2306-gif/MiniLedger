export interface LoanValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validatePhoneNumber = (phone: string): { isValid: boolean; error?: string } => {
  const trimmed = phone.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Accepts 8-15 digits with optional leading +
  const phoneRegex = /^\+?[1-9]\d{7,14}$/;
  if (!phoneRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Invalid phone number format. Must be 8-15 digits with optional leading +',
    };
  }

  return { isValid: true };
};

export const validateOtpCode = (otp: string): { isValid: boolean; error?: string } => {
  const trimmed = otp.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Verification code is required' };
  }

  if (trimmed.length !== 6 || !/^\d{6}$/.test(trimmed)) {
    return { isValid: false, error: 'Verification code must be exactly 6 digits' };
  }

  return { isValid: true };
};

export const validateLoanForm = (
  friendName: string,
  amount: string,
  dueDate: string,
  notes?: string
): LoanValidationResult => {
  const errors: Record<string, string> = {};

  // 1. Friend name validation
  const trimmedName = friendName.trim();
  if (!trimmedName) {
    errors.friendName = 'Friend name is required';
  } else if (trimmedName.length > 100) {
    errors.friendName = 'Friend name cannot exceed 100 characters';
  }

  // 2. Amount validation
  const trimmedAmount = amount.trim();
  const numAmount = parseFloat(trimmedAmount);
  if (!trimmedAmount) {
    errors.amount = 'Loan amount is required';
  } else if (isNaN(numAmount) || numAmount <= 0) {
    errors.amount = 'Loan amount must be greater than zero';
  } else if (numAmount > 100000000) {
    errors.amount = 'Amount exceeds maximum allowable threshold';
  }

  // 3. Due date validation (YYYY-MM-DD)
  const trimmedDate = dueDate.trim();
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!trimmedDate) {
    errors.dueDate = 'Due date is required';
  } else if (!dateRegex.test(trimmedDate)) {
    errors.dueDate = 'Due date must be in YYYY-MM-DD format';
  } else {
    const parts = trimmedDate.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    const d = new Date(year, month - 1, day);
    if (
      isNaN(d.getTime()) ||
      d.getFullYear() !== year ||
      d.getMonth() + 1 !== month ||
      d.getDate() !== day
    ) {
      errors.dueDate = 'Due date must be a valid calendar date';
    }
  }

  // 4. Notes validation
  if (notes && notes.trim().length > 500) {
    errors.notes = 'Notes cannot exceed 500 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
