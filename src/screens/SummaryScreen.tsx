import React, { useMemo } from 'react';
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

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Summary'>;
  route: RouteProp<RootStackParamList, 'Summary'>;
};

const COLORS = [
  '#667eea', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#3498db', '#e91e63', '#00bcd4',
];

export default function SummaryScreen({ navigation, route }: Props) {
  const { receipts, claims } = route.params;
  const receipt = useMemo(() => mergeReceipts(receipts), [receipts]);
  const summaries = calculateSummaries(receipt, claims);

  function personColor(index: number) {
    return COLORS[index % COLORS.length];
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Bill summary</Text>
        <Text style={styles.subtitle}>What everyone owes</Text>

        {summaries.map((person, idx) => (
          <View key={person.name} style={styles.personCard}>
            <View style={[styles.personHeader, { backgroundColor: personColor(idx) }]}>
              <Text style={styles.personInitial}>
                {person.name.slice(0, 1).toUpperCase()}
              </Text>
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
<<<<<<< HEAD
            Receipt total {receipts.length > 1 ? `(${receipts.length} receipts)` : ''}
=======
            Receipt total {receipts.length > 1 ? `(${receipts.length} receipts)` : ''}
>>>>>>> 0fa62d608eb815afdf566d1259776848ee302340
          </Text>

          {receipts.length > 1 && receipts.map((r, i) => (
            <View key={i} style={styles.ticketRow}>
<<<<<<< HEAD
              <Text style={styles.ticketLabel}>Receipt {i + 1}</Text>
=======
              <Text style={styles.ticketLabel}>Receipt {i + 1}</Text>
>>>>>>> 0fa62d608eb815afdf566d1259776848ee302340
              <Text style={styles.ticketValue}>{r.currency} {r.total.toFixed(2)}</Text>
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
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.85}
        >
          <Text style={styles.homeButtonText}>Scan new receipt</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9ff' },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 24 },
  personCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  personHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  personInitial: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    lineHeight: 44,
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  personHeaderInfo: { flex: 1 },
  personName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  personTotal: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
  personBody: { backgroundColor: '#fff', padding: 16 },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lineItemName: { fontSize: 14, color: '#444', flex: 1, marginRight: 10 },
  lineItemPrice: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  taxLine: { borderBottomWidth: 0 },
  taxLabel: { fontSize: 13, color: '#999', fontStyle: 'italic' },
  taxValue: { fontSize: 13, color: '#999', fontStyle: 'italic' },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: '#f0f0f0',
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  totalValue: { fontSize: 18, fontWeight: '800' },
  receiptSummary: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  receiptSummaryTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 12 },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  ticketLabel: { fontSize: 13, color: '#888' },
  ticketValue: { fontSize: 13, color: '#888', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  receiptLabel: { fontSize: 14, color: '#666' },
  receiptValue: { fontSize: 14, color: '#1a1a2e', fontWeight: '500' },
  receiptTotalRow: { borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 8, paddingTop: 12 },
  receiptTotalLabel: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  receiptTotalValue: { fontSize: 16, fontWeight: '800', color: '#667eea' },
  homeButton: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  homeButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
