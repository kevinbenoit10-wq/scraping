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
import { C } from '../theme';

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
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
                  <View style={[styles.modeBadge, entry.mode === 'table-mode' && styles.modeBadgeTable]}>
                    <Text style={[styles.modeText, entry.mode === 'table-mode' && styles.modeTextTable]}>
                      {entry.mode === 'table-mode' ? 'Table Mode' : 'Scan & Split'}
                    </Text>
                  </View>
                  <Text style={styles.cardDate}>{formatDate(entry.date)}</Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.cardTotal}>
                    {entry.currency} {entry.total.toFixed(2)}
                  </Text>
                  {allPaid ? (
                    <View style={styles.allPaidBadge}>
                      <Text style={styles.allPaidText}>Settled</Text>
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
                          {payment.paid ? 'Paid' : 'Unpaid'}
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
  safe: { flex: 1, backgroundColor: C.bg },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: C.textMuted },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700', color: C.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: C.textMuted, marginBottom: 20 },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  modeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  modeBadgeTable: { backgroundColor: '#E8F0FE' },
  modeText: { fontSize: 12, fontWeight: '600', color: C.primary },
  modeTextTable: { color: '#1565C0' },
  cardDate: { fontSize: 12, color: C.textMuted },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  cardTotal: { fontSize: 16, fontWeight: '800', color: C.primary },
  allPaidBadge: {
    backgroundColor: C.successLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  allPaidText: { fontSize: 11, color: C.success, fontWeight: '600' },
  unpaidBadge: {
    backgroundColor: C.warningLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  unpaidText: { fontSize: 11, color: C.warning, fontWeight: '600' },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    padding: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.bg,
  },
  paymentName: { fontSize: 14, fontWeight: '600', color: C.text },
  paymentAmount: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  toggle: {
    backgroundColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  togglePaid: { backgroundColor: C.successLight },
  toggleText: { fontSize: 13, color: C.textMuted, fontWeight: '600' },
  toggleTextPaid: { color: C.success },
  deleteBtn: { marginTop: 14, alignItems: 'center' },
  deleteBtnText: { fontSize: 13, color: C.error },
});
