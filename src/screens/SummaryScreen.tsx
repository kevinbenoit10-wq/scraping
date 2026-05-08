import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { calculateSummaries, mergeReceipts } from '../services/receiptParser';
import { saveHistoryEntry } from '../services/historyService';
import { C, PERSON_COLORS } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Summary'>;
  route: RouteProp<RootStackParamList, 'Summary'>;
};

export default function SummaryScreen({ navigation, route }: Props) {
  const { receipts, claims, mode } = route.params;
  const receipt = useMemo(() => mergeReceipts(receipts), [receipts]);
  const summaries = calculateSummaries(receipt, claims);

  useEffect(() => {
    saveHistoryEntry(mode ?? 'scan-split', receipt.currency, summaries);
  }, []);

  function personColor(index: number) {
    return PERSON_COLORS[index % PERSON_COLORS.length];
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Bill summary</Text>
        <Text style={styles.subtitle}>What everyone owes</Text>

        {summaries.map((person, idx) => (
          <View key={person.name} style={styles.personCard}>
            <View style={[styles.personHeader, { backgroundColor: personColor(idx) }]}>
              <View style={[styles.personInitialBox]}>
                <Text style={styles.personInitial}>
                  {person.name.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.personHeaderInfo}>
                <Text style={styles.personName}>{person.name}</Text>
                <Text style={styles.personTotal}>
                  {receipt.currency} {person.total.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.personBody}>
              {person.items.map(({ item, portionCount, portionCost }) => (
                <View key={item.id} style={styles.lineItem}>
                  <Text style={styles.lineItemName}>
                    {item.name}
                    {portionCount > 1 ? ` ×${portionCount}` : ''}
                    {item.quantity > portionCount ? ` (${portionCount}/${item.quantity})` : ''}
                  </Text>
                  <Text style={styles.lineItemPrice}>
                    {receipt.currency} {portionCost.toFixed(2)}
                  </Text>
                </View>
              ))}

              {receipt.tax > 0 && (
                <View style={styles.lineItem}>
                  <Text style={styles.taxLabel}>Tax share</Text>
                  <Text style={styles.taxValue}>
                    {receipt.currency} {person.taxShare.toFixed(2)}
                  </Text>
                </View>
              )}
              {receipt.deliveryFee > 0 && (
                <View style={[styles.lineItem, styles.taxLine]}>
                  <Text style={styles.taxLabel}>Delivery fee (split equally)</Text>
                  <Text style={styles.taxValue}>
                    {receipt.currency} {person.deliveryFeeShare.toFixed(2)}
                  </Text>
                </View>
              )}

              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={[styles.totalValue, { color: personColor(idx) }]}>
                  {receipt.currency} {person.total.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        ))}

        <View style={styles.receiptSummary}>
          <Text style={styles.receiptSummaryTitle}>
            Receipt total{receipts.length > 1 ? ` (${receipts.length} receipts)` : ''}
          </Text>

          {receipts.length > 1 && receipts.map((r, i) => (
            <View key={i} style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Receipt {i + 1}</Text>
              <Text style={styles.receiptValue}>{r.currency} {r.total.toFixed(2)}</Text>
            </View>
          ))}

          {receipts.length > 1 && <View style={styles.divider} />}

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Subtotal</Text>
            <Text style={styles.receiptValue}>{receipt.currency} {receipt.subtotal.toFixed(2)}</Text>
          </View>
          {receipt.tax > 0 && (
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Tax</Text>
              <Text style={styles.receiptValue}>{receipt.currency} {receipt.tax.toFixed(2)}</Text>
            </View>
          )}
          {receipt.deliveryFee > 0 && (
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Delivery fee</Text>
              <Text style={styles.receiptValue}>{receipt.currency} {receipt.deliveryFee.toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.receiptRow, styles.receiptTotalRow]}>
            <Text style={styles.receiptTotalLabel}>Total</Text>
            <Text style={styles.receiptTotalValue}>{receipt.currency} {receipt.total.toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
          activeOpacity={0.85}
        >
          <Text style={styles.homeButtonText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700', color: C.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: C.textMuted, marginBottom: 24 },
  personCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  personHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  personInitialBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: C.white,
  },
  personHeaderInfo: { flex: 1 },
  personName: { fontSize: 17, fontWeight: '700', color: C.white },
  personTotal: { fontSize: 22, fontWeight: '800', color: C.white, marginTop: 2 },
  personBody: { backgroundColor: C.card, padding: 16 },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  lineItemName: { fontSize: 14, color: C.text, flex: 1, marginRight: 10 },
  lineItemPrice: { fontSize: 14, fontWeight: '600', color: C.text },
  taxLine: { borderBottomWidth: 0 },
  taxLabel: { fontSize: 13, color: C.textMuted, fontStyle: 'italic' },
  taxValue: { fontSize: 13, color: C.textMuted, fontStyle: 'italic' },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: C.border,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: C.text },
  totalValue: { fontSize: 18, fontWeight: '800' },
  receiptSummary: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  receiptSummaryTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 10 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  receiptLabel: { fontSize: 14, color: C.textMuted },
  receiptValue: { fontSize: 14, color: C.text, fontWeight: '500' },
  receiptTotalRow: { borderTopWidth: 1, borderTopColor: C.border, marginTop: 8, paddingTop: 12 },
  receiptTotalLabel: { fontSize: 16, fontWeight: '700', color: C.text },
  receiptTotalValue: { fontSize: 16, fontWeight: '800', color: C.primary },
  homeButton: {
    backgroundColor: C.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  homeButtonText: { color: C.white, fontSize: 17, fontWeight: '700' },
});
