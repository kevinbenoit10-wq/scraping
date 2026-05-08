import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useReceipt } from '../context/ReceiptContext';
import { C } from '../theme';

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
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.title}>splitr</Text>
        <Text style={styles.subtitle}>Split any bill fairly among friends</Text>

        <TouchableOpacity style={styles.primaryButton} onPress={handleScanSplit} activeOpacity={0.85}>
          <View style={styles.buttonTextBlock}>
            <Text style={styles.primaryButtonTitle}>Scan & Split</Text>
            <Text style={styles.primaryButtonSub}>You assign items for everyone</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleTableMode} activeOpacity={0.85}>
          <View style={styles.buttonTextBlock}>
            <Text style={styles.secondaryButtonTitle}>Table Mode</Text>
            <Text style={styles.secondaryButtonSub}>Everyone claims their own items</Text>
          </View>
          <Text style={styles.arrowMuted}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => navigation.navigate('History')}
          activeOpacity={0.75}
        >
          <Text style={styles.historyButtonText}>History</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 22,
    marginBottom: 16,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: C.primary,
    marginBottom: 6,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    color: C.textMuted,
    textAlign: 'center',
    marginBottom: 44,
  },
  primaryButton: {
    backgroundColor: C.primary,
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  secondaryButton: {
    backgroundColor: C.card,
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 36,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  buttonTextBlock: { flex: 1 },
  primaryButtonTitle: { fontSize: 17, fontWeight: '700', color: C.white },
  primaryButtonSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  secondaryButtonTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  secondaryButtonSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  arrow: { fontSize: 20, color: C.white, fontWeight: '600' },
  arrowMuted: { fontSize: 20, color: C.textMuted, fontWeight: '600' },
  historyButton: { paddingVertical: 10, paddingHorizontal: 24 },
  historyButtonText: { color: C.textMuted, fontSize: 15, fontWeight: '600' },
});
