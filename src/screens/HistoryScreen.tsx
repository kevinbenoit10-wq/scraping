import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, HistoryEntry } from '../types';
import { getHistory, togglePayment, deleteHistoryEntry } from '../services/historyService';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'History'>;
};

export default function HistoryScreen({ navigation }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setHistory(await getHistory());
  }

  useEffect(() => { load(); }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleToggle(entryId: string, personName: string) {
    setHistory(await togglePayment(entryId, personName));
  }

  async function handleDelete(entryId: string) {
    setHistory(await deleteHistoryEntry(entryId));
    if (expanded === entryId) setExpanded(null);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  if (history.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No history yet</Text>
          <Text style={styles.emptySubtitle}>Your past splits will appear here</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>{history.length} split{history.length !== 1 ? 's' : ''}</Text>

        {history.map(entry => {
          const isExpanded = expanded === entry.id;
          const allPaid = entry.payments.every(p => p.paid);
          const unpaidCount = entry.payments.filter(p => !p.paid).length;

          return (
            <View key={entry.id} style={styles.card}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => setExpanded(isExpanded ? null : entry.id)}
                activeOpacity={0.8}
              >
                <View>
                  <Text style={styles.cardMode}>
                    {entry.mode === 'table-mode' ? '🍽️ Table Mode' : '📸 Scan & Split'}
                  </Text>
                  <Text style={styles.cardDate}>{formatDate(entry.date)}</Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.cardTotal}>
                    {entry.currency} {entry.total.toFixed(2)}
                  </Text>
                  {allPaid ? (
                    <View style={styles.allPaidBadge}>
                      <Text style={styles.allPaidText}>All settled ✓</Text>
                    </View>
                  ) : (
                    <View style={styles.unpaidBadge}>
                      <Text style={styles.unpaidText}>{unpaidCount} unpaid</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.cardBody}>
                  {entry.payments.map(payment => (
                    <TouchableOpacity
                      key={payment.personName}
                      style={styles.paymentRow}
                      onPress={() => handleToggle(entry.id, payment.personName)}
                      activeOpacity={0.7}
                    >
                      <View>
                        <Text style={styles.paymentName}>{payment.personName}</Text>
                        <Text style={styles.paymentAmount}>
                          {entry.currency} {payment.amount.toFixed(2)}
                        </Text>
                      </View>
                      <View style={[styles.toggle, payment.paid && styles.togglePaid]}>
                        <Text style={[styles.toggleText, payment.paid && styles.toggleTextPaid]}>
                          {payment.paid ? '✓ Paid' : 'Unpaid'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(entry.id)}
                  >
                    <Text style={styles.deleteBtnText}>Delete this split</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9ff' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#999' },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#999', marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  cardMode: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  cardDate: { fontSize: 12, color: '#999', marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  cardTotal: { fontSize: 16, fontWeight: '800', color: '#667eea' },
  allPaidBadge: {
    backgroundColor: '#e8f5e9',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  allPaidText: { fontSize: 11, color: '#2ecc71', fontWeight: '600' },
  unpaidBadge: {
    backgroundColor: '#fff3e0',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  unpaidText: { fontSize: 11, color: '#e67e22', fontWeight: '600' },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  paymentName: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  paymentAmount: { fontSize: 13, color: '#888', marginTop: 2 },
  toggle: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  togglePaid: { backgroundColor: '#e8f5e9' },
  toggleText: { fontSize: 13, color: '#aaa', fontWeight: '600' },
  toggleTextPaid: { color: '#2ecc71' },
  deleteBtn: { marginTop: 14, alignItems: 'center' },
  deleteBtnText: { fontSize: 13, color: '#e74c3c' },
});
