import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { ReceiptProvider } from './src/context/ReceiptContext';
import HomeScreen from './src/screens/HomeScreen';
import ScanScreen from './src/screens/ScanScreen';
import ClaimScreen from './src/screens/ClaimScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import { RootStackParamList } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <ReceiptProvider>
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
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Scan"
            component={ScanScreen}
            options={{ title: 'Scan bon' }}
          />
          <Stack.Screen
            name="Claim"
            component={ClaimScreen}
            options={{ title: 'Items kiezen' }}
          />
          <Stack.Screen
            name="Summary"
            component={SummaryScreen}
            options={{ title: 'Overzicht' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ReceiptProvider>
  );
}
