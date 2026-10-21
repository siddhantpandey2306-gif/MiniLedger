import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Loan, LoanSummary, LoanFilterStatus } from '../types/api';
import { ApiService, ApiError } from '../services/api.service';
import { useAuth } from '../context/AuthContext';
import { SummaryCard } from '../components/SummaryCard';
import { LoanCard } from '../components/LoanCard';
import { AddLoanModal } from '../components/AddLoanModal';
import { NetworkConfigModal } from '../components/NetworkConfigModal';
import { formatPhoneDisplay } from '../utils/formatters';

export const DashboardScreen: React.FC = () => {
  const { user, logout, currentBaseUrl } = useAuth();

  // Financial & Loan States
  const [summary, setSummary] = useState<LoanSummary>({
    total_lent: 0,
    total_repaid: 0,
    overdue_amount: 0,
    pending_amount: 0,
  });
  const [loans, setLoans] = useState<Loan[]>([]);
  const [activeFilter, setActiveFilter] = useState<LoanFilterStatus>('all');

  // Loading, Refreshing & Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // In-flight per-item repay tracking to prevent duplicate clicks
  const [repayingLoanIds, setRepayingLoanIds] = useState<Record<string, boolean>>({});

  // Modals
  const [isAddLoanOpen, setIsAddLoanOpen] = useState<boolean>(false);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState<boolean>(false);

  // Fetch Dashboard Data from Real Backend
  const loadDashboardData = useCallback(
    async (isPullToRefresh = false) => {
      if (isPullToRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      try {
        // Fetch summary and loans in parallel from the real backend API
        const [summaryRes, loansRes] = await Promise.all([
          ApiService.getSummary(),
          ApiService.getLoans(activeFilter),
        ]);

        if (summaryRes?.data) {
          setSummary(summaryRes.data);
        }
        if (loansRes?.data) {
          setLoans(loansRes.data);
        }
      } catch (err: any) {
        const msg = err instanceof ApiError ? err.message : 'Failed to load dashboard data.';
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeFilter]
  );

  // Reload when filter changes or on mount
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle Mark as Repaid
  const handleRepay = (loan: Loan) => {
    Alert.alert(
      'Mark as Repaid',
      `Confirm that ${loan.friend_name} has repaid this loan of ₹${loan.amount}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Repayment',
          style: 'default',
          onPress: async () => {
            // Prevent duplicate clicks
            if (repayingLoanIds[loan.id]) return;

            setRepayingLoanIds((prev) => ({ ...prev, [loan.id]: true }));
            try {
              await ApiService.repayLoan(loan.id);
              setSuccessToast(`Loan to ${loan.friend_name} marked as repaid!`);
              setTimeout(() => setSuccessToast(null), 3500);

              // Auto-refresh summary and loans list
              await loadDashboardData();
            } catch (err: any) {
              const msg = err instanceof ApiError ? err.message : 'Failed to mark loan as repaid.';
              Alert.alert('Action Failed', msg);
            } finally {
              setRepayingLoanIds((prev) => {
                const updated = { ...prev };
                delete updated[loan.id];
                return updated;
              });
            }
          },
        },
      ]
    );
  };

  // Handle logout with confirmation
  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of MiniLedger?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  // Header Component for FlatList
  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* Top App Header */}
      <View style={styles.topHeader}>
        <View style={styles.userProfile}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.appTitle}>MiniLedger</Text>
            <Text style={styles.userPhone}>
              {user ? formatPhoneDisplay(user.phone_number) : 'Active User'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => setIsNetworkModalOpen(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="wifi" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIconButton, { marginLeft: 8 }]}
            onPress={handleLogout}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.overdue} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Success Notification Banner */}
      {successToast && (
        <View style={styles.toastBox}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} style={{ marginRight: 8 }} />
          <Text style={styles.toastText}>{successToast}</Text>
        </View>
      )}

      {/* Summary Cards Grid */}
      <Text style={styles.sectionHeading}>Financial Overview</Text>
      <View style={styles.summaryGrid}>
        <SummaryCard
          title="Total Lent"
          amount={summary.total_lent}
          type="lent"
          icon="trending-up-outline"
        />
        <SummaryCard
          title="Total Repaid"
          amount={summary.total_repaid}
          type="repaid"
          icon="checkmark-done-circle-outline"
        />
      </View>

      <View style={styles.summaryGrid}>
        <SummaryCard
          title="Overdue Amount"
          amount={summary.overdue_amount}
          type="overdue"
          icon="alert-circle-outline"
        />
        <SummaryCard
          title="Pending Amount"
          amount={summary.pending_amount}
          type="pending"
          icon="time-outline"
        />
      </View>

      {/* Section Title & Add Button */}
      <View style={styles.loansSectionHeader}>
        <View>
          <Text style={styles.sectionHeading}>Loan Entries</Text>
          <Text style={styles.sectionSubheading}>
            {loans.length} {loans.length === 1 ? 'record' : 'records'} found
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addLoanHeaderBtn}
          onPress={() => setIsAddLoanOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color={colors.textInverse} style={{ marginRight: 4 }} />
          <Text style={styles.addLoanHeaderBtnText}>Add Loan</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'pending', 'overdue', 'repaid'] as LoanFilterStatus[]).map((tab) => {
          const isActive = activeFilter === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Error state alert inside header */}
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={20} color={colors.overdue} style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadDashboardData()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Empty List State
  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading loans & metrics...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="file-tray-outline" size={38} color={colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No Loan Entries Found</Text>
        <Text style={styles.emptySubtitle}>
          {activeFilter !== 'all'
            ? `There are no ${activeFilter} loans right now.`
            : 'You have not added any loans yet. Tap "Add Loan" to create your first entry.'}
        </Text>
        <TouchableOpacity
          style={styles.emptyActionBtn}
          onPress={() => setIsAddLoanOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={18} color={colors.textInverse} style={{ marginRight: 6 }} />
          <Text style={styles.emptyActionBtnText}>Add New Loan</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={loans}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LoanCard
            loan={item}
            onRepay={handleRepay}
            isRepaying={!!repayingLoanIds[item.id]}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadDashboardData(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button (FAB) for quick add */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsAddLoanOpen(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      {/* Add Loan Form Modal */}
      <AddLoanModal
        visible={isAddLoanOpen}
        onClose={() => setIsAddLoanOpen(false)}
        onSuccess={async () => {
          setIsAddLoanOpen(false);
          setSuccessToast('New loan entry created successfully!');
          setTimeout(() => setSuccessToast(null), 3500);
          await loadDashboardData();
        }}
      />

      {/* Network Configuration Modal */}
      <NetworkConfigModal
        visible={isNetworkModalOpen}
        onClose={() => {
          setIsNetworkModalOpen(false);
          loadDashboardData();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 90, // Room for FAB
  },
  listHeader: {
    marginBottom: 8,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 16,
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  userPhone: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  toastText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  sectionSubheading: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: -8,
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 2,
  },
  loansSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 8,
  },
  addLoanHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addLoanHeaderBtnText: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.textInverse,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overdueLight,
    borderWidth: 1,
    borderColor: colors.overdueBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    fontSize: 13,
    color: colors.overdue,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: colors.overdue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  retryButtonText: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
  centerContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    maxWidth: 280,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
