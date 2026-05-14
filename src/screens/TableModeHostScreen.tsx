import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, ItemClaim } from '../types';
import { mergeReceipts, expandItemsByQuantity, calculateSummaries } from '../services/receiptParser';
import { C } from '../theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TableModeHost'>;
  route: RouteProp<RootStackParamList, 'TableModeHost'>;
};

type Claims = Record<string, string>;

export default function TableModeHostScreen({ navigation, route }: Props) {
  const { receipts } = route.params;
  const receipt = expandItemsByQuantity(mergeReceipts(receipts));

  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [claims, setClaims] = useState<Claims>({});
  const [participants, setParticipants] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [hostName, setHostName] = useState('');
  const [hostJoined, setHostJoined] = useState(false);
  const socketRef = useRef<any>(null);

  const joinUrl = sessionCode ? `https://splitr.eu/join/${sessionCode}` : '';

  useEffect(() => {
    let socket: any;
    import('socket.io-client').then(({ io }) => {
      socket = io(API_URL, { transports: ['websocket', 'polling'] });
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
    }).catch(() => {
      setConnected(false);
    });

    return () => { socket?.disconnect(); };
  }, []);

  function handleJoinAsHost() {
    if (!hostName.trim() || !sessionCode) return;
    socketRef.current?.emit('join_session', { code: sessionCode, name: hostName.trim() });
    setHostJoined(true);
  }

  function handleClaimItem(itemId: string) {
    if (!hostJoined || !sessionCode) return;
    const name = hostName.trim();
    if (claims[itemId] === name) {
      socketRef.current?.emit('unclaim_item', { code: sessionCode, itemId });
    } else if (!claims[itemId]) {
      socketRef.current?.emit('claim_item', { code: sessionCode, itemId, name });
    }
  }

  function handleFinish() {
    const itemClaims: ItemClaim[] = Object.entries(claims).map(([itemId, personName]) => ({
      itemId,
      personName,
      portionCount: 1,
    }));

    const summaries = calculateSummaries(receipt, itemClaims).map(s => ({
      personName: s.name,
      total: s.total,
      currency: receipt.currency,
      items: s.items.map(({ item, portionCost }) => ({
        name: item.name,
        amount: portionCost,
      })),
    }));

    socketRef.current?.emit('close_session', { code: sessionCode, summaries });
    socketRef.current?.disconnect();

    navigation.reset({
      index: 0,
      routes: [
        { name: 'Home' },
        { name: 'Summary', params: { receipts: [receipt], claims: itemClaims, mode: 'table-mode' } },
      ],
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

        {!hostJoined && (
          <View style={styles.hostNameCard}>
            <Text style={styles.hostNameLabel}>Your name (to claim items too)</Text>
            <TextInput
              style={styles.hostNameInput}
              placeholder="Enter your name..."
              placeholderTextColor="#bbb"
              value={hostName}
              onChangeText={setHostName}
              onSubmitEditing={handleJoinAsHost}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.joinBtn, !hostName.trim() && styles.joinBtnDisabled]}
              onPress={handleJoinAsHost}
              disabled={!hostName.trim()}
              activeOpacity={0.85}
            >
              <Text style={styles.joinBtnText}>Join as host</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.qrCard}>
          <QRCode value={joinUrl} size={200} color="#1a1a2e" backgroundColor="#fff" />
          <Text style={styles.codeLabel}>Session code</Text>
          <Text style={styles.code}>{sessionCode}</Text>
          <Text style={styles.codeHint}>splitr.eu/join/{sessionCode}</Text>
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
            const isMine = claimedBy === hostName.trim() && hostJoined;
            const canClaim = hostJoined && (!claimedBy || isMine);

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.itemRow}
                onPress={() => canClaim && handleClaimItem(item.id)}
                activeOpacity={canClaim ? 0.7 : 1}
              >
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>
                    {receipt.currency} {item.totalPrice.toFixed(2)}
                  </Text>
                </View>
                {isMine ? (
                  <View style={styles.mineBadge}>
                    <Text style={styles.mineText}>✓ Mine</Text>
                  </View>
                ) : claimedBy ? (
                  <View style={styles.claimedBadge}>
                    <Text style={styles.claimedText}>{claimedBy}</Text>
                  </View>
                ) : (
                  <View style={[styles.unclaimedBadge, hostJoined && styles.unclaimedBadgeTappable]}>
                    <Text style={styles.unclaimedText}>{hostJoined ? 'Tap to claim' : 'unclaimed'}</Text>
                  </View>
                )}
              </TouchableOpacity>
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
  safe: { flex: 1, backgroundColor: C.bg },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 15, color: C.textMuted },
  container: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: C.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: C.textMuted, textAlign: 'center', marginBottom: 24 },
  hostNameCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 20,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  hostNameLabel: { fontSize: 13, fontWeight: '600', color: C.textMuted, marginBottom: 10 },
  hostNameInput: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: C.text,
    marginBottom: 12,
    backgroundColor: C.bg,
  },
  joinBtn: {
    backgroundColor: C.primary,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  joinBtnDisabled: { opacity: 0.4 },
  joinBtnText: { color: C.white, fontWeight: '700', fontSize: 15 },
  qrCard: {
    backgroundColor: C.card,
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    width: '100%',
  },
  codeLabel: { fontSize: 11, color: C.textMuted, marginTop: 20, textTransform: 'uppercase', letterSpacing: 1.5 },
  code: { fontSize: 34, fontWeight: '800', color: C.primary, letterSpacing: 8, marginTop: 6 },
  codeHint: { fontSize: 12, color: C.textMuted, marginTop: 4 },
  progressCard: {
    backgroundColor: C.primary,
    borderRadius: 14,
    padding: 16,
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  progressText: { fontSize: 16, fontWeight: '700', color: C.white },
  participantsText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  itemsSection: { width: '100%', marginBottom: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: C.text },
  itemPrice: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  mineBadge: { backgroundColor: C.primaryLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  mineText: { fontSize: 13, fontWeight: '600', color: C.primary },
  claimedBadge: { backgroundColor: C.successLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  claimedText: { fontSize: 13, fontWeight: '600', color: C.success },
  unclaimedBadge: { backgroundColor: C.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  unclaimedBadgeTappable: { backgroundColor: C.primaryLight },
  unclaimedText: { fontSize: 13, color: C.textMuted },
  finishButton: {
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
  finishButtonWarning: { backgroundColor: C.warning },
  finishButtonText: { color: C.white, fontSize: 17, fontWeight: '700' },
});
