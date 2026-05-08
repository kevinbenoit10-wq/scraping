import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useReceipt } from '../context/ReceiptContext';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: Props) {
  const { reset } = useReceipt();

  function handleScanSplit() {
    reset();
    navigation.navigate('Scan', {});
  }

  function handleTableMode() {
    reset();
    navigation.navigate('Scan', { tableMode: true });
  }

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.iconWrapper}>
            <Text style={styles.icon}>🧾</Text>
          </View>
          <Text style={styles.title}>Splitr</Text>
          <Text style={styles.subtitle}>
            Split any bill fairly among friends
          </Text>

          <TouchableOpacity style={styles.primaryButton} onPress={handleScanSplit} activeOpacity={0.85}>
            <Text style={styles.buttonIcon}>📸</Text>
            <View style={styles.buttonTextBlock}>
              <Text style={styles.primaryButtonTitle}>Scan & Split</Text>
              <Text style={styles.primaryButtonSub}>You assign items for everyone</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleTableMode} activeOpacity={0.85}>
            <Text style={styles.buttonIcon}>🍽️</Text>
            <View style={styles.buttonTextBlock}>
              <Text style={styles.secondaryButtonTitle}>Table Mode</Text>
              <Text style={styles.secondaryButtonSub}>Everyone claims their own items</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => navigation.navigate('History')}
            activeOpacity={0.75}
          >
            <Text style={styles.historyButtonText}>📋  History</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  iconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  icon: { fontSize: 46 },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    marginBottom: 32,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  buttonIcon: { fontSize: 32 },
  buttonTextBlock: { flex: 1 },
  primaryButtonTitle: { fontSize: 17, fontWeight: '700', color: '#764ba2' },
  primaryButtonSub: { fontSize: 12, color: '#aaa', marginTop: 2 },
  secondaryButtonTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  secondaryButtonSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  historyButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  historyButtonText: { color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: '600' },
});
