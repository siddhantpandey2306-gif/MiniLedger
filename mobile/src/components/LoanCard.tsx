import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Loan } from '../types/api';
import { colors } from '../theme/colors';
import { formatCurrency, formatDate, getDaysRemaining } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';

interface LoanCardProps {
  loan: Loan;
  onRepay: (loan: Loan) => void;
  isRepaying: boolean;
}

export const LoanCard: React.FC<LoanCardProps> = ({ loan, onRepay, isRepaying }) => {
  const isOverdue = loan.is_overdue && !loan.is_repaid;
  const daysInfo = getDaysRemaining(loan.due_date);

  return (
    <View
      style={[
        styles.card,
        isOverdue && styles.overdueCard,
        loan.is_repaid && styles.repaidCard,
      ]}
    >
      {/* Top Header Row: Friend Name & Status Badge */}
      <View style={styles.headerRow}>
        <View style={styles.friendInfo}>
          <View
            style={[
              styles.avatar,
              isOverdue ? styles.avatarOverdue : loan.is_repaid ? styles.avatarRepaid : styles.avatarPending,
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                isOverdue ? styles.avatarTextOverdue : loan.is_repaid ? styles.avatarTextRepaid : styles.avatarTextPending,
              ]}
            >
              {loan.friend_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.friendTextContainer}>
            <Text style={styles.friendName} numberOfLines={1}>
              {loan.friend_name}
            </Text>
            <Text style={styles.createdDate}>
              Created {formatDate(String(loan.created_at))}
            </Text>
          </View>
        </View>

        <StatusBadge isRepaid={loan.is_repaid} isOverdue={isOverdue} />
      </View>

      {/* Center Row: Amount & Due Date Details */}
      <View style={styles.detailsRow}>
        <View>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text
            style={[
              styles.amountValue,
              loan.is_repaid ? styles.amountRepaid : isOverdue ? styles.amountOverdue : styles.amountPending,
            ]}
          >
            {formatCurrency(loan.amount)}
          </Text>
        </View>

        <View style={styles.dueDateContainer}>
          <Text style={styles.dueDateLabel}>Due Date</Text>
          <View style={styles.dueDateRow}>
            <Ionicons
              name="calendar-outline"
              size={13}
              color={isOverdue ? colors.overdue : colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.dueDateValue,
                isOverdue && styles.dueDateValueOverdue,
              ]}
            >
              {formatDate(loan.due_date)}
            </Text>
          </View>
          {!loan.is_repaid && (
            <Text
              style={[
                styles.relativeDays,
                isOverdue ? styles.relativeDaysOverdue : styles.relativeDaysNormal,
              ]}
            >
              {daysInfo.text}
            </Text>
          )}
        </View>
      </View>

      {/* Notes if provided */}
      {!!loan.notes && (
        <View style={styles.notesContainer}>
          <Ionicons name="document-text-outline" size={13} color={colors.textMuted} style={{ marginRight: 5 }} />
          <Text style={styles.notesText} numberOfLines={2}>
            {loan.notes}
          </Text>
        </View>
      )}

      {/* Action Footer: Mark as Repaid for Unpaid Loans */}
      {!loan.is_repaid && (
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={[styles.repayButton, isRepaying && styles.repayButtonDisabled]}
            onPress={() => onRepay(loan)}
            disabled={isRepaying}
            activeOpacity={0.7}
          >
            {isRepaying ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={16} color={colors.textInverse} style={{ marginRight: 6 }} />
                <Text style={styles.repayButtonText}>Mark as Repaid</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Repaid Timestamp Info */}
      {loan.is_repaid && loan.repaid_at && (
        <View style={styles.repaidInfoRow}>
          <Ionicons name="checkmark-circle" size={13} color={colors.success} style={{ marginRight: 5 }} />
          <Text style={styles.repaidInfoText}>
            Repaid on {formatDate(String(loan.repaid_at))}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  overdueCard: {
    borderColor: colors.overdueBorder,
    backgroundColor: '#FFFDFD',
  },
  repaidCard: {
    borderColor: colors.border,
    backgroundColor: '#FAFCFA',
    opacity: 0.95,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarPending: {
    backgroundColor: colors.primaryLight,
  },
  avatarRepaid: {
    backgroundColor: colors.successLight,
  },
  avatarOverdue: {
    backgroundColor: colors.overdueLight,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  avatarTextPending: {
    color: colors.primary,
  },
  avatarTextRepaid: {
    color: colors.success,
  },
  avatarTextOverdue: {
    color: colors.overdue,
  },
  friendTextContainer: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  createdDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  amountPending: {
    color: colors.textPrimary,
  },
  amountRepaid: {
    color: colors.success,
  },
  amountOverdue: {
    color: colors.overdue,
  },
  dueDateContainer: {
    alignItems: 'flex-end',
  },
  dueDateLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dueDateValueOverdue: {
    color: colors.overdue,
  },
  relativeDays: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
  },
  relativeDaysOverdue: {
    color: colors.overdue,
    fontWeight: '600',
  },
  relativeDaysNormal: {
    color: colors.textMuted,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },
  footerRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  repayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    minHeight: 38,
  },
  repayButtonDisabled: {
    opacity: 0.6,
  },
  repayButtonText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '600',
  },
  repaidInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  repaidInfoText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
  },
});
