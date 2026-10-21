import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { ApiService, ApiError } from '../services/api.service';
import { NetworkConfigModal } from '../components/NetworkConfigModal';
import { useAuth } from '../context/AuthContext';

interface LoginScreenProps {
  onOtpRequested: (phone: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onOtpRequested }) => {
  const { currentBaseUrl } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState<string>('+919876543210');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  const phoneRegex = /^\+?[1-9]\d{7,14}$/;

  const validatePhone = (val: string): boolean => {
    return phoneRegex.test(val.trim());
  };

  const handleRequestOtp = async () => {
    Keyboard.dismiss();
    setErrorMessage(null);

    const trimmed = phoneNumber.trim();
    if (!trimmed) {
      setErrorMessage('Phone number is required');
      return;
    }

    if (!validatePhone(trimmed)) {
      setErrorMessage('Please enter a valid phone number (8-15 digits with optional leading +)');
      return;
    }

    // Prevent duplicate submission
    if (isLoading) return;

    setIsLoading(true);
    try {
      await ApiService.requestOtp(trimmed);
      onOtpRequested(trimmed);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to send verification code. Please check your network.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Top Bar with Server Connection status/modal trigger */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.serverBadge}
              onPress={() => setIsConfigOpen(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="wifi" size={14} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.serverBadgeText} numberOfLines={1}>
                {currentBaseUrl.replace('http://', '').replace('/api', '')}
              </Text>
              <Ionicons name="settings-outline" size={13} color={colors.textSecondary} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>

          {/* App Branding & Logo */}
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Ionicons name="wallet-outline" size={36} color={colors.primary} />
            </View>
            <Text style={styles.brandTitle}>MiniLedger</Text>
            <Text style={styles.brandSubtitle}>
              Personal loan tracking for you & your friends
            </Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Welcome Back</Text>
            <Text style={styles.cardSubtext}>
              Sign in with your phone number to manage your shared loans and summaries.
            </Text>

            {/* Error Message Banner */}
            {errorMessage && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.overdue} style={styles.errorIcon} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Phone Number Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mobile Phone Number</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="+919876543210"
                  placeholderTextColor={colors.textMuted}
                  value={phoneNumber}
                  onChangeText={(val) => {
                    setPhoneNumber(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
              <Text style={styles.inputHint}>Format: +91 followed by 10 digits (e.g. +919876543210)</Text>
            </View>

            {/* Notice about Mock OTP */}
            <View style={styles.mockNoticeBox}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={styles.mockNoticeText}>
                <Text style={{ fontWeight: '700' }}>Development Mode:</Text> The 6-digit OTP code is logged directly to your backend server terminal.
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleRequestOtp}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.buttonInner}>
                  <ActivityIndicator size="small" color={colors.textInverse} style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Sending OTP...</Text>
                </View>
              ) : (
                <View style={styles.buttonInner}>
                  <Text style={styles.submitButtonText}>Send Verification Code</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.textInverse} style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Network Config Modal */}
        <NetworkConfigModal visible={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
    paddingTop: 12,
  },
  serverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serverBadgeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    maxWidth: 160,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overdueLight,
    borderWidth: 1,
    borderColor: colors.overdueBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: colors.overdue,
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  inputHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
  },
  mockNoticeBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 20,
  },
  mockNoticeText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 17,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
});
