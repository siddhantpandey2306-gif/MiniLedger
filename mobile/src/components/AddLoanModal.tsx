import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { ApiService, ApiError } from '../services/api.service';
import { CreateLoanPayload } from '../types/api';
import { validateLoanForm } from '../utils/validation';

interface AddLoanModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddLoanModal: React.FC<AddLoanModalProps> = ({ visible, onClose, onSuccess }) => {
  const [friendName, setFriendName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Quick helper to calculate future dates in YYYY-MM-DD
  const setQuickDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    setDueDate(dateStr);
    setFieldErrors((prev) => ({ ...prev, dueDate: '' }));
  };

  const validateForm = (): boolean => {
    const result = validateLoanForm(friendName, amount, dueDate, notes);
    setFieldErrors(result.errors);
    return result.isValid;
  };

  const handleSubmit = async () => {
    setServerError(null);
    if (!validateForm()) {
      return;
    }

    // Prevent duplicate submission
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload: CreateLoanPayload = {
        friend_name: friendName.trim(),
        amount: parseFloat(amount.trim()),
        due_date: dueDate.trim(),
        notes: notes.trim() ? notes.trim() : null,
      };

      await ApiService.createLoan(payload);

      // Reset form and notify parent
      setFriendName('');
      setAmount('');
      setDueDate('');
      setNotes('');
      setFieldErrors({});
      onSuccess();
    } catch (err: any) {
      if (err instanceof ApiError && err.details && err.details.length > 0) {
        const backendFieldErrors: Record<string, string> = {};
        err.details.forEach((issue) => {
          backendFieldErrors[issue.field] = issue.message;
        });
        setFieldErrors(backendFieldErrors);
        setServerError(err.message);
      } else {
        setServerError(err.message || 'Failed to create loan. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setServerError(null);
      setFieldErrors({});
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.headerIcon}>
                <Ionicons name="add-circle" size={20} color={colors.primary} />
              </View>
              <Text style={styles.title}>New Loan Entry</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              disabled={isSubmitting}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
            {/* Server Error Banner */}
            {serverError && (
              <View style={styles.serverErrorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.overdue} style={{ marginRight: 8 }} />
                <Text style={styles.serverErrorText}>{serverError}</Text>
              </View>
            )}

            {/* Friend Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Friend Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, fieldErrors.friendName ? styles.inputError : null]}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor={colors.textMuted}
                value={friendName}
                onChangeText={(text) => {
                  setFriendName(text);
                  if (fieldErrors.friendName) {
                    setFieldErrors((prev) => ({ ...prev, friendName: '' }));
                  }
                }}
                maxLength={100}
                editable={!isSubmitting}
              />
              {fieldErrors.friendName && (
                <Text style={styles.errorText}>{fieldErrors.friendName}</Text>
              )}
            </View>

            {/* Amount */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Amount (₹) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, fieldErrors.amount ? styles.inputError : null]}
                placeholder="e.g. 5000"
                placeholderTextColor={colors.textMuted}
                value={amount}
                onChangeText={(text) => {
                  setAmount(text);
                  if (fieldErrors.amount) {
                    setFieldErrors((prev) => ({ ...prev, amount: '' }));
                  }
                }}
                keyboardType="decimal-pad"
                editable={!isSubmitting}
              />
              {fieldErrors.amount && <Text style={styles.errorText}>{fieldErrors.amount}</Text>}
            </View>

            {/* Due Date & Quick Picker Chips */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Due Date (YYYY-MM-DD) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, fieldErrors.dueDate ? styles.inputError : null]}
                placeholder="2026-11-15"
                placeholderTextColor={colors.textMuted}
                value={dueDate}
                onChangeText={(text) => {
                  setDueDate(text);
                  if (fieldErrors.dueDate) {
                    setFieldErrors((prev) => ({ ...prev, dueDate: '' }));
                  }
                }}
                maxLength={10}
                editable={!isSubmitting}
              />
              {fieldErrors.dueDate && <Text style={styles.errorText}>{fieldErrors.dueDate}</Text>}

              {/* Quick Preset Date Chips */}
              <View style={styles.chipsContainer}>
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => setQuickDate(7)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.chipText}>+7 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => setQuickDate(14)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.chipText}>+14 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => setQuickDate(30)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.chipText}>+30 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => setQuickDate(1)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.chipText}>Tomorrow</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Notes */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea, fieldErrors.notes ? styles.inputError : null]}
                placeholder="Reason or reminder notes (e.g. concert ticket share)"
                placeholderTextColor={colors.textMuted}
                value={notes}
                onChangeText={(text) => {
                  setNotes(text);
                  if (fieldErrors.notes) {
                    setFieldErrors((prev) => ({ ...prev, notes: '' }));
                  }
                }}
                multiline
                numberOfLines={3}
                maxLength={500}
                editable={!isSubmitting}
              />
              {fieldErrors.notes && <Text style={styles.errorText}>{fieldErrors.notes}</Text>}
            </View>
          </ScrollView>

          {/* Footer Submit Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <View style={styles.submittingRow}>
                  <ActivityIndicator size="small" color={colors.textInverse} style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Saving...</Text>
                </View>
              ) : (
                <View style={styles.submittingRow}>
                  <Ionicons name="checkmark-sharp" size={18} color={colors.textInverse} style={{ marginRight: 6 }} />
                  <Text style={styles.submitButtonText}>Save Loan</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  formContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  serverErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overdueLight,
    borderWidth: 1,
    borderColor: colors.overdueBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  serverErrorText: {
    color: colors.overdue,
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  required: {
    color: colors.overdue,
  },
  input: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: colors.overdue,
    backgroundColor: '#FFFBFB',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: colors.overdue,
    marginTop: 4,
    fontWeight: '500',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
