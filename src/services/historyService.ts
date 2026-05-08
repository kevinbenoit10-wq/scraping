import AsyncStorage from '@react-native-async-storage/async-storage';
import { HistoryEntry, PersonSummary } from '../types';

const HISTORY_KEY = 'splitr_history';

export async function saveHistoryEntry(
  mode: 'scan-split' | 'table-mode',
  currency: string,
  summaries: PersonSummary[]
): Promise<void> {
  try {
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      mode,
      currency,
      total: summaries.reduce((sum, p) => sum + p.total, 0),
      payments: summaries.map(p => ({
        personName: p.name,
        amount: p.total,
        paid: false,
      })),
    };
    const existing = await getHistory();
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...existing]));
  } catch (e) {
    console.warn('Failed to save history', e);
  }
}

export async function getHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function togglePayment(entryId: string, personName: string): Promise<HistoryEntry[]> {
  try {
    const history = await getHistory();
    const updated = history.map(entry => {
      if (entry.id !== entryId) return entry;
      return {
        ...entry,
        payments: entry.payments.map(p =>
          p.personName === personName ? { ...p, paid: !p.paid } : p
        ),
      };
    });
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export async function deleteHistoryEntry(entryId: string): Promise<HistoryEntry[]> {
  try {
    const history = await getHistory();
    const updated = history.filter(e => e.id !== entryId);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}
