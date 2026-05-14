import React, { useState, Component } from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ReceiptProvider } from './src/context/ReceiptContext';
import HomeScreen from './src/screens/HomeScreen';
import ScanScreen from './src/screens/ScanScreen';
import ClaimScreen from './src/screens/ClaimScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import TableModeHostScreen from './src/screens/TableModeHostScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SplashAnimation from './src/components/SplashAnimation';
import { RootStackParamList } from './src/types';
import { C } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 16, color: '#333', textAlign: 'center' }}>{this.state.error}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <ErrorBoundary>
    <SafeAreaProvider>
      <ReceiptProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.primary,
              headerTitleStyle: { fontWeight: '700', color: C.text },
              headerBackTitleVisible: false,
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
