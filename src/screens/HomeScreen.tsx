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

  function handleStart() {
    reset();
    navigation.navigate('Scan');
  }

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.iconWrapper}>
            <Text style={styles.icon}>🧾</Text>
          </View>
          <Text style={styles.title}>Receipt Splitter</Text>
          <Text style={styles.subtitle}>
            Scan a receipt and split the bill fairly among friends
          </Text>

          <TouchableOpacity style={styles.button} onPress={handleStart} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Scan Receipt</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 52,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
  },
  button: {
    backgroundColor: '#fff',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#764ba2',
  },
});
