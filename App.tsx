import React, { useState } from 'react';
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

export default function App() {
  const [splashDone, setSplashDone] = useState(true);

  return (
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
  );
}
