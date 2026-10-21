import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { formatCurrency } from '../utils/formatters';

interface SummaryCardProps {
  title: string;
  amount: number;
  type: 'lent' | 'repaid' | 'overdue' | 'pending';
  icon: keyof typeof Ionicons.glyphMap;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ title, amount, type, icon }) => {
  const getColors = () => {
    switch (type) {
      case 'repaid':
        return {
          iconColor: colors.success,
          bgColor: colors.successLight,
          textColor: colors.success,
          borderColor: colors.successBorder,
        };
      case 'overdue':
        return {
          iconColor: colors.overdue,
          bgColor: colors.overdueLight,
          textColor: colors.overdue,
          borderColor: colors.overdueBorder,
        };
      case 'pending':
        return {
          iconColor: colors.warning,
          bgColor: colors.warningLight,
          textColor: colors.warning,
          borderColor: colors.warningBorder,
        };
      case 'lent':
      default:
        return {
          iconColor: colors.primary,
          bgColor: colors.primaryLight,
          textColor: colors.primary,
          borderColor: colors.border,
        };
    }
  };

  const scheme = getColors();

  return (
    <View style={[styles.card, { borderColor: scheme.borderColor }]}>
      <View style={styles.topRow}>
        <View style={[styles.iconWrapper, { backgroundColor: scheme.bgColor }]}>
          <Ionicons name={icon} size={18} color={scheme.iconColor} />
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <Text style={[styles.amount, { color: scheme.textColor }]} numberOfLines={1}>
        {formatCurrency(amount)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    minWidth: '47%',
    flex: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
