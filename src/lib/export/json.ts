import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { db } from '@/db/client';

import { buildDbSnapshot } from './snapshot';

export async function exportJson(): Promise<{ uri: string; bytes: number }> {
  const snapshot = await buildDbSnapshot(db);
  const payload = JSON.stringify(snapshot, replaceDate, 2);
  const filename = `trazia-export-${snapshot.exportedAt.slice(0, 10)}.json`;
  const uri = `${FileSystem.documentDirectory ?? ''}${filename}`;
  await FileSystem.writeAsStringAsync(uri, payload, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Trazia-Export teilen',
      UTI: 'public.json',
    });
  }
  return { uri, bytes: payload.length };
}

// Date instances roundtrip to ISO strings so the resulting JSON is
// dialect-portable (no '__date__' wrappers needed).
function replaceDate(_key: string, value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value;
}
