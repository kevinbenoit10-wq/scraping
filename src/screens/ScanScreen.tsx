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
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, Receipt } from '../types';
import { parseReceiptImage } from '../services/receiptParser';
import { C } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Scan'>;
  route: RouteProp<RootStackParamList, 'Scan'>;
};

export default function ScanScreen({ navigation, route }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scannedTickets, setScannedTickets] = useState<{ receipt: Receipt; imageUri: string }[]>([]);

  function pickFromCamera() {
    launchCamera({ mediaType: 'photo', quality: 0.4, includeBase64: true }, (response) => {
      if (!response.didCancel && !response.errorCode && response.assets?.[0]) {
        setImageUri(response.assets[0].uri ?? null);
        setImageBase64(response.assets[0].base64 ?? null);
      }
    });
  }

  function pickFromGallery() {
    launchImageLibrary({ mediaType: 'photo', quality: 0.4, includeBase64: true }, (response) => {
      if (!response.didCancel && !response.errorCode && response.assets?.[0]) {
        setImageUri(response.assets[0].uri ?? null);
        setImageBase64(response.assets[0].base64 ?? null);
      }
    });
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
                    {ticket.receipt.items.length} items · {ticket.receipt.currency} {ticket.receipt.total.toFixed(2)}
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
            <Text style={styles.placeholderText}>
              {scannedTickets.length > 0 ? 'Add another receipt?' : 'No photo selected yet'}
            </Text>
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.sourceButton, styles.cameraButton]} onPress={pickFromCamera} activeOpacity={0.85}>
            <Text style={styles.sourceButtonText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.sourceButton, styles.galleryButton]} onPress={pickFromGallery} activeOpacity={0.85}>
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
              <Text style={styles.analyzeButtonText}>Analyze receipt</Text>
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
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: 24, alignItems: 'center' },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: C.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  ticketsSection: { width: '100%', marginBottom: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  ticketThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: C.border,
  },
  ticketInfo: { flex: 1, marginLeft: 12 },
  ticketTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  ticketMeta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: C.error, fontSize: 12, fontWeight: '700' },
  placeholderWrapper: {
    width: '100%',
    height: 160,
    backgroundColor: C.card,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.border,
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  placeholderText: { fontSize: 14, color: C.textMuted },
  previewWrapper: { width: '100%', marginBottom: 20, borderRadius: 20, overflow: 'hidden' },
  preview: { width: '100%', height: 260, backgroundColor: C.border, borderRadius: 20 },
  retakeButton: {
    marginTop: 10,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: C.primaryLight,
    borderRadius: 20,
  },
  retakeText: { color: C.primary, fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 20, width: '100%' },
  sourceButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  cameraButton: { backgroundColor: C.primary },
  galleryButton: { backgroundColor: C.primaryDark },
  sourceButtonText: { color: C.white, fontWeight: '600', fontSize: 15 },
  analyzeButton: {
    backgroundColor: C.primary,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 12,
  },
  analyzeButtonDisabled: { opacity: 0.6 },
  analyzeButtonText: { color: C.white, fontSize: 17, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  continueButton: {
    backgroundColor: C.primary,
    paddingVertical: 16,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonText: { color: C.white, fontSize: 17, fontWeight: '700' },
});
