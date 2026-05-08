import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, Receipt } from '../types';
import { parseReceiptImage } from '../services/receiptParser';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Scan'>;
  route: RouteProp<RootStackParamList, 'Scan'>;
};

export default function ScanScreen({ navigation, route }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scannedTickets, setScannedTickets] = useState<{ receipt: Receipt; imageUri: string }[]>([]);

  async function pickFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera access is needed to scan a receipt.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.4,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
    }
  }

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Gallery access is needed to import a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.4,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
    }
  }

  async function analyzeReceipt() {
    if (!imageBase64 || !imageUri) return;
    setLoading(true);
    try {
      const receipt = await parseReceiptImage(imageBase64);
      setScannedTickets((prev) => [...prev, { receipt, imageUri }]);
      setImageUri(null);
      setImageBase64(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Scan failed', msg);
    } finally {
      setLoading(false);
    }
  }

  function removeTicket(index: number) {
    setScannedTickets((prev) => prev.filter((_, i) => i !== index));
  }

  function handleContinue() {
    const receipts = scannedTickets.map((t) => t.receipt);
    if (route.params?.tableMode) {
      navigation.navigate('TableModeHost', { receipts });
    } else {
      navigation.navigate('Claim', { receipts });
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Scan your receipt</Text>
        <Text style={styles.subtitle}>
          Scan one or more receipts. Each ticket will be shown separately.
        </Text>

        {scannedTickets.length > 0 && (
          <View style={styles.ticketsSection}>
            <Text style={styles.sectionLabel}>Scanned receipts ({scannedTickets.length})</Text>
            {scannedTickets.map((ticket, index) => (
              <View key={index} style={styles.ticketRow}>
                <Image source={{ uri: ticket.imageUri }} style={styles.ticketThumb} />
                <View style={styles.ticketInfo}>
                  <Text style={styles.ticketTitle}>Receipt {index + 1}</Text>
                  <Text style={styles.ticketMeta}>
                    {ticket.receipt.items.length} items • {ticket.receipt.currency} {ticket.receipt.total.toFixed(2)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeTicket(index)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {imageUri ? (
          <View style={styles.previewWrapper}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={() => { setImageUri(null); setImageBase64(null); }}
            >
              <Text style={styles.retakeText}>Different photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.placeholderWrapper}>
            <Text style={styles.placeholderIcon}>📄</Text>
            <Text style={styles.placeholderText}>
              {scannedTickets.length > 0 ? 'Add another receipt?' : 'No photo selected yet'}
            </Text>
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.sourceButton, styles.cameraButton]} onPress={pickFromCamera} activeOpacity={0.85}>
            <Text style={styles.sourceIcon}>📷</Text>
            <Text style={styles.sourceButtonText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.sourceButton, styles.galleryButton]} onPress={pickFromGallery} activeOpacity={0.85}>
            <Text style={styles.sourceIcon}>🖼️</Text>
            <Text style={styles.sourceButtonText}>Gallery</Text>
          </TouchableOpacity>
        </View>

        {imageUri && (
          <TouchableOpacity
            style={[styles.analyzeButton, loading && styles.analyzeButtonDisabled]}
            onPress={analyzeReceipt}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={[styles.analyzeButtonText, { marginLeft: 10 }]}>
                  Analyzing receipt...
                </Text>
              </View>
            ) : (
              <Text style={styles.analyzeButtonText}>Analyze receipt ✨</Text>
            )}
          </TouchableOpacity>
        )}

        {scannedTickets.length > 0 && !imageUri && (
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.85}>
            <Text style={styles.continueButtonText}>
              Continue with {scannedTickets.length} receipt{scannedTickets.length > 1 ? 's' : ''} →
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9ff' },
  container: { padding: 24, alignItems: 'center' },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  ticketsSection: {
    width: '100%',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  ticketThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  ticketInfo: { flex: 1, marginLeft: 12 },
  ticketTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  ticketMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: '#e74c3c', fontSize: 12, fontWeight: '700' },
  placeholderWrapper: {
    width: '100%',
    height: 180,
    backgroundColor: '#e8eaf6',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#c5cae9',
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  placeholderIcon: { fontSize: 40, marginBottom: 8 },
  placeholderText: { fontSize: 14, color: '#9e9e9e' },
  previewWrapper: { width: '100%', marginBottom: 20, borderRadius: 20, overflow: 'hidden' },
  preview: { width: '100%', height: 260, backgroundColor: '#eee', borderRadius: 20 },
  retakeButton: {
    marginTop: 10,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#e8eaf6',
    borderRadius: 20,
  },
  retakeText: { color: '#5c6bc0', fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 20, width: '100%' },
  sourceButton: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  cameraButton: { backgroundColor: '#667eea' },
  galleryButton: { backgroundColor: '#764ba2' },
  sourceIcon: { fontSize: 26, marginBottom: 4 },
  sourceButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  analyzeButton: {
    backgroundColor: '#5c6bc0',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#5c6bc0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 12,
  },
  analyzeButtonDisabled: { opacity: 0.7 },
  analyzeButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  continueButton: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
