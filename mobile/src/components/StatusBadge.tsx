import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface StatusBadgeProps {
  isRepaid: boolean;
  isOverdue: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ isRepaid, isOverdue }) => {
  if (isRepaid) {
    return (
      <View style={[styles.badge, styles.repaidBadge]}>
        <Ionicons name="checkmark-circle" size={14} color={colors.success} style={styles.icon} />
        <Text style={[styles.text, styles.repaidText]}>Repaid</Text>
      </View>
    );
  }

  if (isOverdue) {
    return (
      <View style={[styles.badge, styles.overdueBadge]}>
        <Ionicons name="alert-circle" size={14} color={colors.overdue} style={styles.icon} />
        <Text style={[styles.text, styles.overdueText]}>Overdue</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, styles.pendingBadge]}>
      <Ionicons name="time-outline" size={14} color={colors.pending} style={styles.icon} />
      <Text style={[styles.text, styles.pendingText]}>Pending</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  repaidBadge: {
    backgroundColor: colors.successLight,
    borderColor: colors.successBorder,
  },
  repaidText: {
    color: colors.success,
  },
  overdueBadge: {
    backgroundColor: colors.overdueLight,
    borderColor: colors.overdueBorder,
  },
  overdueText: {
    color: colors.overdue,
  },
  pendingBadge: {
    backgroundColor: colors.pendingLight,
    borderColor: colors.pendingBorder,
  },
  pendingText: {
    color: colors.pending,
  },
});
