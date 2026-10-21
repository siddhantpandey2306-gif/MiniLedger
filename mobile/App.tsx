import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { OtpScreen } from './src/screens/OtpScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { colors } from './src/theme/colors';

const MainNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [authStep, setAuthStep] = useState<'login' | 'otp'>('login');
  const [pendingPhone, setPendingPhone] = useState<string>('');

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    if (authStep === 'otp') {
      return (
        <OtpScreen
          phoneNumber={pendingPhone}
          onBackToLogin={() => setAuthStep('login')}
        />
      );
    }

    return (
      <LoginScreen
        onOtpRequested={(phone) => {
          setPendingPhone(phone);
          setAuthStep('otp');
        }}
      />
    );
  }

  return <DashboardScreen />;
};

export default function App() {
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <AuthProvider>
        <MainNavigator />
      </AuthProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
