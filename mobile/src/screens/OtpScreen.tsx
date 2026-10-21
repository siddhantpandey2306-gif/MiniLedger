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
import { useAuth } from '../context/AuthContext';
import { formatPhoneDisplay } from '../utils/formatters';

interface OtpScreenProps {
  phoneNumber: string;
  onBackToLogin: () => void;
}

export const OtpScreen: React.FC<OtpScreenProps> = ({ phoneNumber, onBackToLogin }) => {
  const { login } = useAuth();
  const [otpCode, setOtpCode] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendSuccessMessage, setResendSuccessMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);

  const handleVerifyOtp = async () => {
    Keyboard.dismiss();
    setErrorMessage(null);
    setResendSuccessMessage(null);

    const cleanOtp = otpCode.trim();
    if (!cleanOtp) {
      setErrorMessage('Verification code is required');
      return;
    }

    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage('Verification code must be exactly 6 digits');
      return;
    }

    if (isVerifying) return;

    setIsVerifying(true);
    try {
      const response = await ApiService.verifyOtp(phoneNumber, cleanOtp);
      await login(response.token, response.user);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Verification failed. Please check the code and try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (isResending) return;
    setIsResending(true);
    setErrorMessage(null);
    setResendSuccessMessage(null);

    try {
      await ApiService.requestOtp(phoneNumber);
      setResendSuccessMessage('A new verification code has been generated. Check server terminal logs.');
      setOtpCode('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Back Button */}
          <View style={styles.topNav}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBackToLogin}
              disabled={isVerifying}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.backButtonText}>Change Number</Text>
            </TouchableOpacity>
          </View>

          {/* Header & Verification Info */}
          <View style={styles.headerContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark-outline" size={36} color={colors.primary} />
            </View>
            <Text style={styles.title}>Enter 6-Digit Code</Text>
            <Text style={styles.subtitle}>
              We sent a verification code to{' '}
              <Text style={styles.phoneHighlight}>{formatPhoneDisplay(phoneNumber)}</Text>
            </Text>
          </View>

          {/* Verification Card */}
          <View style={styles.card}>
            {/* Error Message */}
            {errorMessage && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.overdue} style={styles.alertIcon} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Resend Success Message */}
            {resendSuccessMessage && (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} style={styles.alertIcon} />
                <Text style={styles.successText}>{resendSuccessMessage}</Text>
              </View>
            )}

            {/* OTP Input Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Security Code</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="• • • • • •"
                placeholderTextColor={colors.textMuted}
                value={otpCode}
                onChangeText={(val) => {
                  setOtpCode(val.replace(/\D/g, ''));
                  if (errorMessage) setErrorMessage(null);
                }}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                editable={!isVerifying}
              />
            </View>

            {/* Mock Helper reminder */}
            <View style={styles.hintBox}>
              <Ionicons name="terminal-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.hintText}>
                Check the backend console output for the 6-digit code.
              </Text>
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[styles.verifyButton, isVerifying && styles.buttonDisabled]}
              onPress={handleVerifyOtp}
              disabled={isVerifying}
              activeOpacity={0.8}
            >
              {isVerifying ? (
                <View style={styles.buttonRow}>
                  <ActivityIndicator size="small" color={colors.textInverse} style={{ marginRight: 8 }} />
                  <Text style={styles.verifyButtonText}>Verifying...</Text>
                </View>
              ) : (
                <View style={styles.buttonRow}>
                  <Text style={styles.verifyButtonText}>Verify & Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.textInverse} style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>

            {/* Resend Action */}
            <View style={styles.resendRow}>
              <Text style={styles.resendPrompt}>Didn't receive code? </Text>
              <TouchableOpacity
                onPress={handleResendOtp}
                disabled={isResending || isVerifying}
                activeOpacity={0.7}
              >
                {isResending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.resendAction}>Resend OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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
  topNav: {
    paddingTop: 12,
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.surfaceSubtle,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 16,
  },
  phoneHighlight: {
    fontWeight: '700',
    color: colors.textPrimary,
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
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  alertIcon: {
    marginRight: 8,
  },
  errorText: {
    color: colors.overdue,
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  successText: {
    color: colors.success,
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  otpInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.borderFocus,
    borderRadius: 14,
    height: 56,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 10,
    color: colors.textPrimary,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  hintText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  verifyButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifyButtonText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendPrompt: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  resendAction: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
