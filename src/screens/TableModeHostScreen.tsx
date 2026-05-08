import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { io, Socket } from 'socket.io-client';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, ItemClaim } from '../types';
import { mergeReceipts } from '../services/receiptParser';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TableModeHost'>;
  route: RouteProp<RootStackParamList, 'TableModeHost'>;
};

type Claims = Record<string, string>; // itemId → personName

export default function TableModeHostScreen({ navigation, route }: Props) {
  const { receipts } = route.params;
  const receipt = mergeReceipts(receipts);

  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [claims, setClaims] = useState<Claims>({});
  const [participants, setParticipants] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const joinUrl = sessionCode ? `${API_URL}/join/${sessionCode}` : '';

  useEffect(() => {
    const socket = io(API_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('create_session', { items: receipt.items });
    });

    socket.on('session_created', ({ code }: { code: string }) => {
      setSessionCode(code);
    });

    socket.on('session_update', ({
      claims: newClaims,
      participants: newParticipants,
    }: { claims: Claims; participants: string[] }) => {
      setClaims(newClaims);
      setParticipants(newParticipants);
    });

    socket.on('disconnect', () => setConnected(false));

    return () => { socket.disconnect(); };
  }, []);

  function handleFinish() {
    const itemClaims: ItemClaim[] = Object.entries(claims).map(([itemId, personName]) => ({
      itemId,
      personName,
      portionCount: 1,
    }));

    socketRef.current?.emit('close_session', { code: sessionCode });
    socketRef.current?.disconnect();

    navigation.navigate('Summary', {
      receipts,
      claims: itemClaims,
      mode: 'table-mode',
    });
  }

  const claimedCount = Object.keys(claims).length;
  const totalItems = receipt.items.length;
  const allClaimed = claimedCount === totalItems;

  if (!connected || !sessionCode) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Creating session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Table Mode</Text>
        <Text style={styles.subtitle}>
          Everyone scans the QR to claim their items
        </Text>

        <View style={styles.qrCard}>
          <QRCode value={joinUrl} size={200} color="#1a1a2e" backgroundColor="#fff" />
          <Text style={styles.codeLabel}>Session code</Text>
          <Text style={styles.code}>{sessionCode}</Text>
          <Text style={styles.codeHint}>api.splitr.eu/join/{sessionCode}</Text>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.progressText}>
            {claimedCount}/{totalItems} items claimed
          </Text>
          {participants.length > 0 && (
            <Text style={styles.participantsText}>
              {participants.join(', ')} joined
            </Text>
          )}
        </View>

        <View style={styles.itemsSection}>
          <Text style={styles.sectionLabel}>Items</Text>
          {receipt.items.map(item => {
            const claimedBy = claims[item.id];
            return (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>
                    {receipt.currency} {item.totalPrice.toFixed(2)}
                  </Text>
                </View>
                {claimedBy ? (
                  <View style={styles.claimedBadge}>
                    <Text style={styles.claimedText}>{claimedBy}</Text>
                  </View>
                ) : (
                  <View style={styles.unclaimedBadge}>
                    <Text style={styles.unclaimedText}>unclaimed</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.finishButton, !allClaimed && styles.finishButtonWarning]}
          onPress={() => {
            if (!allClaimed) {
              Alert.alert(
                'Not all items claimed',
                `${totalItems - claimedCount} item(s) still unclaimed. Finish anyway?`,
                [
                  { text: 'Wait', style: 'cancel' },
                  { text: 'Finish', onPress: handleFinish },
                ]
              );
            } else {
              handleFinish();
            }
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.finishButtonText}>
            {allClaimed ? 'Finish & see summary →' : `Finish (${totalItems - claimedCount} unclaimed)`}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9ff' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 15, color: '#666' },
  container: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  qrCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    width: '100%',
  },
  codeLabel: {
    fontSize: 11,
    color: '#bbb',
    marginTop: 20,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  code: { fontSize: 36, fontWeight: '800', color: '#667eea', letterSpacing: 8, marginTop: 6 },
  codeHint: { fontSize: 12, color: '#ccc', marginTop: 4 },
  progressCard: {
    backgroundColor: '#667eea',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  progressText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  participantsText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  itemsSection: { width: '100%', marginBottom: 24 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  itemPrice: { fontSize: 13, color: '#888', marginTop: 2 },
  claimedBadge: {
    backgroundColor: '#e8f5e9',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  claimedText: { fontSize: 13, fontWeight: '600', color: '#2ecc71' },
  unclaimedBadge: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  unclaimedText: { fontSize: 13, color: '#ccc' },
  finishButton: {
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
  finishButtonWarning: { backgroundColor: '#e67e22' },
  finishButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
