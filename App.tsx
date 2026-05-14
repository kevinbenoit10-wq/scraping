import React, { useState, Component, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ReceiptProvider } from './src/context/ReceiptContext';
import SplashAnimation from './src/components/SplashAnimation';
import { RootStackParamList } from './src/types';
import { C } from './src/theme';

function lazy(loader: () => Promise<{ default: React.ComponentType<any> }>) {
  return function LazyScreen(props: any) {
    const [Comp, setComp] = React.useState<React.ComponentType<any> | null>(null);
    const [err, setErr] = React.useState<string | null>(null);
    React.useEffect(() => {
      loader()
        .then(m => setComp(() => m.default))
        .catch(e => setErr(e?.message || String(e)));
    }, []);
    if (err) return (
      <View style={{ flex: 1, backgroundColor: '#c0392b', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>{err}</Text>
      </View>
    );
    if (!Comp) return null;
    return <Comp {...props} />;
  };
}

const HomeScreen = lazy(() => import('./src/screens/HomeScreen'));
const ScanScreen = lazy(() => import('./src/screens/ScanScreen'));
const ClaimScreen = lazy(() => import('./src/screens/ClaimScreen'));
const SummaryScreen = lazy(() => import('./src/screens/SummaryScreen'));
const TableModeHostScreen = lazy(() => import('./src/screens/TableModeHostScreen'));
const HistoryScreen = lazy(() => import('./src/screens/HistoryScreen'));

const Stack = createNativeStackNavigator<RootStackParamList>();

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message || 'Unknown error' }; }
  render() {
    if (this.state.error !== null) {
      return (
        <View style={{ flex: 1, backgroundColor: '#c0392b', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 18, color: '#fff', fontWeight: 'bold', marginBottom: 12 }}>Crash caught:</Text>
          <Text style={{ fontSize: 14, color: '#fff', textAlign: 'center' }}>{this.state.error || 'Unknown error'}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);

  useEffect(() => {
    const g = global as any;
    const prev = g.ErrorUtils?.getGlobalHandler?.();
    g.ErrorUtils?.setGlobalHandler?.((error: Error, isFatal: boolean) => {
      if (isFatal) {
        setFatalError(error.message + '\n\n' + (error.stack?.split('\n').slice(0, 10).join('\n') ?? ''));
      } else if (prev) {
        prev(error, isFatal);
      }
    });
    return () => { if (prev) g.ErrorUtils?.setGlobalHandler?.(prev); };
  }, []);

  if (fatalError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1a1a2e', padding: 24, paddingTop: 60 }}>
        <Text style={{ color: '#e74c3c', fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>JS Fatal Error:</Text>
        <ScrollView>
          <Text style={{ color: '#fff', fontSize: 11, fontFamily: 'monospace' }}>{fatalError}</Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <ErrorBoundary>
    <SafeAreaProvider>
      <ReceiptProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerTintColor: C.primary,
              headerTitleStyle: { fontWeight: '700', color: C.text },
              contentStyle: { backgroundColor: C.bg },
            }}
          >
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Scan"
              component={ScanScreen}
              options={{ title: 'Scan receipt' }}
            />
            <Stack.Screen
              name="Claim"
              component={ClaimScreen}
              options={{ title: 'Assign items' }}
            />
            <Stack.Screen
              name="Summary"
              component={SummaryScreen}
              options={{ title: 'Summary' }}
            />
            <Stack.Screen
              name="TableModeHost"
              component={TableModeHostScreen}
              options={{ title: 'Table Mode', headerBackVisible: false }}
            />
            <Stack.Screen
              name="History"
              component={HistoryScreen}
              options={{ title: 'History' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
        {!splashDone && <SplashAnimation onDone={() => setSplashDone(true)} />}
      </ReceiptProvider>
    </SafeAreaProvider>
    </ErrorBoundary>
  );
}
