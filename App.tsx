import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { usePreventScreenCapture } from 'expo-screen-capture';

import { ReceiptProvider, useReceipt } from './src/context/ReceiptContext';
import HomeScreen from './src/screens/HomeScreen';
import ScanScreen from './src/screens/ScanScreen';
import ClaimScreen from './src/screens/ClaimScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import { RootStackParamList } from './src/types';
import { runSecurityCheck } from './src/services/securityCheck';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Clear receipt data after 15 minutes in the background
const SESSION_TIMEOUT_MS = 15 * 60 * 1000;

function AppContent() {
  usePreventScreenCapture();

  const { reset } = useReceipt();
  const [locked, setLocked] = useState(false);
  const [securityBlocked, setSecurityBlocked] = useState(false);
  const [booting, setBooting] = useState(true);
  const backgroundedAt = useRef<number | null>(null);

  async function authenticate() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !enrolled) {
      setLocked(false);
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Bevestig je identiteit om door te gaan',
      cancelLabel: 'Annuleer',
      disableDeviceFallback: false,
    });

    if (result.success) setLocked(false);
  }

  useEffect(() => {
    async function boot() {
      const security = await runSecurityCheck();
      if (!security.safe) {
        setSecurityBlocked(true);
        setBooting(false);
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHardware && enrolled) {
        setLocked(true);
        await authenticate();
      }
      setBooting(false);
    }
    boot();
  }, []);

  useEffect(() => {
    function handleAppStateChange(nextState: AppStateStatus) {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundedAt.current = Date.now();
      } else if (nextState === 'active') {
        const wentBackground = backgroundedAt.current;
        if (wentBackground && Date.now() - wentBackground > SESSION_TIMEOUT_MS) {
          reset();
        }
        backgroundedAt.current = null;

        // Re-lock when returning from background
        async function recheckBiometrics() {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const enrolled = await LocalAuthentication.isEnrolledAsync();
          if (hasHardware && enrolled) {
            setLocked(true);
            await authenticate();
          }
        }
        recheckBiometrics();
      }
    }

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [reset]);

  if (booting) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  if (securityBlocked) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.blockTitle}>Niet ondersteund</Text>
        <Text style={styles.blockText}>
          Deze app werkt niet op een gejailbreakt of geroot apparaat.
        </Text>
      </SafeAreaView>
    );
  }

  if (locked) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.lockTitle}>Receipt Splitter</Text>
        <Text style={styles.lockSubtitle}>Bevestig je identiteit om door te gaan</Text>
        <TouchableOpacity style={styles.unlockButton} onPress={authenticate}>
          <Text style={styles.unlockButtonText}>Ontgrendelen</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#f8f9ff' },
          headerTintColor: '#667eea',
          headerTitleStyle: { fontWeight: '700' },
          headerBackTitleVisible: false,
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Scan" component={ScanScreen} options={{ title: 'Scan bon' }} />
        <Stack.Screen name="Claim" component={ClaimScreen} options={{ title: 'Items kiezen' }} />
        <Stack.Screen name="Summary" component={SummaryScreen} options={{ title: 'Overzicht' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ReceiptProvider>
        <AppContent />
      </ReceiptProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: '#f8f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  lockTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  unlockButton: {
    backgroundColor: '#667eea',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  unlockButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  blockTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e74c3c',
    marginBottom: 12,
  },
  blockText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});
