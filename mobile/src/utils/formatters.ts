export const formatCurrency = (amount: number | string): string => {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  try {
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    const d = new Date(dateString);
    return isNaN(d.getTime())
      ? dateString
      : d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
  } catch {
    return dateString;
  }
};

export const getDaysRemaining = (dueDate: string): { text: string; isPast: boolean } => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parts = dueDate.split('T')[0].split('-');
    const due = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    due.setHours(0, 0, 0, 0);

    const diffMs = due.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const pastDays = Math.abs(diffDays);
      return {
        text: `${pastDays} day${pastDays === 1 ? '' : 's'} overdue`,
        isPast: true,
      };
    } else if (diffDays === 0) {
      return { text: 'Due today', isPast: false };
    } else if (diffDays === 1) {
      return { text: 'Due tomorrow', isPast: false };
    } else {
      return { text: `Due in ${diffDays} days`, isPast: false };
    }
  } catch {
    return { text: dueDate, isPast: false };
  }
};

export const formatPhoneDisplay = (phone: string): string => {
  if (!phone) return '';
  if (phone.startsWith('+91') && phone.length === 13) {
    return `+91 ${phone.slice(3, 8)} ${phone.slice(8)}`;
  }
  return phone;
};
