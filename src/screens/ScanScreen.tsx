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
import { RootStackParamList } from '../types';
import { parseReceiptImage } from '../services/receiptParser';
import { useReceipt } from '../context/ReceiptContext';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Scan'>;
};

export default function ScanScreen({ navigation }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setReceipt } = useReceipt();

  async function pickFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Toestemming nodig', 'Camera toegang is nodig om een bon te scannen.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.8,
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
      Alert.alert('Toestemming nodig', 'Galerij toegang is nodig om een foto te importeren.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
    }
  }

  async function analyzeReceipt() {
    if (!imageBase64) return;
    setLoading(true);
    try {
      const receipt = await parseReceiptImage(imageBase64);
      setReceipt(receipt);
      navigation.navigate('Claim', { receipt });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Fout bij scannen', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Scan je bon</Text>
        <Text style={styles.subtitle}>
          Maak een foto van je bon of kies een foto uit je galerij
        </Text>

        {imageUri ? (
          <View style={styles.previewWrapper}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
            <TouchableOpacity style={styles.retakeButton} onPress={() => { setImageUri(null); setImageBase64(null); }}>
              <Text style={styles.retakeText}>Andere foto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.placeholderWrapper}>
            <Text style={styles.placeholderIcon}>📄</Text>
            <Text style={styles.placeholderText}>Nog geen foto geselecteerd</Text>
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.sourceButton, styles.cameraButton]} onPress={pickFromCamera} activeOpacity={0.85}>
            <Text style={styles.sourceIcon}>📷</Text>
            <Text style={styles.sourceButtonText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.sourceButton, styles.galleryButton]} onPress={pickFromGallery} activeOpacity={0.85}>
            <Text style={styles.sourceIcon}>🖼️</Text>
            <Text style={styles.sourceButtonText}>Galerij</Text>
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
                  Bon analyseren...
                </Text>
              </View>
            ) : (
              <Text style={styles.analyzeButtonText}>Analyseer bon ✨</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  container: {
    padding: 24,
    alignItems: 'center',
  },
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
    marginBottom: 28,
  },
  placeholderWrapper: {
    width: '100%',
    height: 220,
    backgroundColor: '#e8eaf6',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#c5cae9',
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  placeholderText: {
    fontSize: 15,
    color: '#9e9e9e',
  },
  previewWrapper: {
    width: '100%',
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  preview: {
    width: '100%',
    height: 300,
    backgroundColor: '#eee',
    borderRadius: 20,
  },
  retakeButton: {
    marginTop: 10,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#e8eaf6',
    borderRadius: 20,
  },
  retakeText: {
    color: '#5c6bc0',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    width: '100%',
  },
  sourceButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  cameraButton: {
    backgroundColor: '#667eea',
  },
  galleryButton: {
    backgroundColor: '#764ba2',
  },
  sourceIcon: {
    fontSize: 26,
    marginBottom: 4,
  },
  sourceButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
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
  },
  analyzeButtonDisabled: {
    opacity: 0.7,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
