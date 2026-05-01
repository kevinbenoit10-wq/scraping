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
import { useReceipt } from '../context/ReceiptContext';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Claim'>;
  route: RouteProp<RootStackParamList, 'Claim'>;
};

const COLORS = [
  '#667eea', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#3498db', '#e91e63', '#00bcd4',
];

export default function ClaimScreen({ navigation, route }: Props) {
  const { receipt } = route.params;
  const { setClaims } = useReceipt();

  const [personName, setPersonName] = useState('');
  const [savedPersons, setSavedPersons] = useState<string[]>([]);
  const [activePerson, setActivePerson] = useState<string | null>(null);
  const [claims, setLocalClaims] = useState<ItemClaim[]>([]);

  function personColor(name: string) {
    const idx = savedPersons.indexOf(name) % COLORS.length;
    return COLORS[idx >= 0 ? idx : 0];
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
      Alert.alert('Kies een persoon', 'Selecteer eerst je naam of voeg een nieuwe toe.');
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
      Alert.alert('Geen selecties', 'Duid minstens één item aan.');
      return;
    }
    setClaims(claims);
    navigation.navigate('Summary', { receipt, claims });
  }

  function renderClaimBadges(itemId: string) {
    const itemClaims = claims.filter((c) => c.itemId === itemId);
    return (
      <View style={styles.badgeRow}>
        {itemClaims.map((c) => (
          <View key={c.personName} style={[styles.badge, { backgroundColor: personColor(c.personName) }]}>
            <Text style={styles.badgeText}>
              {c.personName.slice(0, 1).toUpperCase()} {c.portionCount > 1 ? `×${c.portionCount}` : ''}
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
          <Text style={styles.title}>Wie heeft wat?</Text>
          <Text style={styles.subtitle}>
            Voeg personen toe en duid aan wat ieder heeft besteld
          </Text>
        </View>

        <View style={styles.personSection}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Naam invoeren..."
              value={personName}
              onChangeText={setPersonName}
              onSubmitEditing={addPerson}
              returnKeyType="done"
              placeholderTextColor="#aaa"
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

        <FlatList
          data={receipt.items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          style={styles.flex}
        />

        <View style={styles.footer}>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.85}>
            <Text style={styles.continueButtonText}>Bekijk rekening →</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9ff' },
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#1a1a2e' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  personSection: { paddingHorizontal: 20, paddingBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#1a1a2e',
  },
  addBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#667eea',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 24, fontWeight: '300' },
  personRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  personChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    opacity: 0.7,
  },
  personChipActive: { opacity: 1, transform: [{ scale: 1.05 }] },
  personChipText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { paddingHorizontal: 20, paddingBottom: 16 },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemInfo: { flex: 1, marginRight: 12 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  itemMeta: { fontSize: 13, color: '#888', marginTop: 2 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  counterBtn: {
    width: 32,
    height: 32,
    backgroundColor: '#667eea',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnDisabled: { backgroundColor: '#e0e0e0' },
  counterBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  counterValue: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', minWidth: 20, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  footer: { padding: 20, backgroundColor: '#f8f9ff' },
  continueButton: {
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
  continueButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
