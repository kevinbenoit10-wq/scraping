import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, ItemClaim, ReceiptItem } from '../types';
import { mergeReceipts } from '../services/receiptParser';
import { C, PERSON_COLORS } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Claim'>;
  route: RouteProp<RootStackParamList, 'Claim'>;
};

export default function ClaimScreen({ navigation, route }: Props) {
  const receipt = mergeReceipts(route.params.receipts);

  const [personName, setPersonName] = useState('');
  const [savedPersons, setSavedPersons] = useState<string[]>([]);
  const [activePerson, setActivePerson] = useState<string | null>(null);
  const [claims, setLocalClaims] = useState<ItemClaim[]>([]);

  function personColor(name: string) {
    const idx = savedPersons.indexOf(name) % PERSON_COLORS.length;
    return PERSON_COLORS[idx >= 0 ? idx : 0];
  }

  function addPerson() {
    const name = personName.trim();
    if (!name) return;
    if (savedPersons.includes(name)) {
      setActivePerson(name);
      setPersonName('');
      return;
    }
    setSavedPersons((prev) => [...prev, name]);
    setActivePerson(name);
    setPersonName('');
  }

  function claimedPortions(itemId: string, person: string): number {
    return claims.find((c) => c.itemId === itemId && c.personName === person)?.portionCount ?? 0;
  }

  function totalClaimedPortions(itemId: string): number {
    return claims.filter((c) => c.itemId === itemId).reduce((s, c) => s + c.portionCount, 0);
  }

  function adjustClaim(item: ReceiptItem, delta: number) {
    if (!activePerson) {
      Alert.alert('Select a person', 'First select your name or add a new one.');
      return;
    }
    const current = claimedPortions(item.id, activePerson);
    const totalOthers = totalClaimedPortions(item.id) - current;
    const newCount = Math.max(0, Math.min(item.quantity - totalOthers, current + delta));

    setLocalClaims((prev) => {
      const filtered = prev.filter((c) => !(c.itemId === item.id && c.personName === activePerson));
      if (newCount > 0) {
        return [...filtered, { itemId: item.id, personName: activePerson, portionCount: newCount }];
      }
      return filtered;
    });
  }

  function handleContinue() {
    if (claims.length === 0) {
      Alert.alert('No selections', 'Please select at least one item.');
      return;
    }
    navigation.navigate('Summary', { receipts: route.params.receipts, claims, mode: 'scan-split' });
  }

  function renderClaimBadges(itemId: string) {
    const itemClaims = claims.filter((c) => c.itemId === itemId);
    return (
      <View style={styles.badgeRow}>
        {itemClaims.map((c) => (
          <View key={c.personName} style={[styles.badge, { backgroundColor: personColor(c.personName) }]}>
            <Text style={styles.badgeText}>
              {c.personName.slice(0, 1).toUpperCase()}{c.portionCount > 1 ? ` ×${c.portionCount}` : ''}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  function renderItem({ item }: { item: ReceiptItem }) {
    const myPortions = activePerson ? claimedPortions(item.id, activePerson) : 0;
    const totalClaimed = totalClaimedPortions(item.id);
    const remaining = item.quantity - totalClaimed;

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemMeta}>
              {item.quantity > 1 ? `${item.quantity}× ` : ''}
              {receipt.currency} {item.unitPrice.toFixed(2)}
              {item.quantity > 1 ? ` = ${receipt.currency} ${item.totalPrice.toFixed(2)}` : ''}
            </Text>
          </View>
          <View style={styles.counter}>
            <TouchableOpacity
              style={[styles.counterBtn, myPortions === 0 && styles.counterBtnDisabled]}
              onPress={() => adjustClaim(item, -1)}
              disabled={myPortions === 0}
            >
              <Text style={styles.counterBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.counterValue}>{myPortions}</Text>
            <TouchableOpacity
              style={[styles.counterBtn, remaining === 0 && styles.counterBtnDisabled]}
              onPress={() => adjustClaim(item, 1)}
              disabled={remaining === 0}
            >
              <Text style={styles.counterBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        {renderClaimBadges(item.id)}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Who had what?</Text>
          <Text style={styles.subtitle}>
            Add people and indicate what each person ordered
          </Text>
        </View>

        <View style={styles.personSection}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Enter name..."
              value={personName}
              onChangeText={setPersonName}
              onSubmitEditing={addPerson}
              returnKeyType="done"
              placeholderTextColor={C.textMuted}
            />
            <TouchableOpacity style={styles.addBtn} onPress={addPerson}>
              <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.personRow}>
            {savedPersons.map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.personChip,
                  { backgroundColor: personColor(p) },
                  activePerson === p && styles.personChipActive,
                ]}
                onPress={() => setActivePerson(p)}
              >
                <Text style={styles.personChipText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {receipt.deliveryFee > 0 && (
          <View style={styles.deliveryBanner}>
            <Text style={styles.deliveryBannerText}>
              Delivery fee {receipt.currency} {receipt.deliveryFee.toFixed(2)} will be split equally
            </Text>
          </View>
        )}

        <FlatList
          data={receipt.items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          style={styles.flex}
        />

        <View style={styles.footer}>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.85}>
            <Text style={styles.continueButtonText}>View bill →</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: C.text },
  subtitle: { fontSize: 14, color: C.textMuted, marginTop: 4 },
  personSection: { paddingHorizontal: 20, paddingBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  input: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
  },
  addBtn: {
    width: 48,
    height: 48,
    backgroundColor: C.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: C.white, fontSize: 24, fontWeight: '300' },
  personRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  personChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    opacity: 0.65,
  },
  personChipActive: { opacity: 1, transform: [{ scale: 1.05 }] },
  personChipText: { color: C.white, fontWeight: '600', fontSize: 14 },
  list: { paddingHorizontal: 20, paddingBottom: 16 },
  itemCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemInfo: { flex: 1, marginRight: 12 },
  itemName: { fontSize: 15, fontWeight: '600', color: C.text },
  itemMeta: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  counterBtn: {
    width: 32,
    height: 32,
    backgroundColor: C.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnDisabled: { backgroundColor: C.border },
  counterBtnText: { color: C.white, fontSize: 18, fontWeight: '600' },
  counterValue: { fontSize: 16, fontWeight: '700', color: C.text, minWidth: 20, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: C.white, fontSize: 12, fontWeight: '600' },
  deliveryBanner: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: C.warningLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: C.warning,
  },
  deliveryBannerText: { fontSize: 13, color: C.warning, fontWeight: '600' },
  footer: { padding: 20, backgroundColor: C.bg },
  continueButton: {
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
  continueButtonText: { color: C.white, fontSize: 17, fontWeight: '700' },
});
